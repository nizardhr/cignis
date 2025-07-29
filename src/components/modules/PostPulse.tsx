import { useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Copy,
  Send,
  RefreshCw,
  Heart,
  MessageCircle,
  Share,
  Clock,
  Zap,
  Eye,
  Calendar,
  ChevronDown,
  Database,
  AlertCircle,
  Image as ImageIcon,
} from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { Pagination } from "../ui/Pagination";
import { CacheStatusIndicator } from "../ui/CacheStatusIndicator";
import { usePostPulseData } from "../../hooks/usePostPulseData";
import { useAppStore } from "../../stores/appStore";
import { PostPulseCache } from "../../services/postpulse-cache";
import { ProcessedPost } from "../../services/postpulse-cache";
import { useAuthStore } from "../../stores/authStore";

export const PostPulse = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  const [timeFilter, setTimeFilter] = useState<"7d" | "30d" | "90d">("7d");
  const [debugMode, setDebugMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<string>>(new Set());
  const { setCurrentModule } = useAppStore();
  const { dmaToken } = useAuthStore();

  // Use the enhanced data hook
  const {
    posts,
    isLoading,
    isInitialLoading,
    isRefetching,
    error,
    cacheStatus,
    pagination,
    dataSources,
  } = usePostPulseData({
    timeFilter,
    searchTerm,
    page: currentPage,
    pageSize: 12,
  });

  const handleImageError = (postId: string) => {
    setImageLoadErrors(prev => new Set([...prev, postId]));
  };

  const getThumbnailUrl = (post: ProcessedPost): string | null => {
    if (imageLoadErrors.has(post.id)) {
      return null;
    }
    
    if (post.mediaAssetId && dmaToken) {
      // Use our media download function for LinkedIn assets
      return `/.netlify/functions/linkedin-media-download?assetId=${post.mediaAssetId}`;
    }
    
    // Fallback to direct URL if available
    return post.thumbnail || null;
  };
  const handleRefresh = () => {
    PostPulseCache.clearCache();
    window.location.reload();
  };

  const togglePostSelection = (postId: string) => {
    setSelectedPosts((prev) =>
      prev.includes(postId)
        ? prev.filter((id) => id !== postId)
        : [...prev, postId]
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleRepurpose = (post: ProcessedPost) => {
    // Store the post in sessionStorage for PostGen to access
    sessionStorage.setItem(
      "repurposePost",
      JSON.stringify({
        text: post.text,
        originalDate: new Date(post.timestamp).toISOString(),
        engagement: {
          likes: post.likes,
          comments: post.comments,
          shares: post.shares,
        },
        url: post.url,
        mediaType: post.mediaType,
      })
    );

    // Navigate to PostGen rewrite section
    setCurrentModule("postgen");
    // Update URL to show the module change
    window.history.pushState({}, "", "/?module=postgen&tab=rewrite");
  };

  const getPostStatus = (post: ProcessedPost) => {
    if (post.daysSincePosted < 7) {
      return {
        label: "Too Recent",
        color: "bg-red-100 text-red-800",
        icon: Clock,
      };
    } else if (post.daysSincePosted < 30) {
      return {
        label: `${30 - post.daysSincePosted} days left`,
        color: "bg-yellow-100 text-yellow-800",
        icon: Clock,
      };
    } else {
      return {
        label: "Ready to Repost",
        color: "bg-green-100 text-green-800",
        icon: Zap,
      };
    }
  };

  const truncateText = (text: string, maxLength: number = 150): string => {
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + "...";
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Reset to page 1 when filters change
  const handleTimeFilterChange = (filter: "7d" | "30d" | "90d") => {
    setTimeFilter(filter);
    setCurrentPage(1);
  };

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  if (isInitialLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-center h-64"
      >
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading your LinkedIn posts...</p>
          <p className="text-sm text-gray-500">Fetching historical data...</p>
        </div>
      </motion.div>
    );
  }

  // Show error state if data fetching failed
  if (error && posts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center py-12"
      >
        <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Error Loading Posts
        </h3>
        <p className="text-gray-600 mb-4">
          We encountered an error while loading your LinkedIn posts:
        </p>
        <p className="text-sm text-red-600 mb-6">{error.message}</p>
        <Button variant="primary" onClick={handleRefresh}>
          <RefreshCw size={16} className="mr-2" />
          Try Again
        </Button>
      </motion.div>
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
        <div>
          <h2 className="text-2xl font-bold">PostPulse</h2>
          <p className="text-gray-600 mt-1">
            Your LinkedIn posts from the last {timeFilter}
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={() => setDebugMode(!debugMode)}
            className="text-xs"
          >
            {debugMode ? "Hide Debug" : "Debug Mode"}
          </Button>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefetching}
          >
            <RefreshCw
              size={16}
              className={`mr-2 ${isRefetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button variant="primary" disabled={selectedPosts.length === 0}>
            <Send size={16} className="mr-2" />
            Push to PostGen ({selectedPosts.length})
          </Button>
        </div>
      </div>

      {/* Cache Status Indicator */}
      <Card variant="glass" className="p-4">
        <CacheStatusIndicator
          cacheStatus={cacheStatus}
          dataSources={dataSources}
          isRefetching={isRefetching}
          onRefresh={handleRefresh}
        />
      </Card>

      {/* Debug Information */}
      {debugMode && (
        <Card variant="glass" className="p-4 bg-yellow-50">
          <h3 className="font-semibold mb-2">Debug Information:</h3>
          <div className="text-sm space-y-1">
            <div>Total Posts: {pagination.totalPosts}</div>
            <div>
              Current Page: {pagination.currentPage} of {pagination.totalPages}
            </div>
            <div>Posts on Page: {posts.length}</div>
            <div>Time Filter: {timeFilter}</div>
            <div>Search Term: {searchTerm || "None"}</div>
            <div>Cache Status: {cacheStatus.exists ? "Exists" : "None"}</div>
            <div>
              Data Sources:{" "}
              {Object.entries(dataSources)
                .filter(([_, v]) => v)
                .map(([k]) => k)
                .join(", ")}
            </div>
          </div>
        </Card>
      )}

      {/* Search and Time Filter */}
      <Card variant="glass" className="p-4">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search
              size={20}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search your posts..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex space-x-2">
            {(["7d", "30d", "90d"] as const).map((period) => (
              <button
                key={period}
                onClick={() => handleTimeFilterChange(period)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  timeFilter === period
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                    : "bg-white border border-blue-200 text-blue-600 hover:bg-blue-50"
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Loading State */}
      {isRefetching && (
        <div className="flex items-center justify-center py-4">
          <LoadingSpinner size="md" />
          <span className="ml-2 text-gray-600">Updating posts...</span>
        </div>
      )}

      {/* Posts Grid */}
      {posts.length === 0 ? (
        <Card variant="glass" className="p-8 text-center">
          <div className="text-gray-500">
            <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">No posts found</h3>
            <p className="text-sm">
              {pagination.totalPosts === 0
                ? "No posts found in the selected date range. Try adjusting your time filter."
                : "No posts match your search criteria. Try a different search term."}
            </p>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post, index) => {
              const status = getPostStatus(post);
              const StatusIcon = status.icon;

              return (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="cursor-pointer"
                >
                  <Card
                    variant="glass"
                    className={`p-4 transition-all duration-300 hover:shadow-xl relative ${
                      selectedPosts.includes(post.id)
                        ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "hover:shadow-lg hover:border-gray-300"
                    }`}
                  >
                    {/* Source Indicator */}
                    <div className="absolute top-4 left-4">
                      <div
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          post.source === "historical"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {post.source === "historical" ? "Historical" : "Recent"}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div
                      className={`absolute top-4 right-4 px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${status.color}`}
                    >
                      <StatusIcon size={12} />
                      <span>{status.label}</span>
                    </div>

                    {/* Thumbnail if available */}
                    {getThumbnailUrl(post) && (
                      <div className="w-full h-32 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                        <img
                          src={getThumbnailUrl(post)!}
                          alt="Post thumbnail"
                          className="w-full h-full object-cover"
                          onError={() => handleImageError(post.id)}
                          loading="lazy"
                        />
                      </div>
                    )}

                    {/* Media Type Indicator */}
                    {post.mediaType !== "TEXT" && !getThumbnailUrl(post) && (
                      <div className="w-full h-32 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg mb-3 flex items-center justify-center">
                        <div className="text-center">
                          <ImageIcon
                            size={24}
                            className="mx-auto text-gray-600 mb-2"
                          />
                          <span className="text-sm text-gray-600">
                            {post.mediaType} Content
                            {post.mediaAssetId && (
                              <div className="text-xs text-gray-500 mt-1">
                                Asset: {post.mediaAssetId.substring(0, 8)}...
                              </div>
                            )}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Post Content Preview */}
                    <div className="mb-4">
                      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-4">
                        {truncateText(post.text)}
                      </p>
                    </div>

                    {/* Post Date */}
                    <p className="text-xs text-gray-500 mb-3">
                      Posted: {new Date(post.timestamp).toLocaleDateString()} •{" "}
                      {post.daysSincePosted} days ago
                    </p>

                    {/* Engagement Metrics */}
                    <div className="flex items-center justify-between mb-4">
                      <motion.div
                        className="flex items-center space-x-1 text-red-500"
                        whileHover={{ scale: 1.1 }}
                      >
                        <Heart size={16} />
                        <span className="text-sm font-medium">
                          {post.likes}
                        </span>
                      </motion.div>
                      <motion.div
                        className="flex items-center space-x-1 text-blue-500"
                        whileHover={{ scale: 1.1 }}
                      >
                        <MessageCircle size={16} />
                        <span className="text-sm font-medium">
                          {post.comments}
                        </span>
                      </motion.div>
                      <motion.div
                        className="flex items-center space-x-1 text-green-500"
                        whileHover={{ scale: 1.1 }}
                      >
                        <Share size={16} />
                        <span className="text-sm font-medium">
                          {post.shares}
                        </span>
                      </motion.div>
                      <div className="text-xs text-gray-500">
                        Total: {post.likes + post.comments + post.shares}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRepurpose(post);
                        }}
                        className="flex-1"
                        disabled={!post.canRepost}
                      >
                        <Zap size={14} className="mr-1" />
                        {post.canRepost ? "Repurpose" : "Too Recent"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(post.text);
                        }}
                      >
                        <Copy size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePostSelection(post.id);
                        }}
                        className={
                          selectedPosts.includes(post.id) ? "bg-blue-100" : ""
                        }
                      >
                        <Send size={14} />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
            className="mt-8"
          />

          {/* Posts Summary */}
          <div className="text-center text-sm text-gray-500 mt-4">
            Showing {posts.length} of {pagination.totalPosts} posts from the
            last {timeFilter} • Page {pagination.currentPage} of{" "}
            {pagination.totalPages}
          </div>
        </>
      )}
    </motion.div>
  );
};
