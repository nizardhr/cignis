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
    console.log("Dashboard Data: Starting LinkedIn DMA analysis with person post filtering");
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

    // Calculate 28 days ago timestamp (DMA constraint: Changelog only covers last 28 days)
    const twentyEightDaysAgo = Date.now() - (28 * 24 * 60 * 60 * 1000);

    // Fetch Member Changelog (last 28 days) - count clamped to 1-50 per DMA requirements
    const changelogData = await fetchMemberChangelog(authorization, twentyEightDaysAgo, 50);
    
    // Fetch Snapshot data for baseline metrics (fallback when Changelog is empty)
    const [profileSnapshot, connectionsSnapshot, postsSnapshot] = await Promise.all([
      fetchMemberSnapshot(authorization, "PROFILE"),
      fetchMemberSnapshot(authorization, "CONNECTIONS"),
      fetchMemberSnapshot(authorization, "MEMBER_SHARE_INFO")
    ]);

    const fetchTime = Date.now() - startTime;
    console.log(`Dashboard Data: Data fetching completed in ${fetchTime}ms`);

    // Process the data with person post filtering
    const processingStartTime = Date.now();
    
    // Parse changelog events
    const changelogEvents = changelogData?.elements || [];
    console.log(`Dashboard Data: Processing ${changelogEvents.length} changelog events`);

    // CRITICAL: Filter to person posts only and exclude deleted posts
    const allPosts = changelogEvents.filter(e => e.resourceName === "ugcPosts");
    console.log(`Dashboard Data: Found ${allPosts.length} total ugcPosts events`);

    const personPosts = allPosts.filter(post => {
      // Exclude DELETE method (deleted objects don't carry content per PDF)
      if (post.method === "DELETE") {
        console.log("Excluding DELETE post:", post.resourceId);
        return false;
      }

      // Check for deleted lifecycle state
      const lifecycleState = post.processedActivity?.lifecycleState || post.activity?.lifecycleState;
      if (lifecycleState === "DELETED" || lifecycleState === "REMOVED") {
        console.log("Excluding deleted lifecycle post:", post.resourceId);
        return false;
      }

      // Require author to be a person (urn:li:person:), not organization
      const author = post.processedActivity?.author || post.activity?.author || post.owner;
      const isPersonPost = author && typeof author === 'string' && author.startsWith('urn:li:person:');
      
      if (!isPersonPost) {
        console.log("Excluding non-person post:", post.resourceId, "author:", author);
        return false;
      }

      console.log("Including person post:", post.resourceId, "author:", author);
      return true;
    });

    console.log(`Dashboard Data: Filtered to ${personPosts.length} person-authored, non-deleted posts`);

    // Create set of person post URNs for engagement filtering
    const personPostUrns = new Set(personPosts.map(p => {
      // Use activity.id first, then resourceId as fallback
      return p.activity?.id || p.resourceId;
    }));

    console.log("Dashboard Data: Person post URNs:", Array.from(personPostUrns));

    // Filter engagements to only those on person posts
    const allLikes = changelogEvents.filter(e => e.resourceName === "socialActions/likes" && e.method === "CREATE");
    const allComments = changelogEvents.filter(e => e.resourceName === "socialActions/comments" && e.method === "CREATE");

    const personPostLikes = allLikes.filter(like => {
      const targetPost = like.activity?.object;
      const isOnPersonPost = personPostUrns.has(targetPost);
      if (isOnPersonPost) {
        console.log("Including like on person post:", targetPost);
      }
      return isOnPersonPost;
    });

    const personPostComments = allComments.filter(comment => {
      const targetPost = comment.activity?.object;
      const isOnPersonPost = personPostUrns.has(targetPost);
      if (isOnPersonPost) {
        console.log("Including comment on person post:", targetPost);
      }
      return isOnPersonPost;
    });

    console.log(`Dashboard Data: Filtered engagements - Likes: ${personPostLikes.length}/${allLikes.length}, Comments: ${personPostComments.length}/${allComments.length}`);

    // Get invitations for network growth
    const invitations = changelogEvents.filter(e => e.resourceName === "invitations");

    console.log("Dashboard Data: Filtered event counts:", {
      personPosts: personPosts.length,
      personPostLikes: personPostLikes.length,
      personPostComments: personPostComments.length,
      invitations: invitations.length
    });

    // Calculate scores with methodology tracking
    const { scores, methodology } = calculateScoresWithMethodology({
      personPosts,
      personPostLikes,
      personPostComments,
      invitations,
      profileSnapshot,
      connectionsSnapshot,
      postsSnapshot
    });

    // Calculate summary metrics
    const summary = calculateSummary({
      personPosts,
      personPostLikes,
      personPostComments,
      invitations,
      connectionsSnapshot
    });

    // Calculate trends from person posts only
    const trends = calculateTrends(personPosts, personPostLikes, personPostComments);

    // Calculate content types from person posts only
    const content = calculateContentTypes(personPosts);

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
      methodology, // NEW: formulas and inputs for hover tooltips
      metadata: {
        fetchTimeMs: fetchTime,
        processingTimeMs: processingTime,
        totalTimeMs: Date.now() - startTime,
        dataSource: changelogEvents.length > 0 ? "changelog" : "snapshot",
        hasRecentActivity: personPosts.length > 0,
        personPostsCount: personPosts.length,
        totalPostsCount: allPosts.length,
        filteredEngagements: {
          likes: personPostLikes.length,
          comments: personPostComments.length,
          total: personPostLikes.length + personPostComments.length
        }
      },
      lastUpdated: new Date().toISOString()
    };

    console.log("Dashboard Data: Analysis complete with person post filtering");

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

async function fetchMemberChangelog(authorization, startTime, count = 50) {
  try {
    // Clamp count to valid range [1..50] per DMA requirements
    const validCount = Math.max(1, Math.min(50, count));
    const url = `https://api.linkedin.com/rest/memberChangeLogs?q=memberAndApplication&count=${validCount}&startTime=${startTime}`;
    
    console.log(`Dashboard Data: Fetching changelog with count=${validCount}, startTime=${startTime}`);
    
    const response = await fetch(url, {
      headers: {
        Authorization: authorization,
        "LinkedIn-Version": "202312" // Required for versioned REST API
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

function calculateScoresWithMethodology({ personPosts, personPostLikes, personPostComments, invitations, profileSnapshot, connectionsSnapshot, postsSnapshot }) {
  const scores = {};
  const methodology = {};

  // Profile Completeness (0-10) - from Snapshot PROFILE
  const profileResult = calculateProfileCompleteness(profileSnapshot);
  scores.profileCompleteness = profileResult.score;
  methodology.profileCompleteness = profileResult.methodology;

  // Posting Activity (0-10) - from filtered person posts (28 days)
  const postingResult = calculatePostingActivity(personPosts.length);
  scores.postingActivity = postingResult.score;
  methodology.postingActivity = postingResult.methodology;

  // Engagement Quality (0-10) - average engagement per person post
  const engagementResult = calculateEngagementQuality(personPosts.length, personPostLikes.length + personPostComments.length);
  scores.engagementQuality = engagementResult.score;
  methodology.engagementQuality = engagementResult.methodology;

  // Network Growth (0-10) - invitations activity (28 days)
  const networkResult = calculateNetworkGrowth(invitations.length);
  scores.networkGrowth = networkResult.score;
  methodology.networkGrowth = networkResult.methodology;

  // Audience Relevance (0-10) - from Snapshot CONNECTIONS
  const audienceResult = calculateAudienceRelevance(connectionsSnapshot);
  scores.audienceRelevance = audienceResult.score;
  methodology.audienceRelevance = audienceResult.methodology;

  // Content Diversity (0-10) - distinct shareMediaCategory types from person posts
  const diversityResult = calculateContentDiversity(personPosts);
  scores.contentDiversity = diversityResult.score;
  methodology.contentDiversity = diversityResult.methodology;

  // Engagement Rate (0-10) - total engagements on person posts / person posts
  const engagementRate = personPosts.length > 0 ? ((personPostLikes.length + personPostComments.length) / personPosts.length) * 100 : 0;
  const rateResult = calculateEngagementRateScore(engagementRate, personPostLikes.length + personPostComments.length, personPosts.length);
  scores.engagementRate = rateResult.score;
  methodology.engagementRate = rateResult.methodology;

  // Mutual Interactions (0-10) - comment exchanges
  const mutualResult = calculateMutualInteractions(personPostComments);
  scores.mutualInteractions = mutualResult.score;
  methodology.mutualInteractions = mutualResult.methodology;

  // Profile Visibility (0-10) - from Snapshot if available
  const visibilityResult = calculateProfileVisibility(profileSnapshot);
  scores.profileVisibility = visibilityResult.score;
  methodology.profileVisibility = visibilityResult.methodology;

  // Professional Brand (0-10) - recommendations + endorsements
  const brandResult = calculateProfessionalBrand(profileSnapshot);
  scores.professionalBrand = brandResult.score;
  methodology.professionalBrand = brandResult.methodology;

  return { scores, methodology };
}

function calculateProfileCompleteness(profileSnapshot) {
  if (!profileSnapshot?.elements?.[0]?.snapshotData) {
    return {
      score: null,
      methodology: {
        formula: "Profile completeness from Snapshot PROFILE domain",
        inputs: { error: "No profile snapshot data available" },
        note: "This uses Snapshot domain data (point-in-time)"
      }
    };
  }

  const profile = profileSnapshot.elements[0].snapshotData[0] || {};
  const fields = {
    firstName: !!(profile["First Name"] || profile.firstName),
    lastName: !!(profile["Last Name"] || profile.lastName),
    headline: !!(profile["Headline"] || profile.headline),
    summary: !!(profile["Summary"] || profile.summary || profile.about),
    industry: !!(profile["Industry"] || profile.industry),
    location: !!(profile["Location"] || profile.location),
    picture: !!(profile["Profile Picture"] || profile.picture),
    background: !!(profile["Background Image"] || profile.backgroundImage)
  };

  const filledFields = Object.values(fields).filter(Boolean).length;
  const totalFields = Object.keys(fields).length;
  const completionPct = (filledFields / totalFields) * 100;
  const score = Math.round((completionPct / 100) * 10);

  return {
    score: Math.min(score, 10),
    methodology: {
      formula: "Profile completeness = (Filled fields / Total fields) * 10",
      inputs: {
        filledFields,
        totalFields,
        completionPct: Math.round(completionPct),
        fieldsStatus: fields
      },
      note: "This uses Snapshot PROFILE domain data (point-in-time)"
    }
  };
}

function calculatePostingActivity(postsCount) {
  let score;
  if (postsCount >= 8) score = 10;
  else if (postsCount >= 4) score = 7;
  else if (postsCount > 0) score = 5;
  else score = 2;

  return {
    score,
    methodology: {
      formula: "Posts(28d) = COUNT(person ugcPosts where method != DELETE)",
      inputs: {
        postCount28d: postsCount,
        scoringBand: postsCount >= 8 ? "≥8 posts" : postsCount >= 4 ? "4-7 posts" : postsCount > 0 ? "1-3 posts" : "0 posts"
      }
    }
  };
}

function calculateEngagementQuality(postsCount, totalEngagements) {
  if (postsCount === 0) {
    return {
      score: 2,
      methodology: {
        formula: "Avg engagements per post = (Likes_on_person_posts + Comments_on_person_posts) / Person_posts_count",
        inputs: {
          likes: 0,
          comments: 0,
          posts: 0,
          avg: 0,
          note: "No person posts to calculate engagement"
        }
      }
    };
  }
  
  const avgEngagement = totalEngagements / postsCount;
  let score;
  if (avgEngagement >= 10) score = 10;
  else if (avgEngagement >= 5) score = 7;
  else if (avgEngagement > 0) score = 5;
  else score = 2;

  return {
    score,
    methodology: {
      formula: "Avg engagements per post = (Likes_on_person_posts + Comments_on_person_posts) / Person_posts_count",
      inputs: {
        totalEngagements,
        posts: postsCount,
        avg: Math.round(avgEngagement * 100) / 100
      }
    }
  };
}

function calculateNetworkGrowth(invitationsCount) {
  let score;
  if (invitationsCount >= 20) score = 10;
  else if (invitationsCount >= 10) score = 7;
  else if (invitationsCount > 0) score = 5;
  else score = 2;

  return {
    score,
    methodology: {
      formula: "Invitations activity events (28d) from changelog",
      inputs: {
        invitationEvents: invitationsCount,
        scoringBand: invitationsCount >= 20 ? "≥20 events" : invitationsCount >= 10 ? "10-19 events" : invitationsCount > 0 ? "1-9 events" : "0 events"
      }
    }
  };
}

function calculateAudienceRelevance(connectionsSnapshot) {
  if (!connectionsSnapshot?.elements?.[0]?.snapshotData) {
    return {
      score: null,
      methodology: {
        formula: "Industry diversity from Snapshot CONNECTIONS domain",
        inputs: { error: "No connections snapshot data available" },
        note: "This uses Snapshot domain data (point-in-time)"
      }
    };
  }

  const connections = connectionsSnapshot.elements[0].snapshotData;
  const industries = {};
  
  connections.forEach(conn => {
    const industry = conn.Industry || conn.industry || "Unknown";
    industries[industry] = (industries[industry] || 0) + 1;
  });

  const industryCount = Object.keys(industries).length;
  const totalConnections = connections.length;

  if (totalConnections === 0) {
    return {
      score: 2,
      methodology: {
        formula: "Industry diversity = Unique_industries / Total_connections",
        inputs: {
          uniqueIndustries: 0,
          totalConnections: 0,
          diversityRatio: 0
        },
        note: "This uses Snapshot CONNECTIONS domain data (point-in-time)"
      }
    };
  }

  const diversityRatio = industryCount / Math.min(totalConnections, 20); // Cap at 20 for calculation
  
  let score;
  if (diversityRatio >= 0.8) score = 10;
  else if (diversityRatio >= 0.6) score = 8;
  else if (diversityRatio >= 0.4) score = 6;
  else if (diversityRatio >= 0.2) score = 4;
  else score = 2;

  return {
    score,
    methodology: {
      formula: "Industry diversity = Unique_industries / min(Total_connections, 20)",
      inputs: {
        uniqueIndustries: industryCount,
        totalConnections,
        diversityRatio: Math.round(diversityRatio * 100) / 100,
        topIndustries: Object.entries(industries).sort(([,a], [,b]) => b - a).slice(0, 5)
      },
      note: "This uses Snapshot CONNECTIONS domain data (point-in-time)"
    }
  };
}

function calculateContentDiversity(personPosts) {
  const mediaTypes = new Set();
  const typeBreakdown = {};
  
  personPosts.forEach(post => {
    const content = post.activity?.specificContent?.["com.linkedin.ugc.ShareContent"];
    const mediaCategory = content?.shareMediaCategory || "NONE";
    mediaTypes.add(mediaCategory);
    typeBreakdown[mediaCategory] = (typeBreakdown[mediaCategory] || 0) + 1;
  });

  const typeCount = mediaTypes.size;
  let score;
  if (typeCount >= 4) score = 10;
  else if (typeCount === 3) score = 8;
  else if (typeCount === 2) score = 6;
  else if (typeCount === 1) score = 4;
  else score = 2;

  return {
    score,
    methodology: {
      formula: "Distinct shareMediaCategory across person posts",
      inputs: {
        typesUsed: Array.from(mediaTypes),
        distinctCount: typeCount,
        typeBreakdown
      }
    }
  };
}

function calculateEngagementRateScore(engagementRate, totalEngagements, postsCount) {
  let score;
  if (engagementRate >= 15) score = 10;
  else if (engagementRate >= 10) score = 8;
  else if (engagementRate >= 5) score = 6;
  else if (engagementRate > 0) score = 4;
  else score = 2;

  return {
    score,
    methodology: {
      formula: "Engagement rate (%) = (Total engagements on person posts / max(Person posts,1)) * 100",
      inputs: {
        engagements: totalEngagements,
        posts: postsCount,
        ratePct: Math.round(engagementRate * 100) / 100
      }
    }
  };
}

function calculateMutualInteractions(personPostComments) {
  // Simple heuristic: count unique commenters as proxy for interactions
  const commenters = new Set();
  personPostComments.forEach(comment => {
    if (comment.actor) commenters.add(comment.actor);
  });

  const uniqueCommenters = commenters.size;
  let score;
  if (uniqueCommenters >= 10) score = 10;
  else if (uniqueCommenters >= 5) score = 7;
  else if (uniqueCommenters > 0) score = 5;
  else score = 2;

  return {
    score,
    methodology: {
      formula: "Unique commenters on person posts (proxy for mutual interactions)",
      inputs: {
        totalComments: personPostComments.length,
        uniqueCommenters,
        commenters: Array.from(commenters).slice(0, 5) // Show first 5 for reference
      }
    }
  };
}

function calculateProfileVisibility(profileSnapshot) {
  if (!profileSnapshot?.elements?.[0]?.snapshotData) {
    return {
      score: null,
      methodology: {
        formula: "Profile visibility from Snapshot PROFILE domain",
        inputs: { error: "No profile snapshot data available" },
        note: "This uses Snapshot domain data (point-in-time). Not available in current Snapshot domains."
      }
    };
  }

  const profile = profileSnapshot.elements[0].snapshotData[0] || {};
  const views = parseInt(profile["Profile Views"] || profile.profileViews || "0");
  const searches = parseInt(profile["Search Appearances"] || profile.searchAppearances || "0");

  if (views === 0 && searches === 0) {
    return {
      score: null,
      methodology: {
        formula: "Profile visibility = Profile_views + Search_appearances",
        inputs: {
          profileViews: views,
          searchAppearances: searches,
          totalVisibility: 0,
          note: "No visibility data available in profile snapshot"
        },
        note: "This uses Snapshot domain data (point-in-time)"
      }
    };
  }

  const totalVisibility = views + searches;
  let score;
  if (totalVisibility >= 1000) score = 10;
  else if (totalVisibility >= 500) score = 8;
  else if (totalVisibility >= 100) score = 6;
  else if (totalVisibility > 0) score = 4;
  else score = 2;

  return {
    score,
    methodology: {
      formula: "Profile visibility = Profile_views + Search_appearances",
      inputs: {
        profileViews: views,
        searchAppearances: searches,
        totalVisibility
      },
      note: "This uses Snapshot domain data (point-in-time)"
    }
  };
}

function calculateProfessionalBrand(profileSnapshot) {
  if (!profileSnapshot?.elements?.[0]?.snapshotData) {
    return {
      score: null,
      methodology: {
        formula: "Professional brand indicators from Snapshot PROFILE",
        inputs: { error: "No profile snapshot data available" },
        note: "This uses Snapshot domain data (point-in-time)"
      }
    };
  }

  const profile = profileSnapshot.elements[0].snapshotData[0] || {};
  const indicators = {
    headline: !!(profile["Headline"] || profile.headline),
    industry: !!(profile["Industry"] || profile.industry),
    summary: !!(profile["Summary"] || profile.summary),
    currentPosition: !!(profile["Current Position"] || profile.currentPosition)
  };

  const presentIndicators = Object.values(indicators).filter(Boolean).length;
  let score = Math.min(presentIndicators * 2.5, 10); // Scale to 0-10

  return {
    score: Math.round(score),
    methodology: {
      formula: "Professional brand = COUNT(headline, industry, summary, position) * 2.5",
      inputs: {
        indicators,
        presentIndicators,
        maxPossible: 4
      },
      note: "This uses Snapshot PROFILE domain data (point-in-time)"
    }
  };
}

function calculateOverallScore(scores) {
  const validScores = Object.values(scores).filter(score => score !== null && score !== undefined);
  if (validScores.length === 0) return 0;
  
  const sum = validScores.reduce((acc, score) => acc + score, 0);
  return Math.round((sum / validScores.length) * 10) / 10;
}

function calculateSummary({ personPosts, personPostLikes, personPostComments, invitations, connectionsSnapshot }) {
  const totalConnections = connectionsSnapshot?.elements?.[0]?.snapshotData?.length || 0;
  const posts30d = personPosts.length; // Only person posts
  const totalEngagements = personPostLikes.length + personPostComments.length; // Only on person posts
  const engagementRatePct = posts30d > 0 ? Math.round((totalEngagements / posts30d) * 100) / 100 : 0;
  const newConnections28d = invitations.length;

  return {
    totalConnections,
    posts30d,
    engagementRatePct,
    newConnections28d
  };
}

function calculateTrends(personPosts, personPostLikes, personPostComments) {
  const weeklyData = {};
  
  // Process person posts only
  personPosts.forEach(post => {
    const eventTime = post.capturedAt || post.processedAt; // Prefer capturedAt per PDF
    const date = new Date(eventTime);
    const year = date.getFullYear();
    const week = getWeekNumber(date);
    const weekKey = `${year}-W${week.toString().padStart(2, '0')}`;
    
    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = { posts: 0, engagements: 0 };
    }
    
    if (post.method === "CREATE" || post.method === "UPDATE") {
      weeklyData[weekKey].posts++;
    }
  });

  // Process engagements on person posts only
  [...personPostLikes, ...personPostComments].forEach(engagement => {
    const eventTime = engagement.capturedAt || engagement.processedAt;
    const date = new Date(eventTime);
    const year = date.getFullYear();
    const week = getWeekNumber(date);
    const weekKey = `${year}-W${week.toString().padStart(2, '0')}`;
    
    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = { posts: 0, engagements: 0 };
    }
    
    weeklyData[weekKey].engagements++;
  });

  return {
    weeklyPosts: Object.fromEntries(Object.entries(weeklyData).map(([week, data]) => [week, data.posts])),
    weeklyEngagements: Object.fromEntries(Object.entries(weeklyData).map(([week, data]) => [week, data.engagements]))
  };
}

function calculateContentTypes(personPosts) {
  const types = {};
  
  personPosts.forEach(post => {
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