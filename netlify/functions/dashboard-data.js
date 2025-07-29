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

  if (!authorization) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "No authorization token" }),
    };
  }

  try {
    console.log("Dashboard Data: Starting comprehensive analysis");

    // Fetch all required data in parallel
    const [
      profileData,
      connectionsData,
      postsData,
      changelogData,
      skillsData,
      positionsData,
      educationData,
      allCommentsData
    ] = await Promise.all([
      fetchLinkedInData(authorization, "linkedin-snapshot", "PROFILE"),
      fetchLinkedInData(authorization, "linkedin-snapshot", "CONNECTIONS"),
      fetchLinkedInData(authorization, "linkedin-snapshot", "MEMBER_SHARE_INFO"),
      fetchLinkedInData(authorization, "linkedin-changelog", null, "count=100"),
      fetchLinkedInData(authorization, "linkedin-snapshot", "SKILLS"),
      fetchLinkedInData(authorization, "linkedin-snapshot", "POSITIONS"),
      fetchLinkedInData(authorization, "linkedin-snapshot", "EDUCATION"),
      fetchLinkedInData(authorization, "linkedin-snapshot", "ALL_COMMENTS")
    ]);

    console.log("Dashboard Data: All data fetched successfully");

    // Calculate profile evaluation scores
    const profileEvaluation = calculateProfileEvaluation({
      profileData,
      connectionsData,
      postsData,
      changelogData,
      skillsData,
      positionsData,
      educationData,
      allCommentsData
    });

    // Calculate summary KPIs
    const summaryKPIs = calculateSummaryKPIs({
      connectionsData,
      postsData,
      changelogData
    });

    // Calculate mini trends
    const miniTrends = calculateMiniTrends(changelogData);

    const result = {
      profileEvaluation,
      summaryKPIs,
      miniTrends,
      lastUpdated: new Date().toISOString()
    };

    console.log("Dashboard Data: Analysis complete", result);

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
    console.error("Dashboard Data Error:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: "Failed to fetch dashboard data",
        details: error.message,
      }),
    };
  }
}

async function fetchLinkedInData(authorization, endpoint, domain = null, extraParams = "") {
  try {
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

    const response = await fetch(url, {
      headers: {
        Authorization: authorization,
        "LinkedIn-Version": "202312",
      },
    });

    if (!response.ok) {
      console.warn(`Failed to fetch ${endpoint} ${domain}: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${endpoint} ${domain}:`, error);
    return null;
  }
}

function calculateProfileEvaluation(data) {
  const {
    profileData,
    connectionsData,
    postsData,
    changelogData,
    skillsData,
    positionsData,
    educationData,
    allCommentsData
  } = data;

  console.log("Calculating profile evaluation with data:", {
    hasProfile: !!profileData,
    hasConnections: !!connectionsData,
    hasPosts: !!postsData,
    hasChangelog: !!changelogData,
    hasSkills: !!skillsData,
    hasPositions: !!positionsData,
    hasEducation: !!educationData,
    hasComments: !!allCommentsData
  });

  const scores = {};

  // 1. Profile Completeness (0-10)
  scores.profileCompleteness = calculateProfileCompleteness({
    profileData,
    skillsData,
    positionsData,
    educationData
  });

  // 2. Posting Activity (0-10)
  scores.postingActivity = calculatePostingActivity(postsData, changelogData);

  // 3. Engagement Quality (0-10)
  scores.engagementQuality = calculateEngagementQuality(changelogData);

  // 4. Network Growth (0-10)
  scores.networkGrowth = calculateNetworkGrowth(connectionsData);

  // 5. Audience Relevance (0-10)
  scores.audienceRelevance = calculateAudienceRelevance(connectionsData);

  // 6. Content Diversity (0-10)
  scores.contentDiversity = calculateContentDiversity(postsData, changelogData);

  // 7. Engagement Rate vs Followers (0-10)
  scores.engagementRate = calculateEngagementRate(postsData, changelogData, connectionsData);

  // 8. Mutual Interactions (0-10)
  scores.mutualInteractions = calculateMutualInteractions(changelogData, allCommentsData);

  // 9. Profile Visibility Signals (0-10)
  scores.profileVisibility = calculateProfileVisibility(profileData);

  // 10. Professional Brand Signals (0-10)
  scores.professionalBrand = calculateProfessionalBrand({
    profileData,
    postsData,
    positionsData
  });

  // Calculate overall score
  const overallScore = Object.values(scores).reduce((sum, score) => sum + score, 0) / 10;

  return {
    scores,
    overallScore: Math.round(overallScore * 10) / 10,
    explanations: getScoreExplanations()
  };
}

function calculateProfileCompleteness({ profileData, skillsData, positionsData, educationData }) {
  let score = 0;
  const profileSnapshot = profileData?.elements?.[0]?.snapshotData || [];
  
  // LinkedIn profile data might be an array, find the main profile entry
  const profile = profileSnapshot.find(p => p["First Name"] || p["Last Name"]) || profileSnapshot[0] || {};
  
  // Basic info (4 points)
  if (profile["First Name"]) score += 1;
  if (profile["Last Name"]) score += 1;
  if (profile["Headline"]) score += 1;
  if (profile["Industry"]) score += 1;
  
  // Skills (2 points)
  const skillsCount = skillsData?.elements?.[0]?.snapshotData?.length || 0;
  score += Math.min(skillsCount / 5, 2); // 2 points for 5+ skills
  
  // Experience (2 points)
  const positionsCount = positionsData?.elements?.[0]?.snapshotData?.length || 0;
  score += Math.min(positionsCount / 2, 2); // 2 points for 2+ positions
  
  // Education (2 points)
  const educationCount = educationData?.elements?.[0]?.snapshotData?.length || 0;
  score += Math.min(educationCount, 2); // 2 points for education entries
  
  return Math.min(Math.round(score), 10);
}

function calculatePostingActivity(postsData, changelogData) {
  const posts = changelogData?.elements?.filter(e => 
    e.resourceName === "ugcPosts" && e.method === "CREATE"
  ) || [];
  
  const last30Days = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const recentPosts = posts.filter(p => p.capturedAt >= last30Days);
  
  // Score based on posting frequency (0-10)
  if (recentPosts.length >= 20) return 10;
  if (recentPosts.length >= 15) return 8;
  if (recentPosts.length >= 10) return 6;
  if (recentPosts.length >= 5) return 4;
  if (recentPosts.length >= 1) return 2;
  return 0;
}

function calculateEngagementQuality(changelogData) {
  const elements = changelogData?.elements || [];
  
  const likes = elements.filter(e => e.resourceName === "socialActions/likes" && e.method === "CREATE");
  const comments = elements.filter(e => e.resourceName === "socialActions/comments" && e.method === "CREATE");
  const posts = elements.filter(e => e.resourceName === "ugcPosts" && e.method === "CREATE");
  
  if (posts.length === 0) return 0;
  
  const avgEngagement = (likes.length + comments.length) / posts.length;
  
  // Score based on average engagement per post
  if (avgEngagement >= 20) return 10;
  if (avgEngagement >= 15) return 8;
  if (avgEngagement >= 10) return 6;
  if (avgEngagement >= 5) return 4;
  if (avgEngagement >= 1) return 2;
  return 0;
}

function calculateNetworkGrowth(connectionsData, changelogData) {
  const connections = connectionsData?.elements?.[0]?.snapshotData || [];
  
  // Also check changelog for invitation acceptances
  const invitations = changelogData?.elements?.filter(e => 
    e.resourceName === "invitations" && e.method === "CREATE"
  ) || [];
  
  const last30Days = Date.now() - (30 * 24 * 60 * 60 * 1000);
  
  // Count recent connections from snapshot data
  const recentConnections = connections.filter(conn => {
    const connectedDate = new Date(conn["Connected On"] || conn.connectedOn);
    return connectedDate.getTime() >= last30Days;
  });
  
  // Add recent invitations from changelog
  const recentInvitations = invitations.filter(inv => inv.capturedAt >= last30Days);
  
  const totalRecentGrowth = recentConnections.length + recentInvitations.length;
  
  // Score based on recent growth
  if (totalRecentGrowth >= 50) return 10;
  if (totalRecentGrowth >= 30) return 8;
  if (totalRecentGrowth >= 20) return 6;
  if (totalRecentGrowth >= 10) return 4;
  if (totalRecentGrowth >= 5) return 2;
  return 0;
}

function calculateAudienceRelevance(connectionsData) {
  const connections = connectionsData?.elements?.[0]?.snapshotData || [];
  
  // Calculate industry diversity
  const industries = {};
  connections.forEach(conn => {
    const industry = conn.Industry || "Unknown";
    industries[industry] = (industries[industry] || 0) + 1;
  });
  
  const industryCount = Object.keys(industries).length;
  const totalConnections = connections.length;
  
  if (totalConnections === 0) return 0;
  
  // Score based on industry diversity and professional titles
  const diversityScore = Math.min(industryCount / 10, 1) * 5; // 0-5 points
  
  const professionalConnections = connections.filter(conn => 
    conn.Position && conn.Position.trim()
  ).length;
  const professionalRatio = professionalConnections / totalConnections;
  const professionalScore = professionalRatio * 5; // 0-5 points
  
  return Math.round(diversityScore + professionalScore);
}

function calculateContentDiversity(postsData, changelogData) {
  // Check both snapshot and changelog data for content types
  const snapshotPosts = postsData?.elements?.[0]?.snapshotData || [];
  const posts = changelogData?.elements?.filter(e => 
    e.resourceName === "ugcPosts" && e.method === "CREATE"
  ) || [];
  
  const totalPosts = posts.length + snapshotPosts.length;
  if (totalPosts === 0) return 0;
  
  const contentTypes = {
    text: 0,
    image: 0,
    video: 0,
    article: 0,
    external: 0
  };
  
  // Process changelog posts
  posts.forEach(post => {
    const content = post.activity?.specificContent?.["com.linkedin.ugc.ShareContent"];
    const media = content?.media;
    
    if (media && media.length > 0) {
      const mediaType = media[0].mediaType || "IMAGE";
      if (mediaType.includes("VIDEO")) {
        contentTypes.video++;
      } else {
        contentTypes.image++;
      }
    } else {
      contentTypes.text++;
    }
  });
  
  // Process snapshot posts
  snapshotPosts.forEach(post => {
    const mediaType = post["Media Type"] || post.mediaType || "TEXT";
    if (mediaType === "VIDEO") {
      contentTypes.video++;
    } else if (mediaType === "IMAGE") {
      contentTypes.image++;
    } else if (mediaType === "ARTICLE") {
      contentTypes.article++;
    } else if (post["Shared URL"] || post.sharedUrl) {
      contentTypes.external++;
    } else {
      contentTypes.text++;
    }
  });
  
  const typeCount = Object.values(contentTypes).filter(count => count > 0).length;
  
  // Score based on content type diversity
  return Math.min(typeCount * 2.5, 10);
}

function calculateEngagementRate(postsData, changelogData, connectionsData) {
  const posts = changelogData?.elements?.filter(e => 
    e.resourceName === "ugcPosts" && e.method === "CREATE"
  ) || [];
  
  const likes = changelogData?.elements?.filter(e => 
    e.resourceName === "socialActions/likes" && e.method === "CREATE"
  ) || [];
  
  const comments = changelogData?.elements?.filter(e => 
    e.resourceName === "socialActions/comments" && e.method === "CREATE"
  ) || [];
  
  const totalConnections = connectionsData?.elements?.[0]?.snapshotData?.length || 1;
  const totalEngagement = likes.length + comments.length;
  
  if (posts.length === 0) return 0;
  
  const engagementRate = (totalEngagement / posts.length / totalConnections) * 100;
  
  // Score based on engagement rate
  if (engagementRate >= 5) return 10;
  if (engagementRate >= 3) return 8;
  if (engagementRate >= 2) return 6;
  if (engagementRate >= 1) return 4;
  if (engagementRate >= 0.5) return 2;
  return 0;
}

function calculateMutualInteractions(changelogData, allCommentsData) {
  const elements = changelogData?.elements || [];
  
  // Comments given by user (from changelog)
  const myLikes = elements.filter(e => 
    e.resourceName === "socialActions/likes" && e.method === "CREATE"
  );
  const myComments = elements.filter(e => 
    e.resourceName === "socialActions/comments" && e.method === "CREATE"
  );
  
  // Comments from snapshot (ALL_COMMENTS domain)
  const snapshotComments = allCommentsData?.elements?.[0]?.snapshotData?.length || 0;
  
  const totalInteractions = myLikes.length + myComments.length + snapshotComments;
  
  // Score based on giving engagement to others
  if (totalInteractions >= 100) return 10;
  if (totalInteractions >= 75) return 8;
  if (totalInteractions >= 50) return 6;
  if (totalInteractions >= 25) return 4;
  if (totalInteractions >= 10) return 2;
  return 0;
}

function calculateProfileVisibility(profileData) {
  const profileSnapshot = profileData?.elements?.[0]?.snapshotData || [];
  const profile = profileSnapshot.find(p => p["Profile Views"] || p["Search Appearances"]) || profileSnapshot[0] || {};
  
  let score = 0;
  
  // Profile views (if available)
  const profileViews = parseInt(profile["Profile Views"] || "0");
  if (profileViews >= 1000) score += 4;
  else if (profileViews >= 500) score += 3;
  else if (profileViews >= 100) score += 2;
  else if (profileViews >= 50) score += 1;
  
  // Search appearances (if available)
  const searchAppearances = parseInt(profile["Search Appearances"] || "0");
  if (searchAppearances >= 100) score += 3;
  else if (searchAppearances >= 50) score += 2;
  else if (searchAppearances >= 10) score += 1;
  
  // Profile completeness indicators
  if (profile.Headline && profile.Headline.length > 50) score += 1;
  if (profile.Industry) score += 1;
  if (profile.Location) score += 1;
  
  return Math.min(score, 10);
}

function calculateProfessionalBrand(data) {
  const { profileData, postsData, positionsData } = data;
  const profileSnapshot = profileData?.elements?.[0]?.snapshotData || [];
  const profile = profileSnapshot.find(p => p["First Name"] || p["Last Name"]) || profileSnapshot[0] || {};
  
  let score = 0;
  
  // Professional headline
  if (profile.Headline && profile.Headline.length > 20) score += 2;
  
  // Industry specified
  if (profile.Industry) score += 2;
  
  // Work experience
  const positions = positionsData?.elements?.[0]?.snapshotData || [];
  if (positions.length >= 3) score += 2;
  else if (positions.length >= 1) score += 1;
  
  // Current position
  const currentPosition = positions.find(pos => pos["End Date"] === null || !pos["End Date"]);
  if (currentPosition) score += 2;
  
  // Professional posting (check for business-related content)
  const posts = postsData?.elements?.[0]?.snapshotData || [];
  const professionalPosts = posts.filter(post => {
    const content = post.ShareCommentary || "";
    return content.includes("business") || content.includes("professional") || 
           content.includes("industry") || content.includes("career");
  });
  
  if (professionalPosts.length / Math.max(posts.length, 1) >= 0.5) score += 2;
  
  return Math.min(score, 10);
}

function calculateSummaryKPIs(data) {
  const { connectionsData, postsData, changelogData } = data;
  
  const totalConnections = connectionsData?.elements?.[0]?.snapshotData?.length || 0;
  
  const last30Days = Date.now() - (30 * 24 * 60 * 60 * 1000);
  
  // Posts last 30 days
  const recentPosts = changelogData?.elements?.filter(e => 
    e.resourceName === "ugcPosts" && 
    e.method === "CREATE" && 
    e.capturedAt >= last30Days
  ) || [];
  
  // Connections added last 30 days
  const connections = connectionsData?.elements?.[0]?.snapshotData || [];
  const recentConnections = connections.filter(conn => {
    const connectedDate = new Date(conn["Connected On"] || conn.connectedOn);
    return connectedDate.getTime() >= last30Days;
  });
  
  // Add invitations from changelog
  const recentInvitations = changelogData?.elements?.filter(e => 
    e.resourceName === "invitations" && 
    e.method === "CREATE" && 
    e.capturedAt >= last30Days
  ) || [];
  
  // Engagement rate
  const likes = changelogData?.elements?.filter(e => 
    e.resourceName === "socialActions/likes" && e.method === "CREATE"
  ) || [];
  const comments = changelogData?.elements?.filter(e => 
    e.resourceName === "socialActions/comments" && e.method === "CREATE"
  ) || [];
  
  const totalEngagement = likes.length + comments.length;
  const engagementRate = recentPosts.length > 0 ? 
    ((totalEngagement / recentPosts.length) * 100).toFixed(1) : "0";
  
  return {
    totalConnections,
    postsLast30Days: recentPosts.length,
    engagementRate: `${engagementRate}%`,
    connectionsLast30Days: recentConnections.length + recentInvitations.length
  };
}

function calculateMiniTrends(changelogData) {
  const elements = changelogData?.elements || [];
  
  // Get last 7 days of data
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    last7Days.push({
      date: date.toLocaleDateString(),
      posts: 0,
      engagements: 0
    });
  }
  
  // Count posts and engagements by day
  elements.forEach(element => {
    const elementDate = new Date(element.capturedAt).toLocaleDateString();
    const dayData = last7Days.find(day => day.date === elementDate);
    
    if (dayData) {
      if (element.resourceName === "ugcPosts" && element.method === "CREATE") {
        dayData.posts++;
      } else if (
        (element.resourceName === "socialActions/likes" || 
         element.resourceName === "socialActions/comments") && 
        element.method === "CREATE"
      ) {
        dayData.engagements++;
      }
    }
  });
  
  return {
    posts: last7Days.map((day, index) => ({ 
      date: `Day ${index + 1}`, 
      value: day.posts 
    })),
    engagements: last7Days.map((day, index) => ({ 
      date: `Day ${index + 1}`, 
      value: day.engagements 
    }))
  };
}

function getScoreExplanations() {
  return {
    profileCompleteness: "Profile completeness based on filled fields (headline, skills, experience, education)",
    postingActivity: "Posting frequency in the last 30 days from LinkedIn changelog",
    engagementQuality: "Average engagement (likes + comments) received per post",
    networkGrowth: "New connections and invitations in the last 30 days",
    audienceRelevance: "Industry diversity and professional connection quality",
    contentDiversity: "Variety in content types (text, images, videos, articles)",
    engagementRate: "Total engagement relative to your network size",
    mutualInteractions: "Engagement you give to others (likes, comments)",
    profileVisibility: "Profile views and search appearances from LinkedIn",
    professionalBrand: "Professional signals (headline, industry, current role)"
  };
}