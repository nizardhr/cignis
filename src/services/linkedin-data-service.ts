export class LinkedInDataService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour cache

  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`Using cached data for: ${key}`);
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
    console.log(`Cached data for: ${key}`);
  }

  async fetchProfileViews(token: string) {
    try {
      console.log(
        "Fetching profile views with DMA token:",
        token ? "Token available" : "No token"
      );

      // Check cache first
      const cacheKey = `profile_views_${token.substring(0, 20)}`;
      const cachedData = this.getCachedData(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      const response = await fetch(
        "/.netlify/functions/linkedin-snapshot?domain=PROFILE",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 429) {
          throw new Error(
            `LinkedIn API Rate Limit Exceeded: ${
              errorData.message ||
              "Daily limit reached. Please try again tomorrow."
            }`
          );
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Raw profile snapshot response:", data);

      // Check if LinkedIn returned an error response
      if (data.status === 429) {
        throw new Error(
          `LinkedIn API Rate Limit Exceeded: ${
            data.message || "Daily limit reached. Please try again tomorrow."
          }`
        );
      }

      // Handle different possible response structures
      let profileData = [];
      if (data.elements && data.elements.length > 0) {
        profileData = data.elements[0]?.snapshotData || [];
      } else if (data.snapshotData) {
        profileData = data.snapshotData;
      } else if (Array.isArray(data)) {
        profileData = data;
      }

      console.log("Extracted profile data:", profileData);

      let profileViews = 0;
      let searchAppearances = 0;
      let uniqueViewers = 0;

      // Check every item for the metrics we need
      profileData.forEach((item: any) => {
        console.log("Processing profile item:", item);

        // Try multiple possible keys for profile views
        const possibleViewKeys = [
          "Profile Views",
          "profile_views",
          "ProfileViews",
          "Views",
          "Profile View Count",
          "profile_view_count",
          "viewCount",
          "profileViews",
          "profile_views_count",
          "views_count",
        ];

        const possibleSearchKeys = [
          "Search Appearances",
          "search_appearances",
          "SearchAppearances",
          "Search Results",
          "search_results",
          "searchResults",
          "searchAppearances",
          "search_appearances_count",
        ];

        const possibleViewerKeys = [
          "Unique Viewers",
          "unique_viewers",
          "UniqueViewers",
          "Viewer Count",
          "viewer_count",
          "viewerCount",
          "uniqueViewers",
          "unique_viewers_count",
        ];

        // Check for profile views
        possibleViewKeys.forEach((key) => {
          if (key in item && item[key] !== undefined && item[key] !== null) {
            const value = parseInt(String(item[key])) || 0;
            if (value > profileViews) profileViews = value;
          }
        });

        // Check for search appearances
        possibleSearchKeys.forEach((key) => {
          if (key in item && item[key] !== undefined && item[key] !== null) {
            const value = parseInt(String(item[key])) || 0;
            if (value > searchAppearances) searchAppearances = value;
          }
        });

        // Check for unique viewers
        possibleViewerKeys.forEach((key) => {
          if (key in item && item[key] !== undefined && item[key] !== null) {
            const value = parseInt(String(item[key])) || 0;
            if (value > uniqueViewers) uniqueViewers = value;
          }
        });

        // Log all keys to debug
        console.log("Profile data item keys:", Object.keys(item));
        console.log("Profile data item values:", item);
      });

      const result = { profileViews, searchAppearances, uniqueViewers };
      console.log("Processed profile metrics:", result);

      // Cache the result
      this.setCachedData(cacheKey, result);

      return result;
    } catch (error) {
      console.error("Error fetching profile views:", error);
      // Re-throw rate limit errors so they can be handled by the UI
      if (error instanceof Error && error.message.includes("Rate Limit")) {
        throw error;
      }
      return { profileViews: 0, searchAppearances: 0, uniqueViewers: 0 };
    }
  }

  async fetchConnections(token: string) {
    try {
      console.log("Fetching connections with DMA token");

      const response = await fetch(
        "/.netlify/functions/linkedin-snapshot?domain=CONNECTIONS",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 429) {
          throw new Error(
            `LinkedIn API Rate Limit Exceeded: ${
              errorData.message ||
              "Daily limit reached. Please try again tomorrow."
            }`
          );
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Raw connections response:", data);

      // Check if LinkedIn returned an error response
      if (data.status === 429) {
        throw new Error(
          `LinkedIn API Rate Limit Exceeded: ${
            data.message || "Daily limit reached. Please try again tomorrow."
          }`
        );
      }

      // Handle different possible response structures
      let connections = [];
      if (data.elements && data.elements.length > 0) {
        connections = data.elements[0]?.snapshotData || [];
      } else if (data.snapshotData) {
        connections = data.snapshotData;
      } else if (Array.isArray(data)) {
        connections = data;
      }

      console.log("Extracted connections:", connections.length);

      // Calculate growth over time
      const last30Days = connections.filter((conn: any) => {
        const connectedDate = new Date(
          conn["Connected On"] || conn.connectedOn || conn.date || conn["Date"]
        );
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return connectedDate >= thirtyDaysAgo;
      });

      const result = {
        total: connections.length,
        monthlyGrowth: last30Days.length,
        growthRate:
          connections.length > 0
            ? ((last30Days.length / connections.length) * 100).toFixed(2)
            : "0",
        topCompanies: this.getTopItems(connections, "Company", 5),
        topPositions: this.getTopItems(connections, "Position", 5),
      };

      console.log("Processed connection metrics:", result);
      return result;
    } catch (error) {
      console.error("Error fetching connections:", error);
      // Re-throw rate limit errors so they can be handled by the UI
      if (error instanceof Error && error.message.includes("Rate Limit")) {
        throw error;
      }
      return {
        total: 0,
        monthlyGrowth: 0,
        growthRate: "0",
        topCompanies: [],
        topPositions: [],
      };
    }
  }

  async calculateEngagementMetrics(token: string) {
    try {
      console.log("Calculating engagement metrics with DMA token");

      // Get your posts first
      const postsResponse = await fetch(
        "/.netlify/functions/linkedin-snapshot?domain=MEMBER_SHARE_INFO",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!postsResponse.ok) {
        throw new Error(
          `HTTP ${postsResponse.status}: ${postsResponse.statusText}`
        );
      }

      const postsData = await postsResponse.json();
      console.log("Raw posts response:", postsData);

      // Handle different possible response structures
      let shares = [];
      if (postsData.elements && postsData.elements.length > 0) {
        shares = postsData.elements[0]?.snapshotData || [];
      } else if (postsData.snapshotData) {
        shares = postsData.snapshotData;
      } else if (Array.isArray(postsData)) {
        shares = postsData;
      }

      console.log("Extracted shares:", shares.length);

      // Get recent activity
      const changelogResponse = await fetch(
        "/.netlify/functions/linkedin-changelog?count=50",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!changelogResponse.ok) {
        throw new Error(
          `HTTP ${changelogResponse.status}: ${changelogResponse.statusText}`
        );
      }

      const changelogData = await changelogResponse.json();
      console.log("Raw changelog response:", changelogData);

      // Handle different possible response structures
      let changelogElements = [];
      if (changelogData.elements) {
        changelogElements = changelogData.elements;
      } else if (Array.isArray(changelogData)) {
        changelogElements = changelogData;
      }

      console.log("Extracted changelog elements:", changelogElements.length);

      // Map share URLs to URNs for matching
      const urlToUrnMap: Record<string, any> = {};
      shares.forEach((share: any) => {
        const url =
          share["Share URL"] || share["URL"] || share.shareUrl || share.url;
        if (url) {
          const match = url.match(/activity-(\d+)/);
          if (match) {
            urlToUrnMap[`urn:li:activity:${match[1]}`] = share;
          }
        }
      });

      // Count engagements
      let totalLikes = 0;
      let totalComments = 0;
      let totalShares = 0;

      // First, get all your posts to track engagement for
      const userPosts =
        changelogElements?.filter(
          (event: any) =>
            event.resourceName === "ugcPosts" &&
            event.method === "CREATE" &&
            event.actor === event.owner // Your own posts
        ) || [];

      console.log("Found user posts:", userPosts.length);

      // Initialize engagement tracking for your posts
      const engagementByPost: Record<string, any> = {};
      userPosts.forEach((post: any) => {
        engagementByPost[post.resourceId] = {
          likes: 0,
          comments: 0,
          shares: 0,
          postUrn: post.resourceId,
        };
      });

      // Process each event
      changelogElements?.forEach((event: any) => {
        // Likes on your posts
        if (
          event.resourceName === "socialActions/likes" &&
          event.method === "CREATE"
        ) {
          const postUrn = event.activity?.object || event.resourceId;
          if (postUrn && engagementByPost[postUrn]) {
            engagementByPost[postUrn].likes++;
            totalLikes++;
          }
        }
        // Comments on your posts
        else if (
          event.resourceName === "socialActions/comments" &&
          event.method === "CREATE"
        ) {
          const postUrn = event.activity?.object || event.resourceId;
          if (postUrn && engagementByPost[postUrn]) {
            engagementByPost[postUrn].comments++;
            totalComments++;
          }
        }
        // Shares on your posts
        else if (
          event.resourceName === "socialActions/shares" &&
          event.method === "CREATE"
        ) {
          const postUrn = event.activity?.object || event.resourceId;
          if (postUrn && engagementByPost[postUrn]) {
            engagementByPost[postUrn].shares++;
            totalShares++;
          }
        }
      });

      const totalEngagement = totalLikes + totalComments + totalShares;
      const avgPerPost =
        userPosts.length > 0
          ? (totalEngagement / userPosts.length).toFixed(2)
          : "0";

      console.log("Calculated engagement:", {
        totalLikes,
        totalComments,
        totalShares,
        totalEngagement,
        avgPerPost,
        userPosts: userPosts.length,
      });

      return {
        totalLikes,
        totalComments,
        totalShares,
        totalEngagement,
        avgPerPost,
        engagementByPost,
      };
    } catch (error) {
      console.error("Error calculating engagement metrics:", error);
      return {
        totalLikes: 0,
        totalComments: 0,
        totalShares: 0,
        totalEngagement: 0,
        avgPerPost: "0",
        engagementByPost: {},
      };
    }
  }

  async fetchActivityMetrics(token: string) {
    try {
      console.log("Fetching activity metrics with DMA token");

      // Get all activity from changelog
      const response = await fetch(
        "/.netlify/functions/linkedin-changelog?count=50",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Raw activity changelog response:", data);

      // Handle different possible response structures
      let elements = [];
      if (data.elements) {
        elements = data.elements;
      } else if (Array.isArray(data)) {
        elements = data;
      }

      console.log("Extracted activity elements:", elements.length);

      // Categorize activities
      const activities = {
        postsCreated: 0,
        commentsGiven: 0,
        likesGiven: 0,
        articlesPublished: 0,
        messagesSent: 0,
        invitationsSent: 0,
      };

      elements?.forEach((event: any) => {
        console.log(
          "Processing activity event:",
          event.resourceName,
          event.method
        );

        switch (event.resourceName) {
          case "ugcPosts":
            if (event.method === "CREATE") activities.postsCreated++;
            break;
          case "socialActions/comments":
            activities.commentsGiven++;
            break;
          case "socialActions/likes":
            activities.likesGiven++;
            break;
          case "originalArticles":
            activities.articlesPublished++;
            break;
          case "messages":
            if (event.actor === event.owner) activities.messagesSent++;
            break;
          case "invitations":
            activities.invitationsSent++;
            break;
        }
      });

      console.log("Processed activity metrics:", activities);
      return activities;
    } catch (error) {
      console.error("Error fetching activity metrics:", error);
      return {
        postsCreated: 0,
        commentsGiven: 0,
        likesGiven: 0,
        articlesPublished: 0,
        messagesSent: 0,
        invitationsSent: 0,
      };
    }
  }

  private getTopItems(data: any[], keyName: string, limit: number) {
    const items: Record<string, number> = {};

    data.forEach((item) => {
      const key = item[keyName] || item[keyName.toLowerCase()] || "Unknown";
      items[key] = (items[key] || 0) + 1;
    });

    return Object.entries(items)
      .map(([name, count]) => ({ [keyName.toLowerCase()]: name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}

// Debug function to explore all available data
export async function debugLinkedInData(token: string) {
  console.log("=== LinkedIn Data Debug ===");

  // Check Profile domain
  try {
    const profileResponse = await fetch(
      "/.netlify/functions/linkedin-snapshot?domain=PROFILE",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const profileData = await profileResponse.json();
    console.log("PROFILE Domain:", profileData);

    // List all available keys
    if (profileData.elements?.[0]?.snapshotData) {
      const allKeys = new Set<string>();
      profileData.elements[0].snapshotData.forEach((item: any) => {
        Object.keys(item).forEach((key) => allKeys.add(key));
      });
      console.log("All available profile keys:", Array.from(allKeys));
    }
  } catch (error) {
    console.error("Error debugging profile data:", error);
  }

  // Check other domains
  const domains = [
    "MEMBER_SHARE_INFO",
    "CONNECTIONS",
    "ALL_LIKES",
    "ALL_COMMENTS",
    "SKILLS",
    "POSITIONS",
  ];
  for (const domain of domains) {
    try {
      const response = await fetch(
        `/.netlify/functions/linkedin-snapshot?domain=${domain}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      console.log(`${domain} Domain:`, data);

      if (data.elements?.[0]?.snapshotData) {
        console.log(`${domain} sample data:`, data.elements[0].snapshotData[0]);
        console.log(`${domain} count:`, data.elements[0].snapshotData.length);
      }
    } catch (error) {
      console.error(`Error debugging ${domain} data:`, error);
    }
  }
}
