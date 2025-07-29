export async function handler(event, context) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
    };
  }

  const { authorization } = event.headers;
  const { assetId, token } = event.queryStringParameters || {};

  console.log("LinkedIn Media Download Function - Asset ID:", assetId);
  console.log("LinkedIn Media Download Function - Token from query:", token ? "present" : "missing");
  console.log("LinkedIn Media Download Function - Authorization header present:", !!authorization);

  // Use token from query params if authorization header is not present
  const authToken = authorization || (token ? `Bearer ${token}` : null);
  
  if (!authToken) {
    return {
      statusCode: 401,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: "No authorization token provided" }),
    };
  }

  if (!assetId) {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: "Asset ID is required" }),
    };
  }

  try {
    // Try the most common LinkedIn media download endpoint
    const url = `https://api.linkedin.com/mediaDownload/${assetId}`;
    console.log("LinkedIn Media Download Function - Calling URL:", url);

    const response = await fetch(url, {
      headers: {
        Authorization: authToken,
        "LinkedIn-Version": "202312",
      },
    });

    console.log("LinkedIn Media Download Function - Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log("LinkedIn Media Download Function - Error response:", errorText);
      
      return {
        statusCode: response.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          error: "Failed to download LinkedIn media",
          details: `LinkedIn API returned ${response.status}: ${response.statusText}`,
          assetId: assetId,
          endpoint: url
        }),
      };
    }

    // Get the binary data
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    console.log("LinkedIn Media Download Function - Image size:", imageBuffer.byteLength, "bytes");

    // Convert to base64 for frontend display
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    const dataUrl = `data:${contentType};base64,${base64Image}`;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
      body: JSON.stringify({
        success: true,
        dataUrl: dataUrl,
        contentType: contentType,
        size: imageBuffer.byteLength,
        assetId: assetId
      }),
    };
  } catch (error) {
    console.error("LinkedIn Media Download Function - Error:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: "Failed to download LinkedIn media",
        details: error.message,
        assetId: assetId
      }),
    };
  }
}