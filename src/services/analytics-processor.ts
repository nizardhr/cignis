interface ProfileMetrics {
  profileViews: number;
  searchAppearances: number;
  uniqueViewers: number;
  viewerCompanies: string[];
  viewerTitles: string[];
}

interface ConnectionStats {
  total: number;
  monthlyGrowth: number;
  growthRate: string;
  topCompanies: Array<{ company: string; count: number }>;
  topPositions: Array<{ position: string; count: number }>;
}

interface PostAnalytics {
  urn: string;
  url: string;
  date: string;
  commentary: string;
  visibility: string;
  mediaType: string;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
  };
}

interface ActivityMetrics {
  postsCreated: number;
  commentsGiven: number;
  likesGiven: number;
  articlesPublished: number;
  messagesSent: number;
  invitationsSent: number;
}

interface DerivedMetrics {
  totalEngagement: number;
  avgEngagementPerPost: string;
  engagementRate: string;
  postingFrequency: string;
  contentMix: Record<string, number>;
  bestPostingTimes: Array<{ hour: number; avgEngagement: string }>;
  topPerformingPosts: PostAnalytics[];
}

interface ComprehensiveMetrics {
  profile: ProfileMetrics;
  network: ConnectionStats;
  content: PostAnalytics[];
  activity: ActivityMetrics;
  calculated: DerivedMetrics;
}

export class AnalyticsProcessor {
  async calculateAllMetrics(token: string): Promise<ComprehensiveMetrics> {
    try {
      const [profileMetrics, connectionStats, postAnalytics, activityMetrics] = await Promise.all([
        this.fetchProfileMetrics(token),
        this.fetchConnectionStats(token),
        this.fetchPostAnalytics(token),
        this.fetchActivityMetrics(token)
      ]);
      
      return {
        profile: profileMetrics,
        network: connectionStats,
        content: postAnalytics,
        activity: activityMetrics,
        calculated: this.calculateDerivedMetrics(postAnalytics, activityMetrics)
      };
    } catch (error) {
      console.error('Error calculating metrics:', error);
      return this.getDefaultMetrics();
    }
  }
  
  private async fetchProfileMetrics(token: string): Promise<ProfileMetrics> {
    try {
      const response = await fetch('/.netlify/functions/linkedin-snapshot?domain=PROFILE', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Profile snapshot data:', data);
      
      // The data structure is: elements[0].snapshotData is an array of objects with key-value pairs
      const profileData = data.elements?.[0]?.snapshotData || [];
      
      let metrics = {
        profileViews: 0,
        searchAppearances: 0,
        uniqueViewers: 0,
        viewerCompanies: [],
        viewerTitles: []
      };
      
      // Parse the array of profile data - LinkedIn returns data in various key formats
      profileData.forEach((dataPoint: any) => {
        // Look for profile views with different possible key names
        if (dataPoint['Profile Views'] !== undefined) {
          metrics.profileViews = parseInt(dataPoint['Profile Views']) || 0;
        } else if (dataPoint['profile_views'] !== undefined) {
          metrics.profileViews = parseInt(dataPoint['profile_views']) || 0;
        } else if (dataPoint.profileViews !== undefined) {
          metrics.profileViews = parseInt(dataPoint.profileViews) || 0;
        }
        
        // Look for search appearances
        if (dataPoint['Search Appearances'] !== undefined) {
          metrics.searchAppearances = parseInt(dataPoint['Search Appearances']) || 0;
        } else if (dataPoint['search_appearances'] !== undefined) {
          metrics.searchAppearances = parseInt(dataPoint['search_appearances']) || 0;
        } else if (dataPoint.searchAppearances !== undefined) {
          metrics.searchAppearances = parseInt(dataPoint.searchAppearances) || 0;
        }
        
        // Look for unique viewers
        if (dataPoint['Unique Viewers'] !== undefined) {
          metrics.uniqueViewers = parseInt(dataPoint['Unique Viewers']) || 0;
        } else if (dataPoint['unique_viewers'] !== undefined) {
          metrics.uniqueViewers = parseInt(dataPoint['unique_viewers']) || 0;
        } else if (dataPoint.uniqueViewers !== undefined) {
          metrics.uniqueViewers = parseInt(dataPoint.uniqueViewers) || 0;
        }
      });
      
      console.log('Processed profile metrics:', metrics);
      return metrics;
    } catch (error) {
      console.error('Error fetching profile metrics:', error);
      return {
        profileViews: 0,
        searchAppearances: 0,
        uniqueViewers: 0,
        viewerCompanies: [],
        viewerTitles: []
      };
    }
  }
  
  private async fetchConnectionStats(token: string): Promise<ConnectionStats> {
    try {
      const connectionsResponse = await fetch('/.netlify/functions/linkedin-snapshot?domain=CONNECTIONS', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!connectionsResponse.ok) {
        throw new Error(`HTTP ${connectionsResponse.status}`);
      }
      
      const data = await connectionsResponse.json();
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
        topCompanies: this.getTopCompanies(connections),
        topPositions: this.getTopPositions(connections)
      };
    } catch (error) {
      console.error('Error fetching connection stats:', error);
      return {
        total: 0,
        monthlyGrowth: 0,
        growthRate: '0',
        topCompanies: [],
        topPositions: []
      };
    }
  }
  
  private async fetchPostAnalytics(token: string): Promise<PostAnalytics[]> {
    try {
      // Get all posts from Snapshot API
      const postsResponse = await fetch('/.netlify/functions/linkedin-snapshot?domain=MEMBER_SHARE_INFO', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!postsResponse.ok) {
        throw new Error(`HTTP ${postsResponse.status}`);
      }
      
      const postsData = await postsResponse.json();
      const posts = this.parsePostsFromSnapshot(postsData);
      
      // Get recent engagement from Changelog
      const engagementMap = await this.fetchRecentEngagement(token);
      
      // Enrich posts with engagement data
      return posts.map(post => ({
        ...post,
        engagement: engagementMap[post.urn] || { likes: 0, comments: 0, shares: 0 }
      }));
    } catch (error) {
      console.error('Error fetching post analytics:', error);
      return [];
    }
  }
  
  private parsePostsFromSnapshot(snapshotData: any): Omit<PostAnalytics, 'engagement'>[] {
    const posts: Omit<PostAnalytics, 'engagement'>[] = [];
    const shareInfo = snapshotData.elements?.[0]?.snapshotData || [];
    
    shareInfo.forEach((item: any) => {
      if (item['Share URL'] || item.shareUrl || item.url) {
        posts.push({
          urn: this.extractUrnFromUrl(item['Share URL'] || item.shareUrl || item.url),
          url: item['Share URL'] || item.shareUrl || item.url,
          date: item['Share Date'] || item.shareDate || item.date || item['Date'],
          commentary: item['Share Commentary'] || item.shareCommentary || item.commentary || item['Commentary'] || '',
          visibility: item['Visibility'] || item.visibility || 'PUBLIC',
          mediaType: item['Media Type'] || item.mediaType || 'TEXT'
        });
      }
    });
    
    return posts;
  }
  
  private extractUrnFromUrl(url: string): string {
    // Extract URN from LinkedIn URL
    const match = url.match(/activity-(\d+)/);
    return match ? `urn:li:activity:${match[1]}` : url;
  }
  
  private async fetchRecentEngagement(token: string): Promise<Record<string, { likes: number; comments: number; shares: number }>> {
    try {
      const engagementMap: Record<string, { likes: number; comments: number; shares: number }> = {};
      
      const response = await fetch('/.netlify/functions/linkedin-changelog?count=50', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      // First, get all your posts to track engagement for
      const userPosts = data.elements?.filter((event: any) => 
        event.resourceName === 'ugcPosts' && 
        event.method === 'CREATE' &&
        event.actor === event.owner // Your own posts
      ) || [];
      
      // Initialize engagement tracking for your posts
      userPosts.forEach((post: any) => {
        engagementMap[post.resourceId] = { likes: 0, comments: 0, shares: 0 };
      });
      
      // Process each event
      data.elements?.forEach((event: any) => {
        // Likes on your posts
        if (event.resourceName === 'socialActions/likes' && event.method === 'CREATE') {
          const postUrn = event.activity?.object;
          if (postUrn && engagementMap[postUrn]) {
            engagementMap[postUrn] = engagementMap[postUrn] || { likes: 0, comments: 0, shares: 0 };
            engagementMap[postUrn].likes++;
          }
        } 
        // Comments on your posts
        else if (event.resourceName === 'socialActions/comments' && event.method === 'CREATE') {
          const postUrn = event.activity?.object;
          if (postUrn && engagementMap[postUrn]) {
            engagementMap[postUrn] = engagementMap[postUrn] || { likes: 0, comments: 0, shares: 0 };
            engagementMap[postUrn].comments++;
          }
        }
      });
      
      console.log('Engagement map:', engagementMap);
      return engagementMap;
    } catch (error) {
      console.error('Error fetching recent engagement:', error);
      return {};
    }
  }
  
  private async fetchActivityMetrics(token: string): Promise<ActivityMetrics> {
    try {
      const response = await fetch('/.netlify/functions/linkedin-changelog?count=50', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      const activities: ActivityMetrics = {
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
  
  private calculateDerivedMetrics(postAnalytics: PostAnalytics[], activityMetrics: ActivityMetrics): DerivedMetrics {
    const totalEngagement = postAnalytics.reduce((sum, post) => 
      sum + post.engagement.likes + post.engagement.comments + post.engagement.shares, 0
    );
    
    const avgEngagementPerPost = postAnalytics.length > 0 
      ? (totalEngagement / postAnalytics.length).toFixed(2) 
      : '0';
    
    console.log('Calculated engagement:', { totalEngagement, avgEngagementPerPost, postCount: postAnalytics.length });
    
    // Calculate posting frequency
    const postDates = postAnalytics.map(p => new Date(p.date)).sort((a, b) => b.getTime() - a.getTime());
    const daysBetweenPosts: number[] = [];
    
    for (let i = 1; i < postDates.length; i++) {
      const days = Math.floor((postDates[i-1].getTime() - postDates[i].getTime()) / (1000 * 60 * 60 * 24));
      daysBetweenPosts.push(days);
    }
    
    const avgDaysBetweenPosts = daysBetweenPosts.length > 0
      ? (daysBetweenPosts.reduce((a, b) => a + b) / daysBetweenPosts.length).toFixed(1)
      : '0';
    
    return {
      totalEngagement,
      avgEngagementPerPost,
      engagementRate: postAnalytics.length > 0 ? ((totalEngagement / (postAnalytics.length * 100)) * 100).toFixed(2) : '0',
      postingFrequency: avgDaysBetweenPosts,
      contentMix: this.analyzeContentMix(postAnalytics),
      bestPostingTimes: this.analyzeBestTimes(postAnalytics),
      topPerformingPosts: this.getTopPosts(postAnalytics, 5)
    };
  }
  
  private analyzeContentMix(posts: PostAnalytics[]): Record<string, number> {
    const types: Record<string, number> = {};
    posts.forEach(post => {
      const type = post.mediaType || 'TEXT';
      types[type] = (types[type] || 0) + 1;
    });
    return types;
  }
  
  private analyzeBestTimes(posts: PostAnalytics[]): Array<{ hour: number; avgEngagement: string }> {
    const hourlyEngagement = new Array(24).fill(0);
    const hourlyCounts = new Array(24).fill(0);
    
    posts.forEach(post => {
      const hour = new Date(post.date).getHours();
      hourlyEngagement[hour] += post.engagement.likes + post.engagement.comments;
      hourlyCounts[hour]++;
    });
    
    return hourlyEngagement.map((engagement, hour) => ({
      hour,
      avgEngagement: hourlyCounts[hour] > 0 ? (engagement / hourlyCounts[hour]).toFixed(2) : '0'
    }));
  }
  
  private getTopPosts(posts: PostAnalytics[], limit: number): PostAnalytics[] {
    return posts
      .sort((a, b) => {
        const aTotal = a.engagement.likes + a.engagement.comments + a.engagement.shares;
        const bTotal = b.engagement.likes + b.engagement.comments + b.engagement.shares;
        return bTotal - aTotal;
      })
      .slice(0, limit);
  }
  
  private getTopCompanies(connections: any[]): Array<{ company: string; count: number }> {
    const companies: Record<string, number> = {};
    connections.forEach(conn => {
      const company = conn['Company'] || conn.company || 'Unknown';
      companies[company] = (companies[company] || 0) + 1;
    });
    
    return Object.entries(companies)
      .map(([company, count]) => ({ company, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }
  
  private getTopPositions(connections: any[]): Array<{ position: string; count: number }> {
    const positions: Record<string, number> = {};
    connections.forEach(conn => {
      const position = conn['Position'] || conn.position || 'Unknown';
      positions[position] = (positions[position] || 0) + 1;
    });
    
    return Object.entries(positions)
      .map(([position, count]) => ({ position, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }
  
  private getDefaultMetrics(): ComprehensiveMetrics {
    return {
      profile: {
        profileViews: 0,
        searchAppearances: 0,
        uniqueViewers: 0,
        viewerCompanies: [],
        viewerTitles: []
      },
      network: {
        total: 0,
        monthlyGrowth: 0,
        growthRate: '0',
        topCompanies: [],
        topPositions: []
      },
      content: [],
      activity: {
        postsCreated: 0,
        commentsGiven: 0,
        likesGiven: 0,
        articlesPublished: 0,
        messagesSent: 0,
        invitationsSent: 0
      },
      calculated: {
        totalEngagement: 0,
        avgEngagementPerPost: '0',
        engagementRate: '0',
        postingFrequency: '0',
        contentMix: {},
        bestPostingTimes: [],
        topPerformingPosts: []
      }
    };
  }
}