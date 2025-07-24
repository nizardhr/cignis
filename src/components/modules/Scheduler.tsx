import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  Plus,
  Image,
  Send,
  Save,
  Edit3,
  Trash2,
  ArrowRight,
  FileText,
  Upload,
} from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { useAppStore } from "../../stores/appStore";

interface ScheduledPost {
  id: string;
  content: string;
  scheduledTime?: string;
  media?: {
    name: string;
    type: string;
    size: number;
    data?: string; // Base64 data for preview
  } | null;
  status: "scheduled" | "posted" | "draft";
  createdAt: number;
  updatedAt: number;
}

interface PostGenData {
  content: string;
  media?: {
    name: string;
    type: string;
    size: number;
    data?: string;
  } | null;
  source: "scheduler";
  timestamp: number;
}

const STORAGE_KEY = "scheduler_posts";
const POSTGEN_STORAGE_KEY = "postgen_data";

export const Scheduler = () => {
  const { setCurrentModule } = useAppStore();
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [isComposing, setIsComposing] = useState(false);
  const [editingPost, setEditingPost] = useState<ScheduledPost | null>(null);
  const [newPost, setNewPost] = useState({
    content: "",
    scheduledTime: "",
    media: null as File | null,
  });

  // Load posts from localStorage on component mount
  useEffect(() => {
    loadPosts();
  }, []);

  // Check for scheduled post data from PostGen
  useEffect(() => {
    const scheduledPostData = sessionStorage.getItem("scheduledPost");
    if (scheduledPostData) {
      try {
        const data = JSON.parse(scheduledPostData);

        // Auto-populate the compose form
        setNewPost({
          content: data.content,
          scheduledTime: "",
          media: null,
        });

        // Convert media data if present
        if (data.media) {
          // For now, we'll just store the media info
          // In a real app, you'd want to handle file conversion properly
          setNewPost((prev) => ({
            ...prev,
            content: data.content,
          }));
        }

        // Open the compose modal
        setIsComposing(true);

        // Clear the data after using it
        sessionStorage.removeItem("scheduledPost");
      } catch (error) {
        console.error("Error parsing scheduled post data:", error);
      }
    }
  }, []);

  const loadPosts = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setPosts(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Error loading posts:", error);
    }
  };

  const savePosts = (updatedPosts: ScheduledPost[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPosts));
      setPosts(updatedPosts);
    } catch (error) {
      console.error("Error saving posts:", error);
    }
  };

  const handleSchedulePost = () => {
    if (!newPost.content) return;

    const post: ScheduledPost = {
      id: Date.now().toString(),
      content: newPost.content,
      scheduledTime: newPost.scheduledTime || undefined,
      media: newPost.media
        ? {
            name: newPost.media.name,
            type: newPost.media.type,
            size: newPost.media.size,
          }
        : null,
      status: newPost.scheduledTime ? "scheduled" : "draft",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updatedPosts = [...posts, post];
    savePosts(updatedPosts);
    resetForm();
  };

  const handleSaveDraft = () => {
    if (!newPost.content) return;

    const post: ScheduledPost = {
      id: Date.now().toString(),
      content: newPost.content,
      scheduledTime: undefined,
      media: newPost.media
        ? {
            name: newPost.media.name,
            type: newPost.media.type,
            size: newPost.media.size,
          }
        : null,
      status: "draft",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updatedPosts = [...posts, post];
    savePosts(updatedPosts);
    resetForm();
  };

  const handleEditPost = (post: ScheduledPost) => {
    setEditingPost(post);
    setNewPost({
      content: post.content,
      scheduledTime: post.scheduledTime || "",
      media: null,
    });
    setIsComposing(true);
  };

  const handleUpdatePost = () => {
    if (!editingPost || !newPost.content) return;

    const updatedPost: ScheduledPost = {
      ...editingPost,
      content: newPost.content,
      scheduledTime: newPost.scheduledTime || undefined,
      status: newPost.scheduledTime ? "scheduled" : "draft",
      updatedAt: Date.now(),
    };

    const updatedPosts = posts.map((p) =>
      p.id === editingPost.id ? updatedPost : p
    );
    savePosts(updatedPosts);
    resetForm();
  };

  const handleDeletePost = (postId: string) => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      const updatedPosts = posts.filter((p) => p.id !== postId);
      savePosts(updatedPosts);
    }
  };

  const handlePushToPostGen = (post: ScheduledPost) => {
    // Prepare data for PostGen
    const postGenData: PostGenData = {
      content: post.content,
      media: post.media,
      source: "scheduler",
      timestamp: Date.now(),
    };

    // Store in sessionStorage for PostGen to access
    sessionStorage.setItem(POSTGEN_STORAGE_KEY, JSON.stringify(postGenData));

    // Navigate to PostGen module
    setCurrentModule("postgen");

    // Update URL
    window.history.pushState({}, "", "/?module=postgen");
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewPost({ ...newPost, media: file });
    }
  };

  const resetForm = () => {
    setNewPost({ content: "", scheduledTime: "", media: null });
    setIsComposing(false);
    setEditingPost(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "posted":
        return "bg-green-100 text-green-800 border-green-200";
      case "draft":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString();
  };

  const sortedPosts = [...posts].sort((a, b) => {
    // Sort by status: scheduled first, then draft, then posted
    const statusOrder = { scheduled: 0, draft: 1, posted: 2 };
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];

    if (statusDiff !== 0) return statusDiff;

    // Within same status, sort by scheduled time (if available) or creation time
    if (a.scheduledTime && b.scheduledTime) {
      return (
        new Date(a.scheduledTime).getTime() -
        new Date(b.scheduledTime).getTime()
      );
    }

    return b.createdAt - a.createdAt;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Post Scheduler</h2>
        <Button variant="primary" onClick={() => setIsComposing(true)}>
          <Plus size={16} className="mr-2" />
          New Post
        </Button>
      </div>

      {/* Compose/Edit Post Modal */}
      {isComposing && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        >
          <Card
            variant="glass"
            className="w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editingPost ? "Edit Post" : "Compose New Post"}
              </h3>
              <Button variant="ghost" onClick={resetForm}>
                ✕
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Post Content
                </label>
                <textarea
                  value={newPost.content}
                  onChange={(e) =>
                    setNewPost({ ...newPost, content: e.target.value })
                  }
                  placeholder="What's on your mind?"
                  className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                <p className="text-sm text-gray-500 mt-1">
                  {newPost.content.length}/3000 characters
                </p>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Calendar size={16} className="text-gray-500" />
                  <input
                    type="datetime-local"
                    value={newPost.scheduledTime}
                    onChange={(e) =>
                      setNewPost({ ...newPost, scheduledTime: e.target.value })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleMediaUpload}
                    className="hidden"
                    id="media-upload"
                  />
                  <label
                    htmlFor="media-upload"
                    className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <Upload size={16} />
                    <span className="text-sm">Add Media</span>
                  </label>
                </div>
              </div>

              {newPost.media && (
                <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  <div className="flex items-center space-x-2">
                    <FileText size={16} />
                    <span>Selected: {newPost.media.name}</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <Button variant="ghost" onClick={resetForm}>
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  onClick={editingPost ? handleUpdatePost : handleSaveDraft}
                  disabled={!newPost.content}
                >
                  <Save size={16} className="mr-2" />
                  {editingPost ? "Update" : "Save Draft"}
                </Button>
                <Button
                  variant="primary"
                  onClick={editingPost ? handleUpdatePost : handleSchedulePost}
                  disabled={
                    !newPost.content || (!editingPost && !newPost.scheduledTime)
                  }
                >
                  <Send size={16} className="mr-2" />
                  {editingPost ? "Update" : "Schedule Post"}
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Posts List */}
      <div className="space-y-4">
        {sortedPosts.map((post, index) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card variant="glass" className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                        post.status
                      )}`}
                    >
                      {post.status === "draft"
                        ? "Draft"
                        : post.status === "scheduled"
                        ? "Scheduled"
                        : "Posted"}
                    </span>
                    {post.scheduledTime && (
                      <div className="flex items-center space-x-1 text-sm text-gray-500">
                        <Clock size={14} />
                        <span>{formatDateTime(post.scheduledTime)}</span>
                      </div>
                    )}
                    {post.status === "draft" && (
                      <div className="flex items-center space-x-1 text-sm text-gray-500">
                        <FileText size={14} />
                        <span>Draft</span>
                      </div>
                    )}
                  </div>

                  <p className="text-gray-700 dark:text-gray-300 mb-4 whitespace-pre-line">
                    {post.content}
                  </p>

                  {post.media && (
                    <div className="w-full h-32 bg-gray-100 dark:bg-gray-700 rounded-lg mb-4 flex items-center justify-center">
                      <div className="flex items-center space-x-2 text-gray-500">
                        <FileText size={20} />
                        <span>{post.media.name}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col space-y-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePushToPostGen(post)}
                    className="w-full"
                  >
                    <ArrowRight size={14} className="mr-1" />
                    Push to PostGen
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditPost(post)}
                  >
                    <Edit3 size={14} className="mr-1" />
                    Edit
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeletePost(post.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 size={14} className="mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {posts.length === 0 && (
        <div className="text-center py-12">
          <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 mb-2">No posts yet</p>
          <p className="text-sm text-gray-400">
            Create your first post to get started with scheduling
          </p>
        </div>
      )}
    </motion.div>
  );
};
