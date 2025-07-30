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
  const { timeFilter = "7d", page = "1", pageSize = "12" } = event.queryStringParameters || {};

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

  try {
    console.log("PostPulse Data: Starting with person post filtering");
    const startTime = Date.now();

    // Calculate time range
    const days = timeFilter === "7d" ? 7 : timeFilter === "30d" ? 30 : 90;
    const startTimeMs = Date.now() - (days * 24 * 60 * 60 * 1000);

    // Fetch data from both sources
    const [changelogData, historicalData] = await Promise.all([
      fetchMemberChangelog(authorization, startTimeMs),
      fetchHistoricalPosts(authorization, days)
    ]);

    // Process changelog posts (recent activity)
    const changelogPosts = processChangelogPosts(changelogData, authorization);
    console.log(`PostPulse: Processed ${changelogPosts.length} changelog posts`);

    // Process historical posts
    const historicalPosts = processHistoricalPosts(historicalData, authorization);
    console.log(`PostPulse: Processed ${historicalPosts.length} historical posts`);

    // Merge and deduplicate
    const allPosts = mergeAndDeduplicatePosts(changelogPosts, historicalPosts);
    console.log(`PostPulse: Merged to ${allPosts.length} unique posts`);

    // Apply pagination
    const pageNum = parseInt(page);
    const pageSizeNum = parseInt(pageSize);
    const startIndex = (pageNum - 1) * pageSizeNum;
    const endIndex = startIndex + pageSizeNum;
    const paginatedPosts = allPosts.slice(startIndex, endIndex);

    const result = {
      posts: paginatedPosts,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(allPosts.length / pageSizeNum),
        totalPosts: allPosts.length,
        hasNextPage: endIndex < allPosts.length,
        hasPrevPage: pageNum > 1,
      },
      metadata: {
        fetchTimeMs: Date.now() - startTime,
        timeFilter,
        dataSource: changelogPosts.length > 0 ? "changelog+historical" : "historical",
      },
      lastUpdated: new Date().toISOString(),
    };

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
    console.error("PostPulse Data Error:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: "Failed to fetch PostPulse data",
        details: error.message,
      }),
    };
  }
}

async function fetchMemberChangelog(authorization, startTime) {
  try {
    const count = 50; // Max allowed by DMA
    const url = `https://api.linkedin.com/rest/memberChangeLogs?q=memberAndApplication&count=${count}`;
    // Remove startTime filter to get more recent data for testing
    
    const response = await fetch(url, {
      headers: {
        Authorization: authorization,
        "LinkedIn-Version": "202312" // Required for versioned REST API
      }
    });

    if (!response.ok) {
      console.warn(`Changelog API returned ${response.status}`);
      return { elements: [] };
    }

    const data = await response.json();
    console.log(`Fetched ${data.elements?.length || 0} changelog events`, {
      resourceNames: data.elements?.map(e => e.resourceName).slice(0, 10),
      methods: data.elements?.map(e => e.method).slice(0, 10),
      owners: data.elements?.map(e => e.owner).slice(0, 5)
    });
    return data;
  } catch (error) {
    console.error("Error fetching changelog:", error);
    return { elements: [] };
  }
}

async function fetchHistoricalPosts(authorization, daysBack) {
  try {
    const response = await fetch(
      `/.netlify/functions/linkedin-historical-posts?daysBack=${daysBack}&count=50`,
      {
        headers: {
          Authorization: authorization,
        }
      }
    );

    if (!response.ok) {
      console.warn(`Historical posts API returned ${response.status}`);
      return { elements: [] };
    }

    const data = await response.json();
    console.log(`Fetched historical posts: ${data.elements?.length || 0} elements`);
    return data;
  } catch (error) {
    console.error("Error fetching historical posts:", error);
    return { elements: [] };
  }
}

function processChangelogPosts(changelogData, authorization) {
  const posts = [];
  const elements = changelogData?.elements || [];

  // Get current user ID for filtering
  const currentUserId = elements.find(e => e.owner)?.owner;
  console.log("Current user ID:", currentUserId);

  // Filter to person posts only
  const personPosts = elements.filter(event => {
    // Must be a ugcPost
    if (event.resourceName !== "ugcPosts") return false;

    // Exclude DELETE method
    if (event.method === "DELETE") {
      console.log("Excluding DELETE post:", event.resourceId);
      return false;
    }

    // Check for deleted lifecycle state
    const lifecycleState = event.processedActivity?.lifecycleState || event.activity?.lifecycleState;
    if (lifecycleState === "DELETED" || lifecycleState === "REMOVED") {
      console.log("Excluding deleted lifecycle post:", event.resourceId);
      return false;
    }

    // Check if this is the user's own post
    // For ugcPosts, the owner should be the current user
    if (event.owner !== currentUserId) {
      console.log("Excluding post from different user:", event.resourceId, "owner:", event.owner);
      return false;
    }

    // Additional check: ensure the author is a person (not organization)
    const author = event.processedActivity?.author || event.activity?.author || event.owner;
    if (author && typeof author === 'string' && !author.startsWith('urn:li:person:')) {
      console.log("Excluding non-person authored post:", event.resourceId, "author:", author);
      return false;
    }

    console.log("Including person post:", event.resourceId, "author:", author);
    return true;
  });

  console.log(`Found ${personPosts.length} person posts out of ${elements.length} total events`);

  personPosts.forEach(event => {
    try {
      const processedContent = event.processedActivity?.specificContent?.["com.linkedin.ugc.ShareContent"];
      const activityContent = event.activity?.specificContent?.["com.linkedin.ugc.ShareContent"];
      
      const shareCommentary = processedContent?.shareCommentary?.text ||
                             activityContent?.shareCommentary?.text ||
                             "Post content from LinkedIn";

      const timestamp = event.capturedAt || event.processedAt || Date.now();
      const postId = event.resourceId || event.id?.toString();

      // Extract media information
      const mediaInfo = extractMediaInfo(processedContent, activityContent, authorization);

      posts.push({
        id: postId,
        urn: event.resourceId,
        title: shareCommentary,
        text: shareCommentary,
        url: `https://linkedin.com/feed/update/${postId}`,
        timestamp: timestamp,
        thumbnail: mediaInfo.thumbnail,
        mediaType: mediaInfo.mediaType,
        mediaAssetId: mediaInfo.assetId,
        source: "changelog",
        daysSincePosted: Math.floor((Date.now() - timestamp) / (24 * 60 * 60 * 1000)),
        canRepost: Math.floor((Date.now() - timestamp) / (24 * 60 * 60 * 1000)) >= 30,
        likes: 0, // Will be calculated separately
        comments: 0,
        shares: 0,
      });
    } catch (error) {
      console.error("Error processing changelog post:", error, event);
    }
  });

  return posts.sort((a, b) => b.timestamp - a.timestamp);
}

function processHistoricalPosts(historicalData, authorization) {
  const posts = [];
  
  if (!historicalData.elements) return posts;

  historicalData.elements.forEach((element) => {
    if (element.snapshotDomain === "MEMBER_SHARE_INFO" && element.snapshotData) {
      element.snapshotData.forEach((share, index) => {
        try {
          // Skip company posts - but be more lenient with visibility checks
          // Some personal posts might have different visibility settings
          console.log("Processing historical share with visibility:", share.Visibility);

          const timestamp = new Date(share.Date).getTime();
          const daysSincePosted = Math.floor((Date.now() - timestamp) / (24 * 60 * 60 * 1000));

          // Extract post ID from ShareLink
          let postId = `historical_${timestamp}_${index}`;
          if (share.ShareLink) {
            const activityMatch = share.ShareLink.match(/activity-(\d+)/);
            if (activityMatch) {
              postId = `urn:li:activity:${activityMatch[1]}`;
            }
          }

          // Extract media information from historical posts
          const mediaInfo = extractHistoricalMediaInfo(share, authorization);

          posts.push({
            id: postId,
            urn: postId,
            title: share.ShareCommentary || "Historical post content",
            text: share.ShareCommentary || "Historical post content",
            url: share.ShareLink || `https://linkedin.com/feed/update/${postId}`,
            timestamp: timestamp,
            thumbnail: mediaInfo.thumbnail,
            mediaType: mediaInfo.mediaType,
            mediaAssetId: mediaInfo.assetId,
            source: "historical",
            daysSincePosted: daysSincePosted,
            canRepost: daysSincePosted >= 30,
            likes: parseInt(share.LikesCount) || 0,
            comments: parseInt(share.CommentsCount) || 0,
            shares: parseInt(share.SharesCount) || 0,
          });
        } catch (error) {
          console.error("Error processing historical share:", error, share);
        }
      });
    }
  });

  return posts.sort((a, b) => b.timestamp - a.timestamp);
}

function extractMediaInfo(processedContent, activityContent, authorization) {
  const shareContent = processedContent || activityContent;
  if (!shareContent) {
    return { thumbnail: null, mediaType: "TEXT", assetId: null };
  }

  const shareMediaCategory = shareContent.shareMediaCategory || "NONE";
  const mediaArray = shareContent.media || [];

  console.log("Extracting media info:", {
    shareMediaCategory,
    mediaArrayLength: mediaArray.length,
    firstMedia: mediaArray[0]
  });

  // Handle IMAGE and VIDEO posts
  if ((shareMediaCategory === "IMAGE" || shareMediaCategory === "VIDEO") && mediaArray.length > 0) {
    const firstMedia = mediaArray[0];
    const mediaUrn = firstMedia?.media;
    
    if (mediaUrn && typeof mediaUrn === 'string') {
      // Extract asset ID from URN like "urn:li:digitalmediaAsset:C5606AQF245TuEXNVXA"
      const assetMatch = mediaUrn.match(/urn:li:digitalmediaAsset:(.+)/);
      if (assetMatch) {
        const assetId = assetMatch[1];
        console.log("Extracted media asset ID:", assetId);
        
        // Only generate thumbnail if status is READY
        if (firstMedia?.status === "READY") {
          return {
            thumbnail: `/.netlify/functions/linkedin-media-download?assetId=${assetId}`,
            mediaType: shareMediaCategory,
            assetId: assetId
          };
        }
      }
    }
  }

  // Handle ARTICLE posts
  if (shareMediaCategory === "ARTICLE") {
    const contentEntities = shareContent.contentEntities || [];
    if (contentEntities.length > 0) {
      const firstEntity = contentEntities[0];
      const thumbnailUrl = firstEntity?.thumbnails?.[0]?.imageSpecificContent?.media ||
                          firstEntity?.thumbnails?.[0]?.imageUrl;
      
      if (thumbnailUrl) {
        console.log("Found article thumbnail:", thumbnailUrl);
        return {
          thumbnail: thumbnailUrl,
          mediaType: "ARTICLE",
          assetId: null
        };
      }
    }
  }

  return { thumbnail: null, mediaType: shareMediaCategory || "TEXT", assetId: null };
}

function extractHistoricalMediaInfo(share, authorization) {
  console.log("Extracting historical media info:", {
    MediaUrl: share.MediaUrl,
    MediaType: share.MediaType,
    SharedUrl: share.SharedUrl
  });

  // Historical posts may have MediaUrl for direct access
  if (share.MediaUrl && share.MediaUrl.trim()) {
    console.log("Found MediaUrl:", share.MediaUrl);
    return {
      thumbnail: share.MediaUrl,
      mediaType: share.MediaType || "IMAGE",
      assetId: null
    };
  }

  // Check if it's an article with a shared URL that might have a preview
  if (share.SharedUrl && share.MediaType === "ARTICLE") {
    // For articles, we might not have a direct thumbnail
    // but we can indicate it's an article type
    return {
      thumbnail: null,
      mediaType: "ARTICLE",
      assetId: null
    };
  }

  return {
    thumbnail: null,
    mediaType: share.MediaType || "TEXT",
    assetId: null
  };
}

function mergeAndDeduplicatePosts(changelogPosts, historicalPosts) {
  const postMap = new Map();
  
  // Add historical posts first
  historicalPosts.forEach(post => {
    postMap.set(post.id, post);
  });
  
  // Add changelog posts, preferring them over historical if there's a conflict
  changelogPosts.forEach(post => {
    const existingPost = postMap.get(post.id);
    if (!existingPost || post.source === "changelog") {
      postMap.set(post.id, post);
    }
  });

  const merged = Array.from(postMap.values());
  console.log(`Merged ${historicalPosts.length} historical + ${changelogPosts.length} changelog = ${merged.length} unique posts`);
  
  return merged.sort((a, b) => b.timestamp - a.timestamp);
}