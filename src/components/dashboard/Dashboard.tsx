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
} from "lucide-react";
import { StatsCard } from "./StatsCard";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { useAuthStore } from "../../stores/authStore";
import { LinkedInDataService } from "../../services/linkedin-data-service";
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
  const [metrics, setMetrics] = useState<any>({
    profileViews: 0,
    searchAppearances: 0,
    uniqueViewers: 0,
    connections: 0,
    connectionGrowth: 0,
    totalEngagement: 0,
    avgPerPost: "0",
    totalLikes: 0,
    totalComments: 0,
    totalPosts: 0,
    postsCreated: 0,
    commentsGiven: 0,
    likesGiven: 0,
    // New analytics metrics
    profileStrength: 0,
    networkQuality: 0,
    socialActivity: 0,
    contentPerformance: 0,
    profileAnalysis: null,
    networkAnalysis: null,
    socialAnalysis: null,
    contentAnalysis: null,
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

        // Load all metrics using the new analytics service
        const profileMetrics = await service.getProfileMetrics();

        const newMetrics = {
          profileViews: profileMetrics.profileViews || 0,
          searchAppearances: profileMetrics.searchAppearances || 0,
          uniqueViewers: profileMetrics.uniqueViewers || 0,
          connections: profileMetrics.totalConnections || 0,
          connectionGrowth:
            profileMetrics.networkAnalysis?.analysis?.recentGrowth || 0,
          totalEngagement: profileMetrics.totalEngagement || 0,
          avgPerPost: "0", // Will be calculated from posts
          totalLikes: profileMetrics.totalLikes || 0,
          totalComments: profileMetrics.totalComments || 0,
          totalPosts: profileMetrics.totalPosts || 0,
          postsCreated: profileMetrics.totalPosts || 0,
          commentsGiven: profileMetrics.likesGiven || 0,
          likesGiven: profileMetrics.likesGiven || 0,
          // New analytics metrics
          profileStrength: profileMetrics.profileStrength || 0,
          networkQuality: profileMetrics.networkQuality || 0,
          socialActivity: profileMetrics.socialActivity || 0,
          contentPerformance: profileMetrics.contentPerformance || 0,
          profileAnalysis: profileMetrics.profileAnalysis || null,
          networkAnalysis: profileMetrics.networkAnalysis || null,
          socialAnalysis: profileMetrics.socialAnalysis || null,
          contentAnalysis: profileMetrics.contentAnalysis || null,
        };

        setMetrics(newMetrics);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load dashboard metrics"
        );
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
        {error.includes("Rate Limit") ? (
          <div className="max-w-md mx-auto">
            <div className="mb-6">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-orange-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                LinkedIn API Rate Limit Exceeded
              </h2>
              <p className="text-gray-600 mb-4">
                You've reached the daily limit for LinkedIn API calls. This is a
                LinkedIn restriction, not an issue with your account.
              </p>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-orange-800 mb-2">
                  What this means:
                </h3>
                <ul className="text-sm text-orange-700 space-y-1">
                  <li>• LinkedIn limits DMA API calls per day</li>
                  <li>• Your data is still accessible</li>
                  <li>• Limits reset at midnight Pacific Time</li>
                  <li>• This is normal for active users</li>
                </ul>
              </div>
            </div>
            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Try Again
              </Button>
              <Button
                variant="primary"
                onClick={() => (window.location.href = "/?module=dma-test")}
                className="w-full"
              >
                Test API Status
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-red-600 mb-4">Error loading metrics: {error}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </>
        )}
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
    const trends = posts.slice(0, 10).map((post) => ({
      date: new Date(post.date).toLocaleDateString(),
      likes: post.engagement.likes,
      comments: post.engagement.comments,
      shares: post.engagement.shares,
    }));
    return trends.reverse();
  };

  const prepareContentMixData = (contentMix: Record<string, number>) => {
    return Object.entries(contentMix).map(([type, count]) => ({
      name: type,
      value: count,
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
        <StatsCard
          title="Profile Strength"
          value={`${metrics.profileStrength || 0}%`}
          change={metrics.profileStrength >= 80 ? "Excellent" : "Good"}
          icon={User}
          color="blue"
        />

        <StatsCard
          title="Network Quality"
          value={`${metrics.networkQuality || 0}/10`}
          change={`${
            metrics.networkAnalysis?.analysis?.recentGrowth || 0
          } new this month`}
          icon={Users}
          color="green"
        />

        <StatsCard
          title="Social Activity"
          value={`${metrics.socialActivity || 0}/10`}
          change={`${
            metrics.socialAnalysis?.metrics?.likesGiven || 0
          } interactions`}
          icon={Heart}
          color="purple"
        />

        <StatsCard
          title="Content Performance"
          value={`${metrics.contentPerformance || 0}/10`}
          change={`${
            metrics.contentAnalysis?.metrics?.totalPosts || 0
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
            <ActivityItem label="Posts Created" value={metrics.postsCreated} />
            <ActivityItem
              label="Comments Given"
              value={metrics.commentsGiven}
            />
            <ActivityItem label="Likes Given" value={metrics.likesGiven} />
            <ActivityItem label="Total Posts" value={metrics.totalPosts} />
          </div>
        </Card>

        <Card variant="glass" className="p-6">
          <h3 className="text-xl font-bold mb-4">Professional Insights</h3>
          <div className="space-y-4">
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-800">
                Profile Development
              </h4>
              {metrics.profileAnalysis?.recommendations?.map(
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
              {metrics.networkAnalysis?.insights?.map(
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
              {metrics.contentAnalysis?.insights?.map(
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
              {metrics.socialAnalysis?.insights?.map(
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
