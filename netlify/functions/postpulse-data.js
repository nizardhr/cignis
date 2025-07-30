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
    const url = `https://api.linkedin.com/rest/memberChangeLogs?q=memberAndApplication&count=${count}&startTime=${startTime}`;
    
    console.log("🔗 Fetching changelog from:", url);
    
    const response = await fetch(url, {
      headers: {
        Authorization: authorization,
        "LinkedIn-Version": "202312" // Required for versioned REST API
      }
    });

    if (!response.ok) {
      console.warn(`⚠️ Changelog API returned ${response.status}`);
      return { elements: [] };
    }

    const data = await response.json();
    console.log(`📥 Fetched ${data.elements?.length || 0} changelog events`);
    console.log("📊 Changelog summary:", {
      resourceNames: data.elements?.map(e => e.resourceName).slice(0, 10),
      methods: data.elements?.map(e => e.method).slice(0, 10),
      owners: data.elements?.map(e => e.owner).slice(0, 5)
    });
    return data;
  } catch (error) {
    console.error("❌ Error fetching changelog:", error);
    return { elements: [] };
  }
}

async function fetchHistoricalPosts(authorization, daysBack) {
  try {
    console.log("🔗 Fetching historical posts for", daysBack, "days back");
    
    const response = await fetch(
      `/.netlify/functions/linkedin-historical-posts?daysBack=${daysBack}&count=50`,
      {
        headers: {
          Authorization: authorization,
        }
      }
    );

    if (!response.ok) {
      console.warn(`⚠️ Historical posts API returned ${response.status}`);
      return { elements: [] };
    }

    const data = await response.json();
    console.log(`📥 Fetched historical posts: ${data.elements?.length || 0} elements`);
    console.log("📊 Historical data summary:", data.elements?.[0]?.snapshotData?.length || 0, "shares");
    return data;
  } catch (error) {
    console.error("❌ Error fetching historical posts:", error);
    return { elements: [] };
  }
}

function processChangelogPosts(changelogData, authorization) {
  const posts = [];
  const elements = changelogData?.elements || [];
  
  console.log("=== PROCESSING CHANGELOG POSTS ===");
  console.log("Total elements:", elements.length);
  console.log("Authorization header:", authorization ? "present" : "missing");

  // Get current user ID for filtering
  const currentUserId = elements.find(e => e.owner)?.owner;
  console.log("🔍 Current user ID:", currentUserId);
  
  // Log all ugcPosts events for debugging
  const allUgcPosts = elements.filter(e => e.resourceName === "ugcPosts");
  console.log("🔍 Total ugcPosts events:", allUgcPosts.length);
  
  allUgcPosts.forEach((post, index) => {
    console.log(`📝 UGC Post ${index + 1}/${allUgcPosts.length}:`, {
      resourceId: post.resourceId,
      method: post.method,
      owner: post.owner,
      actor: post.actor,
      ownerMatchesUser: post.owner === currentUserId,
      lifecycleState: post.processedActivity?.lifecycleState || post.activity?.lifecycleState,
      author: post.processedActivity?.author || post.activity?.author || post.owner
    });
  });

  // Filter to person posts only
  const personPosts = elements.filter(event => {
    console.log("=== FILTERING CHANGELOG POST ===");
    console.log("Resource name:", event.resourceName);
    console.log("Post ID:", event.resourceId);
    console.log("Method:", event.method);
    console.log("Owner:", event.owner);
    console.log("Actor:", event.actor);
    console.log("Current User ID:", currentUserId);
    console.log("Owner matches current user:", event.owner === currentUserId);
    
    // Must be a ugcPost
    if (event.resourceName !== "ugcPosts") {
      console.log("❌ EXCLUDED: Not a ugcPost");
      return false;
    }

    // Exclude DELETE method
    if (event.method === "DELETE") {
      console.log("❌ EXCLUDED: DELETE method");
      return false;
    }

    // Check for deleted lifecycle state
    const lifecycleState = event.processedActivity?.lifecycleState || event.activity?.lifecycleState;
    console.log("Lifecycle state:", lifecycleState);
    if (lifecycleState === "DELETED" || lifecycleState === "REMOVED") {
      console.log("❌ EXCLUDED: Deleted lifecycle state");
      return false;
    }

    // SIMPLIFIED: Just check if this is the user's own post
    if (event.owner !== currentUserId) {
      console.log("❌ EXCLUDED: Not current user's post (owner mismatch)");
      return false;
    }
    
    // Optional: Check if author is a person (but don't be too strict)
    const author = event.processedActivity?.author || event.activity?.author || event.owner;
    if (author && typeof author === 'string' && author.startsWith('urn:li:organization:')) {
      console.log("❌ EXCLUDED: Organization author:", author);
      return false;
    }
    
    console.log("✅ INCLUDED: Valid person post");
    return true;
  });

  console.log(`🎯 FINAL RESULT: Found ${personPosts.length} person posts out of ${elements.length} total events`);

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
      console.log("Media info for post", postId, ":", mediaInfo);

      posts.push({
        id: postId,
        urn: event.resourceId,
        title: shareCommentary,
        text: shareCommentary,
        url: `https://linkedin.com/feed/update/${postId}`,
        timestamp: timestamp,
        thumbnail: mediaInfo.thumbnail ? `${mediaInfo.thumbnail}&token=${encodeURIComponent(authorization.replace('Bearer ', ''))}` : null,
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
  
  console.log("=== PROCESSING HISTORICAL POSTS ===");
  console.log("Historical data elements:", historicalData.elements?.length || 0);
  
  if (!historicalData.elements) return posts;

  historicalData.elements.forEach((element) => {
    if (element.snapshotDomain === "MEMBER_SHARE_INFO" && element.snapshotData) {
      console.log(`📊 Processing ${element.snapshotData.length} historical shares`);
      
      element.snapshotData.forEach((share, index) => {
        try {
          console.log(`=== HISTORICAL SHARE ${index + 1} ===`);
          console.log("Share data:", {
            Date: share.Date,
            Visibility: share.Visibility,
            ShareCommentary: share.ShareCommentary?.substring(0, 50) + "...",
            ShareLink: share.ShareLink,
            MediaType: share.MediaType,
            LikesCount: share.LikesCount,
            CommentsCount: share.CommentsCount
          });
          
          // Skip company posts but be more lenient
          if (share.Visibility === "COMPANY" || share.Visibility === "ORGANIZATION") {
            console.log("❌ EXCLUDED: Company/Organization post");
            return;
          }

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
          console.log("Historical media info for share", index, ":", mediaInfo);

          posts.push({
            id: postId,
            urn: postId,
            title: share.ShareCommentary || "Historical post content",
            text: share.ShareCommentary || "Historical post content",
            url: share.ShareLink || `https://linkedin.com/feed/update/${postId}`,
            timestamp: timestamp,
            thumbnail: mediaInfo.thumbnail ? `${mediaInfo.thumbnail}&token=${encodeURIComponent(authorization.replace('Bearer ', ''))}` : null,
            mediaType: mediaInfo.mediaType,
            mediaAssetId: mediaInfo.assetId,
            source: "historical",
            daysSincePosted: daysSincePosted,
            canRepost: daysSincePosted >= 30,
            likes: parseInt(share.LikesCount) || 0,
            comments: parseInt(share.CommentsCount) || 0,
            shares: parseInt(share.SharesCount) || 0,
          });
          
          console.log("✅ INCLUDED: Historical post added");
        } catch (error) {
          console.error("Error processing historical share:", error, share);
        }
      });
    }
  });

  console.log(`🎯 HISTORICAL RESULT: Processed ${posts.length} historical posts`);
  return posts.sort((a, b) => b.timestamp - a.timestamp);
}

function extractMediaInfo(processedContent, activityContent, authorization) {
  const shareContent = processedContent || activityContent;
  if (!shareContent) {
    console.log("No share content found");
    return { thumbnail: null, mediaType: "TEXT", assetId: null };
  }

  const shareMediaCategory = shareContent.shareMediaCategory || "NONE";
  const mediaArray = shareContent.media || [];

  console.log("Extracting media info:", {
    shareMediaCategory,
    mediaArrayLength: mediaArray.length,
    firstMedia: mediaArray[0],
    hasContentEntities: !!shareContent.contentEntities
  });

  // Handle IMAGE and VIDEO posts
  if ((shareMediaCategory === "IMAGE" || shareMediaCategory === "VIDEO") && mediaArray.length > 0) {
    const firstMedia = mediaArray[0];
    const mediaUrn = firstMedia?.media;
    console.log("Processing IMAGE/VIDEO media URN:", mediaUrn);
    
    if (mediaUrn && typeof mediaUrn === 'string') {
      // Extract asset ID from URN like "urn:li:digitalmediaAsset:C5606AQF245TuEXNVXA"
      const assetMatch = mediaUrn.match(/urn:li:digitalmediaAsset:(.+)/);
      console.log("Asset match result:", assetMatch);
      
      if (assetMatch) {
        const assetId = assetMatch[1];
        console.log("Extracted media asset ID:", assetId);
        
        // Only generate thumbnail if status is READY
        if (firstMedia?.status === "READY") {
          console.log("Media status is READY, generating thumbnail URL");
          return {
            thumbnail: `/.netlify/functions/linkedin-media-download?assetId=${assetId}`,
            mediaType: shareMediaCategory,
            assetId: assetId
          };
        } else {
          console.log("Media status not READY:", firstMedia?.status);
        }
      }
    }
  }

  // Handle ARTICLE posts
  if (shareMediaCategory === "ARTICLE") {
    console.log("Processing ARTICLE post, checking contentEntities");
    const contentEntities = shareContent.contentEntities || [];
    console.log("Content entities:", contentEntities.length);
    
    if (contentEntities.length > 0) {
      const firstEntity = contentEntities[0];
      console.log("First entity:", firstEntity);
      
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

  console.log("No media found, returning defaults");
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
  console.log("=== MERGING POSTS ===");
  console.log("📊 Input counts:", {
    changelog: changelogPosts.length,
    historical: historicalPosts.length
  });
  
  const postMap = new Map();
  
  // Add historical posts first
  historicalPosts.forEach(post => {
    console.log("📝 Adding historical post:", post.id);
    postMap.set(post.id, post);
  });
  
  // Add changelog posts, preferring them over historical if there's a conflict
  changelogPosts.forEach(post => {
    const existingPost = postMap.get(post.id);
    console.log("📝 Processing changelog post:", post.id, "exists:", !!existingPost);
    if (!existingPost || post.source === "changelog") {
      postMap.set(post.id, post);
    }
  });

  const merged = Array.from(postMap.values());
  console.log(`🎯 MERGE RESULT: ${historicalPosts.length} historical + ${changelogPosts.length} changelog = ${merged.length} unique posts`);
  
  return merged.sort((a, b) => b.timestamp - a.timestamp);
}