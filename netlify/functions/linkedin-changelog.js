export async function handler(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      }
    };
  }

  const { authorization } = event.headers;
  const { startTime, count = '50' } = event.queryStringParameters || {};
  
  if (!authorization) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'No authorization token' })
    };
  }

  try {
    let url = `https://api.linkedin.com/rest/memberChangeLogs?q=memberAndApplication&count=${count}`;
    if (startTime) {
      url += `&startTime=${startTime}`;
    }
    
    const response = await fetch(url, {
      headers: {
        'Authorization': authorization,
        'LinkedIn-Version': '202312',
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      },
      body: JSON.stringify(data)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Failed to fetch LinkedIn changelog data' })
    };
  }
}