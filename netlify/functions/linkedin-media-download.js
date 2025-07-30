export async function handler(event, context) {
  // Handle CORS preflight
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

  console.log("=== LINKEDIN MEDIA DOWNLOAD ===");
  console.log("Query parameters:", event.queryStringParameters);
  console.log("Headers:", event.headers);

  const { assetId, token } = event.queryStringParameters || {};
  const authHeader = event.headers.authorization || event.headers.Authorization;

  console.log("Asset ID:", assetId);
  console.log("Token from params:", token ? "present" : "missing");
  console.log("Auth header:", authHeader ? "present" : "missing");

  if (!assetId) {
    console.error("Missing assetId parameter");
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: "Missing assetId parameter" })
    };
  }

  // Use token from params or auth header
  const accessToken = token || (authHeader ? authHeader.replace('Bearer ', '') : null);
  
  if (!accessToken) {
    console.error("No access token available");
    return {
      statusCode: 401,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: "No access token provided" })
    };
  }

  try {
    // Clean the asset ID (remove URN prefix if present)
    const cleanAssetId = assetId.replace("urn:li:digitalmediaAsset:", "");
    console.log("Clean asset ID:", cleanAssetId);
    
    // Use the LinkedIn media download API
    const mediaUrl = `https://api.linkedin.com/mediaDownload/${encodeURIComponent(cleanAssetId)}`;
    console.log("Fetching media from:", mediaUrl);
    
    const response = await fetch(mediaUrl, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "LinkedIn-Version": "202312",
        "User-Agent": "LinkedInGrowth/1.0"
      },
      redirect: "follow"
    });

    console.log("LinkedIn response status:", response.status);
    console.log("LinkedIn response headers:", Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      console.error(`LinkedIn media API error: ${response.status} ${response.statusText}`);
      
      if (response.status === 404) {
        return {
          statusCode: 404,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({ error: "Media asset not found" })
        };
      }
      
      if (response.status === 403) {
        return {
          statusCode: 403,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({ error: "Access denied to media asset" })
        };
      }
      
      return {
        statusCode: response.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ 
          error: `LinkedIn API error: ${response.status} ${response.statusText}` 
        })
      };
    }

    // Get the content type from LinkedIn's response
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    console.log("Content type:", contentType);
    
    // Convert response to buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log(`Successfully fetched media: ${buffer.length} bytes, type: ${contentType}`);
    
    return {
      statusCode: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
      body: buffer.toString("base64"),
      isBase64Encoded: true
    };
  } catch (error) {
    console.error("Media download error:", error);
    console.error("Error stack:", error.stack);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: "Failed to download media",
        details: error.message
      })
    };
  }
}