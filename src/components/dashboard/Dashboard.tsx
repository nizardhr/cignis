import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Zap } from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { useAuthStore } from "../../stores/authStore";
import { useDashboardData } from "../../hooks/useDashboardData";
import { ProfileEvaluationCard } from "./ProfileEvaluationCard";
import { SummaryKPIsCard } from "./SummaryKPIsCard";
import { MiniTrendsCard } from "./MiniTrendsCard";
import { useAppStore } from "../../stores/appStore";

export const Dashboard = () => {
  const { dmaToken } = useAuthStore();
  const { setCurrentModule } = useAppStore();
  const { data: dashboardData, isLoading, error } = useDashboardData();

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

  if (isLoading || !dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        {error.message?.includes("Rate Limit") ? (
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
            <p className="text-red-600 mb-4">Error loading dashboard: {error.message}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </>
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
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Zap className="mr-2" size={20} />
          Quick Actions
        </h3>
        <div className="space-y-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full p-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all"
            onClick={() => setCurrentModule("analytics")}
          >
            View Detailed Analytics
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
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full p-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all"
            onClick={() => setCurrentModule("scheduler")}
          >
            Schedule Content
          </motion.button>
        </div>
      </Card>
    </motion.div>
  );
};