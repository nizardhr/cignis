import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, TrendingUp, Users, MessageCircle, Eye, BarChart3, Heart, FileText, Info, RefreshCw, AlertCircle, Filter, Download, Share2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useAuthStore } from '../../stores/authStore';
import { useAnalyticsData } from '../../hooks/useAnalyticsData';
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
  AreaChart,
  Area
} from 'recharts';

type TimeRange = '7d' | '30d' | '90d';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658', '#ff7300'];

export const Analytics = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [debugMode, setDebugMode] = useState(false);
  const { dmaToken } = useAuthStore();
  const { data: analyticsData, isLoading, error, refetch } = useAnalyticsData(timeRange);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !analyticsData) {
    return (
      <div className="text-center py-12">
        <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Error Loading Analytics
        </h2>
        <p className="text-gray-600 mb-4">
          {error?.message || 'Failed to load analytics data'}
        </p>
        <div className="space-y-3">
          <Button variant="primary" onClick={() => refetch()}>
            <RefreshCw size={16} className="mr-2" />
            Try Again
          </Button>
          <Button
            variant="outline"
            onClick={() => setDebugMode(!debugMode)}
          >
            {debugMode ? "Hide" : "Show"} Debug Info
          </Button>
        </div>
        {debugMode && error && (
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
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">LinkedIn Analytics</h2>
          <p className="text-gray-600 mt-1">Comprehensive insights into your LinkedIn performance</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <Download size={16} className="mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Share2 size={16} className="mr-2" />
            Share
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDebugMode(!debugMode)}
          >
            <Eye size={16} className="mr-2" />
            {debugMode ? "Hide" : "Show"} Debug
          </Button>
        </div>
      </div>

      {/* Time Filter Section */}
      <Card variant="glass" className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Filter size={20} className="text-blue-600" />
            <div>
              <h3 className="font-semibold text-gray-900">Time Range</h3>
              <p className="text-sm text-gray-600">Select the period for analysis</p>
            </div>
          </div>
          <div className="flex space-x-2">
            {(['7d', '30d', '90d'] as TimeRange[]).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setTimeRange(range)}
                className={timeRange === range ? 'shadow-lg' : 'hover:bg-blue-100'}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Debug Panel */}
      {debugMode && analyticsData && (
        <Card variant="glass" className="p-6 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-yellow-900 flex items-center">
              <Eye size={16} className="mr-2" />
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
          <div className="text-sm space-y-3 text-yellow-800">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white p-3 rounded-lg">
                <div className="font-medium">Time Range</div>
                <div className="text-yellow-900">{analyticsData.timeRange}</div>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <div className="font-medium">Last Updated</div>
                <div className="text-yellow-900">{new Date(analyticsData.lastUpdated).toLocaleString()}</div>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <div className="font-medium">Data Points</div>
                <div className="text-yellow-900">{analyticsData.postsEngagementsTrend?.length || 0} trends</div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Posts & Engagements Trend */}
        <Card variant="glass" className="p-8 bg-gradient-to-br from-white to-blue-50 border-2 border-blue-100 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl">
                <TrendingUp size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Posts & Engagements</h3>
                <p className="text-sm text-gray-600">Activity and engagement trends</p>
              </div>
            </div>
            <div className="relative group">
              <Info size={18} className="text-gray-400 cursor-help hover:text-gray-600 transition-colors" />
              <div className="absolute bottom-full right-0 mb-2 w-80 p-4 bg-gray-900 text-white text-sm rounded-xl opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-xl">
                {analyticsData.scoreImpacts.postingActivity.description}
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={analyticsData.postsEngagementsTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                }} 
              />
              <Line type="monotone" dataKey="posts" stroke="#3B82F6" strokeWidth={3} name="Posts" dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }} />
              <Line type="monotone" dataKey="totalEngagement" stroke="#10B981" strokeWidth={3} name="Total Engagement" dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }} />
              <Line type="monotone" dataKey="likes" stroke="#EF4444" strokeWidth={2} name="Likes" strokeDasharray="5 5" />
              <Line type="monotone" dataKey="comments" stroke="#8B5CF6" strokeWidth={2} name="Comments" strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-4 p-4 bg-blue-50 rounded-xl">
            <p className="text-sm text-blue-800">
              <strong>Impact:</strong> {analyticsData.scoreImpacts.postingActivity.impact}
            </p>
          </div>
        </Card>

        {/* Connections Growth Chart */}
        <Card variant="glass" className="p-8 bg-gradient-to-br from-white to-green-50 border-2 border-green-100 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl">
                <Users size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Network Growth</h3>
                <p className="text-sm text-gray-600">Connection expansion over time</p>
              </div>
            </div>
            <div className="relative group">
              <Info size={18} className="text-gray-400 cursor-help hover:text-gray-600 transition-colors" />
              <div className="absolute bottom-full right-0 mb-2 w-80 p-4 bg-gray-900 text-white text-sm rounded-xl opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-xl">
                {analyticsData.scoreImpacts.networkGrowth.description}
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={analyticsData.connectionsGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                }} 
              />
              <Area 
                type="monotone" 
                dataKey="totalConnections" 
                stroke="#10B981" 
                fill="url(#colorConnections)" 
                strokeWidth={3}
              />
              <defs>
                <linearGradient id="colorConnections" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
            </AreaChart>
          </ResponsiveContainer>
          <div className="mt-4 p-4 bg-green-50 rounded-xl">
            <p className="text-sm text-green-800">
              <strong>Impact:</strong> {analyticsData.scoreImpacts.networkGrowth.impact}
            </p>
          </div>
        </Card>

        {/* Post Types Chart */}
        <Card variant="glass" className="p-8 bg-gradient-to-br from-white to-purple-50 border-2 border-purple-100 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl">
                <BarChart3 size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Content Types</h3>
                <p className="text-sm text-gray-600">Distribution of your content formats</p>
              </div>
            </div>
            <div className="relative group">
              <Info size={18} className="text-gray-400 cursor-help hover:text-gray-600 transition-colors" />
              <div className="absolute bottom-full right-0 mb-2 w-80 p-4 bg-gray-900 text-white text-sm rounded-xl opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-xl">
                {analyticsData.scoreImpacts.contentDiversity.description}
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={analyticsData.postTypesBreakdown}
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={40}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {analyticsData.postTypesBreakdown.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                }} 
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 p-4 bg-purple-50 rounded-xl">
            <p className="text-sm text-purple-800">
              <strong>Impact:</strong> {analyticsData.scoreImpacts.contentDiversity.impact}
            </p>
          </div>
        </Card>

        {/* Top Hashtags Chart */}
        <Card variant="glass" className="p-8 bg-gradient-to-br from-white to-orange-50 border-2 border-orange-100 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl">
                <FileText size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Top Hashtags</h3>
                <p className="text-sm text-gray-600">Most used hashtags in your content</p>
              </div>
            </div>
            <div className="relative group">
              <Info size={18} className="text-gray-400 cursor-help hover:text-gray-600 transition-colors" />
              <div className="absolute bottom-full right-0 mb-2 w-80 p-4 bg-gray-900 text-white text-sm rounded-xl opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-xl">
                Popular hashtags help increase content discoverability
              </div>
            </div>
          </div>
          {analyticsData.topHashtags.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={analyticsData.topHashtags} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" />
                <YAxis dataKey="hashtag" type="category" width={100} tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                  }} 
                />
                <Bar dataKey="count" fill="url(#colorHashtags)" radius={[0, 8, 8, 0]} />
                <defs>
                  <linearGradient id="colorHashtags" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0.8}/>
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500 bg-gray-50 rounded-xl">
              <div className="text-center">
                <BarChart3 size={48} className="mx-auto mb-4 text-gray-300" />
                <p className="font-medium">No hashtags found in your posts</p>
                <p className="text-sm mt-1">Start using hashtags to increase visibility</p>
              </div>
            </div>
          )}
          <div className="mt-4 p-4 bg-orange-50 rounded-xl">
            <p className="text-sm text-orange-800">
              <strong>Tip:</strong> Use 3-5 relevant hashtags per post to increase discoverability
            </p>
          </div>
        </Card>
      </div>

      {/* Second Row of Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Engagement per Post */}
        <Card variant="glass" className="p-8 bg-gradient-to-br from-white to-pink-50 border-2 border-pink-100 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl">
                <Heart size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Top Performing Posts</h3>
                <p className="text-sm text-gray-600">Posts with highest engagement</p>
              </div>
            </div>
            <div className="relative group">
              <Info size={18} className="text-gray-400 cursor-help hover:text-gray-600 transition-colors" />
              <div className="absolute bottom-full right-0 mb-2 w-80 p-4 bg-gray-900 text-white text-sm rounded-xl opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-xl">
                {analyticsData.scoreImpacts.engagementQuality.description}
              </div>
            </div>
          </div>
          {analyticsData.engagementPerPost.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={analyticsData.engagementPerPost}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="content" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                  }} 
                />
                <Bar dataKey="likes" stackId="a" fill="#EF4444" name="Likes" radius={[0, 0, 4, 4]} />
                <Bar dataKey="comments" stackId="a" fill="#8B5CF6" name="Comments" radius={[0, 0, 0, 0]} />
                <Bar dataKey="shares" stackId="a" fill="#10B981" name="Shares" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500 bg-gray-50 rounded-xl">
              <div className="text-center">
                <Heart size={48} className="mx-auto mb-4 text-gray-300" />
                <p className="font-medium">No engagement data available</p>
                <p className="text-sm mt-1">Start posting to see engagement metrics</p>
              </div>
            </div>
          )}
          <div className="mt-4 p-4 bg-pink-50 rounded-xl">
            <p className="text-sm text-pink-800">
              <strong>Impact:</strong> {analyticsData.scoreImpacts.engagementQuality.impact}
            </p>
          </div>
        </Card>

        {/* Messages Sent vs Received */}
        <Card variant="glass" className="p-8 bg-gradient-to-br from-white to-cyan-50 border-2 border-cyan-100 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl">
                <MessageCircle size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Message Activity</h3>
                <p className="text-sm text-gray-600">Communication patterns</p>
              </div>
            </div>
            <div className="relative group">
              <Info size={18} className="text-gray-400 cursor-help hover:text-gray-600 transition-colors" />
              <div className="absolute bottom-full right-0 mb-2 w-80 p-4 bg-gray-900 text-white text-sm rounded-xl opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-xl">
                {analyticsData.scoreImpacts.mutualInteractions.description}
              </div>
            </div>
          </div>
          {analyticsData.messagesSentReceived.some(d => d.sent > 0 || d.received > 0) ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={analyticsData.messagesSentReceived}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                  }} 
                />
                <Bar dataKey="sent" stackId="a" fill="#3B82F6" name="Sent" radius={[4, 4, 0, 0]} />
                <Bar dataKey="received" stackId="a" fill="#10B981" name="Received" radius={[0, 0, 4, 4]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500 bg-gray-50 rounded-xl">
              <div className="text-center">
                <MessageCircle size={48} className="mx-auto mb-4 text-gray-300" />
                <p className="font-medium">No message data available</p>
                <p className="text-sm mt-1">Message activity will appear here</p>
              </div>
            </div>
          )}
          <div className="mt-4 p-4 bg-cyan-50 rounded-xl">
            <p className="text-sm text-cyan-800">
              <strong>Impact:</strong> {analyticsData.scoreImpacts.mutualInteractions.impact}
            </p>
          </div>
        </Card>
      </div>

      {/* Audience Distribution */}
      <Card variant="glass" className="p-8 bg-gradient-to-br from-white to-gray-50 border-2 border-gray-100">
        <div className="flex items-center space-x-3 mb-8">
          <div className="p-3 bg-gradient-to-r from-gray-600 to-gray-700 rounded-xl">
            <Users size={24} className="text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Audience Analysis</h3>
            <p className="text-gray-600">Understanding your network composition</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Industry Distribution */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-lg font-bold text-gray-900">Industries</h4>
            <div className="relative group">
              <Info size={16} className="text-gray-400 cursor-help hover:text-gray-600 transition-colors" />
              <div className="absolute bottom-full right-0 mb-2 w-72 p-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-lg">
                {analyticsData.scoreImpacts.audienceRelevance.description}
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={analyticsData.audienceDistribution.industries}
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={30}
                dataKey="value"
                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {analyticsData.audienceDistribution.industries.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }} 
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Position Distribution */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-lg font-bold text-gray-900">Positions</h4>
            <div className="relative group">
              <Info size={16} className="text-gray-400 cursor-help hover:text-gray-600 transition-colors" />
              <div className="absolute bottom-full right-0 mb-2 w-72 p-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-lg">
                Professional connections enhance your network quality
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={analyticsData.audienceDistribution.positions.slice(0, 8)} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }} 
              />
              <Bar dataKey="value" fill="#82ca9d" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Location Distribution */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-lg font-bold text-gray-900">Locations</h4>
            <div className="relative group">
              <Info size={16} className="text-gray-400 cursor-help hover:text-gray-600 transition-colors" />
              <div className="absolute bottom-full right-0 mb-2 w-72 p-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-lg">
                Geographic diversity can expand your professional reach
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={analyticsData.audienceDistribution.locations.slice(0, 8)} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }} 
              />
              <Bar dataKey="value" fill="#ffc658" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        </div>
      </Card>

      {/* Score Improvement Tips */}
      <Card variant="glass" className="p-8 bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200">
        <div className="flex items-center space-x-3 mb-8">
          <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl">
            <TrendingUp size={24} className="text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Improvement Recommendations</h3>
            <p className="text-gray-600">Actionable tips to boost your LinkedIn performance</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Object.entries(analyticsData.scoreImpacts).slice(0, 6).map(([key, impact]) => (
            <motion.div 
              key={key} 
              className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-300"
              whileHover={{ y: -2 }}
            >
              <h4 className="font-bold text-gray-900 capitalize mb-3 text-lg">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </h4>
              <p className="text-sm text-gray-700 mb-4 leading-relaxed">{impact.description}</p>
              <ul className="text-sm text-gray-600 space-y-2">
                {impact.tips.map((tip, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></span>
                    <span className="leading-relaxed">{tip}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
};