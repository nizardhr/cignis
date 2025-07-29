import { ProcessedPost } from "./postpulse-cache";

export interface HistoricalPostData {
  paging: {
    start: number;
    count: number;
    total: number;
    hasMore: boolean;
  };
  elements: Array<{
    snapshotDomain: string;
    snapshotData: Array<{
      Visibility: string;
      ShareCommentary: string;
      MediaUrl?: string;
      ShareLink: string;
      Date: string;
      SharedUrl?: string;
      LikesCount: string;
      CommentsCount: string;
      SharesCount: string;
      MediaType: string;
    }>;
  }>;
  cutoffDate: string;
  daysBack: number;
}

export interface ChangelogPostData {
  elements: Array<{
    resourceName: string;
    method: string;
    capturedAt: number;
    resourceId: string;
    processedActivity?: any;
    activity?: any;
  }>;
}

export class PostPulseProcessor {
  static processHistoricalData(data: HistoricalPostData): ProcessedPost[] {
    const posts: ProcessedPost[] = [];

    if (!data.elements) return posts;

    data.elements.forEach((element) => {
      if (
        element.snapshotDomain === "MEMBER_SHARE_INFO" &&
        element.snapshotData
      ) {
        element.snapshotData.forEach((share, index) => {
          try {
            // Skip if this is not the user's own post (company posts, etc.)
            if (share.Visibility === "COMPANY" || share.Visibility === "ORGANIZATION") {
              return;
            }

            const timestamp = new Date(share.Date).getTime();
            const daysSincePosted = Math.floor(
              (Date.now() - timestamp) / (24 * 60 * 60 * 1000)
            );

            // Extract post ID from ShareLink
            let postId = `historical_${timestamp}_${index}`;
            if (share.ShareLink) {
              const activityMatch = share.ShareLink.match(/activity-(\d+)/);
              if (activityMatch) {
                postId = `urn:li:activity:${activityMatch[1]}`;
              }
            }

            // Extract media information
            let media = undefined;
            let thumbnail = null;
            
            if (share.MediaUrl) {
              media = { url: share.MediaUrl };
              thumbnail = share.MediaUrl;
            } else if (share.MediaType && share.MediaType !== "TEXT") {
              // If there's a media type but no URL, try to extract from other fields
              const mediaFields = [
                share["Media URL"],
                share.mediaUrl,
                share["Image URL"],
                share.imageUrl
              ];
              
              for (const field of mediaFields) {
                if (field && typeof field === 'string' && field.startsWith('http')) {
                  media = { url: field };
                  thumbnail = field;
                  break;
                }
              }
            }

            posts.push({
              id: postId,
              text: share.ShareCommentary || "Historical post content",
              url:
                share.ShareLink || `https://linkedin.com/feed/update/${postId}`,
              timestamp: timestamp,
              likes: parseInt(share.LikesCount) || 0,
              comments: parseInt(share.CommentsCount) || 0,
              shares: parseInt(share.SharesCount) || 0,
              repurposeGrade:
                parseInt(share.LikesCount) +
                  parseInt(share.CommentsCount) +
                  parseInt(share.SharesCount) >
                3
                  ? "red"
                  : "blue",
              media: media,
              thumbnail: thumbnail,
              canRepost: daysSincePosted >= 30,
              daysSincePosted: daysSincePosted,
              visibility: share.Visibility || "PUBLIC",
              mediaType: share.MediaType || "TEXT",
              source: "historical",
            });
          } catch (error) {
            console.error("Error processing historical share:", error, share);
          }
        });
      }
    });

    // Remove duplicates based on post ID and sort by timestamp
    const uniquePosts = posts.filter(
      (post, index, self) => index === self.findIndex((p) => p.id === post.id)
    );
    
    return uniquePosts.sort((a, b) => b.timestamp - a.timestamp);
  }

  static processChangelogData(data: ChangelogPostData): ProcessedPost[] {
    const posts: ProcessedPost[] = [];

    if (!data.elements) return posts;

    // Get the current user's ID from the first element (owner field)
    const currentUserId = data.elements.find(e => e.owner)?.owner;
    console.log("Current user ID:", currentUserId);

    // Build engagement map first
    const engagementMap: Record<
      string,
      { likes: number; comments: number; shares: number }
    > = {};

    data.elements.forEach((event) => {
      if (event.resourceName?.includes("socialActions")) {
        const postUrn = event.activity?.object;
        if (postUrn) {
          if (!engagementMap[postUrn]) {
            engagementMap[postUrn] = { likes: 0, comments: 0, shares: 0 };
          }

          if (
            event.resourceName === "socialActions/likes" &&
            event.method === "CREATE"
          ) {
            engagementMap[postUrn].likes++;
          } else if (
            event.resourceName === "socialActions/comments" &&
            event.method === "CREATE"
          ) {
            engagementMap[postUrn].comments++;
          } else if (
            event.resourceName === "socialActions/shares" &&
            event.method === "CREATE"
          ) {
            engagementMap[postUrn].shares++;
          }
        }
      }
    });

    // Process UGC posts - only include posts created by the current user
    const postEvents = data.elements.filter((e) => {
      return e.resourceName === "ugcPosts" && 
             e.method === "CREATE" &&
             e.owner === e.actor && // Only posts where the user is the actor (creator)
             (!currentUserId || e.owner === currentUserId); // Ensure it's the current user's post
    });

    console.log(`Found ${postEvents.length} user posts out of ${data.elements.length} total events`);

    postEvents.forEach((event) => {
      try {
        const processedContent =
          event.processedActivity?.specificContent?.[
            "com.linkedin.ugc.ShareContent"
          ];
        const activityContent =
          event.activity?.specificContent?.["com.linkedin.ugc.ShareContent"];

        const shareCommentary =
          processedContent?.shareCommentary?.text ||
          activityContent?.shareCommentary?.text ||
          event.processedActivity?.text ||
          event.activity?.text ||
          "Post content from LinkedIn";

        const timestamp = event.capturedAt || event.processedAt || Date.now();
        const daysSincePosted = Math.floor(
          (Date.now() - timestamp) / (24 * 60 * 60 * 1000)
        );

        const postId = event.resourceId || event.id?.toString();
        const engagement = engagementMap[postId] || {
          likes: 0,
          comments: 0,
          shares: 0,
        };

        // Extract media information from the post
        let media = null;
        let thumbnail = null;
        let mediaType = "TEXT";
        
        const mediaArray = processedContent?.media || activityContent?.media;
        if (mediaArray && mediaArray.length > 0) {
          const firstMedia = mediaArray[0];
          
          // Try to extract media URL from various possible fields
          const mediaUrl = firstMedia?.media?.downloadUrl ||
                           firstMedia?.media?.url ||
                           firstMedia?.downloadUrl ||
                           firstMedia?.url;
          
          if (mediaUrl) {
            media = { url: mediaUrl };
            thumbnail = mediaUrl;
            mediaType = firstMedia?.mediaType || "IMAGE";
          }
        }

        posts.push({
          id: postId,
          text: shareCommentary,
          url: `https://linkedin.com/feed/update/${postId}`,
          timestamp: timestamp,
          likes: engagement.likes,
          comments: engagement.comments,
          shares: engagement.shares,
          repurposeGrade:
            engagement.likes + engagement.comments + engagement.shares > 3
              ? "red"
              : "blue",
          media: media,
          thumbnail: thumbnail,
          canRepost: daysSincePosted >= 30,
          daysSincePosted: daysSincePosted,
          visibility: "PUBLIC",
          mediaType: mediaType,
          source: "realtime",
        });
      } catch (error) {
        console.error("Error processing changelog post event:", error, event);
      }
    });

    // Remove duplicates and sort by timestamp
    const uniquePosts = posts.filter(
      (post, index, self) => index === self.findIndex((p) => p.id === post.id)
    );
    
    return uniquePosts.sort((a, b) => b.timestamp - a.timestamp);
  }

  static mergeAndDeduplicatePosts(
    historicalPosts: ProcessedPost[],
    realtimePosts: ProcessedPost[]
  ): ProcessedPost[] {
    // Create a map to track posts by ID for better deduplication
    const postMap = new Map<string, ProcessedPost>();
    
    // Add historical posts first
    historicalPosts.forEach(post => {
      postMap.set(post.id, post);
    });
    
    // Add realtime posts, but prefer realtime data if there's a conflict
    realtimePosts.forEach(post => {
      const existingPost = postMap.get(post.id);
      if (!existingPost || post.source === "realtime") {
        postMap.set(post.id, post);
      }
    });

    // Convert back to array and sort
    const merged = Array.from(postMap.values());

    console.log(`Merged ${historicalPosts.length} historical + ${realtimePosts.length} realtime = ${merged.length} unique posts`);
    
    return merged.sort((a, b) => b.timestamp - a.timestamp);
  }

  static filterPostsByDateRange(
    posts: ProcessedPost[],
    daysBack: number
  ): ProcessedPost[] {
    const cutoffTime = Date.now() - daysBack * 24 * 60 * 60 * 1000;
    return posts.filter((post) => post.timestamp >= cutoffTime);
  }

  static paginatePosts(
    posts: ProcessedPost[],
    page: number,
    pageSize: number = 12
  ): {
    posts: ProcessedPost[];
    totalPages: number;
    currentPage: number;
    totalPosts: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } {
    const totalPosts = posts.length;
    const totalPages = Math.ceil(totalPosts / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedPosts = posts.slice(startIndex, endIndex);

    return {
      posts: paginatedPosts,
      totalPages,
      currentPage: page,
      totalPosts,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }
}
