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
    
    // Use image.pollinations.ai with GET request and token parameter
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&model=${model}&seed=${seedParam}&nologo=true&token=${apiKey}`;

    console.log('Fetching from Pollinations (URL length):', pollinationsUrl.length);

    const response = await fetch(pollinationsUrl, {
      method: 'GET',
    });

    console.log('Pollinations response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Pollinations API error: ${response.status} ${response.statusText}`, errorText);
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
