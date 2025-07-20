import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Users, 
  FileText, 
  BarChart3, 
  Calendar, 
  Zap, 
  Eye, 
  Search,
  Heart,
  MessageCircle,
  Share
} from 'lucide-react';
import { StatsCard } from './StatsCard';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useAuthStore } from '../../stores/authStore';
import { LinkedInDataService } from '../../services/linkedin-data-service';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle: string;
  icon: React.ReactNode;
  trend?: string;
}

const MetricCard = ({ title, value, subtitle, icon, trend }: MetricCardProps) => (
  <Card variant="glass" hover className="p-6">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        {trend && (
          <p className="text-sm text-green-600 mt-1">+{trend}%</p>
        )}
      </div>
      <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500">
        {icon}
      </div>
    </div>
  </Card>
);

const ActivityItem = ({ label, value }: { label: string; value: number }) => (
  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
    <span className="text-sm font-medium text-gray-700">{label}</span>
    <span className="text-lg font-bold text-blue-600">{value}</span>
  </div>
);

const PostPreview = ({ post, rank }: { post: any; rank: number }) => (
  <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
    <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold">
      {rank}
    </div>
    <div className="flex-1">
      <p className="text-sm font-medium text-gray-900 line-clamp-2">
        {post.commentary || 'Post content...'}
      </p>
      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
        <span className="flex items-center space-x-1">
          <Heart size={12} className="text-red-500" />
          <span>{post.engagement.likes}</span>
        </span>
        <span className="flex items-center space-x-1">
          <MessageCircle size={12} className="text-blue-500" />
          <span>{post.engagement.comments}</span>
        </span>
        <span className="flex items-center space-x-1">
          <Share size={12} className="text-green-500" />
          <span>{post.engagement.shares}</span>
        </span>
      </div>
    </div>
  </div>
);

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const Dashboard = () => {
  const { dmaToken } = useAuthStore();
  const [metrics, setMetrics] = useState({
    profileViews: 0,
    searchAppearances: 0,
    uniqueViewers: 0,
    connections: 0,
    connectionGrowth: 0,
    totalEngagement: 0,
    avgPerPost: '0',
    totalLikes: 0,
    totalComments: 0,
    totalPosts: 0,
    postsCreated: 0,
    commentsGiven: 0,
    likesGiven: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMetrics = async () => {
      if (!dmaToken) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const service = new LinkedInDataService();
        
        // Load all metrics in parallel
        const [profileData, engagementData, connectionsData, activityData] = await Promise.all([
          service.fetchProfileViews(dmaToken),
          service.calculateEngagementMetrics(dmaToken),
          service.fetchConnections(dmaToken),
          service.fetchActivityMetrics(dmaToken)
        ]);
        
        console.log('Loaded metrics:', { profileData, engagementData, connectionsData, activityData });
        
        setMetrics({
          profileViews: profileData.profileViews,
          searchAppearances: profileData.searchAppearances,
          uniqueViewers: profileData.uniqueViewers,
          connections: connectionsData.total,
          connectionGrowth: connectionsData.monthlyGrowth,
          totalEngagement: engagementData.totalEngagement,
          avgPerPost: engagementData.avgPerPost,
          totalLikes: engagementData.totalLikes,
          totalComments: engagementData.totalComments,
          totalPosts: engagementData.totalPosts,
          postsCreated: activityData.postsCreated,
          commentsGiven: activityData.commentsGiven,
          likesGiven: activityData.likesGiven
        });
      } catch (err) {
        console.error('Error loading metrics:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard metrics');
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
  }, [dmaToken]);

  if (!dmaToken) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Limited Access Mode</h2>
          <p className="text-gray-600 mb-6">
            You have basic LinkedIn access. Enable data access permissions for full analytics and insights.
          </p>
          <Button 
            variant="primary"
            onClick={() => window.location.href = '/'}
          >
            Enable Full Access
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
        <p className="text-red-600 mb-4">Error loading metrics: {error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No metrics available</p>
      </div>
    );
  }

  const prepareEngagementTrends = (posts: any[]) => {
    const trends = posts.slice(0, 10).map(post => ({
      date: new Date(post.date).toLocaleDateString(),
      likes: post.engagement.likes,
      comments: post.engagement.comments,
      shares: post.engagement.shares
    }));
    return trends.reverse();
  };

  const prepareContentMixData = (contentMix: Record<string, number>) => {
    return Object.entries(contentMix).map(([type, count]) => ({
      name: type,
      value: count
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Profile Views"
          value={metrics.profileViews}
          subtitle="Past Year"
          icon={<Eye size={24} className="text-white" />}
        />
        
        <MetricCard
          title="Total Connections"
          value={metrics.connections}
          subtitle={`Past Year • +${metrics.connectionGrowth} this month`}
          icon={<Users size={24} className="text-white" />}
          trend={metrics.connections > 0 ? ((metrics.connectionGrowth / metrics.connections) * 100).toFixed(1) : '0'}
        />
        
        <MetricCard
          title="Total Engagement"
          value={metrics.totalEngagement}
          subtitle={`Past Year • ${metrics.avgPerPost} avg per post`}
          icon={<Heart size={24} className="text-white" />}
          trend={metrics.totalPosts > 0 ? ((metrics.totalEngagement / (metrics.totalPosts * 10)) * 100).toFixed(1) : '0'}
        />
        
        <MetricCard
          title="Search Appearances"
          value={metrics.searchAppearances}
          subtitle="Past Year"
          icon={<Search size={24} className="text-white" />}
        />
      </div>

      {/* Activity Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card variant="glass" className="p-6">
          <h3 className="text-xl font-bold mb-4">Your Activity (Past 28 days)</h3>
          <div className="space-y-4">
            <ActivityItem label="Posts Created" value={metrics.postsCreated} />
            <ActivityItem label="Comments Given" value={metrics.commentsGiven} />
            <ActivityItem label="Likes Given" value={metrics.likesGiven} />
            <ActivityItem label="Total Posts" value={metrics.totalPosts} />
          </div>
        </Card>
        
        <Card variant="glass" className="p-6">
          <h3 className="text-xl font-bold mb-4">Engagement Breakdown</h3>
          <div className="space-y-4">
            <ActivityItem label="Total Likes Received" value={metrics.totalLikes} />
            <ActivityItem label="Total Comments Received" value={metrics.totalComments} />
            <ActivityItem label="Average per Post" value={metrics.avgPerPost} />
            <ActivityItem label="Engagement Rate" value={`${metrics.totalPosts > 0 ? ((metrics.totalEngagement / (metrics.totalPosts * 10)) * 100).toFixed(1) : 0}%`} />
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card variant="glass" className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Zap className="mr-2" size={20} />
          Quick Actions
        </h3>
        <div className="space-y-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full p-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all"
            onClick={() => window.location.href = '/?module=synergy'}
          >
            Check Synergy Partners
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full p-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
            onClick={() => window.location.href = '/?module=postgen'}
          >
            Generate New Post
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full p-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all"
            onClick={() => window.location.href = '/?module=analytics'}
          >
            View Analytics
          </motion.button>
        </div>
      </Card>
    </motion.div>
  );
};