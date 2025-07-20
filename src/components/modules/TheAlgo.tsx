import { useState } from 'react';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Zap, Clock, Users, Eye } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useLinkedInChangelog } from '../../hooks/useLinkedInData';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { analyzePostPerformance } from '../../services/openai';

interface AlgoInsight {
  metric: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  recommendation: string;
}

export const TheAlgo = () => {
  const { data: changelogData, isLoading } = useLinkedInChangelog();
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const algoInsights = useMemo(() => {
    if (!changelogData) return null;

    const now = Date.now();
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = now - (14 * 24 * 60 * 60 * 1000);

    const thisWeek = changelogData.elements?.filter(e => e.capturedAt >= oneWeekAgo) || [];
    const lastWeek = changelogData.elements?.filter(e => 
      e.capturedAt >= twoWeeksAgo && e.capturedAt < oneWeekAgo
    ) || [];

    const thisWeekPosts = thisWeek.filter(e => e.resourceName === 'ugcPosts');
    const lastWeekPosts = lastWeek.filter(e => e.resourceName === 'ugcPosts');

    const thisWeekLikes = thisWeek.filter(e => e.resourceName === 'socialActions/likes' && e.method === 'CREATE');
    const lastWeekLikes = lastWeek.filter(e => e.resourceName === 'socialActions/likes' && e.method === 'CREATE');

    const thisWeekComments = thisWeek.filter(e => e.resourceName === 'socialActions/comments' && e.method === 'CREATE');
    const lastWeekComments = lastWeek.filter(e => e.resourceName === 'socialActions/comments' && e.method === 'CREATE');

    // Calculate metrics
    const postFrequency = thisWeekPosts.length;
    const postFrequencyChange = lastWeekPosts.length > 0 ? 
      ((thisWeekPosts.length - lastWeekPosts.length) / lastWeekPosts.length) * 100 : 0;

    const engagementRate = thisWeekPosts.length > 0 ? 
      (thisWeekLikes.length + thisWeekComments.length) / thisWeekPosts.length : 0;
    const lastWeekEngagementRate = lastWeekPosts.length > 0 ? 
      (lastWeekLikes.length + lastWeekComments.length) / lastWeekPosts.length : 0;
    const engagementChange = lastWeekEngagementRate > 0 ? 
      ((engagementRate - lastWeekEngagementRate) / lastWeekEngagementRate) * 100 : 0;

    // Analyze posting times
    const postTimes = thisWeekPosts.map(p => new Date(p.capturedAt).getHours());
    const avgPostTime = postTimes.reduce((acc, time) => acc + time, 0) / postTimes.length || 9;

    // Reach analysis from processedActivity
    const postsWithReach = thisWeekPosts.filter(p => p.processedActivity?.distribution?.feedDistribution);
    const avgReach = postsWithReach.length > 0 ? 
      postsWithReach.reduce((acc, post) => {
        const impressions = post.processedActivity?.distribution?.feedDistribution?.impressions || 0;
        return acc + impressions;
      }, 0) / postsWithReach.length : 0;

    const insights: AlgoInsight[] = [
      {
        metric: 'Post Frequency',
        value: postFrequency,
        change: postFrequencyChange,
        trend: postFrequencyChange > 0 ? 'up' : postFrequencyChange < 0 ? 'down' : 'stable',
        recommendation: postFrequency < 3 ? 'Increase posting frequency to 3-5 times per week' : 
                      postFrequency > 7 ? 'Consider reducing frequency to avoid audience fatigue' :
                      'Great posting frequency! Keep it consistent.'
      },
      {
        metric: 'Engagement Rate',
        value: Math.round(engagementRate * 100) / 100,
        change: engagementChange,
        trend: engagementChange > 0 ? 'up' : engagementChange < 0 ? 'down' : 'stable',
        recommendation: engagementRate < 5 ? 'Focus on more engaging content formats like questions and polls' :
                       engagementRate > 10 ? 'Excellent engagement! Scale your successful content themes' :
                       'Good engagement. Try varying your content types.'
      },
      {
        metric: 'Optimal Posting Time',
        value: Math.round(avgPostTime),
        change: 0,
        trend: 'stable',
        recommendation: avgPostTime < 8 || avgPostTime > 17 ? 
                       'Consider posting during business hours (9-17) for better visibility' :
                       'Good timing! Your audience is most active during business hours.'
      },
      {
        metric: 'Reach Score',
        value: Math.round(avgReach),
        change: 0,
        trend: 'stable',
        recommendation: avgReach < 100 ? 
                       'Increase engagement in first hour after posting to boost reach' :
                       'Strong reach! Your content is performing well in the algorithm.'
      }
    ];

    return insights;
  }, [changelogData]);

  const generateAIAnalysis = async () => {
    if (!changelogData) return;
    
    setIsAnalyzing(true);
    try {
      const posts = changelogData.elements?.filter(e => e.resourceName === 'ugcPosts') || [];
      const engagement = changelogData.elements?.filter(e => 
        e.resourceName === 'socialActions/likes' || e.resourceName === 'socialActions/comments'
      ) || [];
      
      const analysis = await analyzePostPerformance(posts, engagement);
      setAiAnalysis(analysis);
    } catch (error) {
      console.error('Failed to generate AI analysis:', error);
      setAiAnalysis('AI analysis temporarily unavailable. Please check your OpenAI API configuration.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
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
        <h2 className="text-2xl font-bold">The Algo</h2>
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            onClick={generateAIAnalysis}
            disabled={isAnalyzing}
          >
            <Zap size={16} className="mr-2" />
            {isAnalyzing ? 'Analyzing...' : 'AI Analysis'}
          </Button>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Clock size={16} />
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* AI Analysis Section */}
      {aiAnalysis && (
        <Card variant="glass" className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Zap className="mr-2 text-purple-500" size={20} />
            AI Algorithm Analysis
          </h3>
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-line text-gray-700 dark:text-gray-300">
              {aiAnalysis}
            </div>
          </div>
        </Card>
      )}

      {/* Algorithm Status */}
      <Card variant="glass" className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Algorithm Performance</h3>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-600">Active</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">85%</div>
            <div className="text-sm text-gray-500">Visibility Score</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">+12%</div>
            <div className="text-sm text-gray-500">Weekly Growth</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">A-</div>
            <div className="text-sm text-gray-500">Algo Grade</div>
          </div>
        </div>
      </Card>

      {/* Real-time Insights */}
      {algoInsights && (
        <div className="space-y-4">
          {algoInsights.map((insight, index) => (
            <motion.div
              key={insight.metric}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card variant="glass" className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-xl ${
                      insight.metric === 'Post Frequency' ? 'bg-blue-500' :
                      insight.metric === 'Engagement Rate' ? 'bg-green-500' :
                      insight.metric === 'Optimal Posting Time' ? 'bg-purple-500' :
                      'bg-orange-500'
                    }`}>
                      {insight.metric === 'Post Frequency' && <Users size={24} className="text-white" />}
                      {insight.metric === 'Engagement Rate' && <Zap size={24} className="text-white" />}
                      {insight.metric === 'Optimal Posting Time' && <Clock size={24} className="text-white" />}
                      {insight.metric === 'Reach Score' && <Eye size={24} className="text-white" />}
                    </div>
                    <div>
                      <h4 className="font-semibold">{insight.metric}</h4>
                      <p className="text-sm text-gray-600">{insight.recommendation}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      {insight.metric === 'Optimal Posting Time' ? `${insight.value}:00` : insight.value}
                    </div>
                    {insight.change !== 0 && (
                      <div className={`flex items-center space-x-1 text-sm ${
                        insight.trend === 'up' ? 'text-green-600' : 
                        insight.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {insight.trend === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        <span>{Math.abs(insight.change).toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Algorithm Tips */}
      <Card variant="glass" className="p-6">
        <h3 className="text-lg font-semibold mb-4">Algorithm Tips</h3>
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
              1
            </div>
            <div>
              <p className="font-medium">Engage Early</p>
              <p className="text-sm text-gray-600">Respond to comments within the first hour for maximum reach</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
              2
            </div>
            <div>
              <p className="font-medium">Consistent Posting</p>
              <p className="text-sm text-gray-600">Maintain a regular posting schedule to stay visible</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
              3
            </div>
            <div>
              <p className="font-medium">Native Content</p>
              <p className="text-sm text-gray-600">Upload videos directly to LinkedIn instead of linking externally</p>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};