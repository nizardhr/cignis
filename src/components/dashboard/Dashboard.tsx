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
  const [metrics, setMetrics] = useState({
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
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugData, setDebugData] = useState<any>(null);

  // Debug authentication state
  console.log("Dashboard - Auth state:", {
    hasAccessToken: !!accessToken,
    hasDmaToken: !!dmaToken,
    isBasicAuthenticated,
    isFullyAuthenticated,
    dmaTokenLength: dmaToken?.length || 0,
    accessTokenLength: accessToken?.length || 0,
  });

  const testDMAToken = async () => {
    if (!dmaToken) {
      console.log("No DMA token available for testing");
      return;
    }

    console.log("Testing DMA token directly...");
    console.log(
      "DMA token (first 20 chars):",
      dmaToken.substring(0, 20) + "..."
    );

    try {
      // Test profile snapshot
      console.log("Testing profile snapshot API...");
      const profileResponse = await fetch(
        "/.netlify/functions/linkedin-snapshot?domain=PROFILE",
        {
          headers: { Authorization: `Bearer ${dmaToken}` },
        }
      );

      console.log("Profile test response status:", profileResponse.status);
      console.log(
        "Profile test response headers:",
        Object.fromEntries(profileResponse.headers.entries())
      );

      const profileData = await profileResponse.json();
      console.log("Profile test raw data:", profileData);

      // Validate profile data structure
      if (profileData.elements && profileData.elements.length > 0) {
        console.log("✓ Profile data has elements array");
        const firstElement = profileData.elements[0];
        if (firstElement.snapshotData) {
          console.log(
            "✓ Profile data has snapshotData array with",
            firstElement.snapshotData.length,
            "items"
          );
          if (firstElement.snapshotData.length > 0) {
            console.log(
              "✓ First snapshot data item keys:",
              Object.keys(firstElement.snapshotData[0])
            );
          } else {
            console.log("✗ Profile snapshotData is empty");
          }
        } else {
          console.log("✗ Profile data missing snapshotData");
        }
      } else {
        console.log("✗ Profile data missing elements array or empty");
      }

      // Test changelog
      console.log("Testing changelog API...");
      const changelogResponse = await fetch(
        "/.netlify/functions/linkedin-changelog?count=10",
        {
          headers: { Authorization: `Bearer ${dmaToken}` },
        }
      );

      console.log("Changelog test response status:", changelogResponse.status);
      console.log(
        "Changelog test response headers:",
        Object.fromEntries(changelogResponse.headers.entries())
      );

      const changelogData = await changelogResponse.json();
      console.log("Changelog test raw data:", changelogData);

      // Validate changelog data structure
      if (changelogData.elements) {
        console.log(
          "✓ Changelog data has elements array with",
          changelogData.elements.length,
          "items"
        );
        if (changelogData.elements.length > 0) {
          console.log(
            "✓ First changelog item keys:",
            Object.keys(changelogData.elements[0])
          );
          console.log("✓ Resource names found:", [
            ...new Set(
              changelogData.elements.map((el: any) => el.resourceName)
            ),
          ]);
        } else {
          console.log("✗ Changelog elements array is empty");
        }
      } else {
        console.log("✗ Changelog data missing elements array");
      }

      // Test connections
      console.log("Testing connections API...");
      const connectionsResponse = await fetch(
        "/.netlify/functions/linkedin-snapshot?domain=CONNECTIONS",
        {
          headers: { Authorization: `Bearer ${dmaToken}` },
        }
      );

      console.log(
        "Connections test response status:",
        connectionsResponse.status
      );
      const connectionsData = await connectionsResponse.json();
      console.log("Connections test raw data:", connectionsData);

      // Validate connections data structure
      if (connectionsData.elements && connectionsData.elements.length > 0) {
        console.log("✓ Connections data has elements array");
        const firstElement = connectionsData.elements[0];
        if (firstElement.snapshotData) {
          console.log(
            "✓ Connections data has snapshotData array with",
            firstElement.snapshotData.length,
            "items"
          );
          if (firstElement.snapshotData.length > 0) {
            console.log(
              "✓ First connection item keys:",
              Object.keys(firstElement.snapshotData[0])
            );
          } else {
            console.log("✗ Connections snapshotData is empty");
          }
        } else {
          console.log("✗ Connections data missing snapshotData");
        }
      } else {
        console.log("✗ Connections data missing elements array or empty");
      }
    } catch (error) {
      console.error("DMA token test error:", error);
    }
  };

  useEffect(() => {
    const loadMetrics = async () => {
      if (!dmaToken) {
        console.log("Dashboard: No DMA token available");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log("Dashboard: Starting to load metrics with DMA token");
        const service = new LinkedInDataService();

        // Load all metrics in parallel
        const [profileData, engagementData, connectionsData, activityData] =
          await Promise.all([
            service.fetchProfileViews(dmaToken),
            service.calculateEngagementMetrics(dmaToken),
            service.fetchConnections(dmaToken),
            service.fetchActivityMetrics(dmaToken),
          ]);

        console.log("Dashboard: Loaded all metrics:", {
          profileData,
          engagementData,
          connectionsData,
          activityData,
        });

        // Store debug data
        setDebugData({
          profileData,
          engagementData,
          connectionsData,
          activityData,
        });

        // Calculate total posts from user posts in engagement data
        const totalPosts = Object.keys(
          engagementData.engagementByPost || {}
        ).length;

        const newMetrics = {
          profileViews: profileData.profileViews || 0,
          searchAppearances: profileData.searchAppearances || 0,
          uniqueViewers: profileData.uniqueViewers || 0,
          connections: connectionsData.total || 0,
          connectionGrowth: connectionsData.monthlyGrowth || 0,
          totalEngagement: engagementData.totalEngagement || 0,
          avgPerPost: engagementData.avgPerPost || "0",
          totalLikes: engagementData.totalLikes || 0,
          totalComments: engagementData.totalComments || 0,
          totalPosts: totalPosts,
          postsCreated: activityData.postsCreated || 0,
          commentsGiven: activityData.commentsGiven || 0,
          likesGiven: activityData.likesGiven || 0,
        };

        console.log("Dashboard: Setting metrics:", newMetrics);
        setMetrics(newMetrics);
      } catch (err) {
        console.error("Dashboard: Error loading metrics:", err);
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
          trend={
            metrics.connections > 0
              ? (
                  (metrics.connectionGrowth / metrics.connections) *
                  100
                ).toFixed(1)
              : "0"
          }
        />

        <MetricCard
          title="Total Engagement"
          value={metrics.totalEngagement}
          subtitle={`Past Year • ${metrics.avgPerPost} avg per post`}
          icon={<Heart size={24} className="text-white" />}
          trend={
            metrics.totalPosts > 0
              ? (
                  (metrics.totalEngagement / (metrics.totalPosts * 10)) *
                  100
                ).toFixed(1)
              : "0"
          }
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
          <h3 className="text-xl font-bold mb-4">Engagement Breakdown</h3>
          <div className="space-y-4">
            <ActivityItem
              label="Total Likes Received"
              value={metrics.totalLikes}
            />
            <ActivityItem
              label="Total Comments Received"
              value={metrics.totalComments}
            />
            <ActivityItem label="Average per Post" value={metrics.avgPerPost} />
            <ActivityItem
              label="Engagement Rate"
              value={`${
                metrics.totalPosts > 0
                  ? (
                      (metrics.totalEngagement / (metrics.totalPosts * 10)) *
                      100
                    ).toFixed(1)
                  : 0
              }%`}
            />
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

      {/* Debug Section - Remove this in production */}
      {debugData && (
        <Card variant="glass" className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <BarChart3 className="mr-2" size={20} />
            Debug Data (Development Only)
          </h3>
          <div className="space-y-4">
            <Button variant="outline" onClick={testDMAToken} className="mb-4">
              Test DMA Token Directly
            </Button>

            {/* Authentication State */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium mb-2">Authentication State:</h4>
              <div className="text-sm space-y-1">
                <div>
                  Access Token: {accessToken ? "✓ Present" : "✗ Missing"} (
                  {accessToken?.length || 0} chars)
                </div>
                <div>
                  DMA Token: {dmaToken ? "✓ Present" : "✗ Missing"} (
                  {dmaToken?.length || 0} chars)
                </div>
                <div>Basic Auth: {isBasicAuthenticated ? "✓ Yes" : "✗ No"}</div>
                <div>Full Auth: {isFullyAuthenticated ? "✓ Yes" : "✗ No"}</div>
                {dmaToken && (
                  <div>DMA Token Preview: {dmaToken.substring(0, 20)}...</div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Profile Data:</h4>
              <pre className="text-xs bg-gray-100 p-3 rounded-lg overflow-x-auto">
                {JSON.stringify(debugData.profileData, null, 2)}
              </pre>
            </div>
            <div>
              <h4 className="font-medium mb-2">Engagement Data:</h4>
              <pre className="text-xs bg-gray-100 p-3 rounded-lg overflow-x-auto">
                {JSON.stringify(debugData.engagementData, null, 2)}
              </pre>
            </div>
            <div>
              <h4 className="font-medium mb-2">Connections Data:</h4>
              <pre className="text-xs bg-gray-100 p-3 rounded-lg overflow-x-auto">
                {JSON.stringify(debugData.connectionsData, null, 2)}
              </pre>
            </div>
            <div>
              <h4 className="font-medium mb-2">Activity Data:</h4>
              <pre className="text-xs bg-gray-100 p-3 rounded-lg overflow-x-auto">
                {JSON.stringify(debugData.activityData, null, 2)}
              </pre>
            </div>
          </div>
        </Card>
      )}
    </motion.div>
  );
};
