export async function handler(event, context) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
    };
  }

  const { authorization } = event.headers;
  const { partnerPersonUrn } = event.queryStringParameters || {};

  console.log("=== SYNERGY PARTNER POSTS ===");
  console.log("Partner URN:", partnerPersonUrn);
  console.log("Authorization present:", !!authorization);

  if (!authorization) {
    return {
      statusCode: 401,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: "No authorization token" }),
    };
  }

  if (!partnerPersonUrn) {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: "partnerPersonUrn is required" }),
    };
  }

  try {
    // Extract viewer's DMA token
    const myDmaToken = authorization.replace('Bearer ', '');
    
    // For demo purposes, we'll use the same token for partner
    // In production, you'd fetch the partner's token from your database
    const partnerDmaToken = myDmaToken;

    console.log("Using tokens for partner posts fetch");

    // Verify partner consent
    const consentCheck = await verifyPartnerConsent(partnerDmaToken);
    if (!consentCheck.isActive) {
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          error: "partner_not_authorized",
          message: "Partner needs to reconnect with DMA consent"
        }),
      };
    }

    // Calculate 28 days ago
    const twentyEightDaysAgo = Date.now() - (28 * 24 * 60 * 60 * 1000);

    // Fetch partner's posts from their changelog
    const partnerPosts = await fetchPartnerPosts(partnerDmaToken, partnerPersonUrn, twentyEightDaysAgo);
    console.log(`Found ${partnerPosts.length} partner posts`);

    // Fetch my comments on those posts
    const myComments = await fetchMyComments(myDmaToken, partnerPosts.map(p => p.urn), twentyEightDaysAgo);
    console.log(`Found ${Object.keys(myComments).length} of my comments on partner posts`);

    // Combine posts with my comments
    const postsWithComments = partnerPosts.map(post => ({
      ...post,
      myComment: myComments[post.urn] || null
    }));

    const result = {
      partner: {
        personUrn: partnerPersonUrn,
        displayName: extractDisplayName(partnerPersonUrn) // Extract from URN for demo
      },
      posts: postsWithComments
    };

    console.log(`Returning ${result.posts.length} posts for partner`);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
      body: JSON.stringify(result),
    };

  } catch (error) {
    console.error("Synergy partner posts error:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: "Failed to fetch partner posts",
        details: error.message
      }),
    };
  }
}

async function verifyPartnerConsent(partnerDmaToken) {
  try {
    const response = await fetch("https://api.linkedin.com/rest/memberAuthorizations?q=memberAndApplication", {
      headers: {
        Authorization: `Bearer ${partnerDmaToken}`,
        "LinkedIn-Version": "202312"
      }
    });

    if (!response.ok) {
      return { isActive: false, message: "Unable to verify partner consent" };
    }

    const data = await response.json();
    const hasConsent = data.elements && data.elements.length > 0;

    return {
      isActive: hasConsent,
      message: hasConsent ? "Partner consent active" : "Partner consent not active"
    };
  } catch (error) {
    console.error("Error verifying partner consent:", error);
    return { isActive: false, message: "Error checking partner consent" };
  }
}

async function fetchPartnerPosts(partnerDmaToken, partnerPersonUrn, startTime) {
  try {
    console.log(`Fetching posts for partner: ${partnerPersonUrn}`);
    
    const response = await fetch(
      `https://api.linkedin.com/rest/memberChangeLogs?q=memberAndApplication&count=50&startTime=${startTime}`,
      {
        headers: {
          Authorization: `Bearer ${partnerDmaToken}`,
          "LinkedIn-Version": "202312"
        }
      }
    );

    if (!response.ok) {
      console.warn(`Partner changelog API returned ${response.status}`);
      return [];
    }

    const data = await response.json();
    const events = data.elements || [];

    console.log(`Processing ${events.length} events for partner posts`);

    // Filter for partner's ugcPosts
    const ugcPosts = events.filter(event => {
      return event.resourceName === "ugcPosts" &&
             event.method !== "DELETE" &&
             (event.activity?.author === partnerPersonUrn || event.owner === partnerPersonUrn) &&
             event.activity?.author?.startsWith?.('urn:li:person:');
    });

    console.log(`Found ${ugcPosts.length} UGC posts from partner`);

    // Process posts and extract thumbnails
    const posts = ugcPosts
      .sort((a, b) => (b.capturedAt || b.processedAt) - (a.capturedAt || a.processedAt))
      .slice(0, 5)
      .map(event => {
        const content = event.activity?.specificContent?.["com.linkedin.ugc.ShareContent"];
        const text = content?.shareCommentary?.text || "Post content";
        const mediaType = content?.shareMediaCategory || "NONE";
        
        // Extract thumbnail
        const thumbnail = extractThumbnail(content, mediaType);
        
        return {
          urn: event.resourceId,
          createdAt: event.capturedAt || event.processedAt,
          text: text,
          mediaType: mediaType,
          thumbnail: thumbnail
        };
      });

    console.log(`Returning ${posts.length} processed partner posts`);
    return posts;

  } catch (error) {
    console.error("Error fetching partner posts:", error);
    return [];
  }
}

async function fetchMyComments(myDmaToken, postUrns, startTime) {
  try {
    console.log(`Fetching my comments for ${postUrns.length} post URNs`);
    
    const response = await fetch(
      `https://api.linkedin.com/rest/memberChangeLogs?q=memberAndApplication&count=50&startTime=${startTime}`,
      {
        headers: {
          Authorization: `Bearer ${myDmaToken}`,
          "LinkedIn-Version": "202312"
        }
      }
    );

    if (!response.ok) {
      console.warn(`My changelog API returned ${response.status}`);
      return {};
    }

    const data = await response.json();
    const events = data.elements || [];

    console.log(`Processing ${events.length} events for my comments`);

    // Filter for my comments on the partner's posts
    const myComments = {};
    
    events.forEach(event => {
      if (event.resourceName === "socialActions/comments" && 
          event.method === "CREATE" &&
          event.activity?.object &&
          postUrns.includes(event.activity.object)) {
        
        const postUrn = event.activity.object;
        const commentText = event.activity?.message?.text || 
                           event.processedActivity?.message?.text || 
                           "Comment text";
        
        // Keep the latest comment per post
        if (!myComments[postUrn] || 
            (event.capturedAt || event.processedAt) > myComments[postUrn].createdAt) {
          myComments[postUrn] = {
            text: commentText,
            createdAt: event.capturedAt || event.processedAt
          };
        }
      }
    });

    console.log(`Found my comments on ${Object.keys(myComments).length} partner posts`);
    return myComments;

  } catch (error) {
    console.error("Error fetching my comments:", error);
    return {};
  }
}

function extractThumbnail(content, mediaType) {
  if (!content) return null;

  // Handle IMAGE/VIDEO posts
  if ((mediaType === "IMAGE" || mediaType === "VIDEO") && content.media && content.media.length > 0) {
    const firstMedia = content.media[0];
    const mediaUrn = firstMedia?.media;
    
    if (mediaUrn && typeof mediaUrn === 'string') {
      const assetMatch = mediaUrn.match(/urn:li:digitalmediaAsset:(.+)/);
      if (assetMatch) {
        const assetId = assetMatch[1];
        return `/.netlify/functions/linkedin-media-download?assetId=${assetId}`;
      }
    }
  }

  // Handle ARTICLE posts
  if (mediaType === "ARTICLE" && content.contentEntities && content.contentEntities.length > 0) {
    const firstEntity = content.contentEntities[0];
    const articleThumbnail = firstEntity?.thumbnails?.[0]?.imageSpecificContent?.media ||
                            firstEntity?.thumbnails?.[0]?.imageUrl;
    if (articleThumbnail) {
      return articleThumbnail;
    }
  }

  return null;
}

function extractDisplayName(personUrn) {
  // Extract a display name from the URN for demo purposes
  // In production, you'd fetch this from your database or LinkedIn profile API
  const urnParts = personUrn.split(':');
  const id = urnParts[urnParts.length - 1];
  return `Partner ${id.substring(0, 8)}`;
}