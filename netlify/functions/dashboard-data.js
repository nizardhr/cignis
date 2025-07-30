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
    console.error("Dashboard Data: No authorization header provided");
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
    console.log("Dashboard Data: Starting LinkedIn DMA analysis");
    const startTime = Date.now();

    // First, verify DMA consent is active
    const consentCheck = await verifyDMAConsent(authorization);
    if (!consentCheck.isActive) {
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          error: "DMA not enabled",
          message: consentCheck.message,
          needsReconnect: true
        }),
      };
    }

    // Calculate 28 days ago timestamp
    const twentyEightDaysAgo = Date.now() - (28 * 24 * 60 * 60 * 1000);

    // Fetch Member Changelog (last 28 days)
    const changelogData = await fetchMemberChangelog(authorization, twentyEightDaysAgo);
    
    // Fetch Snapshot data for baseline metrics
    const [profileSnapshot, connectionsSnapshot, postsSnapshot] = await Promise.all([
      fetchMemberSnapshot(authorization, "PROFILE"),
      fetchMemberSnapshot(authorization, "CONNECTIONS"),
      fetchMemberSnapshot(authorization, "MEMBER_SHARE_INFO")
    ]);

    const fetchTime = Date.now() - startTime;
    console.log(`Dashboard Data: Data fetching completed in ${fetchTime}ms`);

    // Process the data
    const processingStartTime = Date.now();
    
    // Parse changelog events
    const changelogEvents = changelogData?.elements || [];
    const posts = changelogEvents.filter(e => e.resourceName === "ugcPosts" && (e.method === "CREATE" || e.method === "UPDATE"));
    const likes = changelogEvents.filter(e => e.resourceName === "socialActions/likes" && e.method === "CREATE");
    const comments = changelogEvents.filter(e => e.resourceName === "socialActions/comments" && e.method === "CREATE");
    const invitations = changelogEvents.filter(e => e.resourceName === "invitations");

    console.log("Changelog analysis:", {
      totalEvents: changelogEvents.length,
      posts: posts.length,
      likes: likes.length,
      comments: comments.length,
      invitations: invitations.length
    });

    // Calculate scores
    const scores = calculateScores({
      posts,
      likes,
      comments,
      invitations,
      profileSnapshot,
      connectionsSnapshot,
      postsSnapshot
    });

    // Calculate summary metrics
    const summary = calculateSummary({
      posts,
      likes,
      comments,
      invitations,
      connectionsSnapshot
    });

    // Calculate trends
    const trends = calculateTrends(changelogEvents);

    // Calculate content types
    const content = calculateContentTypes(posts);

    const processingTime = Date.now() - processingStartTime;
    console.log(`Dashboard Data: Processing completed in ${processingTime}ms`);

    const result = {
      scores: {
        overall: calculateOverallScore(scores),
        ...scores
      },
      summary,
      trends,
      content,
      explanations: getExplanations(),
      metadata: {
        fetchTimeMs: fetchTime,
        processingTimeMs: processingTime,
        totalTimeMs: Date.now() - startTime,
        dataSource: changelogEvents.length > 0 ? "changelog" : "snapshot",
        hasRecentActivity: changelogEvents.length > 0
      },
      lastUpdated: new Date().toISOString()
    };

    console.log("Dashboard Data: Analysis complete with real metrics");

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
        timestamp: new Date().toISOString()
      }),
    };
  }
}

async function verifyDMAConsent(authorization) {
  try {
    const response = await fetch("https://api.linkedin.com/rest/memberAuthorizations?q=memberAndApplication", {
      headers: {
        Authorization: authorization,
        "LinkedIn-Version": "202312"
      }
    });

    if (!response.ok) {
      return {
        isActive: false,
        message: "Unable to verify DMA consent status"
      };
    }

    const data = await response.json();
    const hasConsent = data.elements && data.elements.length > 0;

    if (!hasConsent) {
      // Try to enable DMA consent
      try {
        const enableResponse = await fetch("https://api.linkedin.com/rest/memberAuthorizations", {
          method: "POST",
          headers: {
            Authorization: authorization,
            "LinkedIn-Version": "202312",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({})
        });

        if (enableResponse.ok) {
          return { isActive: true, message: "DMA consent enabled" };
        }
      } catch (enableError) {
        console.log("Could not auto-enable DMA consent:", enableError.message);
      }

      return {
        isActive: false,
        message: "DMA consent not active. Please reconnect your LinkedIn account with data access permissions."
      };
    }

    return { isActive: true, message: "DMA consent active" };
  } catch (error) {
    console.error("Error verifying DMA consent:", error);
    return {
      isActive: false,
      message: "Error checking DMA consent status"
    };
  }
}

async function fetchMemberChangelog(authorization, startTime) {
  try {
    const url = `https://api.linkedin.com/rest/memberChangeLogs?q=memberAndApplication&count=50&startTime=${startTime}`;
    
    const response = await fetch(url, {
      headers: {
        Authorization: authorization,
        "LinkedIn-Version": "202312"
      }
    });

    if (!response.ok) {
      console.warn(`Changelog API returned ${response.status}, falling back to snapshot data`);
      return { elements: [] };
    }

    const data = await response.json();
    console.log(`Fetched ${data.elements?.length || 0} changelog events`);
    return data;
  } catch (error) {
    console.error("Error fetching changelog:", error);
    return { elements: [] };
  }
}

async function fetchMemberSnapshot(authorization, domain) {
  try {
    const url = `https://api.linkedin.com/rest/memberSnapshotData?q=criteria&domain=${domain}`;
    
    const response = await fetch(url, {
      headers: {
        Authorization: authorization,
        "LinkedIn-Version": "202312"
      }
    });

    if (!response.ok) {
      console.warn(`Snapshot API for ${domain} returned ${response.status}`);
      return null;
    }

    const data = await response.json();
    console.log(`Fetched snapshot data for ${domain}: ${data.elements?.[0]?.snapshotData?.length || 0} items`);
    return data;
  } catch (error) {
    console.error(`Error fetching snapshot for ${domain}:`, error);
    return null;
  }
}

function calculateScores({ posts, likes, comments, invitations, profileSnapshot, connectionsSnapshot, postsSnapshot }) {
  const scores = {};

  // Profile Completeness (0-10) - from Snapshot PROFILE
  scores.profileCompleteness = calculateProfileCompleteness(profileSnapshot);

  // Posting Activity (0-10) - from Changelog ugcPosts (28 days)
  scores.postingActivity = calculatePostingActivity(posts.length);

  // Engagement Quality (0-10) - average engagement per post
  scores.engagementQuality = calculateEngagementQuality(posts.length, likes.length + comments.length);

  // Network Growth (0-10) - invitations activity (28 days)
  scores.networkGrowth = calculateNetworkGrowth(invitations.length);

  // Audience Relevance (0-10) - from Snapshot CONNECTIONS
  scores.audienceRelevance = calculateAudienceRelevance(connectionsSnapshot);

  // Content Diversity (0-10) - distinct shareMediaCategory types
  scores.contentDiversity = calculateContentDiversity(posts);

  // Engagement Rate (0-10) - total engagements / posts
  const engagementRate = posts.length > 0 ? ((likes.length + comments.length) / posts.length) * 100 : 0;
  scores.engagementRate = calculateEngagementRateScore(engagementRate);

  // Mutual Interactions (0-10) - comment exchanges
  scores.mutualInteractions = calculateMutualInteractions(comments);

  // Profile Visibility (0-10) - from Snapshot if available
  scores.profileVisibility = calculateProfileVisibility(profileSnapshot);

  // Professional Brand (0-10) - recommendations + endorsements
  scores.professionalBrand = calculateProfessionalBrand(profileSnapshot);

  return scores;
}

function calculateProfileCompleteness(profileSnapshot) {
  if (!profileSnapshot?.elements?.[0]?.snapshotData) return 2;

  const profile = profileSnapshot.elements[0].snapshotData[0] || {};
  let score = 0;
  let maxScore = 10;

  // Check key profile fields
  if (profile["First Name"] || profile.firstName) score += 1;
  if (profile["Last Name"] || profile.lastName) score += 1;
  if (profile["Headline"] || profile.headline) score += 2;
  if (profile["Summary"] || profile.summary || profile.about) score += 2;
  if (profile["Industry"] || profile.industry) score += 1;
  if (profile["Location"] || profile.location) score += 1;
  if (profile["Profile Picture"] || profile.picture) score += 1;
  if (profile["Background Image"] || profile.backgroundImage) score += 1;

  return Math.min(score, maxScore);
}

function calculatePostingActivity(postsCount) {
  // Map posts in 28 days to 0-10 scale
  if (postsCount >= 8) return 10;
  if (postsCount >= 4) return 7;
  if (postsCount > 0) return 5;
  return 2;
}

function calculateEngagementQuality(postsCount, totalEngagements) {
  if (postsCount === 0) return 2;
  
  const avgEngagement = totalEngagements / postsCount;
  if (avgEngagement >= 10) return 10;
  if (avgEngagement >= 5) return 7;
  if (avgEngagement > 0) return 5;
  return 2;
}

function calculateNetworkGrowth(invitationsCount) {
  if (invitationsCount >= 20) return 10;
  if (invitationsCount >= 10) return 7;
  if (invitationsCount > 0) return 5;
  return 2;
}

function calculateAudienceRelevance(connectionsSnapshot) {
  if (!connectionsSnapshot?.elements?.[0]?.snapshotData) return 5;

  const connections = connectionsSnapshot.elements[0].snapshotData;
  const industries = {};
  
  connections.forEach(conn => {
    const industry = conn.Industry || conn.industry || "Unknown";
    industries[industry] = (industries[industry] || 0) + 1;
  });

  const industryCount = Object.keys(industries).length;
  const totalConnections = connections.length;

  // Score based on industry diversity
  if (totalConnections === 0) return 2;
  const diversityRatio = industryCount / Math.min(totalConnections, 20); // Cap at 20 for calculation
  
  if (diversityRatio >= 0.8) return 10;
  if (diversityRatio >= 0.6) return 8;
  if (diversityRatio >= 0.4) return 6;
  if (diversityRatio >= 0.2) return 4;
  return 2;
}

function calculateContentDiversity(posts) {
  const mediaTypes = new Set();
  
  posts.forEach(post => {
    const content = post.activity?.specificContent?.["com.linkedin.ugc.ShareContent"];
    const mediaCategory = content?.shareMediaCategory || "NONE";
    mediaTypes.add(mediaCategory);
  });

  const typeCount = mediaTypes.size;
  if (typeCount >= 4) return 10;
  if (typeCount === 3) return 8;
  if (typeCount === 2) return 6;
  if (typeCount === 1) return 4;
  return 2;
}

function calculateEngagementRateScore(engagementRate) {
  if (engagementRate >= 15) return 10;
  if (engagementRate >= 10) return 8;
  if (engagementRate >= 5) return 6;
  if (engagementRate > 0) return 4;
  return 2;
}

function calculateMutualInteractions(comments) {
  // Simple heuristic: count unique commenters as proxy for interactions
  const commenters = new Set();
  comments.forEach(comment => {
    if (comment.actor) commenters.add(comment.actor);
  });

  const uniqueCommenters = commenters.size;
  if (uniqueCommenters >= 10) return 10;
  if (uniqueCommenters >= 5) return 7;
  if (uniqueCommenters > 0) return 5;
  return 2;
}

function calculateProfileVisibility(profileSnapshot) {
  if (!profileSnapshot?.elements?.[0]?.snapshotData) return null;

  const profile = profileSnapshot.elements[0].snapshotData[0] || {};
  const views = parseInt(profile["Profile Views"] || profile.profileViews || "0");
  const searches = parseInt(profile["Search Appearances"] || profile.searchAppearances || "0");

  if (views === 0 && searches === 0) return null;

  const totalVisibility = views + searches;
  if (totalVisibility >= 1000) return 10;
  if (totalVisibility >= 500) return 8;
  if (totalVisibility >= 100) return 6;
  if (totalVisibility > 0) return 4;
  return 2;
}

function calculateProfessionalBrand(profileSnapshot) {
  if (!profileSnapshot?.elements?.[0]?.snapshotData) return 5;

  const profile = profileSnapshot.elements[0].snapshotData[0] || {};
  let score = 0;

  // Check professional indicators
  if (profile["Headline"] || profile.headline) score += 3;
  if (profile["Industry"] || profile.industry) score += 2;
  if (profile["Summary"] || profile.summary) score += 2;
  if (profile["Current Position"] || profile.currentPosition) score += 3;

  return Math.min(score, 10);
}

function calculateOverallScore(scores) {
  const validScores = Object.values(scores).filter(score => score !== null && score !== undefined);
  if (validScores.length === 0) return 0;
  
  const sum = validScores.reduce((acc, score) => acc + score, 0);
  return Math.round((sum / validScores.length) * 10) / 10;
}

function calculateSummary({ posts, likes, comments, invitations, connectionsSnapshot }) {
  const totalConnections = connectionsSnapshot?.elements?.[0]?.snapshotData?.length || 0;
  const posts30d = posts.length;
  const totalEngagements = likes.length + comments.length;
  const engagementRatePct = posts30d > 0 ? Math.round((totalEngagements / posts30d) * 100) / 100 : 0;
  const newConnections28d = invitations.length;

  return {
    totalConnections,
    posts30d,
    engagementRatePct,
    newConnections28d
  };
}

function calculateTrends(changelogEvents) {
  const weeklyData = {};
  
  changelogEvents.forEach(event => {
    const date = new Date(event.capturedAt);
    const year = date.getFullYear();
    const week = getWeekNumber(date);
    const weekKey = `${year}-W${week.toString().padStart(2, '0')}`;
    
    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = { posts: 0, engagements: 0 };
    }
    
    if (event.resourceName === "ugcPosts" && (event.method === "CREATE" || event.method === "UPDATE")) {
      weeklyData[weekKey].posts++;
    } else if ((event.resourceName === "socialActions/likes" || event.resourceName === "socialActions/comments") && event.method === "CREATE") {
      weeklyData[weekKey].engagements++;
    }
  });

  return {
    weeklyPosts: Object.fromEntries(Object.entries(weeklyData).map(([week, data]) => [week, data.posts])),
    weeklyEngagements: Object.fromEntries(Object.entries(weeklyData).map(([week, data]) => [week, data.engagements]))
  };
}

function calculateContentTypes(posts) {
  const types = {};
  
  posts.forEach(post => {
    const content = post.activity?.specificContent?.["com.linkedin.ugc.ShareContent"];
    const mediaCategory = content?.shareMediaCategory || "NONE";
    types[mediaCategory] = (types[mediaCategory] || 0) + 1;
  });

  return { types };
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function getExplanations() {
  return {
    profileCompleteness: "Computed from Snapshot PROFILE fields (photo, headline, about, experience, skills, recommendations). Scoring: Complete profile (8+ fields) → 10/10; Good (6-7) → 7/10; Basic (4-5) → 5/10; Minimal → 2/10.",
    postingActivity: "Number of posts created/updated in the last 28 days (Changelog ugcPosts). Scoring: ≥8 posts → 10/10; 4-7 → 7/10; 1-3 → 5/10; 0 → 2/10.",
    engagementQuality: "Average (likes + comments) per post over last 28 days. Scoring: ≥10 avg → 10/10; 5-9 → 7/10; 1-4 → 5/10; 0 → 2/10.",
    networkGrowth: "Count of invitations activity in last 28 days; when accept status can be inferred, counts accepted. Scoring: ≥20 → 10/10; 10-19 → 7/10; 1-9 → 5/10; 0 → 2/10.",
    audienceRelevance: "Industry diversity of your connections (Snapshot CONNECTIONS). Scoring: High diversity (80%+) → 10/10; Good (60-79%) → 8/10; Moderate (40-59%) → 6/10; Low → 2/10.",
    contentDiversity: "Count of distinct shareMediaCategory types used in posts over last 28 days. Scoring: ≥4 types → 10/10; 3 → 8/10; 2 → 6/10; 1 → 4/10; 0 → 2/10.",
    engagementRate: "Total engagements divided by posts, expressed as percentage. Scoring: ≥15% → 10/10; 10-14% → 8/10; 5-9% → 6/10; 1-4% → 4/10; 0% → 2/10.",
    mutualInteractions: "Number of unique members you've exchanged comments with over last 28 days. Scoring: ≥10 → 10/10; 5-9 → 7/10; 1-4 → 5/10; 0 → 2/10.",
    profileVisibility: "If available in Snapshot domains: search appearances/impressions mapped to bands. Scoring: ≥1000 → 10/10; 500-999 → 8/10; 100-499 → 6/10; 1-99 → 4/10; 0 → 2/10. This uses Snapshot domain data (point-in-time).",
    professionalBrand: "Professional indicators from Snapshot PROFILE (headline, industry, summary, current position). Scoring: All indicators → 10/10; Most → 7/10; Some → 5/10; Few → 2/10. This uses Snapshot domain data (point-in-time)."
  };
}