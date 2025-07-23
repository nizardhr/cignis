import { useState, useMemo, useEffect } from "react";
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
} from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import {
  useLinkedInSnapshot,
  useLinkedInChangelog,
  useLinkedInMultipleSnapshots,
} from "../../hooks/useLinkedInData";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { useAppStore } from "../../stores/appStore";

interface ProcessedPost {
  id: string;
  text: string;
  url: string;
  timestamp: number;
  likes: number;
  comments: number;
  shares: number;
  repurposeGrade: "red" | "blue";
  media?: any;
  thumbnail?: string;
  canRepost: boolean;
  daysSincePosted: number;
  resourceName?: string;
  visibility?: string;
  mediaType?: string;
}

export const PostPulse = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  const [timeFilter, setTimeFilter] = useState<
    "7d" | "30d" | "90d" | "365d" | "custom"
  >("30d");
  const [customDates, setCustomDates] = useState({ from: "", to: "" });
  const [debugMode, setDebugMode] = useState(false);
  const { setCurrentModule } = useAppStore();

  const { data: snapshotData, isLoading: snapshotLoading } =
    useLinkedInSnapshot("MEMBER_SHARE_INFO");
  const { data: richMediaData, isLoading: richMediaLoading } =
    useLinkedInSnapshot("RICH_MEDIA");
  const { data: changelogData, isLoading: changelogLoading } =
    useLinkedInChangelog(100);

  // Account type detection
  useEffect(() => {
    if (changelogData || snapshotData) {
      console.log("=== ACCOUNT ANALYSIS ===");
      console.log("Changelog available:", !!changelogData?.elements);
      console.log("Changelog elements:", changelogData?.elements?.length);
      console.log("Snapshot available:", !!snapshotData?.elements);
      console.log("Account type:", changelogData?.elements?.length > 50 ? "HIGH_VOLUME" : "NORMAL");
      
      if (changelogData?.elements) {
        const resourceTypes = changelogData.elements.reduce((acc: any, el: any) => {
          acc[el.resourceName] = (acc[el.resourceName] || 0) + 1;
          return acc;
        }, {});
        console.log("Resource types in changelog:", resourceTypes);
      }
    }
  }, [changelogData, snapshotData]);

  // Optimized date range calculation with memoization
  const dateRange = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const periods = { "7d": 7, "30d": 30, "90d": 90, "365d": 365 };

    if (timeFilter === "custom") {
      return {
        from: customDates.from
          ? new Date(customDates.from).getTime()
          : now - 30 * dayMs,
        to: customDates.to ? new Date(customDates.to).getTime() : now,
      };
    }

    return { from: now - (periods[timeFilter] || 30) * dayMs, to: now };
  }, [timeFilter, customDates.from, customDates.to]);

  // DMA-compliant data extraction helper
  const extractData = (obj: any, keys: string[], fallback: any = "") => {
    if (!obj || typeof obj !== "object") return fallback;
    return (
      keys.find((key) => obj[key] !== undefined && obj[key] !== null) ||
      fallback
    );
  };

  // Handle both epoch timestamps and date strings per DMA docs
  const parsePostDate = (dateInput: any): number => {
    if (typeof dateInput === "number") {
      // Epoch timestamp (from changelog)
      return dateInput;
    }

    if (typeof dateInput === "string") {
      // Date string from snapshot (format: YYYY-MM-DD)
      const date = new Date(dateInput);
      return !isNaN(date.getTime()) ? date.getTime() : Date.now();
    }

    // Fallback
    return Date.now();
  };

  // Build engagement map from changelog per DMA docs
  const engagementMap = useMemo(() => {
    if (!changelogData?.elements) return new Map();

    const map = new Map<
      string,
      { likes: number; comments: number; shares: number }
    >();

    changelogData.elements.forEach((event: any) => {
      if (event.method !== "CREATE") return;

      // The object field contains the post URN for social actions
      const postUrn = event.activity?.object;
      if (!postUrn) return;

      if (!map.has(postUrn)) {
        map.set(postUrn, { likes: 0, comments: 0, shares: 0 });
      }

      const current = map.get(postUrn)!;

      if (event.resourceName === "socialActions/likes") {
        current.likes++;
      } else if (event.resourceName === "socialActions/comments") {
        current.comments++;
      } else if (event.resourceName === "socialActions/shares") {
        current.shares++;
      }
    });

    return map;
  }, [changelogData]);

    // Robust data processing for high-volume accounts
  const posts = useMemo(() => {
    console.log("=== SNAPSHOT PROCESSING DEBUG ===");
    console.log("Raw snapshot data:", snapshotData);
    console.log("Snapshot structure:", snapshotData ? Object.keys(snapshotData) : "No data");
    
    if (!changelogData?.elements) {
      console.log("No changelog data available");
      return [];
    }

    const processedPosts: ProcessedPost[] = [];

    try {
      // PRIMARY: Process from changelog data (works for all account sizes)
      if (changelogData?.elements) {
        console.log("Processing from changelog data...");
        
        const postEvents = changelogData.elements.filter(e => e.resourceName === "ugcPosts");
        console.log("Found UGC posts in changelog:", postEvents.length);
        
        // Build engagement map first
        const engagementMap: Record<string, { likes: number; comments: number; shares: number }> = {};
        
        changelogData.elements.forEach((event: any) => {
          if (event.resourceName?.includes("socialActions")) {
            const postUrn = event.activity?.object;
            if (postUrn) {
              if (!engagementMap[postUrn]) {
                engagementMap[postUrn] = { likes: 0, comments: 0, shares: 0 };
              }
              
              if (event.resourceName === "socialActions/likes" && event.method === "CREATE") {
                engagementMap[postUrn].likes++;
              } else if (event.resourceName === "socialActions/comments" && event.method === "CREATE") {
                engagementMap[postUrn].comments++;
              }
            }
          }
        });

        // Process each post
        postEvents.forEach((event: any) => {
          try {
            // Extract content from processedActivity first, then activity
            const processedContent = event.processedActivity?.specificContent?.["com.linkedin.ugc.ShareContent"];
            const activityContent = event.activity?.specificContent?.["com.linkedin.ugc.ShareContent"];
            
            const shareCommentary = processedContent?.shareCommentary?.text 
              || activityContent?.shareCommentary?.text
              || event.processedActivity?.text
              || event.activity?.text
              || "Post content from LinkedIn";

            // Use capturedAt timestamp (epoch milliseconds)
            const timestamp = event.capturedAt || event.processedAt || Date.now();
            
            // Calculate days since posted
            const daysSincePosted = Math.floor((Date.now() - timestamp) / (24 * 60 * 60 * 1000));
            
            // Get engagement data
            const postId = event.resourceId || event.id?.toString();
            const engagement = engagementMap[postId] || { likes: 0, comments: 0, shares: 0 };
            
            // Filter by date range
            if (timestamp >= dateRange.from && timestamp <= dateRange.to) {
              processedPosts.push({
                id: postId,
                text: shareCommentary,
                url: `https://linkedin.com/feed/update/${postId}`,
                timestamp: timestamp,
                likes: engagement.likes,
                comments: engagement.comments,
                shares: engagement.shares,
                repurposeGrade: (engagement.likes + engagement.comments + engagement.shares) > 3 ? "red" : "blue",
                media: processedContent?.media?.[0] || activityContent?.media?.[0] || null,
                thumbnail: null,
                canRepost: daysSincePosted >= 30,
                daysSincePosted: daysSincePosted,
                visibility: "PUBLIC",
                mediaType: (processedContent?.media?.[0] || activityContent?.media?.[0]) ? "IMAGE" : "TEXT",
              });
            }
          } catch (error) {
            console.error("Error processing post event:", error, event);
          }
        });
      }

      // SECONDARY: Try to process snapshot data if available (fallback)
      if (snapshotData?.elements) {
        console.log("Attempting to process snapshot data as fallback...");
        
        const shareInfoElement = snapshotData.elements.find(
          e => e.snapshotDomain === "MEMBER_SHARE_INFO"
        );
        
        if (shareInfoElement?.snapshotData && Array.isArray(shareInfoElement.snapshotData)) {
          console.log("Found snapshot data:", shareInfoElement.snapshotData.length, "items");
          
          shareInfoElement.snapshotData.forEach((share: any, index: number) => {
            try {
              const postUrl = share["Share URL"] || share.shareUrl || share.url;
              const shareDate = share["Share Date"] || share.shareDate || share.date;
              const commentary = share["Share Commentary"] || share.shareCommentary || share.commentary;
              
              if (commentary || postUrl) {
                const timestamp = shareDate ? new Date(shareDate).getTime() : Date.now() - (index * 24 * 60 * 60 * 1000);
                const daysSincePosted = Math.floor((Date.now() - timestamp) / (24 * 60 * 60 * 1000));
                
                if (timestamp >= dateRange.from && timestamp <= dateRange.to) {
                  const postId = postUrl?.match(/activity-(\d+)/) 
                    ? `urn:li:activity:${postUrl.match(/activity-(\d+)/)?.[1]}`
                    : `historical_${index}`;
                  
                  // Check if this post is already in processedPosts from changelog
                  const existingPost = processedPosts.find(p => p.id === postId || p.text === commentary);
                  if (!existingPost) {
                    processedPosts.push({
                      id: postId,
                      text: commentary,
                      url: postUrl || `https://linkedin.com/feed/update/${postId}`,
                      timestamp: timestamp,
                      likes: parseInt(share["Likes Count"] || "0") || 0,
                      comments: parseInt(share["Comments Count"] || "0") || 0,
                      shares: parseInt(share["Shares Count"] || "0") || 0,
                      repurposeGrade: "blue",
                      media: null,
                      thumbnail: share["Media Thumbnail"] || null,
                      canRepost: daysSincePosted >= 30,
                      daysSincePosted: daysSincePosted,
                      visibility: share.Visibility || "PUBLIC",
                      mediaType: share["Media Type"] || "TEXT",
                    });
                  }
                }
              }
            } catch (error) {
              console.error("Error processing snapshot share:", error, share);
            }
          });
        }
      }

      console.log("=== PROCESSING SUMMARY ===");
      console.log("Total processed posts:", processedPosts.length);
      console.log("Date range:", new Date(dateRange.from).toDateString(), "to", new Date(dateRange.to).toDateString());
      console.log("Posts in date range:", processedPosts.length);
      
      // Return sorted posts, limited to reasonable number for UI performance
      return processedPosts
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 100); // Limit to 100 most recent posts for performance

    } catch (error) {
      console.error("Critical error in post processing:", error);
      return [];
    }
  }, [snapshotData, changelogData, dateRange]);

  const filteredPosts = posts.filter((post) =>
    post.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  if (snapshotLoading || changelogLoading || richMediaLoading) {
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
          {changelogLoading && <p className="text-sm text-gray-500">Fetching recent activity...</p>}
          {snapshotLoading && <p className="text-sm text-gray-500">Loading post history...</p>}
        </div>
      </motion.div>
    );
  }

  // Show error state if both data sources failed
  if (
    !snapshotLoading &&
    !changelogLoading &&
    !snapshotData &&
    !changelogData
  ) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center py-12"
      >
        <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No Posts Available
        </h3>
        <p className="text-gray-600 mb-4">
          We couldn't load your LinkedIn posts. This might be because:
        </p>
        <ul className="text-sm text-gray-500 space-y-1 mb-6">
          <li>• You haven't posted on LinkedIn yet</li>
          <li>• Your posts are not accessible via the API</li>
          <li>• There's a temporary connection issue</li>
        </ul>
        <Button variant="primary" onClick={() => window.location.reload()}>
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
            Your LinkedIn posts filtered by time range
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
          <Button variant="outline">
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </Button>
          <Button variant="primary" disabled={selectedPosts.length === 0}>
            <Send size={16} className="mr-2" />
            Push to PostGen ({selectedPosts.length})
          </Button>
        </div>
      </div>

      {/* High-Volume Account Indicator */}
      {changelogData?.elements?.length > 50 && !snapshotData?.elements && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <Eye size={16} className="text-blue-600 mr-2" />
            <span className="text-sm text-blue-800">
              High-volume account detected. Showing recent posts from activity feed.
            </span>
          </div>
        </div>
      )}

      {/* Debug Information */}
      {debugMode && (
        <Card variant="glass" className="p-4 bg-yellow-50">
          <h3 className="font-semibold mb-2">Debug Information:</h3>
          <div className="text-sm space-y-1">
            <div>
              Snapshot Data: {snapshotData?.elements?.length || 0} elements
            </div>
            <div>
              Changelog Data: {changelogData?.elements?.length || 0} elements
            </div>
            <div>
              Rich Media Data: {richMediaData?.elements?.length || 0} elements
            </div>
            <div>Processed Posts: {posts.length}</div>
            <div>Filtered Posts: {filteredPosts.length}</div>
            <div>
              Date Range: {new Date(dateRange.from).toLocaleDateString()} -{" "}
              {new Date(dateRange.to).toLocaleDateString()}
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
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex space-x-2">
            {(["7d", "30d", "90d", "365d"] as const).map((period) => (
              <button
                key={period}
                onClick={() => setTimeFilter(period)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  timeFilter === period
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                    : "bg-white border border-blue-200 text-blue-600 hover:bg-blue-50"
                }`}
              >
                {period}
              </button>
            ))}
            <button
              onClick={() => setTimeFilter("custom")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeFilter === "custom"
                  ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                  : "bg-white border border-blue-200 text-blue-600 hover:bg-blue-50"
              }`}
            >
              Custom
            </button>
          </div>
        </div>

        {/* Custom Date Picker */}
        {timeFilter === "custom" && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Calendar size={16} className="text-gray-500" />
                <span className="text-sm font-medium">From:</span>
                <input
                  type="date"
                  value={customDates.from}
                  onChange={(e) =>
                    setCustomDates((prev) => ({
                      ...prev,
                      from: e.target.value,
                    }))
                  }
                  className="px-3 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Calendar size={16} className="text-gray-500" />
                <span className="text-sm font-medium">To:</span>
                <input
                  type="date"
                  value={customDates.to}
                  onChange={(e) =>
                    setCustomDates((prev) => ({ ...prev, to: e.target.value }))
                  }
                  className="px-3 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Posts Grid */}
      {filteredPosts.length === 0 ? (
        <Card variant="glass" className="p-8 text-center">
          <div className="text-gray-500">
            <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">No posts found</h3>
            <p className="text-sm">
              {posts.length === 0
                ? "No posts found in the selected date range. Try adjusting your time filter."
                : "No posts match your search criteria. Try a different search term."}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post, index) => {
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
                  {/* Status Badge */}
                  <div
                    className={`absolute top-4 right-4 px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${status.color}`}
                  >
                    <StatusIcon size={12} />
                    <span>{status.label}</span>
                  </div>

                  {/* Thumbnail if available */}
                  {post.thumbnail && (
                    <div className="w-full h-32 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                      <img
                        src={post.thumbnail}
                        alt="Post thumbnail"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                        }}
                      />
                    </div>
                  )}

                  {/* Media Type Indicator */}
                  {post.mediaType !== "TEXT" && !post.thumbnail && (
                    <div className="w-full h-32 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg mb-3 flex items-center justify-center">
                      <div className="text-center">
                        <Eye size={24} className="mx-auto text-gray-600 mb-2" />
                        <span className="text-sm text-gray-600">
                          {post.mediaType} Content
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
                      <span className="text-sm font-medium">{post.likes}</span>
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
                      <span className="text-sm font-medium">{post.shares}</span>
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
      )}
    </motion.div>
  );
};
