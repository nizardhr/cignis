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


  const { assetId, token } = event.queryStringParameters || {};
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
  if (!assetId) {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: "Missing assetId parameter" })
    };
  }

    // Clean the asset ID (remove URN prefix if present)
    const cleanAssetId = assetId.replace("urn:li:digitalmediaAsset:", "");
    
    // Use the LinkedIn media download API
    const mediaUrl = `https://api.linkedin.com/mediaDownload/${encodeURIComponent(cleanAssetId)}`;
    
    console.log("Fetching media from LinkedIn:", mediaUrl);
    
    const response = await fetch(mediaUrl, {
      headers: {
        "Authorization": authorization,
        "LinkedIn-Version": "202312",
        "User-Agent": "LinkedInGrowth/1.0"
      },
      redirect: "follow"
    });

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