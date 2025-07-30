import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Zap, RefreshCw, Database, TrendingUp, Users, FileText, Heart, Info, ExternalLink } from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { useAuthStore } from "../../stores/authStore";
import { useDashboardData } from "../../hooks/useDashboardData";
import { QuickStatsCard } from "./QuickStatsCard";
import { useAppStore } from "../../stores/appStore";

export const Dashboard = () => {
  const { dmaToken } = useAuthStore();
  const { setCurrentModule } = useAppStore();
  const { data: dashboardData, isLoading, error, refetch } = useDashboardData();
  const [debugMode, setDebugMode] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);

  // Handle DMA reconnect scenario
  const handleRefetch = async () => {
    setIsRefetching(true);
    try {
      await refetch();
    } finally {
      setIsRefetching(false);
    }
  };

  const handleReconnect = () => {
    // Clear tokens and redirect to auth flow
    localStorage.clear();
    window.location.href = '/';
  };

  // Check for DMA reconnect needed
  if (dashboardData?.needsReconnect) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <Card variant="glass" className="p-8 text-center bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-200">
          <AlertCircle size={64} className="mx-auto text-orange-500 mb-6" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">LinkedIn Data Access Required</h2>
          <p className="text-gray-700 mb-6 max-w-2xl mx-auto">
            {dashboardData.error === "DMA not enabled" 
              ? "Your LinkedIn account needs to be reconnected with data access permissions to view analytics."
              : "We need to verify your LinkedIn data access permissions."}
          </p>
          <div className="space-y-4">
            <Button
              variant="primary"
              onClick={handleReconnect}
              className="px-8 py-3"
            >
              <ExternalLink size={20} className="mr-2" />
              Reconnect LinkedIn Account
            </Button>
            <p className="text-sm text-gray-600">
              This will redirect you to LinkedIn to grant data access permissions.
            </p>
          </div>
        </Card>
      </motion.div>
    );
  }

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
        const response = await fetch('/api/dashboard-data', {
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

  // Show empty state for no recent activity
  if (dashboardData?.metadata?.hasRecentActivity === false) {
    return (
      <EmptyActivityState 
        dashboardData={dashboardData} 
        onRefetch={handleRefetch} 
        isRefetching={isRefetching} 
      />
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
          <p className="text-gray-600 mt-1">LinkedIn performance insights from the last 28 days</p>
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
        <Card variant="glass" className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
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
              <span className="font-medium">Data Source:</span>
              <span className={`px-2 py-1 rounded ${dashboardData.metadata.hasRecentActivity ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                {dashboardData.metadata.dataSource}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="bg-white p-3 rounded-lg">
                  <strong className="text-blue-900">Scores:</strong>
                  <div className="mt-1 text-sm">Overall: <span className="font-bold">{dashboardData.scores.overall}/10</span></div>
                  <div className="text-xs text-gray-600 mt-1">Individual: {Object.values(dashboardData.scores).slice(1).join(', ')}</div>
                </div>
              </div>
              <div>
                <div className="bg-white p-3 rounded-lg">
                  <strong className="text-blue-900">Summary:</strong>
                  <div className="mt-1 text-sm space-y-1">
                    <div>Connections: <span className="font-bold">{dashboardData.summary.totalConnections}</span></div>
                    <div>Posts (28d): <span className="font-bold">{dashboardData.summary.posts30d}</span></div>
                    <div>Engagement Rate: <span className="font-bold">{dashboardData.summary.engagementRatePct}%</span></div>
                    <div>New Connections: <span className="font-bold">{dashboardData.summary.newConnections28d}</span></div>
                  </div>
                </div>
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
          value={`${dashboardData.scores.overall}/10`}
          change={dashboardData.scores.overall >= 7 ? "+Good" : "Needs Work"}
          icon={TrendingUp}
          color="blue"
          trend={dashboardData.scores.overall >= 7 ? "up" : "down"}
        />
        <QuickStatsCard
          title="Total Connections"
          value={dashboardData.summary.totalConnections.toLocaleString()}
          change={`+${dashboardData.summary.newConnections28d} (28 days)`}
          icon={Users}
          color="green"
          trend="up"
        />
        <QuickStatsCard
          title="Posts (28d)"
          value={dashboardData.summary.posts30d}
          change={dashboardData.summary.posts30d >= 5 ? "Active" : "Low Activity"}
          icon={FileText}
          color="purple"
          trend={dashboardData.summary.posts30d >= 5 ? "up" : "down"}
        />
        <QuickStatsCard
          title="Engagement Rate"
          value={`${dashboardData.summary.engagementRatePct}%`}
          change={dashboardData.summary.engagementRatePct >= 3 ? "Strong" : "Growing"}
          icon={Heart}
          color="orange"
          trend={dashboardData.summary.engagementRatePct >= 3 ? "up" : "stable"}
        />
      </div>

      {/* Profile Evaluation Scores */}
      <Card variant="glass" className="p-8 bg-gradient-to-br from-white to-blue-50 border-2 border-blue-100 hover:shadow-xl transition-all duration-300">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl">
              <TrendingUp size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Profile Evaluation</h3>
              <p className="text-gray-600">LinkedIn performance analysis (last 28 days)</p>
            </div>
          </div>
          <div className="text-center">
            <div className={`text-4xl font-bold mb-1 ${
              dashboardData.scores.overall >= 8 ? 'text-green-600' : 
              dashboardData.scores.overall >= 5 ? 'text-yellow-600' : 
              'text-red-600'
            }`}>
              {dashboardData.scores.overall}/10
            </div>
            <div className={`text-sm font-semibold px-3 py-1 rounded-full ${
              dashboardData.scores.overall >= 8 ? 'bg-green-100 text-green-800' : 
              dashboardData.scores.overall >= 5 ? 'bg-yellow-100 text-yellow-800' : 
              'bg-red-100 text-red-800'
            }`}>
              {dashboardData.scores.overall >= 8 ? 'Excellent' : 
               dashboardData.scores.overall >= 5 ? 'Good' : 'Needs Work'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(dashboardData.scores).filter(([key]) => key !== 'overall').map(([key, score], index) => (
            <ScoreCard 
              key={key}
              title={formatScoreTitle(key)}
              score={score}
              explanation={dashboardData.explanations[key]}
              index={index}
            />
          ))}
        </div>
      </Card>

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

const ScoreCard = ({ title, score, explanation, index }) => {
  const getScoreColor = (score) => {
    if (score === null) return 'text-gray-500 bg-gray-100 border-gray-200';
    if (score >= 8) return 'text-green-600 bg-green-100 border-green-200';
    if (score >= 5) return 'text-yellow-600 bg-yellow-100 border-yellow-200';
    return 'text-red-600 bg-red-100 border-red-200';
  };

  const getScoreIcon = (score) => {
    if (score === null) return '—';
    if (score >= 8) return '✓';
    if (score >= 5) return '○';
    return '✗';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group relative"
    >
      <div className={`flex items-center justify-between p-4 rounded-xl border-2 hover:shadow-lg transition-all duration-300 bg-white ${getScoreColor(score)}`}>
        <div className="flex items-center space-x-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-lg ${getScoreColor(score)}`}>
            {getScoreIcon(score)}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{title}</p>
            <p className="text-sm text-gray-600">
              {score === null ? 'Not Available' : 
               score >= 8 ? 'Excellent' : 
               score >= 5 ? 'Good' : 'Needs Work'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`text-xl font-bold ${getScoreColor(score).split(' ')[0]}`}>
            {score === null ? '—' : score}
          </span>
          <div className="relative">
            <Info size={16} className="text-gray-400 cursor-help" />
            <div className="absolute bottom-full right-0 mb-2 w-80 p-4 bg-gray-900 text-white text-sm rounded-xl opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none shadow-xl">
              {explanation}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const EmptyActivityState = ({ dashboardData, onRefetch, isRefetching }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <p className="text-gray-600 mt-1">No recent activity (28 days). Showing snapshot totals.</p>
        </div>
        <Button
          variant="outline"
          onClick={onRefetch}
          disabled={isRefetching}
        >
          <RefreshCw size={14} className={`mr-1 ${isRefetching ? 'animate-spin' : ''}`} />
          {isRefetching ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <Card variant="glass" className="p-12 text-center bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
        <div className="max-w-2xl mx-auto">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText size={32} className="text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">No Recent LinkedIn Activity</h3>
          <p className="text-gray-700 mb-8 leading-relaxed">
            We haven't detected any posts, comments, or network activity in the last 28 days. 
            Your dashboard will show meaningful insights once you start engaging on LinkedIn.
          </p>
          
          {/* Show baseline metrics if available */}
          {dashboardData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white p-4 rounded-xl border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">{dashboardData.summary?.totalConnections || 0}</div>
                <div className="text-sm text-gray-600">Total Connections</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">{dashboardData.scores?.profileCompleteness || 0}/10</div>
                <div className="text-sm text-gray-600">Profile Completeness</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">{dashboardData.scores?.professionalBrand || 0}/10</div>
                <div className="text-sm text-gray-600">Professional Brand</div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900">Get Started with LinkedIn Growth</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                variant="primary"
                onClick={() => window.open('https://linkedin.com', '_blank')}
                className="flex items-center justify-center space-x-2"
              >
                <ExternalLink size={16} />
                <span>Post on LinkedIn</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentModule('postgen')}
                className="flex items-center justify-center space-x-2"
              >
                <Zap size={16} />
                <span>Generate Content</span>
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

function formatScoreTitle(key) {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
}