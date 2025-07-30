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
  const { timeRange = "30d" } = event.queryStringParameters || {};

  if (!authorization) {
    console.error("Analytics Data: No authorization header provided");
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
    console.log(`Analytics Data: Starting comprehensive analysis for ${timeRange} period`);
    const startTime = Date.now();

    // Fetch all required data
    const [
      profileData,
      connectionsData,
      postsData,
      changelogData,
      skillsData,
      positionsData
    ] = await Promise.all([
      fetchLinkedInData(authorization, "linkedin-snapshot", "PROFILE"),
      fetchLinkedInData(authorization, "linkedin-snapshot", "CONNECTIONS"),
      fetchLinkedInData(authorization, "linkedin-snapshot", "MEMBER_SHARE_INFO"),
      fetchLinkedInData(authorization, "linkedin-changelog", null, "count=500"), // Increased for better analytics
      fetchLinkedInData(authorization, "linkedin-snapshot", "SKILLS"),
      fetchLinkedInData(authorization, "linkedin-snapshot", "POSITIONS")
    ]);

    const fetchTime = Date.now() - startTime;
    console.log(`Analytics Data: All data fetched successfully in ${fetchTime}ms`);

    // Enhanced data quality logging
    console.log("Analytics Data: Comprehensive data summary:", {
      profile: profileData?.elements?.length || 0,
      connections: connectionsData?.elements?.[0]?.snapshotData?.length || 0,
      posts: postsData?.elements?.[0]?.snapshotData?.length || 0,
      changelog: changelogData?.elements?.length || 0,
      skills: skillsData?.elements?.[0]?.snapshotData?.length || 0,
      positions: positionsData?.elements?.[0]?.snapshotData?.length || 0,
      timeRange,
      fetchTimeMs: fetchTime
    });

    const processingStartTime = Date.now();

    // Calculate detailed analytics
    const analytics = {
      postsEngagementsTrend: calculatePostsEngagementsTrend(changelogData, timeRange),
      connectionsGrowth: calculateConnectionsGrowth(connectionsData, timeRange),
      postTypesBreakdown: calculatePostTypesBreakdown(changelogData),
      topHashtags: calculateTopHashtags(postsData, changelogData),
      engagementPerPost: calculateEngagementPerPost(changelogData),
      messagesSentReceived: calculateMessagesSentReceived(changelogData),
      audienceDistribution: calculateAudienceDistribution(connectionsData),
      scoreImpacts: getScoreImpacts(),
      timeRange,
      lastUpdated: new Date().toISOString(),
      metadata: {
        fetchTimeMs: fetchTime,
        processingTimeMs: Date.now() - processingStartTime,
        totalTimeMs: Date.now() - startTime,
        dataQuality: calculateAnalyticsDataQuality({
          profileData,
          connectionsData,
          postsData,
          changelogData,
          skillsData,
          positionsData
        }),
        recordCounts: {
          profileRecords: profileData?.elements?.length || 0,
          connectionRecords: connectionsData?.elements?.[0]?.snapshotData?.length || 0,
          postRecords: postsData?.elements?.[0]?.snapshotData?.length || 0,
          changelogRecords: changelogData?.elements?.length || 0,
          skillRecords: skillsData?.elements?.[0]?.snapshotData?.length || 0,
          positionRecords: positionsData?.elements?.[0]?.snapshotData?.length || 0
        }
      }
    };

    console.log(`Analytics Data: Comprehensive analysis complete in ${Date.now() - startTime}ms`);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
      body: JSON.stringify(analytics),
    };
  } catch (error) {
    console.error("Analytics Data Error:", error);
    console.error("Analytics Data Error Stack:", error.stack);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: "Failed to fetch analytics data",
        details: error.message,
        timestamp: new Date().toISOString()
      }),
    };
  }
}

async function fetchLinkedInData(authorization, endpoint, domain = null, extraParams = "") {
  try {
    const startTime = Date.now();
    let url = `/.netlify/functions/${endpoint}`;
    const params = new URLSearchParams();
    
    if (domain) {
      params.append("domain", domain);
    }
    
    if (extraParams) {
      const extraParamsObj = new URLSearchParams(extraParams);
      for (const [key, value] of extraParamsObj) {
        params.append(key, value);
      }
    }
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    console.log(`Analytics: Fetching ${endpoint}${domain ? ` (${domain})` : ''}`);

    const response = await fetch(url, {
      headers: {
        Authorization: authorization,
        "LinkedIn-Version": "202312",
      },
    });

    const fetchTime = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details');
      console.warn(`Failed to fetch ${endpoint} ${domain}: ${response.status} ${response.statusText} (${fetchTime}ms)`, errorText);
      return null;
    }

    const data = await response.json();
    console.log(`Analytics: Successfully fetched ${endpoint}${domain ? ` (${domain})` : ''} in ${fetchTime}ms`);
    return data;
  } catch (error) {
    console.error(`Analytics: Network error fetching ${endpoint} ${domain}:`, error.message);
    return null;
  }
}

function calculateAnalyticsDataQuality(data) {
  const {
    profileData,
    connectionsData,
    postsData,
    changelogData,
    skillsData,
    positionsData
  } = data;

  let qualityScore = 0;
  let maxScore = 6;

  // Check data availability and quality
  if (profileData?.elements?.length) qualityScore += 1;
  if (connectionsData?.elements?.[0]?.snapshotData?.length >= 10) qualityScore += 1; // At least 10 connections
  if (postsData?.elements?.[0]?.snapshotData?.length >= 1) qualityScore += 1; // At least 1 post
  if (changelogData?.elements?.length >= 10) qualityScore += 1; // At least 10 changelog entries
  if (skillsData?.elements?.[0]?.snapshotData?.length >= 3) qualityScore += 1; // At least 3 skills
  if (positionsData?.elements?.[0]?.snapshotData?.length >= 1) qualityScore += 1; // At least 1 position

  return {
    score: Math.round((qualityScore / maxScore) * 100),
    breakdown: {
      hasProfile: !!profileData?.elements?.length,
      hasConnections: !!(connectionsData?.elements?.[0]?.snapshotData?.length >= 10),
      hasPosts: !!(postsData?.elements?.[0]?.snapshotData?.length >= 1),
      hasChangelog: !!(changelogData?.elements?.length >= 10),
      hasSkills: !!(skillsData?.elements?.[0]?.snapshotData?.length >= 3),
      hasPositions: !!(positionsData?.elements?.[0]?.snapshotData?.length >= 1)
    }
  };
}

function calculatePostsEngagementsTrend(changelogData, timeRange) {
  console.log("=== ENHANCED POSTS ENGAGEMENT TREND CALCULATION ===");
  
  const elements = changelogData?.elements || [];
  console.log(`Processing ${elements.length} changelog elements for ${timeRange} period`);
  
  // Determine date range
  const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
  const dateRange = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dateRange.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      fullDate: date.toISOString().split('T')[0],
      posts: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      totalEngagement: 0
    });
  }
  
  console.log(`Created date range for ${days} days:`, dateRange.map(d => d.date));
  
  // Count activities by date
  elements.forEach(element => {
    const elementDate = new Date(element.capturedAt);
    const elementDateStr = elementDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const dayData = dateRange.find(day => day.date === elementDateStr);
    
    if (dayData) {
      if (element.resourceName === "ugcPosts" && element.method === "CREATE") {
        dayData.posts++;
      } else if (element.resourceName === "socialActions/likes" && element.method === "CREATE") {
        dayData.likes++;
      } else if (element.resourceName === "socialActions/comments" && element.method === "CREATE") {
        dayData.comments++;
      } else if (element.resourceName === "socialActions/shares" && element.method === "CREATE") {
        dayData.shares++;
      }
    }
  });
  
  // Calculate total engagement and return enhanced data
  const result = dateRange.map(day => ({
    date: day.date,
    posts: day.posts,
    likes: day.likes,
    comments: day.comments,
    shares: day.shares,
    totalEngagement: day.likes + day.comments + day.shares
  }));
  
  const totalPosts = result.reduce((sum, day) => sum + day.posts, 0);
  const totalEngagement = result.reduce((sum, day) => sum + day.totalEngagement, 0);
  
  console.log(`Posts engagement trend: ${totalPosts} posts, ${totalEngagement} total engagement over ${days} days`);
  
  return result;
}

function calculateConnectionsGrowth(connectionsData, timeRange) {
  const connections = connectionsData?.elements?.[0]?.snapshotData || [];
  
  // Sort connections by date
  const sortedConnections = connections
    .filter(conn => conn["Connected On"] || conn.connectedOn)
    .sort((a, b) => {
      const dateA = new Date(a["Connected On"] || a.connectedOn);
      const dateB = new Date(b["Connected On"] || b.connectedOn);
      return dateA.getTime() - dateB.getTime();
    });

  const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
  const growthData = [];
  let cumulativeCount = 0;
  
  // Calculate cumulative growth
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toLocaleDateString();
    const connectionsOnDate = sortedConnections.filter(conn => {
      const connDate = new Date(conn["Connected On"] || conn.connectedOn);
      return connDate.toLocaleDateString() === dateStr;
    }).length;
    
    cumulativeCount += connectionsOnDate;
    
    growthData.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      totalConnections: cumulativeCount,
      newConnections: connectionsOnDate
    });
  }
  
  return growthData;
}

function calculatePostTypesBreakdown(changelogData) {
  const posts = changelogData?.elements?.filter(e => 
    e.resourceName === "ugcPosts" && e.method === "CREATE"
  ) || [];
  
  const typeCounts = {
    "Text Only": 0,
    "Image": 0,
    "Video": 0,
    "Article": 0,
    "External Link": 0
  };
  
  posts.forEach(post => {
    const content = post.activity?.specificContent?.["com.linkedin.ugc.ShareContent"];
    const media = content?.media;
    
    if (media && media.length > 0) {
      const mediaType = media[0].mediaType || "IMAGE";
      if (mediaType.includes("VIDEO")) {
        typeCounts["Video"]++;
      } else if (mediaType.includes("IMAGE")) {
        typeCounts["Image"]++;
      } else {
        typeCounts["External Link"]++;
      }
    } else if (content?.shareCommentary?.text?.includes("http")) {
      typeCounts["External Link"]++;
    } else {
      typeCounts["Text Only"]++;
    }
  });
  
  return Object.entries(typeCounts)
    .filter(([_, count]) => count > 0)
    .map(([name, value]) => ({ name, value }));
}

function calculateTopHashtags(postsData, changelogData) {
  const hashtagCounts = {};
  
  // Extract hashtags from snapshot data
  const snapshotPosts = postsData?.elements?.[0]?.snapshotData || [];
  snapshotPosts.forEach(post => {
    const content = post.ShareCommentary || "";
    const hashtags = content.match(/#[\w]+/g) || [];
    hashtags.forEach(hashtag => {
      hashtagCounts[hashtag] = (hashtagCounts[hashtag] || 0) + 1;
    });
  });
  
  // Extract hashtags from changelog data
  const changelogPosts = changelogData?.elements?.filter(e => 
    e.resourceName === "ugcPosts" && e.method === "CREATE"
  ) || [];
  
  changelogPosts.forEach(post => {
    const content = post.activity?.specificContent?.["com.linkedin.ugc.ShareContent"]?.shareCommentary?.text || "";
    const hashtags = content.match(/#[\w]+/g) || [];
    hashtags.forEach(hashtag => {
      hashtagCounts[hashtag] = (hashtagCounts[hashtag] || 0) + 1;
    });
  });
  
  return Object.entries(hashtagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([hashtag, count]) => ({ hashtag, count }));
}

function calculateEngagementPerPost(changelogData) {
  const elements = changelogData?.elements || [];
  
  // Get user posts
  const userPosts = elements.filter(e => 
    e.resourceName === "ugcPosts" && e.method === "CREATE"
  );
  
  // Build engagement map
  const engagementMap = {};
  userPosts.forEach(post => {
    engagementMap[post.resourceId] = {
      postId: post.resourceId,
      content: post.activity?.specificContent?.["com.linkedin.ugc.ShareContent"]?.shareCommentary?.text || "Post content",
      likes: 0,
      comments: 0,
      shares: 0,
      createdAt: post.capturedAt
    };
  });
  
  // Count engagements
  elements.forEach(element => {
    const postId = element.activity?.object;
    if (postId && engagementMap[postId]) {
      if (element.resourceName === "socialActions/likes" && element.method === "CREATE") {
        engagementMap[postId].likes++;
      } else if (element.resourceName === "socialActions/comments" && element.method === "CREATE") {
        engagementMap[postId].comments++;
      } else if (element.resourceName === "socialActions/shares" && element.method === "CREATE") {
        engagementMap[postId].shares++;
      }
    }
  });
  
  // Return top 10 posts by total engagement
  return Object.values(engagementMap)
    .map(post => ({
      ...post,
      totalEngagement: post.likes + post.comments + post.shares,
      content: post.content.substring(0, 50) + (post.content.length > 50 ? "..." : "")
    }))
    .sort((a, b) => b.totalEngagement - a.totalEngagement)
    .slice(0, 10);
}

function calculateMessagesSentReceived(changelogData) {
  const elements = changelogData?.elements || [];
  const currentUserId = elements.find(e => e.owner)?.owner;
  
  // Get last 30 days
  const last30Days = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const dateRange = [];
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dateRange.push({
      date: date.toLocaleDateString(),
      sent: 0,
      received: 0
    });
  }
  
  // Count messages
  elements
    .filter(e => e.resourceName === "messages" && e.capturedAt >= last30Days)
    .forEach(message => {
      const messageDate = new Date(message.capturedAt).toLocaleDateString();
      const dayData = dateRange.find(day => day.date === messageDate);
      
      if (dayData) {
        if (message.actor === currentUserId) {
          dayData.sent++;
        } else {
          dayData.received++;
        }
      }
    });
  
  return dateRange.map(day => ({
    date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    sent: day.sent,
    received: day.received
  }));
}

function calculateAudienceDistribution(connectionsData) {
  const connections = connectionsData?.elements?.[0]?.snapshotData || [];
  
  // Industry distribution
  const industries = {};
  const positions = {};
  const locations = {};
  
  connections.forEach(conn => {
    // Industry
    const industry = conn.Industry || "Unknown";
    industries[industry] = (industries[industry] || 0) + 1;
    
    // Position/Seniority
    const position = conn.Position || "Unknown";
    positions[position] = (positions[position] || 0) + 1;
    
    // Location
    const location = conn.Location || "Unknown";
    locations[location] = (locations[location] || 0) + 1;
  });
  
  return {
    industries: Object.entries(industries)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, value]) => ({ name, value })),
    
    positions: Object.entries(positions)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, value]) => ({ name, value })),
    
    locations: Object.entries(locations)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }))
  };
}

function getScoreImpacts() {
  return {
    profileCompleteness: {
      description: "A complete profile increases visibility and credibility",
      impact: "Affects profile visibility and professional brand scores",
      tips: ["Add a professional headline", "Complete work experience", "Add relevant skills"]
    },
    postingActivity: {
      description: "Regular posting keeps you visible in your network's feed",
      impact: "Directly affects engagement quality and professional brand",
      tips: ["Post 3-5 times per week", "Share industry insights", "Engage with others' content"]
    },
    engagementQuality: {
      description: "High engagement indicates valuable content and strong network",
      impact: "Influences audience relevance and mutual interactions",
      tips: ["Ask questions in posts", "Share personal experiences", "Respond to comments quickly"]
    },
    networkGrowth: {
      description: "Growing your network expands your reach and opportunities",
      impact: "Affects audience relevance and engagement rate calculations",
      tips: ["Connect with industry peers", "Attend virtual events", "Engage before connecting"]
    },
    audienceRelevance: {
      description: "A relevant audience is more likely to engage with your content",
      impact: "Improves engagement rate and professional brand perception",
      tips: ["Connect with industry professionals", "Join relevant groups", "Share industry-specific content"]
    },
    contentDiversity: {
      description: "Varied content types keep your audience engaged",
      impact: "Enhances engagement quality and professional brand",
      tips: ["Mix text, images, and videos", "Share articles and insights", "Use polls and questions"]
    },
    engagementRate: {
      description: "High engagement relative to network size shows content quality",
      impact: "Key metric for LinkedIn algorithm and visibility",
      tips: ["Post when audience is active", "Create conversation-starting content", "Use relevant hashtags"]
    },
    mutualInteractions: {
      description: "Engaging with others builds relationships and visibility",
      impact: "Improves network growth and audience relevance",
      tips: ["Like and comment on others' posts", "Share valuable content", "Start conversations"]
    },
    profileVisibility: {
      description: "High visibility indicates strong personal brand",
      impact: "Affects all other scores through increased exposure",
      tips: ["Optimize profile for search", "Use keywords in headline", "Stay active and consistent"]
    },
    professionalBrand: {
      description: "Strong professional brand attracts the right opportunities",
      impact: "Influences all engagement and growth metrics",
      tips: ["Define your expertise area", "Share thought leadership", "Maintain consistent messaging"]
    }
  };
}