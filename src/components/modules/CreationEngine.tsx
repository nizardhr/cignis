import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, TrendingUp, Target, Zap, RefreshCw } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useLinkedInSnapshot, useLinkedInChangelog } from '../../hooks/useLinkedInData';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { generateContentStrategy } from '../../services/openai';

interface ContentStrategy {
  type: string;
  description: string;
  examples: string[];
  engagementRate: number;
  frequency: string;
}

interface ContentIdea {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  estimatedEngagement: number;
}

export const CreationEngine = () => {
  const [selectedStrategy, setSelectedStrategy] = useState<string>('');
  const [generatedIdeas, setGeneratedIdeas] = useState<ContentIdea[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiStrategy, setAiStrategy] = useState<string>('');
  const [isGeneratingStrategy, setIsGeneratingStrategy] = useState(false);
  
  const { data: snapshotData, isLoading: snapshotLoading } = useLinkedInSnapshot();
  const { data: changelogData, isLoading: changelogLoading } = useLinkedInChangelog();

  // Analyze user's posting patterns
  const analysis = useMemo(() => {
    if (!snapshotData || !changelogData) return null;

    const posts = changelogData.elements?.filter(e => e.resourceName === 'ugcPosts') || [];
    const likes = changelogData.elements?.filter(e => e.resourceName === 'socialActions/likes') || [];
    const comments = changelogData.elements?.filter(e => e.resourceName === 'socialActions/comments') || [];

    // Analyze content types from posts
    const contentTypes = {
      text: 0,
      image: 0,
      video: 0,
      carousel: 0,
      poll: 0
    };

    posts.forEach(post => {
      const specificContent = post.activity?.specificContent?.['com.linkedin.ugc.ShareContent'];
      const media = specificContent?.media;
      
      if (media && media.length > 0) {
        if (media.length > 1) {
          contentTypes.carousel++;
        } else {
          contentTypes.image++;
        }
      } else {
        contentTypes.text++;
      }
    });

    // Calculate engagement rates
    const totalEngagement = likes.length + comments.length;
    const avgEngagement = posts.length > 0 ? totalEngagement / posts.length : 0;

    // Analyze best performing times
    const postTimes = posts.map(p => new Date(p.capturedAt).getHours());
    const hourCounts = postTimes.reduce((acc, hour) => {
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const optimalHour = Object.entries(hourCounts).sort(([,a], [,b]) => b - a)[0]?.[0] || '9';

    return {
      totalPosts: posts.length,
      avgEngagement,
      contentTypes,
      optimalHour: parseInt(optimalHour),
      bestPerformingType: Object.entries(contentTypes).sort(([,a], [,b]) => b - a)[0]?.[0] || 'text'
    };
  }, [snapshotData, changelogData]);

  // Content strategies based on analysis
  const strategies: ContentStrategy[] = [
    {
      type: 'Thought Leadership',
      description: 'Share industry insights and personal perspectives',
      examples: ['Industry trend analysis', 'Lessons learned', 'Controversial opinions'],
      engagementRate: 8.5,
      frequency: '2-3x per week'
    },
    {
      type: 'Personal Stories',
      description: 'Share authentic personal experiences',
      examples: ['Career journey', 'Failure stories', 'Behind-the-scenes'],
      engagementRate: 9.2,
      frequency: '1-2x per week'
    },
    {
      type: 'Educational Content',
      description: 'Teach valuable skills and knowledge',
      examples: ['How-to guides', 'Industry tips', 'Tool recommendations'],
      engagementRate: 7.8,
      frequency: '3-4x per week'
    },
    {
      type: 'Engagement Posts',
      description: 'Posts designed to spark conversation',
      examples: ['Questions', 'Polls', 'Controversial takes'],
      engagementRate: 9.8,
      frequency: '1x per week'
    }
  ];

  const generateContentIdeas = async () => {
    setIsGenerating(true);
    
    // Simulate AI generation
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const ideas: ContentIdea[] = [
      {
        id: '1',
        title: 'The Hidden Cost of Remote Work',
        description: 'Share your personal experience with remote work challenges and solutions',
        category: 'Personal Story',
        difficulty: 'Easy',
        estimatedEngagement: 85
      },
      {
        id: '2',
        title: '5 Tools That Changed My Productivity',
        description: 'Create a carousel post showcasing your favorite productivity tools',
        category: 'Educational',
        difficulty: 'Medium',
        estimatedEngagement: 92
      },
      {
        id: '3',
        title: 'What Would You Do? Career Dilemma',
        description: 'Present a career scenario and ask for community advice',
        category: 'Engagement',
        difficulty: 'Easy',
        estimatedEngagement: 78
      },
      {
        id: '4',
        title: 'Industry Prediction: AI in 2024',
        description: 'Share your predictions about AI trends in your industry',
        category: 'Thought Leadership',
        difficulty: 'Hard',
        estimatedEngagement: 95
      }
    ];
    
    setGeneratedIdeas(ideas);
    setIsGenerating(false);
  };

  const generateAIStrategy = async () => {
    if (!snapshotData || !changelogData) return;
    
    setIsGeneratingStrategy(true);
    try {
      const posts = changelogData.elements?.filter(e => e.resourceName === 'ugcPosts') || [];
      const metrics = analysis || {};
      
      const strategy = await generateContentStrategy(posts, metrics);
      setAiStrategy(strategy);
    } catch (error) {
      console.error('Failed to generate AI strategy:', error);
      setAiStrategy('AI strategy generation temporarily unavailable. Please check your OpenAI API configuration.');
    } finally {
      setIsGeneratingStrategy(false);
    }
  };

  if (snapshotLoading || changelogLoading) {
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
        <h2 className="text-2xl font-bold">Creation Engine</h2>
        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            onClick={generateAIStrategy}
            disabled={isGeneratingStrategy}
          >
            <Zap size={16} className="mr-2" />
            {isGeneratingStrategy ? 'Analyzing...' : 'AI Strategy'}
          </Button>
          <Button variant="primary" onClick={generateContentIdeas} disabled={isGenerating}>
            <Lightbulb size={16} className="mr-2" />
            {isGenerating ? 'Generating...' : 'Generate Ideas'}
          </Button>
        </div>
      </div>

      {/* AI Strategy Section */}
      {aiStrategy && (
        <Card variant="glass" className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Zap className="mr-2 text-purple-500" size={20} />
            AI Content Strategy
          </h3>
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-line text-gray-700 dark:text-gray-300">
              {aiStrategy}
            </div>
          </div>
        </Card>
      )}

      {/* Performance Analysis */}
      {analysis && (
        <Card variant="glass" className="p-6">
          <h3 className="text-lg font-semibold mb-4">Your Content Analysis</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{analysis.totalPosts}</div>
              <div className="text-sm text-gray-500">Total Posts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{analysis.avgEngagement.toFixed(1)}</div>
              <div className="text-sm text-gray-500">Avg Engagement</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{analysis.optimalHour}:00</div>
              <div className="text-sm text-gray-500">Optimal Hour</div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm">
              <strong>Recommendation:</strong> Your {analysis.bestPerformingType} posts perform best. 
              Consider posting around {analysis.optimalHour}:00 for maximum engagement.
            </p>
          </div>
        </Card>
      )}

      {/* Content Strategies */}
      <Card variant="glass" className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recommended Strategies</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {strategies.map((strategy, index) => (
            <motion.div
              key={strategy.type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedStrategy === strategy.type
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedStrategy(strategy.type)}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">{strategy.type}</h4>
                <div className="flex items-center space-x-1">
                  <TrendingUp size={14} className="text-green-500" />
                  <span className="text-sm text-green-600">{strategy.engagementRate}%</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-3">{strategy.description}</p>
              <div className="space-y-1">
                {strategy.examples.map((example, i) => (
                  <div key={i} className="text-xs text-gray-500">• {example}</div>
                ))}
              </div>
              <div className="mt-3 text-xs text-blue-600">
                Frequency: {strategy.frequency}
              </div>
            </motion.div>
          ))}
        </div>
      </Card>

      {/* Generated Ideas */}
      {generatedIdeas.length > 0 && (
        <Card variant="glass" className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Content Ideas</h3>
            <Button variant="outline" size="sm" onClick={generateContentIdeas}>
              <RefreshCw size={14} className="mr-1" />
              Refresh
            </Button>
          </div>
          <div className="space-y-4">
            {generatedIdeas.map((idea, index) => (
              <motion.div
                key={idea.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-semibold">{idea.title}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        idea.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                        idea.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {idea.difficulty}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{idea.description}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>Category: {idea.category}</span>
                      <span>Est. Engagement: {idea.estimatedEngagement}%</span>
                    </div>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <Button variant="outline" size="sm">
                      <Zap size={14} className="mr-1" />
                      Use Idea
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Target size={14} />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      )}
    </motion.div>
  );
};