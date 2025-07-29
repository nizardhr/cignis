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
  console.log(
    "LinkedIn Media Download Function - Authorization header present:",
    !!authorization
  );

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
    const url = `https://api.linkedin.com/v2/assets/${assetId}`;
    console.log("LinkedIn Media Download Function - Calling URL:", url);
    console.log("LinkedIn Media Download Function - Using auth token:", authToken ? "present" : "missing");

    const response = await fetch(url, {
      headers: {
        Authorization: authToken,
        "LinkedIn-Version": "202312",
      },
    });

    console.log(
      "LinkedIn Media Download Function - Response status:",
      response.status
    );
    console.log(
      "LinkedIn Media Download Function - Response headers:",
      Object.fromEntries(response.headers.entries())
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.log("LinkedIn Media Download Function - Error response body:", errorText);
      
      // Try alternative endpoint if first one fails
      console.log("LinkedIn Media Download Function - Trying alternative endpoint...");
      const altUrl = `https://api.linkedin.com/mediaDownload/${assetId}`;
      console.log("LinkedIn Media Download Function - Alternative URL:", altUrl);
      
      const altResponse = await fetch(altUrl, {
        headers: {
          Authorization: authToken,
          "LinkedIn-Version": "202312",
        },
      });
      
      console.log("LinkedIn Media Download Function - Alternative response status:", altResponse.status);
      
      if (!altResponse.ok) {
        const altErrorText = await altResponse.text();
        console.log("LinkedIn Media Download Function - Alternative error response:", altErrorText);
        
        return {
          statusCode: altResponse.status,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            error: "Failed to download LinkedIn media",
            details: `Primary: ${response.status} ${response.statusText}, Alternative: ${altResponse.status} ${altResponse.statusText}`,
            primaryError: errorText,
            alternativeError: altErrorText
          }),
        };
      }
      
      // Use alternative response if successful
      const altImageBuffer = await altResponse.arrayBuffer();
      const altContentType = altResponse.headers.get('content-type') || 'image/jpeg';
      
      console.log("LinkedIn Media Download Function - Alternative success, image size:", altImageBuffer.byteLength, "bytes");
      
      const altBase64Image = Buffer.from(altImageBuffer).toString('base64');
      const altDataUrl = `data:${altContentType};base64,${altBase64Image}`;
      
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Cache-Control": "public, max-age=3600",
        },
        body: JSON.stringify({
          success: true,
          dataUrl: altDataUrl,
          contentType: altContentType,
          size: altImageBuffer.byteLength,
          source: "alternative"
        }),
      };
    }

    // Get the binary data
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    console.log(
      "LinkedIn Media Download Function - Image size:",
      imageBuffer.byteLength,
      "bytes"
    );

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
        source: "primary"
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
      }),
    };
  }
}