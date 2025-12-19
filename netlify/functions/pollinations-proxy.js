// Netlify Serverless Function - Pollinations API Proxy
// This function securely proxies requests to Pollinations API with server-side API key

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
    
    // Helper function to call Pollinations API
    const callAPI = async (modelName) => {
      const url = `https://gen.pollinations.ai/image/${encodedPrompt}?model=${modelName}&width=${width}&height=${height}&seed=${seedParam}&nologo=true&private=true`;
      console.log(`Fetching from Pollinations with model: ${modelName}...`);
      return fetch(url, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
    };

    // First try with flux
    let response = await callAPI(model);
    let usedModel = model;
    console.log(`Pollinations response status for ${model}:`, response.status);

    // If flux fails with "no active servers", fallback to turbo
    if (!response.ok && model === 'flux') {
      const errorText = await response.text();
      console.error(`Pollinations API error with flux: ${response.status}`, errorText);
      
      const lowerError = errorText.toLowerCase();
      
      // Check if it's "no active servers" error - try turbo
      if (lowerError.includes('no active') && lowerError.includes('servers')) {
        console.log('Flux servers unavailable, falling back to turbo...');
        response = await callAPI('turbo');
        usedModel = 'turbo';
        console.log(`Pollinations response status for turbo:`, response.status);
      }
    }

    // Handle final response
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Pollinations API error: ${response.status}`, errorText);
      
      const lowerError = errorText.toLowerCase();
      
      // Token exhausted
      if (lowerError.includes('quota') || lowerError.includes('exceeded') || 
          lowerError.includes('insufficient') || lowerError.includes('balance') || 
          lowerError.includes('pollen') || lowerError.includes('credits')) {
        return {
          statusCode: response.status,
          headers,
          body: JSON.stringify({ 
            error: 'API 调用请求成功，但是 token 已用完，请联系 ibby 充值。',
            errorCode: 'TOKEN_EXHAUSTED',
          }),
        };
      }
      
      // Both models unavailable
      if (usedModel === 'turbo' && lowerError.includes('no active') && lowerError.includes('servers')) {
        return {
          statusCode: response.status,
          headers,
          body: JSON.stringify({ 
            error: '两种生图模型（flux 和 turbo）当前在官方服务器都暂不可用，请稍后再试。',
            errorCode: 'ALL_MODELS_UNAVAILABLE',
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
