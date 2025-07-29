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
  const { assetId } = event.queryStringParameters || {};

  console.log("LinkedIn Media Download Function - Asset ID:", assetId);
  console.log(
    "LinkedIn Media Download Function - Authorization header present:",
    !!authorization
  );

  if (!authorization) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "No authorization token" }),
    };
  }

  if (!assetId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Asset ID is required" }),
    };
  }

  try {
    const url = `https://api.linkedin.com/mediaDownload/${assetId}`;
    console.log("LinkedIn Media Download Function - Calling URL:", url);

    const response = await fetch(url, {
      headers: {
        Authorization: authorization,
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
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
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