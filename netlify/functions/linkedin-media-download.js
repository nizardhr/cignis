// netlify/functions/linkedin-media-download.js

export async function handler(event) {
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


  try {
    const { assetId } = event.queryStringParameters || {};
    const token = (event.queryStringParameters || {}).token || process.env.LINKEDIN_DMA_TOKEN;


    if (!assetId) {
      return { 
        statusCode: 400, 
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: "Missing assetId" 
      };
    }
    if (!token) {
      return { 
        statusCode: 401, 
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: "Missing access token" 
      };
    }

    // Only the opaque asset id, NOT the full URN
    const cleanAssetId = assetId.replace("urn:li:digitalmediaAsset:", "");
    if (cleanAssetId.includes(":")) {
      return { 
        statusCode: 400, 
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: "Invalid assetId (does it still include a URN?)" 
      };
    }

    const url = `https://api.linkedin.com/mediaDownload/${encodeURIComponent(cleanAssetId)}`;
    

    const li = await fetch(url, {
      method: "GET",
      headers: { 
        Authorization: `Bearer ${token}`,
        "User-Agent": "LinkedInGrowth/1.0"
      },
      redirect: "follow"
    });



    if (!li.ok) {
      const text = await li.text().catch(() => "");
      // Relay LinkedIn's actual reason for 400/401/403/404
      return { 
        statusCode: li.status, 
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: `LinkedIn response ${li.status}: ${text || "No body"}` 
      };
    }

    const contentType = li.headers.get("content-type") || "application/octet-stream";
    const buf = Buffer.from(await li.arrayBuffer());
    

    return {
      statusCode: 200,
      headers: { 
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600"
      },
      body: buf.toString("base64"),
      isBase64Encoded: true
    };
  } catch (err) {
    return { 
      statusCode: 500, 
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: `Server error: ${err.message}` 
    };
  }
}