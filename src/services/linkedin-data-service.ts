export class LinkedInDataService {
  async fetchProfileViews(token: string) {
    try {
      const response = await fetch('/.netlify/functions/linkedin-snapshot?domain=PROFILE', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      console.log('Profile snapshot data:', data);
      
      // LinkedIn returns profile data as an array of key-value objects
      const profileData = data.elements?.[0]?.snapshotData || [];
      let profileViews = 0;
      let searchAppearances = 0;
      let uniqueViewers = 0;
      
      // Check every item for the metrics we need
      profileData.forEach((item: any) => {
        // Try multiple possible keys for profile views
        const possibleViewKeys = [
          'Profile Views', 'profile_views', 'ProfileViews', 'Views',
          'Profile View Count', 'profile_view_count', 'viewCount'
        ];
        
        const possibleSearchKeys = [
          'Search Appearances', 'search_appearances', 'SearchAppearances',
          'Search Results', 'search_results', 'searchResults'
        ];
        
        const possibleViewerKeys = [
          'Unique Viewers', 'unique_viewers', 'UniqueViewers',
          'Viewer Count', 'viewer_count', 'viewerCount'
        ];
        
        // Check for profile views
        possibleViewKeys.forEach(key => {
          if (key in item && item[key] !== undefined) {
            const value = parseInt(item[key]) || 0;
            if (value > profileViews) profileViews = value;
          }
        });
        
        // Check for search appearances
        possibleSearchKeys.forEach(key => {
          if (key in item && item[key] !== undefined) {
            const value = parseInt(item[key]) || 0;
            if (value > searchAppearances) searchAppearances = value;
          }
        });
        
        // Check for unique viewers
        possibleViewerKeys.forEach(key => {
          if (key in item && item[key] !== undefined) {
            const value = parseInt(item[key]) || 0;
            if (value > uniqueViewers) uniqueViewers = value;
          }
        });
        
        // Log all keys to debug
        console.log('Profile data item keys:', Object.keys(item));
        console.log('Profile data item values:', item);
      });
      
      console.log('Processed profile metrics:', { profileViews, searchAppearances, uniqueViewers });
      
      return { profileViews, searchAppearances, uniqueViewers };
    } catch (error) {
      console.error('Error fetching profile views:', error);
      return { profileViews: 0, searchAppearances: 0, uniqueViewers: 0 };
    }
  }

  async fetchConnections(token: string) {
    try {
      const response = await fetch('/.netlify/functions/linkedin-snapshot?domain=CONNECTIONS', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      const connections = data.elements?.[0]?.snapshotData || [];
      
      // Calculate growth over time
      const last30Days = connections.filter((conn: any) => {
        const connectedDate = new Date(conn['Connected On'] || conn.connectedOn || conn.date);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return connectedDate >= thirtyDaysAgo;
      });
      
      return {
        total: connections.length,
        monthlyGrowth: last30Days.length,
        growthRate: connections.length > 0 ? ((last30Days.length / connections.length) * 100).toFixed(2) : '0',
        topCompanies: this.getTopItems(connections, 'Company', 5),
        topPositions: this.getTopItems(connections, 'Position', 5)
      };
    } catch (error) {
      console.error('Error fetching connections:', error);
      return {
        total: 0,
        monthlyGrowth: 0,
        growthRate: '0',
        topCompanies: [],
        topPositions: []
      };
    }
  }

  async calculateEngagementMetrics(token: string) {
    try {
      // Get your posts first
      const postsResponse = await fetch('/.netlify/functions/linkedin-snapshot?domain=MEMBER_SHARE_INFO', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const postsData = await postsResponse.json();
      const shares = postsData.elements?.[0]?.snapshotData || [];
      
      // Get recent activity
      const changelogResponse = await fetch('/.netlify/functions/linkedin-changelog?count=50', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const changelogData = await changelogResponse.json();
      
      // Map share URLs to URNs for matching
      const urlToUrnMap: Record<string, any> = {};
      shares.forEach((share: any) => {
        const url = share['Share URL'] || share['URL'];
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
      const userPosts = changelogData.elements?.filter((event: any) => 
        event.resourceName === 'ugcPosts' && 
        event.method === 'CREATE' &&
        event.actor === event.owner // Your own posts
      ) || [];
      
      // Initialize engagement tracking for your posts
      const engagementByPost: Record<string, any> = {};
      userPosts.forEach((post: any) => {
        engagementByPost[post.resourceId] = {
          likes: 0,
          comments: 0,
          shares: 0,
          postUrn: post.resourceId
        };
      });
      
      // Count engagements on your posts
      changelogData.elements?.forEach((event: any) => {
        // Likes on your posts
        if (event.resourceName === 'socialActions/likes' && event.method === 'CREATE') {
          const targetPost = event.activity?.object;
          if (engagementByPost[targetPost]) {
            engagementByPost[targetPost].likes++;
            totalLikes++;
          }
        }
        
        // Comments on your posts
        if (event.resourceName === 'socialActions/comments' && event.method === 'CREATE') {
          const targetPost = event.activity?.object;
          if (engagementByPost[targetPost]) {
            engagementByPost[targetPost].comments++;
            totalComments++;
          }
        }
      });
      
      const totalEngagement = totalLikes + totalComments + totalShares;
      const avgPerPost = shares.length > 0 ? (totalEngagement / shares.length).toFixed(1) : '0';
      
      console.log('Engagement map:', engagementByPost);
      console.log('Calculated engagement:', { totalEngagement, avgPerPost, totalLikes, totalComments });
      
      return {
        totalEngagement,
        avgPerPost,
        totalLikes,
        totalComments,
        totalShares,
        totalPosts: shares.length,
        engagementByPost
      };
    } catch (error) {
      console.error('Error calculating engagement metrics:', error);
      return {
        totalEngagement: 0,
        avgPerPost: '0',
        totalLikes: 0,
        totalComments: 0,
        totalShares: 0,
        totalPosts: 0,
        engagementByPost: {}
      };
    }
  }

  async fetchActivityMetrics(token: string) {
    try {
      // Get all activity from changelog
      const response = await fetch('/.netlify/functions/linkedin-changelog?count=50', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      // Categorize activities
      const activities = {
        postsCreated: 0,
        commentsGiven: 0,
        likesGiven: 0,
        articlesPublished: 0,
        messagesSent: 0,
        invitationsSent: 0
      };
      
      data.elements?.forEach((event: any) => {
        switch(event.resourceName) {
          case 'ugcPosts':
            if (event.method === 'CREATE') activities.postsCreated++;
            break;
          case 'socialActions/comments':
            activities.commentsGiven++;
            break;
          case 'socialActions/likes':
            activities.likesGiven++;
            break;
          case 'originalArticles':
            activities.articlesPublished++;
            break;
          case 'messages':
            if (event.actor === event.owner) activities.messagesSent++;
            break;
          case 'invitations':
            activities.invitationsSent++;
            break;
        }
      });
      
      return activities;
    } catch (error) {
      console.error('Error fetching activity metrics:', error);
      return {
        postsCreated: 0,
        commentsGiven: 0,
        likesGiven: 0,
        articlesPublished: 0,
        messagesSent: 0,
        invitationsSent: 0
      };
    }
  }

  private getTopItems(items: any[], field: string, limit: number) {
    const counts: Record<string, number> = {};
    items.forEach(item => {
      const value = item[field];
      if (value) {
        counts[value] = (counts[value] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([name, count]) => ({ name, count }));
  }
}

// Debug function to explore all available data
export async function debugLinkedInData(token: string) {
  console.log('=== LinkedIn Data Debug ===');
  
  // Check Profile domain
  try {
    const profileResponse = await fetch('/.netlify/functions/linkedin-snapshot?domain=PROFILE', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const profileData = await profileResponse.json();
    console.log('PROFILE Domain:', profileData);
    
    // List all available keys
    if (profileData.elements?.[0]?.snapshotData) {
      const allKeys = new Set<string>();
      profileData.elements[0].snapshotData.forEach((item: any) => {
        Object.keys(item).forEach(key => allKeys.add(key));
      });
      console.log('All available profile keys:', Array.from(allKeys));
    }
  } catch (error) {
    console.error('Error debugging profile data:', error);
  }
  
  // Check other domains
  const domains = ['MEMBER_SHARE_INFO', 'CONNECTIONS', 'ALL_LIKES', 'ALL_COMMENTS', 'SKILLS', 'POSITIONS'];
  for (const domain of domains) {
    try {
      const response = await fetch(`/.netlify/functions/linkedin-snapshot?domain=${domain}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
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