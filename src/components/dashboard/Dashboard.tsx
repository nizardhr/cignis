import { useState, useEffect } from "react";
import { motion } from "framer-motion";
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
  Share,
  User,
  AlertCircle,
} from "lucide-react";
import { StatsCard } from "./StatsCard";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { useAuthStore } from "../../stores/authStore";
import { useLinkedInSnapshot, useLinkedInChangelog } from "../../hooks/useLinkedInData";
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
} from "recharts";

interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle: string;
  icon: React.ReactNode;
  trend?: string;
}

const MetricCard = ({
  title,
  value,
  subtitle,
  icon,
  trend,
}: MetricCardProps) => (
  <Card variant="glass" hover className="p-6">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        {trend && <p className="text-sm text-green-600 mt-1">+{trend}%</p>}
      </div>
      <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500">
        {icon}
      </div>
    </div>
  </Card>
);

const ActivityItem = ({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) => (
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
        {post.commentary || "Post content..."}
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

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export const Dashboard = () => {
  const { dmaToken, accessToken, isBasicAuthenticated, isFullyAuthenticated } =
    useAuthStore();
  
  // Use the existing hooks to fetch data
  const { data: profileData, isLoading: profileLoading, error: profileError } = useLinkedInSnapshot('PROFILE');
  const { data: connectionsData, isLoading: connectionsLoading } = useLinkedInSnapshot('CONNECTIONS');
  const { data: postsData, isLoading: postsLoading } = useLinkedInSnapshot('MEMBER_SHARE_INFO');
  const { data: changelogData, isLoading: changelogLoading } = useLinkedInChangelog(100);
  
  const [processedMetrics, setProcessedMetrics] = useState<any>(null);
  
  const isLoading = profileLoading || connectionsLoading || postsLoading || changelogLoading;
  const hasError = profileError;

  // Process the data when it's available
  useEffect(() => {
    if (!dmaToken || isLoading) return;

    console.log('Dashboard - Processing data:', {
      profileData: profileData?.elements?.[0],
      connectionsData: connectionsData?.elements?.[0],
      postsData: postsData?.elements?.[0],
      changelogData: changelogData?.elements?.length
    });

    // Process profile data
    const profileInfo = profileData?.elements?.[0]?.snapshotData?.[0] || {};
    const profileViews = parseInt(profileInfo['Profile Views'] || profileInfo.profileViews || '0') || 0;
    const searchAppearances = parseInt(profileInfo['Search Appearances'] || profileInfo.searchAppearances || '0') || 0;
    
    // Process connections data
    const connections = connectionsData?.elements?.[0]?.snapshotData || [];
    const totalConnections = connections.length;
    
    // Calculate recent connections (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentConnections = connections.filter((conn: any) => {
      const connectedDate = new Date(conn['Connected On'] || conn.connectedOn || conn.date);
      return connectedDate >= thirtyDaysAgo;
    }).length;
    
    // Process posts data
    const posts = postsData?.elements?.[0]?.snapshotData || [];
    const totalPosts = posts.length;
    
    // Calculate total engagement from posts
    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    
    posts.forEach((post: any) => {
      totalLikes += parseInt(post['Likes Count'] || post.likesCount || '0') || 0;
      totalComments += parseInt(post['Comments Count'] || post.commentsCount || '0') || 0;
      totalShares += parseInt(post['Shares Count'] || post.sharesCount || '0') || 0;
    });
    
    const totalEngagement = totalLikes + totalComments + totalShares;
    const avgEngagementPerPost = totalPosts > 0 ? (totalEngagement / totalPosts).toFixed(1) : '0';
    
    // Process changelog data for activity metrics
    const changelogElements = changelogData?.elements || [];
    const postsCreated = changelogElements.filter((e: any) => e.resourceName === 'ugcPosts' && e.method === 'CREATE').length;
    const likesGiven = changelogElements.filter((e: any) => e.resourceName === 'socialActions/likes').length;
    const commentsGiven = changelogElements.filter((e: any) => e.resourceName === 'socialActions/comments').length;
    
    // Calculate derived metrics
    const profileStrength = Math.min(
      (profileViews > 0 ? 25 : 0) + 
      (totalConnections > 50 ? 25 : totalConnections / 2) + 
      (totalPosts > 0 ? 25 : 0) + 
      (totalEngagement > 0 ? 25 : 0), 
      100
    );
    
    const networkQuality = Math.min(
      (totalConnections / 100) * 5 + 
      (recentConnections / 10) * 3 + 
      2, 
      10
    );
    
    const socialActivity = Math.min(
      (likesGiven / 50) * 4 + 
      (commentsGiven / 20) * 3 + 
      (postsCreated > 0 ? 3 : 0), 
      10
    );
    
    const contentPerformance = Math.min(
      (totalPosts / 10) * 3 + 
      (parseFloat(avgEngagementPerPost) / 10) * 4 + 
      (totalPosts > 0 ? 3 : 0), 
      10
    );

    const metrics = {
      profileViews,
      searchAppearances,
      totalConnections,
      recentConnections,
      totalPosts,
      totalEngagement,
      avgEngagementPerPost,
      totalLikes,
      totalComments,
      totalShares,
      postsCreated,
      likesGiven,
      commentsGiven,
      profileStrength: Math.round(profileStrength),
      networkQuality: Math.round(networkQuality * 10) / 10,
      socialActivity: Math.round(socialActivity * 10) / 10,
      contentPerformance: Math.round(contentPerformance * 10) / 10,
      // Analysis objects for insights
      profileAnalysis: {
        recommendations: profileViews === 0 ? ['Complete your LinkedIn profile', 'Add a professional photo', 'Write a compelling headline'] : []
      },
      networkAnalysis: {
        analysis: { recentGrowth: recentConnections },
        insights: [
          `${totalConnections} total connections`,
          `${recentConnections} new connections this month`,
          totalConnections > 500 ? 'Strong professional network' : 'Growing your network'
        ]
      },
      socialAnalysis: {
        metrics: { likesGiven },
        insights: [
          `${likesGiven} likes given`,
          `${commentsGiven} comments made`,
          likesGiven > 50 ? 'Active community member' : 'Increase engagement with others'
        ]
      },
      contentAnalysis: {
        metrics: { totalPosts },
        insights: [
          `${totalPosts} posts published`,
          `${avgEngagementPerPost} average engagement per post`,
          totalPosts > 10 ? 'Consistent content creator' : 'Start publishing more content'
        ]
      }
    };

    console.log('Dashboard - Processed metrics:', metrics);
    setProcessedMetrics(metrics);
  }, [profileData, connectionsData, postsData, changelogData, dmaToken, isLoading]);

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
            You have basic LinkedIn access. Enable data access permissions for
            full analytics and insights.
          </p>
          <Button
            variant="primary"
            onClick={() => (window.location.href = "/")}
          >
            Enable Full Access
          </Button>
        </div>
      </motion.div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="text-center py-12">
        {hasError.message?.includes("Rate Limit") ? (
          <div className="max-w-md mx-auto">
            <div className="mb-6">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} className="text-orange-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                LinkedIn API Rate Limit Exceeded
              </h2>
              <p className="text-gray-600 mb-4">
                You've reached the daily limit for LinkedIn API calls.
              </p>
            </div>
            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Try Again
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-red-600 mb-4">Error loading metrics: {hasError.message}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </>
        )}
      </div>
    );
  }

  if (!processedMetrics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No metrics available</p>
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
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Profile Strength"
          value={`${processedMetrics.profileStrength}%`}
          change={processedMetrics.profileStrength >= 80 ? "Excellent" : "Good"}
          icon={User}
          color="blue"
        />

        <StatsCard
          title="Network Quality"
          value={`${processedMetrics.networkQuality}/10`}
          change={`${
            processedMetrics.networkAnalysis?.analysis?.recentGrowth || 0
          } new this month`}
          icon={Users}
          color="green"
        />

        <StatsCard
          title="Social Activity"
          value={`${processedMetrics.socialActivity}/10`}
          change={`${
            processedMetrics.socialAnalysis?.metrics?.likesGiven || 0
          } interactions`}
          icon={Heart}
          color="purple"
        />

        <StatsCard
          title="Content Performance"
          value={`${processedMetrics.contentPerformance}/10`}
          change={`${
            processedMetrics.contentAnalysis?.metrics?.totalPosts || 0
          } posts published`}
          icon={FileText}
          color="orange"
        />
      </div>

      {/* Activity Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card variant="glass" className="p-6">
          <h3 className="text-xl font-bold mb-4">
            Your Activity (Past 28 days)
          </h3>
          <div className="space-y-4">
            <ActivityItem label="Posts Created" value={processedMetrics.postsCreated} />
            <ActivityItem
              label="Comments Given"
              value={processedMetrics.commentsGiven}
            />
            <ActivityItem label="Likes Given" value={processedMetrics.likesGiven} />
            <ActivityItem label="Total Posts" value={processedMetrics.totalPosts} />
          </div>
        </Card>

        <Card variant="glass" className="p-6">
          <h3 className="text-xl font-bold mb-4">Professional Insights</h3>
          <div className="space-y-4">
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-800">
                Profile Development
              </h4>
              {processedMetrics.profileAnalysis?.recommendations?.map(
                (rec: string, index: number) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-600">{rec}</span>
                  </div>
                )
              ) || (
                <span className="text-gray-500">Profile looking strong!</span>
              )}
            </div>

            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-800">
                Network Insights
              </h4>
              {processedMetrics.networkAnalysis?.insights?.map(
                (insight: string, index: number) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-gray-600">{insight}</span>
                  </div>
                )
              ) || (
                <span className="text-gray-500">Building your network...</span>
              )}
            </div>

            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-800">
                Content Strategy
              </h4>
              {processedMetrics.contentAnalysis?.insights?.map(
                (insight: string, index: number) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-gray-600">{insight}</span>
                  </div>
                )
              ) || (
                <span className="text-gray-500">Start publishing content!</span>
              )}
            </div>

            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-800">
                Social Engagement
              </h4>
              {processedMetrics.socialAnalysis?.insights?.map(
                (insight: string, index: number) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="text-gray-600">{insight}</span>
                  </div>
                )
              ) || (
                <span className="text-gray-500">Engage with your network!</span>
              )}
            </div>
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
            onClick={() => (window.location.href = "/?module=synergy")}
          >
            Check Synergy Partners
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full p-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
            onClick={() => (window.location.href = "/?module=postgen")}
          >
            Generate New Post
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full p-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all"
            onClick={() => (window.location.href = "/?module=analytics")}
          >
            View Analytics
          </motion.button>
        </div>
      </Card>
    </motion.div>
  );
};