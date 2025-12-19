// Netlify Serverless Function - Pollinations API Proxy
// This function securely proxies requests to Pollinations API with server-side API key

// Helper function to call Pollinations API
async function callPollinationsAPI(encodedPrompt, model, width, height, seedParam, apiKey) {
  const pollinationsUrl = `https://gen.pollinations.ai/image/${encodedPrompt}?model=${model}&width=${width}&height=${height}&seed=${seedParam}&nologo=true&private=true`;
  
  console.log(`Fetching from Pollinations with model: ${model}...`);
  
  const response = await fetch(pollinationsUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });
  
  return response;
}

// Helper function to check if error is "no active servers"
function isNoActiveServersError(errorText) {
  return errorText.toLowerCase().includes('no active') && errorText.toLowerCase().includes('servers');
}

// Helper function to check if error is token/quota related
function isTokenExhaustedError(errorText) {
  const lowerText = errorText.toLowerCase();
  return lowerText.includes('quota') || 
         lowerText.includes('limit') || 
         lowerText.includes('exceeded') ||
         lowerText.includes('insufficient') ||
         lowerText.includes('balance') ||
         lowerText.includes('pollen') ||
         lowerText.includes('credits');
}

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { prompt, width = 512, height = 768, model = 'flux', seed } = JSON.parse(event.body);

    if (!prompt) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Prompt is required' }),
      };
    }

    const apiKey = process.env.POLLINATIONS_API_KEY;
    if (!apiKey) {
      console.error('POLLINATIONS_API_KEY environment variable is not set');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error: API key not set' }),
      };
    }

    const seedParam = seed || Math.floor(Math.random() * 1000000);
    const encodedPrompt = encodeURIComponent(prompt);
    
    // First try with the requested model (default: flux)
    let response = await callPollinationsAPI(encodedPrompt, model, width, height, seedParam, apiKey);
    let usedModel = model;
    let fallbackUsed = false;

    console.log(`Pollinations response status for ${model}:`, response.status);

    // If flux fails with "no active servers", fallback to turbo
    if (!response.ok && model === 'flux') {
      const errorText = await response.text();
      console.error(`Pollinations API error with flux: ${response.status}`, errorText);
      
      // IMPORTANT: Check "no active servers" FIRST (more specific error)
      // Then check token errors (to avoid false positives)
      if (isNoActiveServersError(errorText)) {
        console.log('Flux servers unavailable, falling back to turbo model...');
        response = await callPollinationsAPI(encodedPrompt, 'turbo', width, height, seedParam, apiKey);
        usedModel = 'turbo';
        fallbackUsed = true;
        console.log(`Pollinations response status for turbo:`, response.status);
      } else if (isTokenExhaustedError(errorText)) {
        // Check if it's a token/quota exhausted error
        return {
          statusCode: response.status,
          headers,
          body: JSON.stringify({ 
            error: 'API 调用请求成功，但是 token 已用完，请联系 ibby 充值。',
            errorCode: 'TOKEN_EXHAUSTED',
            status: response.status,
            details: errorText,
          }),
        };
      } else {
        // Other error, return as is
        return {
          statusCode: response.status,
          headers,
          body: JSON.stringify({ 
            error: 'Failed to generate image',
            status: response.status,
            details: errorText,
          }),
        };
      }
    }

    // Check if fallback also failed
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Pollinations API error with ${usedModel}: ${response.status}`, errorText);
      
      // IMPORTANT: Check "no active servers" FIRST
      // If both flux and turbo failed with "no active servers"
      if (fallbackUsed && isNoActiveServersError(errorText)) {
        return {
          statusCode: response.status,
          headers,
          body: JSON.stringify({ 
            error: '两种生图模型（flux 和 turbo）当前在官方服务器都暂不可用，请稍后再试。',
            errorCode: 'ALL_MODELS_UNAVAILABLE',
            status: response.status,
            details: errorText,
          }),
        };
      }
      
      // Check if it's a token/quota exhausted error
      if (isTokenExhaustedError(errorText)) {
        return {
          statusCode: response.status,
          headers,
          body: JSON.stringify({ 
            error: 'API 调用请求成功，但是 token 已用完，请联系 ibby 充值。',
            errorCode: 'TOKEN_EXHAUSTED',
            status: response.status,
            details: errorText,
          }),
        };
      }
      
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to generate image',
          status: response.status,
          details: errorText,
        }),
      };
    }

    // Get the image as base64
    const imageBuffer = await response.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageUrl: `data:${contentType};base64,${base64Image}`,
        seed: seedParam,
        model: usedModel,
        fallbackUsed: fallbackUsed,
      }),
    };
  } catch (error) {
    console.error('Proxy error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', message: error.message }),
    };
  }
};
