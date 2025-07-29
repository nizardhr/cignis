import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  ExternalLink, 
  MessageCircle, 
  Copy, 
  Users, 
  Clock, 
  Image as ImageIcon,
  Video,
  FileText,
  Link as LinkIcon,
  Sparkles,
  Send,
  X,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { 
  useSynergyPartners, 
  useAddPartner, 
  useRemovePartner,
  usePartnerPosts,
  useCrossComment,
  useSuggestComment,
  useSynergyAnalytics
} from '../../hooks/useSynergyData';
import { synergyUtils } from '../../services/synergy';
import { useAuthStore } from '../../stores/authStore';

interface AddPartnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (partnerId: string) => void;
  isLoading: boolean;
}

const AddPartnerModal = ({ isOpen, onClose, onAdd, isLoading }: AddPartnerModalProps) => {
  const [partnerEmail, setPartnerEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!synergyUtils.validatePartnerEmail(partnerEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    // In a real implementation, you'd look up the user by email
    // For now, we'll use the email as the partner ID
    onAdd(partnerEmail);
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl p-6 w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Add Synergy Partner</h3>
          <Button variant="ghost" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Partner's Email Address
            </label>
            <input
              type="email"
              value={partnerEmail}
              onChange={(e) => setPartnerEmail(e.target.value)}
              placeholder="partner@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            {error && (
              <p className="text-sm text-red-600 mt-1">{error}</p>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <AlertCircle size={16} className="text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">DMA Requirement</p>
                <p>Both you and your partner must have completed LinkedIn DMA consent to share synergy data.</p>
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading || !partnerEmail}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus size={16} className="mr-2" />
                  Add Partner
                </>
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

interface PostCardProps {
  post: any;
  partner: any;
  currentUserId: string;
}

const PostCard = ({ post, partner, currentUserId }: PostCardProps) => {
  const { dmaToken } = useAuthStore();
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Fetch cross-partner comment
  const { data: crossComment, isLoading: commentLoading } = useCrossComment(
    partner.id,
    post.postUrn
  );
  
  // Comment suggestion mutation
  const suggestCommentMutation = useSuggestComment();
  
  const handleSuggestComment = async () => {
    try {
      const suggestions = await suggestCommentMutation.mutateAsync({
        fromUserId: currentUserId,
        toUserId: partner.id,
        postUrn: post.postUrn,
        postPreview: post.textPreview,
      });
      setShowSuggestions(true);
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getMediaIcon = (mediaType: string) => {
    switch (mediaType) {
      case 'IMAGE': return <ImageIcon size={16} />;
      case 'VIDEO': return <Video size={16} />;
      case 'ARTICLE': return <FileText size={16} />;
      case 'URN_REFERENCE': return <LinkIcon size={16} />;
      default: return null;
    }
  };

  const thumbnailUrl = synergyUtils.getMediaThumbnail(post, dmaToken);

  return (
    <Card variant="glass" className="p-6 hover:shadow-lg transition-all duration-200">
      {/* Post Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Clock size={14} />
          <span>{synergyUtils.formatPostDate(post.createdAtMs)}</span>
          {post.mediaType !== 'NONE' && (
            <>
              <span>•</span>
              <div className="flex items-center space-x-1">
                {getMediaIcon(post.mediaType)}
                <span>{post.mediaType}</span>
              </div>
            </>
          )}
        </div>
        {post.permalink && (
          <Button variant="ghost" size="sm" onClick={() => window.open(post.permalink, '_blank')}>
            <ExternalLink size={14} />
          </Button>
        )}
      </div>

      {/* Media Thumbnail */}
      {thumbnailUrl && (
        <div className="w-full h-32 bg-gray-100 rounded-lg mb-4 overflow-hidden">
          <img
            src={thumbnailUrl}
            alt="Post media"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}

      {/* Post Content */}
      <div className="mb-4">
        <p className="text-gray-800 leading-relaxed">
          {synergyUtils.truncateText(post.textPreview, 200)}
        </p>
      </div>

      {/* Cross-Partner Comments Section */}
      <div className="border-t pt-4">
        <h4 className="font-medium text-gray-900 mb-3 flex items-center">
          <MessageCircle size={16} className="mr-2" />
          Cross-Partner Engagement
        </h4>

        {commentLoading ? (
          <div className="flex items-center space-x-2 text-gray-500">
            <LoadingSpinner size="sm" />
            <span className="text-sm">Checking for comments...</span>
          </div>
        ) : crossComment ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <CheckCircle size={16} className="text-green-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-800">
                  {partner.name} commented on this post
                </p>
                <p className="text-sm text-green-700 mt-1">
                  "{crossComment.message}"
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {synergyUtils.formatPostDate(crossComment.createdAtMs)}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-sm text-gray-600">
                No cross-partner comment found. Generate an AI suggestion to engage with this post.
              </p>
            </div>

            {!showSuggestions ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSuggestComment}
                disabled={suggestCommentMutation.isPending}
                className="w-full"
              >
                {suggestCommentMutation.isPending ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} className="mr-2" />
                    Suggest Comment
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-900">AI Suggestions:</p>
                {suggestCommentMutation.data?.map((suggestion, index) => (
                  <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800 mb-2">"{suggestion}"</p>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(suggestion)}
                      >
                        <Copy size={14} className="mr-1" />
                        Copy
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(post.permalink, '_blank')}
                      >
                        <Send size={14} className="mr-1" />
                        Use on LinkedIn
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSuggestions(false)}
                  className="w-full"
                >
                  Hide Suggestions
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export const Synergy = () => {
  const { dmaToken } = useAuthStore();
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Data hooks
  const { data: partners, isLoading: partnersLoading, error: partnersError } = useSynergyPartners();
  const addPartnerMutation = useAddPartner();
  const removePartnerMutation = useRemovePartner();
  
  // Selected partner's posts
  const { data: partnerPosts, isLoading: postsLoading, error: postsError } = usePartnerPosts(
    selectedPartner,
    5
  );
  
  // Analytics for selected partner
  const { data: analytics } = useSynergyAnalytics(selectedPartner);

  const currentUserId = "user-123"; // In real implementation, get from auth store

  const handleAddPartner = async (partnerId: string) => {
    try {
      await addPartnerMutation.mutateAsync(partnerId);
      setShowAddModal(false);
    } catch (error) {
      console.error('Failed to add partner:', error);
    }
  };

  const handleRemovePartner = async (partnerId: string) => {
    if (window.confirm('Are you sure you want to remove this synergy partner?')) {
      try {
        await removePartnerMutation.mutateAsync(partnerId);
        if (selectedPartner === partnerId) {
          setSelectedPartner(null);
        }
      } catch (error) {
        console.error('Failed to remove partner:', error);
      }
    }
  };

  const selectedPartnerData = useMemo(() => {
    return partners?.find(p => p.id === selectedPartner);
  }, [partners, selectedPartner]);

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
          <h2 className="text-2xl font-bold mb-4">DMA Access Required</h2>
          <p className="text-gray-600 mb-6">
            Synergy features require LinkedIn Data Member Agreement (DMA) access to view partner data.
          </p>
          <Button
            variant="primary"
            onClick={() => (window.location.href = "/")}
          >
            Enable DMA Access
          </Button>
        </div>
      </motion.div>
    );
  }

  if (partnersError) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <div className="text-center py-12">
          <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
          <h2 className="text-2xl font-bold mb-4">Error Loading Partners</h2>
          <p className="text-gray-600 mb-6">
            {partnersError.message}
          </p>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
          >
            <RefreshCw size={16} className="mr-2" />
            Try Again
          </Button>
        </div>
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
          <h2 className="text-2xl font-bold">Synergy Partners</h2>
          <p className="text-gray-600 mt-1">
            Collaborate and engage with your strategic LinkedIn partners
          </p>
        </div>
        <Button 
          variant="primary" 
          onClick={() => setShowAddModal(true)}
          disabled={addPartnerMutation.isPending}
        >
          <Plus size={20} className="mr-2" />
          Add Partner
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Partners List */}
        <div className="lg:col-span-1">
          <Card variant="glass" className="p-6 h-full">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Users size={20} className="mr-2" />
              Partners ({partners?.length || 0})
            </h3>
            
            {partnersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse">
                    <div className="flex items-center space-x-3 p-3 bg-gray-100 rounded-lg">
                      <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : partners && partners.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {partners.map((partner, index) => (
                  <motion.div
                    key={partner.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                      selectedPartner === partner.id
                        ? 'bg-blue-50 border-2 border-blue-200'
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                    onClick={() => setSelectedPartner(partner.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <img
                          src={partner.avatarUrl || `https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=48&h=48&dpr=1`}
                          alt={partner.name}
                          className="w-12 h-12 rounded-full"
                        />
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                          partner.dmaActive ? 'bg-green-500' : 'bg-gray-400'
                        }`}></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">
                          {partner.name}
                        </h4>
                        <p className="text-sm text-gray-500 truncate">
                          {partner.dmaActive ? 'DMA Active' : 'DMA Inactive'}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePartner(partner.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 mb-4">No synergy partners yet</p>
                <Button
                  variant="outline"
                  onClick={() => setShowAddModal(true)}
                >
                  <Plus size={16} className="mr-2" />
                  Add Your First Partner
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Partner Feed */}
        <div className="lg:col-span-2">
          {selectedPartnerData ? (
            <div className="space-y-6">
              {/* Partner Header */}
              <Card variant="glass" className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <img
                      src={selectedPartnerData.avatarUrl || `https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=64&h=64&dpr=1`}
                      alt={selectedPartnerData.name}
                      className="w-16 h-16 rounded-full"
                    />
                    <div>
                      <h3 className="text-xl font-bold">{selectedPartnerData.name}</h3>
                      <p className="text-gray-600">{selectedPartnerData.email}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className={`w-2 h-2 rounded-full ${
                          selectedPartnerData.dmaActive ? 'bg-green-500' : 'bg-gray-400'
                        }`}></div>
                        <span className="text-sm text-gray-500">
                          {selectedPartnerData.dmaActive ? 'DMA Active' : 'DMA Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {analytics && (
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">
                        {analytics.recentPosts}
                      </div>
                      <div className="text-sm text-gray-500">
                        Posts (28 days)
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Partner Posts */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold">Latest Posts</h4>
                
                {postsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <Card key={i} variant="glass" className="p-6">
                        <div className="animate-pulse">
                          <div className="h-4 bg-gray-300 rounded w-1/4 mb-4"></div>
                          <div className="space-y-2">
                            <div className="h-4 bg-gray-300 rounded"></div>
                            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                          </div>
                          <div className="h-20 bg-gray-300 rounded mt-4"></div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : postsError ? (
                  <Card variant="glass" className="p-6 text-center">
                    <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
                    <p className="text-red-600">Error loading posts: {postsError.message}</p>
                  </Card>
                ) : partnerPosts && partnerPosts.length > 0 ? (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {partnerPosts.map((post, index) => (
                      <motion.div
                        key={post.postUrn}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <PostCard
                          post={post}
                          partner={selectedPartnerData}
                          currentUserId={currentUserId}
                        />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <Card variant="glass" className="p-8 text-center">
                    <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 mb-2">No recent posts</p>
                    <p className="text-sm text-gray-400">
                      This partner hasn't published posts in the last 28 days.
                    </p>
                  </Card>
                )}
              </div>
            </div>
          ) : (
            <Card variant="glass" className="p-12 text-center h-full flex items-center justify-center">
              <div>
                <Users size={64} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  Select a Partner
                </h3>
                <p className="text-gray-500">
                  Choose a synergy partner from the list to view their latest posts and engagement opportunities.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Add Partner Modal */}
      <AddPartnerModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddPartner}
        isLoading={addPartnerMutation.isPending}
      />
    </motion.div>
  );
};