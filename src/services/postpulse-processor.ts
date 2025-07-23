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
            const timestamp = new Date(share.Date).getTime();
            const daysSincePosted = Math.floor(
              (Date.now() - timestamp) / (24 * 60 * 60 * 1000)
            );

            const postId = share.ShareLink?.match(/activity-(\d+)/)
              ? `urn:li:activity:${
                  share.ShareLink.match(/activity-(\d+)/)?.[1]
                }`
              : `historical_${Date.now()}_${index}`;

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
              media: share.MediaUrl ? { url: share.MediaUrl } : undefined,
              thumbnail: share.MediaUrl || null,
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

    return posts.sort((a, b) => b.timestamp - a.timestamp);
  }

  static processChangelogData(data: ChangelogPostData): ProcessedPost[] {
    const posts: ProcessedPost[] = [];

    if (!data.elements) return posts;

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

    // Process UGC posts
    const postEvents = data.elements.filter(
      (e) => e.resourceName === "ugcPosts"
    );

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
          media:
            processedContent?.media?.[0] || activityContent?.media?.[0] || null,
          thumbnail: null,
          canRepost: daysSincePosted >= 30,
          daysSincePosted: daysSincePosted,
          visibility: "PUBLIC",
          mediaType:
            processedContent?.media?.[0] || activityContent?.media?.[0]
              ? "IMAGE"
              : "TEXT",
          source: "realtime",
        });
      } catch (error) {
        console.error("Error processing changelog post event:", error, event);
      }
    });

    return posts.sort((a, b) => b.timestamp - a.timestamp);
  }

  static mergeAndDeduplicatePosts(
    historicalPosts: ProcessedPost[],
    realtimePosts: ProcessedPost[]
  ): ProcessedPost[] {
    const merged = [...historicalPosts];
    const existingIds = new Set(historicalPosts.map((p) => p.id));

    realtimePosts.forEach((post) => {
      if (!existingIds.has(post.id)) {
        merged.push(post);
      }
    });

    // Sort by timestamp (newest first) and remove duplicates
    return merged
      .sort((a, b) => b.timestamp - a.timestamp)
      .filter(
        (post, index, self) => index === self.findIndex((p) => p.id === post.id)
      );
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
