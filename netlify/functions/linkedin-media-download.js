// netlify/functions/linkedin-media-download.js

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

  console.log("LinkedIn Media Download Function - Starting");
  console.log("Query parameters:", event.queryStringParameters);

  try {
    const { assetId, token } = event.queryStringParameters || {};
    const authHeader = event.headers.authorization;

    console.log("LinkedIn Media Download Function - Asset ID:", assetId);
    console.log("LinkedIn Media Download Function - Token from query:", token ? "present" : "missing");
    console.log("LinkedIn Media Download Function - Auth header:", authHeader ? "present" : "missing");

    // Use token from query params or authorization header
    const accessToken = token || (authHeader ? authHeader.replace('Bearer ', '') : null);

    if (!assetId) {
      console.log("LinkedIn Media Download Function - Missing assetId");
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "Missing assetId parameter" }),
      };
    }

    if (!accessToken) {
      console.log("LinkedIn Media Download Function - Missing access token");
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "Missing access token" }),
      };
    }

    // Validate asset ID format - should not include URN prefix
    if (assetId.startsWith("urn:li:digitalmediaAsset:")) {
      console.log("LinkedIn Media Download Function - Invalid assetId format (includes URN prefix)");
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ 
          error: "Invalid assetId format", 
          details: "Pass only the asset ID, not the full URN. Remove 'urn:li:digitalmediaAsset:' prefix." 
        }),
      };
    }

    // Construct the LinkedIn mediaDownload URL
    const url = `https://api.linkedin.com/mediaDownload/${encodeURIComponent(assetId)}`;
    console.log("LinkedIn Media Download Function - Calling URL:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        // Note: No LinkedIn-Version header for mediaDownload endpoint
      },
      redirect: "follow", // Follow 302 redirects to CDN
    });

    console.log("LinkedIn Media Download Function - Response status:", response.status);
    console.log("LinkedIn Media Download Function - Response headers:", Object.fromEntries(response.headers.entries()));

    // If LinkedIn returns an error, relay it with the actual error body
    if (!response.ok) {
      const errorText = await response.text().catch(() => "No error body");
      console.log("LinkedIn Media Download Function - LinkedIn error:", errorText);
      
      return {
        statusCode: response.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          error: "LinkedIn API error",
          status: response.status,
          details: `LinkedIn response ${response.status}: ${errorText}`,
          assetId: assetId,
          endpoint: url
        }),
      };
    }

    // Get the binary data
    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    console.log("LinkedIn Media Download Function - Success! Image size:", arrayBuffer.byteLength, "bytes");
    console.log("LinkedIn Media Download Function - Content type:", contentType);

    // Return the binary data as base64 encoded
    return {
      statusCode: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
      body: Buffer.from(arrayBuffer).toString('base64'),
      isBase64Encoded: true,
    };

  } catch (error) {
    console.error("LinkedIn Media Download Function - Unexpected error:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: "Server error",
        details: error.message,
        stack: error.stack
      }),
    };
  }
}