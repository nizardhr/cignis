import { useState } from 'react';
import { motion } from 'framer-motion';
import { Wand2, Copy, Calendar, RefreshCw, Upload, Send, Clock, Edit3 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { generateContent } from '../../services/openai';
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';

interface GeneratedPost {
  content: string;
  timestamp: number;
}

export const PostGen = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'create' | 'rewrite'>('create');
  
  // Create New Post Section
  const [postTopic, setPostTopic] = useState('');
  const [generatedPost, setGeneratedPost] = useState<GeneratedPost | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Rewrite Section
  const [originalPost, setOriginalPost] = useState('');
  const [rewrittenPost, setRewrittenPost] = useState('');
  const [isRewriting, setIsRewriting] = useState(false);

  // Check if we came from PostPulse with a post to rewrite
  useEffect(() => {
    // Check for repurposed post from PostPulse
    const repurposeData = sessionStorage.getItem('repurposePost');
    if (repurposeData) {
      try {
        const { text, originalDate, engagement } = JSON.parse(repurposeData);
        setActiveTab('rewrite');
        setOriginalPost(text);
        // Clear the data after using it
        sessionStorage.removeItem('repurposePost');
        console.log('Loaded repurposed post:', { text, originalDate, engagement });
      } catch (error) {
        console.error('Error parsing repurpose data:', error);
      }
    }
    
    // Check URL parameters for tab and rewrite content
    const urlParams = new URLSearchParams(location.search);
    const tabParam = urlParams.get('tab');
    const postToRewrite = urlParams.get('rewrite');
    
    if (tabParam === 'rewrite') {
      setActiveTab('rewrite');
    }
    
    if (postToRewrite) {
      setActiveTab('rewrite');
      setOriginalPost(decodeURIComponent(postToRewrite));
    }
  }, [location]);

  const handleGeneratePost = async () => {
    if (!postTopic.trim()) return;
    
    setIsGenerating(true);

    try {
      const prompt = `Create a professional LinkedIn post about: ${postTopic}. Make it engaging, authentic, and valuable to the professional community. Include relevant hashtags.`;
      const content = await generateContent(prompt);
      
      setGeneratedPost({
        content,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Failed to generate post:', error);
      // Fallback content
      setGeneratedPost({
        content: `Here's my take on ${postTopic}:\n\nThis topic is incredibly relevant in today's professional landscape. From my experience, the key is to approach it with both strategic thinking and authentic execution.\n\nWhat's your perspective on this? I'd love to hear your thoughts in the comments.\n\n#LinkedIn #Professional #Growth`,
        timestamp: Date.now()
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRewritePost = async () => {
    if (!originalPost.trim()) return;
    
    setIsRewriting(true);
    
    try {
      const prompt = `Rewrite this LinkedIn post to make it more engaging and professional while keeping the core message. Original post: "${originalPost}"`;
      const content = await generateContent(prompt);
      setRewrittenPost(content);
    } catch (error) {
      console.error('Failed to rewrite post:', error);
      setRewrittenPost(`Here's a fresh take on your original post:\n\n${originalPost}\n\n[This would be rewritten with AI to be more engaging while maintaining your core message]`);
    } finally {
      setIsRewriting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handlePostNow = () => {
    // In real app, would integrate with LinkedIn API
    console.log('Posting now:', generatedPost?.content || rewrittenPost);
    alert('Post would be published now! (LinkedIn API integration needed)');
  };

  const handleSchedulePost = () => {
    // In real app, would integrate with scheduler
    console.log('Scheduling post:', generatedPost?.content || rewrittenPost);
    alert('Post would be scheduled! (Scheduler integration needed)');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };


  const clearAll = () => {
    setPostTopic('');
    setGeneratedPost(null);
    setUploadedFile(null);
    setOriginalPost('');
    setRewrittenPost('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">PostGen</h2>
        <Button variant="outline" onClick={clearAll}>
          <RefreshCw size={16} className="mr-2" />
          Clear All
        </Button>
      </div>

      {/* Tab Navigation */}
      <Card variant="glass" className="p-6">
        <div className="flex space-x-4 mb-6">
          <Button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'create'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Wand2 size={16} className="inline mr-2" />
            Create New Post
          </Button>
          <Button
            onClick={() => setActiveTab('rewrite')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'rewrite'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Edit3 size={16} className="inline mr-2" />
            Rewrite Post
          </Button>
        </div>

        {/* Create New Post Section */}
        {activeTab === 'create' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">What do you want to post about?</label>
              <textarea
                value={postTopic}
                onChange={(e) => setPostTopic(e.target.value)}
                placeholder="Describe your post topic, key message, or what you want to share with your network..."
                className="w-full h-24 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-sm text-gray-500">{postTopic.length}/500 characters</p>
                <Button 
                  variant="primary" 
                  onClick={handleGeneratePost} 
                  disabled={!postTopic.trim() || isGenerating}
                >
                  <Wand2 size={16} className="mr-2" />
                  {isGenerating ? 'Generating...' : 'Generate Post'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Rewrite Post Section */}
        {activeTab === 'rewrite' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Original Post</label>
              <textarea
                value={originalPost}
                onChange={(e) => setOriginalPost(e.target.value)}
                placeholder="Paste your previous post here to rewrite it..."
                className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-sm text-gray-500">{originalPost.length}/2000 characters</p>
                <Button 
                  variant="primary" 
                  onClick={handleRewritePost} 
                  disabled={!originalPost.trim() || isRewriting}
                >
                  <Edit3 size={16} className="mr-2" />
                  {isRewriting ? 'Rewriting...' : 'Rewrite My Post'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Generated Content Display */}
      {(generatedPost || rewrittenPost) && (
        <Card variant="glass" className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {activeTab === 'create' ? 'Generated Post' : 'Rewritten Post'}
          </h3>
          <div className="p-4 bg-gray-50 rounded-lg mb-4">
            <p className="whitespace-pre-line text-gray-700">
              {activeTab === 'create' ? generatedPost?.content : rewrittenPost}
            </p>
          </div>
          
          {/* File Upload */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Add Media (Optional)</label>
            <div className="flex items-center space-x-4">
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileUpload}
                className="hidden"
                id="media-upload"
              />
              <label
                htmlFor="media-upload"
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <Upload size={16} />
                <span className="text-sm">Upload Media</span>
              </label>
              {uploadedFile && (
                <span className="text-sm text-green-600">
                  ✓ {uploadedFile.name}
                </span>
              )}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button variant="primary" onClick={handlePostNow} className="flex-1">
              <Send size={16} className="mr-2" />
              Post Now
            </Button>
            <Button variant="outline" onClick={handleSchedulePost} className="flex-1">
              <Clock size={16} className="mr-2" />
              Schedule Later
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => copyToClipboard(activeTab === 'create' ? generatedPost?.content || '' : rewrittenPost)}
            >
              <Copy size={16} />
            </Button>
          </div>
        </Card>
      )}
    </motion.div>
  );
};