import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, TrendingUp, Users, MessageCircle, Eye, BarChart3, Heart, FileText } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useAuthStore } from '../../stores/authStore';
import { useLinkedInChangelog, useLinkedInSnapshot } from '../../hooks/useLinkedInData';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  Area,
  AreaChart
} from 'recharts';

type TimeRange = '7d' | '30d' | '90d' | 'custom';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658', '#ff7300'];

interface AnalyticsData {
  dailyActivity: Array<{
    date: string;
    posts: number;
    engagements: number;
    likes: number;
    comments: number;
  }>;
  connectionsGrowth: Array<{
    date: string;
    totalConnections: number;
    newConnections: number;
  }>;
  postTypes: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  topHashtags: Array<{
    hashtag: string;
    count: number;
  }>;
  dailyMessages: Array<{
    date: string;
    sent: number;
    received: number;
  }>;
  kpis: {
    totalPosts: number;
    totalEngagements: number;
    avgEngagementPerPost: number;
    totalConnections: number;
    messageResponseRate: number;
  };
}

export const Analytics = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { dmaToken } = useAuthStore();
  
  // Fetch data from existing hooks
  const { data: changelogData, isLoading: changelogLoading, error: changelogError } = useLinkedInChangelog(200);
  const { data: connectionsData, isLoading: connectionsLoading } = useLinkedInSnapshot('CONNECTIONS');
  const { data: postsData, isLoading: postsLoading } = useLinkedInSnapshot('MEMBER_SHARE_INFO');

  // Process the data into analytics format
  const processedData = useMemo(() => {
    if (!changelogData || !connectionsData || !postsData) return null;

    console.log('Processing analytics data...', {
      changelogElements: changelogData.elements?.length,
      connectionsCount: connectionsData.elements?.[0]?.snapshotData?.length,
      postsCount: postsData.elements?.[0]?.snapshotData?.length
    });

    const elements = changelogData.elements || [];
    const connections = connectionsData.elements?.[0]?.snapshotData || [];
    const posts = postsData.elements?.[0]?.snapshotData || [];

    // Filter for user's own activities
    const currentUserId = elements.find(e => e.owner)?.owner;
    
    // Filter for user's personal posts only (not company posts) and exclude deleted posts
    const userPosts = elements.filter(e => 
      e.resourceName === 'ugcPosts' && 
      e.method === 'CREATE' &&
      e.owner === e.actor &&
      e.activity?.author?.startsWith?.('urn:li:person:') && // Only personal posts, not company posts
      e.activity?.lifecycleState !== 'DELETED' // Exclude deleted posts
    );

    const userLikes = elements.filter(e => 
      e.resourceName === 'socialActions/likes' && 
      e.method === 'CREATE' &&
      e.actor === currentUserId
    );

    const userComments = elements.filter(e => 
      e.resourceName === 'socialActions/comments' && 
      e.method === 'CREATE' &&
      e.actor === currentUserId
    );

    const invitations = elements.filter(e => 
      e.resourceName === 'invitations' &&
      e.actor === currentUserId
    );

    const messages = elements.filter(e => 
      e.resourceName === 'messages'
    );

    // Process daily activity
    const dailyActivity = processeDailyActivity(userPosts, userLikes, userComments);
    
    // Process connections growth
    const connectionsGrowth = processConnectionsGrowth(connections, invitations);
    
    // Process post types
    const postTypes = processPostTypes(userPosts);
    
    // Process hashtags
    const topHashtags = processHashtags(userPosts);
    
    // Process daily messages for past 30 days
    const dailyMessages = processDailyMessages(messages, currentUserId);

    // Calculate KPIs
    const totalEngagements = userLikes.length + userComments.length;
    const kpis = {
      totalPosts: userPosts.length,
      totalEngagements,
      avgEngagementPerPost: userPosts.length > 0 ? totalEngagements / userPosts.length : 0,
      totalConnections: connections.length,
      messageResponseRate: calculateMessageResponseRate(messages, currentUserId)
    };

    return {
      dailyActivity,
      connectionsGrowth,
      postTypes,
      topHashtags: [], // Removed hashtags
      dailyMessages,
      kpis
    };
  }, [changelogData, connectionsData, postsData]);

  useEffect(() => {
    if (processedData) {
      setAnalyticsData(processedData);
      setLoading(false);
      setError(null);
    } else if (changelogError) {
      setError(changelogError.message);
      setLoading(false);
    } else if (!changelogLoading && !connectionsLoading && !postsLoading) {
      setLoading(false);
    }
  }, [processedData, changelogError, changelogLoading, connectionsLoading, postsLoading]);

  // Helper functions for data processing
  function processeDailyActivity(posts: any[], likes: any[], comments: any[]) {
    const dailyData: Record<string, { posts: number; likes: number; comments: number }> = {};
    
    // Get date range for last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);

    // Initialize all dates with zero values
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      dailyData[dateStr] = { posts: 0, likes: 0, comments: 0 };
    }

    // Count posts per day
    posts.forEach(post => {
      const date = new Date(post.capturedAt).toISOString().split('T')[0];
      if (dailyData[date]) {
        dailyData[date].posts++;
      }
    });

    // Count likes per day
    likes.forEach(like => {
      const date = new Date(like.capturedAt).toISOString().split('T')[0];
      if (dailyData[date]) {
        dailyData[date].likes++;
      }
    });

    // Count comments per day
    comments.forEach(comment => {
      const date = new Date(comment.capturedAt).toISOString().split('T')[0];
      if (dailyData[date]) {
        dailyData[date].comments++;
      }
    });

    return Object.entries(dailyData)
      .map(([date, data]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        posts: data.posts,
        engagements: data.likes + data.comments,
        likes: data.likes,
        comments: data.comments
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  function processConnectionsGrowth(connections: any[], invitations: any[]) {
    const growthData: Array<{ date: string; totalConnections: number; newConnections: number }> = [];
    
    // Sort connections by date
    const sortedConnections = connections
      .filter(conn => conn['Connected On'] || conn.connectedOn)
      .sort((a, b) => {
        const dateA = new Date(a['Connected On'] || a.connectedOn);
        const dateB = new Date(b['Connected On'] || b.connectedOn);
        return dateA.getTime() - dateB.getTime();
      });

    // Calculate cumulative growth
    let cumulativeCount = 0;
    const dailyCounts: Record<string, number> = {};

    sortedConnections.forEach(conn => {
      const date = new Date(conn['Connected On'] || conn.connectedOn).toISOString().split('T')[0];
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    });

    // Generate growth data for last 90 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 90);

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const newConnections = dailyCounts[dateStr] || 0;
      cumulativeCount += newConnections;
      
      growthData.push({
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        totalConnections: cumulativeCount,
        newConnections
      });
    }

    return growthData;
  }

  function processPostTypes(posts: any[]) {
    const typeCounts: Record<string, number> = {
      'Text Only': 0,
      'Image': 0,
      'Video': 0,
      'Article': 0,
      'External Link': 0
    };

    posts.forEach(post => {
      // Skip deleted posts
      if (post.activity?.lifecycleState === 'DELETED') return;
      
      const content = post.activity?.specificContent?.['com.linkedin.ugc.ShareContent'];
      const media = content?.media;
      
      if (media && media.length > 0) {
        // Check media type
        const mediaType = media[0].mediaType || 'IMAGE';
        if (mediaType.includes('VIDEO')) {
          typeCounts['Video']++;
        } else if (mediaType.includes('IMAGE')) {
          typeCounts['Image']++;
        } else {
          typeCounts['External Link']++;
        }
      } else if (content?.shareCommentary?.text?.includes('http')) {
        typeCounts['External Link']++;
      } else {
        typeCounts['Text Only']++;
      }
    });

    return Object.entries(typeCounts)
      .filter(([_, count]) => count > 0)
      .map(([name, value], index) => ({
        name,
        value,
        color: COLORS[index % COLORS.length]
      }));
  }

  function processDailyMessages(messages: any[], currentUserId: string) {
    const dailyData: Record<string, { sent: number; received: number }> = {};
    
    // Get last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30); // 30 days

    // Initialize all dates with zero values
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      dailyData[dateStr] = { sent: 0, received: 0 };
    }

    messages.forEach(message => {
      const messageDate = new Date(message.capturedAt);
      const dateStr = messageDate.toISOString().split('T')[0];
      
      if (dailyData[dateStr]) {
        if (message.actor === currentUserId) {
          dailyData[dateStr].sent++;
        } else {
          dailyData[dateStr].received++;
        }
      }
    });

    return Object.entries(dailyData)
      .map(([date, data]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        sent: data.sent,
        received: data.received
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  function processHashtags(posts: any[]) {
    // Return empty array since hashtags are removed
    return [];
  }

  function processTopPosts(posts: any[], allElements: any[]) {
    // Return empty array since top posts are removed
    return [];
  }

  function processWeeklyMessages(messages: any[], currentUserId: string) {
    // Return empty array since this is replaced with daily messages
    return Object.entries({}).map(([week, data]) => ({
      week,
      sent: data.sent,
      received: data.received
    }));
  }

  function calculateMessageResponseRate(messages: any[], currentUserId: string) {
    const sentMessages = messages.filter(m => m.actor === currentUserId).length;
    const receivedMessages = messages.filter(m => m.actor !== currentUserId).length;
    
    if (receivedMessages === 0) return 0;
    return (sentMessages / receivedMessages) * 100;
  }

  if (!dmaToken) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Analytics Unavailable</h2>
          <p className="text-gray-600 mb-6">
            Advanced analytics require LinkedIn data access permissions.
          </p>
          <Button
            variant="primary"
            onClick={() => (window.location.href = "/")}
          >
            Enable Data Access
          </Button>
        </div>
      </motion.div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Error loading analytics: {error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No analytics data available</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
        <div className="flex space-x-2">
          {(['7d', '30d', '90d'] as TimeRange[]).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(range)}
            >
              {range}
            </Button>
          ))}
          <Button
            variant={timeRange === 'custom' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('custom')}
          >
            Custom
          </Button>
        </div>
      </div>

      {/* Custom Date Range */}
      {timeRange === 'custom' && (
        <Card variant="glass" className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Calendar size={16} />
              <span className="text-sm">From:</span>
              <input
                type="date"
                value={customDateRange.start}
                onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm">To:</span>
              <input
                type="date"
                value={customDateRange.end}
                onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card variant="glass" className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Posts</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.kpis.totalPosts}</p>
            </div>
            <div className="p-3 bg-blue-500 rounded-xl">
              <FileText size={24} className="text-white" />
            </div>
          </div>
        </Card>

        <Card variant="glass" className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Engagements</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.kpis.totalEngagements}</p>
            </div>
            <div className="p-3 bg-green-500 rounded-xl">
              <Heart size={24} className="text-white" />
            </div>
          </div>
        </Card>

        <Card variant="glass" className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Engagement/Post</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.kpis.avgEngagementPerPost.toFixed(1)}</p>
            </div>
            <div className="p-3 bg-purple-500 rounded-xl">
              <TrendingUp size={24} className="text-white" />
            </div>
          </div>
        </Card>

        <Card variant="glass" className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Connections</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.kpis.totalConnections}</p>
            </div>
            <div className="p-3 bg-orange-500 rounded-xl">
              <Users size={24} className="text-white" />
            </div>
          </div>
        </Card>

        <Card variant="glass" className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Message Response Rate</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.kpis.messageResponseRate.toFixed(1)}%</p>
            </div>
            <div className="p-3 bg-cyan-500 rounded-xl">
              <MessageCircle size={24} className="text-white" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Activity Chart */}
        <Card variant="glass" className="p-6">
          <h3 className="text-lg font-semibold mb-4">Daily Posts & Engagements</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analyticsData.dailyActivity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="posts" stroke="#3B82F6" strokeWidth={2} name="Posts" />
              <Line type="monotone" dataKey="engagements" stroke="#10B981" strokeWidth={2} name="Engagements" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Connections Growth Chart */}
        <Card variant="glass" className="p-6">
          <h3 className="text-lg font-semibold mb-4">Connections Growth</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analyticsData.connectionsGrowth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="totalConnections" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Post Types Chart */}
        <Card variant="glass" className="p-6">
          <h3 className="text-lg font-semibold mb-4">Post Types Distribution</h3>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={analyticsData.postTypes}
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={40}
                dataKey="value"
                label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                labelLine={false}
              >
                {analyticsData.postTypes.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Daily Messages Chart */}
        <Card variant="glass" className="p-6">
          <h3 className="text-lg font-semibold mb-4">Daily Messages (Past 30 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analyticsData.dailyMessages}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="sent" stroke="#3B82F6" strokeWidth={2} name="Messages Sent" />
              <Line type="monotone" dataKey="received" stroke="#10B981" strokeWidth={2} name="Messages Received" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </motion.div>
  );
};