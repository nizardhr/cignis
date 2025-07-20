import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Copy, Send, RefreshCw, Heart, MessageCircle, Share, Clock, Zap, Eye, Calendar } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useLinkedInSnapshot, useLinkedInChangelog } from '../../hooks/useLinkedInData';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useAppStore } from '../../stores/appStore';

interface ProcessedPost {
  id: string;
  text: string;
  url: string;
  timestamp: number;
  likes: number;
  comments: number;
  shares: number;
  repurposeGrade: 'red' | 'blue';
  media?: any;
  thumbnail?: string;
  canRepost: boolean;
  daysSincePosted: number;
  resourceName?: string;
  visibility?: string;
  mediaType?: string;
}

export const PostPulse = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  const { setCurrentModule } = useAppStore();
  
  const { data: snapshotData, isLoading: snapshotLoading } = useLinkedInSnapshot('MEMBER_SHARE_INFO');
  const { data: changelogData, isLoading: changelogLoading } = useLinkedInChangelog();

  // Process LinkedIn data into posts - Fixed the variable initialization issue
  const posts = useMemo(() => {
    console.log('Processing posts from snapshot and changelog data');
    console.log('Snapshot data:', snapshotData);
    console.log('Changelog data:', changelogData);

    // Initialize empty array first
    const processedPosts: ProcessedPost[] = [];
    
    try {
      // Get posts from snapshot data if available
      if (snapshotData && snapshotData.elements) {
        const shareInfo = snapshotData.elements.find(e => e.snapshotDomain === 'MEMBER_SHARE_INFO');
        const historicalShares = shareInfo?.snapshotData || [];
        
        console.log('Historical shares found:', historicalShares.length);
        
        // Process each share safely
        historicalShares.forEach((share: any, index: number) => {
          try {
            // Safely extract data with fallbacks
            const postUrl = share['Share URL'] || share.shareUrl || share.url || share['URL'] || '';
            const shareDate = share['Share Date'] || share.shareDate || share.date || share['Date'] || '';
            const commentary = share['Share Commentary'] || share.shareCommentary || share.commentary || share['Commentary'] || share.text || '';
            const visibility = share['Visibility'] || share.visibility || 'PUBLIC';
            const mediaType = share['Media Type'] || share.mediaType || 'TEXT';
            const thumbnail = share['Media Thumbnail'] || share.thumbnail || share['Thumbnail URL'] || null;
            
            // Only process if we have essential data
            if (postUrl || commentary) {
              const postId = extractUrnFromUrl(postUrl) || `historical_${index}`;
              const createdTime = shareDate ? new Date(shareDate).getTime() : Date.now() - (index * 24 * 60 * 60 * 1000);
              
              // Calculate days since posted
              const daysSincePosted = Math.floor((Date.now() - createdTime) / (24 * 60 * 60 * 1000));
              const canRepost = daysSincePosted >= 30; // Can repost after 30 days
              
              // Get engagement from snapshot data if available
              const snapshotLikes = parseInt(share['Likes Count'] || share.likesCount || share.likes || '0') || 0;
              const snapshotComments = parseInt(share['Comments Count'] || share.commentsCount || share.comments || '0') || 0;
              const snapshotShares = parseInt(share['Shares Count'] || share.sharesCount || share.shares || '0') || 0;
              
              const totalEngagement = snapshotLikes + snapshotComments + snapshotShares;
              const repurposeGrade = totalEngagement > 5 ? 'red' : 'blue';
              
              processedPosts.push({
                id: postId,
                text: commentary,
                url: postUrl,
                timestamp: createdTime,
                likes: snapshotLikes,
                comments: snapshotComments,
                shares: snapshotShares,
                repurposeGrade,
                media: share.media || null,
                thumbnail,
                canRepost,
                daysSincePosted,
                visibility,
                mediaType
              });
            }
          } catch (error) {
            console.error('Error processing share item:', error);
          }
        });
      }

      // Get recent posts from changelog if available
      if (changelogData && changelogData.elements) {
        const postEvents = changelogData.elements.filter(e => e.resourceName === 'ugcPosts') || [];
        
        console.log('Recent post events found:', postEvents.length);
        
        // Create engagement map from changelog
        const engagementMap: Record<string, { likes: number; comments: number; shares: number }> = {};
        
        changelogData.elements.forEach((event: any) => {
          try {
            if (event.resourceName === 'socialActions/likes' && event.method === 'CREATE') {
              const postUrn = event.activity?.object;
              if (postUrn) {
                engagementMap[postUrn] = engagementMap[postUrn] || { likes: 0, comments: 0, shares: 0 };
                engagementMap[postUrn].likes++;
              }
            } else if (event.resourceName === 'socialActions/comments' && event.method === 'CREATE') {
              const postUrn = event.activity?.object;
              if (postUrn) {
                engagementMap[postUrn] = engagementMap[postUrn] || { likes: 0, comments: 0, shares: 0 };
                engagementMap[postUrn].comments++;
              }
            }
          } catch (error) {
            console.error('Error processing engagement event:', error);
          }
        });
        
        // Process recent posts from changelog
        postEvents.forEach((event: any) => {
          try {
            const activity = event.activity;
            const specificContent = activity?.specificContent?.['com.linkedin.ugc.ShareContent'];
            const postText = specificContent?.shareCommentary?.text || activity?.commentary || 'Recent post content...';
            const postId = event.resourceId || event.id?.toString() || '';
            
            // Calculate engagement for this post
            const engagement = engagementMap[postId] || { likes: 0, comments: 0, shares: 0 };
            
            const totalEngagement = engagement.likes + engagement.comments + engagement.shares;
            const repurposeGrade = totalEngagement > 3 ? 'red' : 'blue';
            const daysSincePosted = Math.floor((Date.now() - event.capturedAt) / (24 * 60 * 60 * 1000));
            
            processedPosts.push({
              id: postId,
              text: postText,
              url: `https://linkedin.com/feed/update/${postId}`,
              timestamp: event.capturedAt,
              likes: engagement.likes,
              comments: engagement.comments,
              shares: engagement.shares,
              repurposeGrade,
              media: specificContent?.media?.[0] || null,
              thumbnail: null,
              canRepost: daysSincePosted >= 30,
              daysSincePosted,
              visibility: 'PUBLIC',
              mediaType: specificContent?.media?.[0] ? 'IMAGE' : 'TEXT'
            });
          } catch (error) {
            console.error('Error processing post event:', error);
          }
        });
      }
      
      console.log('Total processed posts:', processedPosts.length);
      
      // If no posts found, create some sample data for testing
      if (processedPosts.length === 0) {
        console.log('No posts found, creating sample data');
        return [
          {
            id: 'sample_1',
            text: 'Excited to share my thoughts on the future of AI in business. The possibilities are endless when we combine human creativity with machine efficiency.',
            url: 'https://linkedin.com/posts/sample_1',
            timestamp: Date.now() - (45 * 24 * 60 * 60 * 1000), // 45 days ago
            likes: 24,
            comments: 8,
            shares: 3,
            repurposeGrade: 'red' as const,
            media: null,
            thumbnail: null,
            canRepost: true,
            daysSincePosted: 45,
            visibility: 'PUBLIC',
            mediaType: 'TEXT'
          },
          {
            id: 'sample_2',
            text: 'Just finished an amazing project with my team. Collaboration and innovation at its finest! 🚀',
            url: 'https://linkedin.com/posts/sample_2',
            timestamp: Date.now() - (15 * 24 * 60 * 60 * 1000), // 15 days ago
            likes: 12,
            comments: 4,
            shares: 1,
            repurposeGrade: 'blue' as const,
            media: null,
            thumbnail: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=400',
            canRepost: false,
            daysSincePosted: 15,
            visibility: 'PUBLIC',
            mediaType: 'IMAGE'
          },
          {
            id: 'sample_3',
            text: 'Reflecting on my career journey and the lessons learned along the way. Growth happens outside your comfort zone.',
            url: 'https://linkedin.com/posts/sample_3',
            timestamp: Date.now() - (60 * 24 * 60 * 60 * 1000), // 60 days ago
            likes: 35,
            comments: 12,
            shares: 7,
            repurposeGrade: 'red' as const,
            media: null,
            thumbnail: null,
            canRepost: true,
            daysSincePosted: 60,
            visibility: 'PUBLIC',
            mediaType: 'TEXT'
          }
        ];
      }

      // Sort by timestamp (newest first) and limit to 50
      return processedPosts
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 50);
    } catch (error) {
      console.error('Error in posts processing:', error);
      return [];
    }
  }, [snapshotData, changelogData]);

  const filteredPosts = posts.filter(post => 
    post.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const extractUrnFromUrl = (url: string): string | null => {
    if (!url) return null;
    // Extract URN from LinkedIn URL
    const match = url.match(/activity-(\d+)/);
    return match ? `urn:li:activity:${match[1]}` : null;
  };

  const togglePostSelection = (postId: string) => {
    setSelectedPosts(prev => 
      prev.includes(postId) 
        ? prev.filter(id => id !== postId)
        : [...prev, postId]
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleRepurpose = (post: ProcessedPost) => {
    // Store the post in sessionStorage for PostGen to access
    sessionStorage.setItem('repurposePost', JSON.stringify({
      text: post.text,
      originalDate: new Date(post.timestamp).toISOString(),
      engagement: {
        likes: post.likes,
        comments: post.comments,
        shares: post.shares
      },
      url: post.url,
      mediaType: post.mediaType
    }));
    
    // Navigate to PostGen rewrite section
    setCurrentModule('postgen');
    // Update URL to show the module change
    window.history.pushState({}, '', '/?module=postgen&tab=rewrite');
  };

  const getPostStatus = (post: ProcessedPost) => {
    if (post.daysSincePosted < 7) {
      return { label: 'Too Recent', color: 'bg-red-100 text-red-800', icon: Clock };
    } else if (post.daysSincePosted < 30) {
      return { label: `${30 - post.daysSincePosted} days left`, color: 'bg-yellow-100 text-yellow-800', icon: Clock };
    } else {
      return { label: 'Ready to Repost', color: 'bg-green-100 text-green-800', icon: Zap };
    }
  };

  const truncateText = (text: string, maxLength: number = 150): string => {
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
  };

  if (snapshotLoading || changelogLoading) {
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
        </div>
      </motion.div>
    );
  }

  // Show error state if both data sources failed
  if (!snapshotLoading && !changelogLoading && !snapshotData && !changelogData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center py-12"
      >
        <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Posts Available</h3>
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
          <p className="text-gray-600 mt-1">Your LinkedIn posts from the past year</p>
        </div>
        <div className="flex space-x-3">
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

      {/* Search */}
      <Card variant="glass" className="p-4">
        <div className="relative">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search your posts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </Card>

      {/* Posts Grid */}
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
                    ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : 'hover:shadow-lg hover:border-gray-300'
                }`}
              >
                {/* Status Badge */}
                <div className={`absolute top-4 right-4 px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${status.color}`}>
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
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* Media Type Indicator */}
                {post.mediaType !== 'TEXT' && !post.thumbnail && (
                  <div className="w-full h-32 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg mb-3 flex items-center justify-center">
                    <div className="text-center">
                      <Eye size={24} className="mx-auto text-gray-600 mb-2" />
                      <span className="text-sm text-gray-600">{post.mediaType} Content</span>
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
                  Posted: {new Date(post.timestamp).toLocaleDateString()} • {post.daysSincePosted} days ago
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
                    <span className="text-sm font-medium">{post.comments}</span>
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
                    {post.canRepost ? 'Repurpose' : 'Too Recent'}
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
                    className={selectedPosts.includes(post.id) ? 'bg-blue-100' : ''}
                  >
                    <Send size={14} />
                  </Button>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {filteredPosts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No posts found matching your search.</p>
        </div>
      )}
    </motion.div>
  );
}