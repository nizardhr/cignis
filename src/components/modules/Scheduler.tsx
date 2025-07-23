import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, Plus, Image, Send, Save } from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

interface ScheduledPost {
  id: string;
  content: string;
  scheduledTime: string;
  media?: string;
  status: "scheduled" | "posted" | "draft";
}

interface ScheduledPostData {
  content: string;
  media?: {
    name: string;
    type: string;
    size: number;
  } | null;
  source: "generated" | "rewritten";
  timestamp: number;
}

const SESSION_STORAGE_KEYS = {
  SCHEDULED_POST: "scheduledPost",
} as const;

export const Scheduler = () => {
  const [posts, setPosts] = useState<ScheduledPost[]>([
    {
      id: "1",
      content:
        "Exciting announcement coming this week! Stay tuned for some game-changing updates in our industry.",
      scheduledTime: "2024-01-15T10:00",
      status: "scheduled",
    },
    {
      id: "2",
      content:
        "Just wrapped up an amazing project with the team. The collaboration was incredible!",
      scheduledTime: "2024-01-14T14:30",
      status: "posted",
    },
  ]);

  const [newPost, setNewPost] = useState({
    content: "",
    scheduledTime: "",
    media: null as File | null,
  });

  const [isComposing, setIsComposing] = useState(false);

  // Check for scheduled post data from PostGen
  useEffect(() => {
    const scheduledPostData = sessionStorage.getItem(
      SESSION_STORAGE_KEYS.SCHEDULED_POST
    );
    if (scheduledPostData) {
      try {
        const data: ScheduledPostData = JSON.parse(scheduledPostData);

        // Auto-populate the compose form
        setNewPost({
          content: data.content,
          scheduledTime: "",
          media: null,
        });

        // Open the compose modal
        setIsComposing(true);

        // Clear the data after using it
        sessionStorage.removeItem(SESSION_STORAGE_KEYS.SCHEDULED_POST);

        console.log("Loaded scheduled post from PostGen:", data);
      } catch (error) {
        console.error("Error parsing scheduled post data:", error);
      }
    }
  }, []);

  const handleSchedulePost = () => {
    if (newPost.content && newPost.scheduledTime) {
      const post: ScheduledPost = {
        id: Date.now().toString(),
        content: newPost.content,
        scheduledTime: newPost.scheduledTime,
        status: "scheduled",
      };

      setPosts([...posts, post]);
      setNewPost({ content: "", scheduledTime: "", media: null });
      setIsComposing(false);
    }
  };

  const handleSaveDraft = () => {
    if (newPost.content) {
      const post: ScheduledPost = {
        id: Date.now().toString(),
        content: newPost.content,
        scheduledTime: newPost.scheduledTime,
        status: "draft",
      };

      setPosts([...posts, post]);
      setNewPost({ content: "", scheduledTime: "", media: null });
      setIsComposing(false);
    }
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewPost({ ...newPost, media: file });
    }
  };

  const statusColors = {
    scheduled: "bg-blue-100 text-blue-800",
    posted: "bg-green-100 text-green-800",
    draft: "bg-gray-100 text-gray-800",
  };

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

      {/* Compose Post Modal */}
      {isComposing && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        >
          <Card variant="glass" className="w-full max-w-2xl p-6">
            <h3 className="text-lg font-semibold mb-4">Compose New Post</h3>

            <div className="space-y-4">
              <textarea
                value={newPost.content}
                onChange={(e) =>
                  setNewPost({ ...newPost, content: e.target.value })
                }
                placeholder="What's on your mind?"
                className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />

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
                    accept="image/*"
                    onChange={handleMediaUpload}
                    className="hidden"
                    id="media-upload"
                  />
                  <label
                    htmlFor="media-upload"
                    className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <Image size={16} />
                    <span className="text-sm">Add Media</span>
                  </label>
                </div>
              </div>

              {newPost.media && (
                <div className="text-sm text-gray-600">
                  Selected: {newPost.media.name}
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <Button variant="ghost" onClick={() => setIsComposing(false)}>
                  Cancel
                </Button>
                <Button variant="outline" onClick={handleSaveDraft}>
                  <Save size={16} className="mr-2" />
                  Save Draft
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSchedulePost}
                  disabled={!newPost.content || !newPost.scheduledTime}
                >
                  <Send size={16} className="mr-2" />
                  Schedule Post
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Scheduled Posts */}
      <div className="space-y-4">
        {posts.map((post, index) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card variant="glass" className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        statusColors[post.status]
                      }`}
                    >
                      {post.status.charAt(0).toUpperCase() +
                        post.status.slice(1)}
                    </span>
                    <div className="flex items-center space-x-1 text-sm text-gray-500">
                      <Clock size={14} />
                      <span>
                        {new Date(post.scheduledTime).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 mb-4">
                    {post.content}
                  </p>
                  {post.media && (
                    <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4 flex items-center justify-center">
                      <span className="text-gray-500">Media Preview</span>
                    </div>
                  )}
                </div>
                <div className="flex space-x-2 ml-4">
                  {post.status === "scheduled" && (
                    <>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600"
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                  {post.status === "draft" && (
                    <>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                      <Button variant="primary" size="sm">
                        Schedule
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {posts.length === 0 && (
        <div className="text-center py-12">
          <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">
            No scheduled posts yet. Create your first post!
          </p>
        </div>
      )}
    </motion.div>
  );
};
