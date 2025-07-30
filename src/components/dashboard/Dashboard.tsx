import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Zap, RefreshCw, Database, TrendingUp, Users, FileText, Heart } from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { useAuthStore } from "../../stores/authStore";
import { useDashboardData } from "../../hooks/useDashboardData";
import { ProfileEvaluationCard } from "./ProfileEvaluationCard";
import { SummaryKPIsCard } from "./SummaryKPIsCard";
import { MiniTrendsCard } from "./MiniTrendsCard";
import { QuickStatsCard } from "./QuickStatsCard";
import { useAppStore } from "../../stores/appStore";

export const Dashboard = () => {
  const { dmaToken } = useAuthStore();
  const { setCurrentModule } = useAppStore();
  const { data: dashboardData, isLoading, error, refetch } = useDashboardData();
  const [debugMode, setDebugMode] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);

  const handleRefetch = async () => {
    setIsRefetching(true);
    try {
      await refetch();
    } finally {
      setIsRefetching(false);
    }
  };

  // Add test function to check data flow
  const testDataFlow = async () => {
    console.log("Testing data flow...");
    console.log("DMA Token present:", !!dmaToken);
    console.log("DMA Token value:", dmaToken ? dmaToken.substring(0, 20) + "..." : "null");
    console.log("Dashboard data:", dashboardData);
    console.log("Loading state:", isLoading);
    console.log("Error state:", error);
    
    // Test direct API call
    if (dmaToken) {
      try {
        console.log("Testing direct API call...");
        const response = await fetch('/.netlify/functions/dashboard-data', {
          headers: {
            'Authorization': `Bearer ${dmaToken}`,
            'Content-Type': 'application/json',
          },
        });
        console.log("Direct API response status:", response.status);
        const data = await response.json();
        console.log("Direct API response data:", data);
      } catch (apiError) {
        console.error("Direct API call failed:", apiError);
      }
    }
  };

  if (!dmaToken) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <div className="text-center py-12">
          <AlertCircle size={48} className="mx-auto text-orange-400 mb-4" />
          <h2 className="text-2xl font-bold mb-4">Limited Access Mode</h2>
          <p className="text-gray-600 mb-6">
            DMA token is missing. You need to complete the DMA authentication flow to access dashboard features.
          </p>
          <Button
            variant="primary"
            onClick={() => (window.location.href = "/")}
          >
            Complete DMA Authentication
          </Button>
        </div>
      </motion.div>
    );
  }

  if (isLoading || !dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">Loading LinkedIn analytics...</p>
        <p className="text-sm text-gray-500">This may take a moment for larger accounts</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Error Loading Dashboard
        </h2>
        <p className="text-gray-600 mb-4">
          {error.message || "Failed to load dashboard data"}
        </p>
        <div className="space-y-3">
          <Button variant="primary" onClick={handleRefetch} disabled={isRefetching}>
            <RefreshCw size={16} className="mr-2" />
            {isRefetching ? "Refreshing..." : "Try Again"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setDebugMode(!debugMode)}
          >
            {debugMode ? "Hide" : "Show"} Debug Info
          </Button>
          <Button
            variant="ghost"
            onClick={testDataFlow}
          >
            Test Data Flow
          </Button>
        </div>
        {debugMode && (
          <div className="mt-6 p-4 bg-gray-100 rounded-lg text-left">
            <h3 className="font-semibold mb-2">Debug Information:</h3>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(error, null, 2)}
            </pre>
          </div>
        )}
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
      {/* Header with Debug Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <p className="text-gray-600 mt-1">LinkedIn profile evaluation and key metrics</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDebugMode(!debugMode)}
          >
            <Database size={14} className="mr-1" />
            {debugMode ? "Hide" : "Show"} Debug
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefetch}
            disabled={isRefetching}
          >
            <RefreshCw size={14} className={`mr-1 ${isRefetching ? 'animate-spin' : ''}`} />
            {isRefetching ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Debug Panel */}
      {debugMode && dashboardData && (
        <Card variant="glass" className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold flex items-center text-blue-900">
              <Database size={16} className="mr-2" />
              Debug Information
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDebugMode(false)}
            >
              Hide
            </Button>
          </div>
          <div className="text-sm space-y-3 text-blue-800">
            <div className="flex items-center space-x-2">
              <span className="font-medium">Last Updated:</span>
              <span className="bg-white px-2 py-1 rounded text-blue-900">{new Date(dashboardData.lastUpdated).toLocaleString()}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-medium">DMA Token:</span>
              <span className={`px-2 py-1 rounded ${dmaToken ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {dmaToken ? 'Present' : 'Missing'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="bg-white p-3 rounded-lg">
                  <strong className="text-blue-900">Profile Evaluation:</strong>
                  <div className="mt-1 text-sm">Overall Score: <span className="font-bold">{dashboardData.profileEvaluation.overallScore}/10</span></div>
                  <div className="text-xs text-gray-600 mt-1">Scores: {Object.values(dashboardData.profileEvaluation.scores).join(', ')}</div>
                </div>
              </div>
              <div>
                <div className="bg-white p-3 rounded-lg">
                  <strong className="text-blue-900">Summary KPIs:</strong>
                  <div className="mt-1 text-sm space-y-1">
                    <div>Connections: <span className="font-bold">{dashboardData.summaryKPIs.totalConnections}</span></div>
                    <div>Posts (30d): <span className="font-bold">{dashboardData.summaryKPIs.postsLast30Days}</span></div>
                    <div>Engagement: <span className="font-bold">{dashboardData.summaryKPIs.engagementRate}</span></div>
                    <div>New Connections: <span className="font-bold">{dashboardData.summaryKPIs.connectionsLast30Days}</span></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg">
              <strong className="text-blue-900">Mini Trends:</strong>
              <div className="mt-1 text-xs space-y-1">
                <div>Posts: {dashboardData.miniTrends.posts.map(p => p.value).join(', ')}</div>
                <div>Engagements: {dashboardData.miniTrends.engagements.map(e => e.value).join(', ')}</div>
              </div>
            </div>
            <div className="mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={testDataFlow}
              >
                Test Data Flow
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Quick Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <QuickStatsCard
          title="Overall Score"
          value={`${dashboardData.profileEvaluation.overallScore}/10`}
          change={dashboardData.profileEvaluation.overallScore >= 7 ? "+Good" : "Needs Work"}
          icon={TrendingUp}
          color="blue"
          trend={dashboardData.profileEvaluation.overallScore >= 7 ? "up" : "down"}
        />
        <QuickStatsCard
          title="Total Connections"
          value={dashboardData.summaryKPIs.totalConnections.toLocaleString()}
          change={`+${dashboardData.summaryKPIs.connectionsLast30Days} this month`}
          icon={Users}
          color="green"
          trend="up"
        />
        <QuickStatsCard
          title="Posts (30d)"
          value={dashboardData.summaryKPIs.postsLast30Days}
          change={dashboardData.summaryKPIs.postsLast30Days >= 5 ? "Active" : "Low Activity"}
          icon={FileText}
          color="purple"
          trend={dashboardData.summaryKPIs.postsLast30Days >= 5 ? "up" : "down"}
        />
        <QuickStatsCard
          title="Engagement Rate"
          value={dashboardData.summaryKPIs.engagementRate}
          change={parseFloat(dashboardData.summaryKPIs.engagementRate) >= 3 ? "Strong" : "Growing"}
          icon={Heart}
          color="orange"
          trend={parseFloat(dashboardData.summaryKPIs.engagementRate) >= 3 ? "up" : "stable"}
        />
      </div>

      {/* Profile Evaluation */}
      <ProfileEvaluationCard
        scores={dashboardData.profileEvaluation.scores}
        overallScore={dashboardData.profileEvaluation.overallScore}
        explanations={dashboardData.profileEvaluation.explanations}
      />

      {/* Summary KPIs and Mini Trends */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SummaryKPIsCard kpis={dashboardData.summaryKPIs} />
        <MiniTrendsCard trends={dashboardData.miniTrends} />
      </div>

      {/* Quick Actions */}
      <Card variant="glass" className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold flex items-center text-gray-900">
            <Zap className="mr-2" size={20} />
            Quick Actions
          </h3>
          <div className="text-sm text-gray-500">
            Boost your LinkedIn presence
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full p-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl"
            onClick={() => setCurrentModule("analytics")}
          >
            <div className="flex items-center justify-center space-x-2">
              <span className="text-2xl">📊</span>
              <span className="font-semibold">View Detailed Analytics</span>
            </div>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full p-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl"
            onClick={() => setCurrentModule("postgen")}
          >
            <div className="flex items-center justify-center space-x-2">
              <span className="text-2xl">✍️</span>
              <span className="font-semibold">Generate New Post</span>
            </div>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full p-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg hover:shadow-xl"
            onClick={() => setCurrentModule("postpulse")}
          >
            <div className="flex items-center justify-center space-x-2">
              <span className="text-2xl">📈</span>
              <span className="font-semibold">Analyze Posts</span>
            </div>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full p-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-all shadow-lg hover:shadow-xl"
            onClick={() => setCurrentModule("scheduler")}
          >
            <div className="flex items-center justify-center space-x-2">
              <span className="text-2xl">📅</span>
              <span className="font-semibold">Schedule Content</span>
            </div>
          </motion.button>
        </div>
      </Card>
    </motion.div>
  );
};