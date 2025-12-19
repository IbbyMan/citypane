// Netlify Serverless Function - Pollinations API Proxy
// This function securely proxies requests to Pollinations API with server-side API key

// Fallback models to try when flux is unavailable (in order of preference)
const FALLBACK_MODELS = ['seedream', 'nanobanana', 'zimage'];

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

// Helper function to check if error is model not allowed (403)
function isModelNotAllowedError(errorText) {
  return errorText.toLowerCase().includes('not allowed');
}

// Helper function to check if error is token/quota related
function isTokenExhaustedError(errorText) {
  const lowerText = errorText.toLowerCase();
  return lowerText.includes('quota') || 
         lowerText.includes('exceeded') ||
         lowerText.includes('insufficient') ||
         lowerText.includes('balance') ||
         lowerText.includes('pollen') ||
         lowerText.includes('credits');
}

// Helper function to check if error is retryable (should try next fallback model)
function isRetryableError(errorText) {
  return isNoActiveServersError(errorText) || isModelNotAllowedError(errorText);
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
    let triedModels = [model];

    console.log(`Pollinations response status for ${model}:`, response.status);

    // If primary model fails, try fallback models
    if (!response.ok && model === 'flux') {
      let errorText = await response.text();
      console.error(`Pollinations API error with flux: ${response.status}`, errorText);
      
      // Check if it's a token/quota exhausted error first
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
      
      // If it's a retryable error (no active servers or model not allowed), try fallbacks
      if (isRetryableError(errorText)) {
        for (const fallbackModel of FALLBACK_MODELS) {
          console.log(`Trying fallback model: ${fallbackModel}...`);
          triedModels.push(fallbackModel);
          
          response = await callPollinationsAPI(encodedPrompt, fallbackModel, width, height, seedParam, apiKey);
          console.log(`Pollinations response status for ${fallbackModel}:`, response.status);
          
          if (response.ok) {
            usedModel = fallbackModel;
            fallbackUsed = true;
            break;
          }
          
          // Check error for this fallback
          errorText = await response.text();
          console.error(`Pollinations API error with ${fallbackModel}: ${response.status}`, errorText);
          
          // If token exhausted, stop trying
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
          
          // If not retryable, stop trying fallbacks
          if (!isRetryableError(errorText)) {
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
        
        // If we've tried all fallbacks and still failing
        if (!response.ok) {
          return {
            statusCode: response.status,
            headers,
            body: JSON.stringify({ 
              error: `所有生图模型（${triedModels.join('、')}）当前都不可用，请稍后再试。`,
              errorCode: 'ALL_MODELS_UNAVAILABLE',
              status: response.status,
              triedModels: triedModels,
            }),
          };
        }
      } else {
        // Non-retryable error, return as is
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

    // Check if non-flux model failed
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Pollinations API error with ${usedModel}: ${response.status}`, errorText);
      
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
