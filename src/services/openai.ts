const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const generateContent = async (prompt: string, context?: string): Promise<string> => {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const messages: OpenAIMessage[] = [
    {
      role: 'system',
      content: 'You are a LinkedIn content expert. Create engaging, professional LinkedIn posts that drive engagement. Keep posts concise, authentic, and valuable to the professional community.'
    }
  ];

  if (context) {
    messages.push({
      role: 'system',
      content: `Context: ${context}`
    });
  }

  messages.push({
    role: 'user',
    content: prompt
  });

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages,
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Failed to generate content';
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
};

export const analyzePostPerformance = async (posts: any[], engagement: any[]): Promise<string> => {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const analysisPrompt = `
Analyze the following LinkedIn post performance data and provide insights:

Posts: ${JSON.stringify(posts.slice(0, 10))}
Engagement: ${JSON.stringify(engagement.slice(0, 20))}

Please provide:
1. Top performing post types
2. Best posting times
3. Engagement patterns
4. Content recommendations
5. Algorithm insights

Keep the analysis professional and actionable.
`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a LinkedIn analytics expert. Analyze post performance data and provide actionable insights for improving LinkedIn engagement and reach.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Failed to generate analysis';
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
};

export const generateContentStrategy = async (userHistory: any[], metrics: any): Promise<string> => {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const strategyPrompt = `
Based on this LinkedIn user's posting history and performance metrics, create a personalized content strategy:

User History: ${JSON.stringify(userHistory.slice(0, 10))}
Metrics: ${JSON.stringify(metrics)}

Please provide:
1. Content pillars to focus on
2. Optimal posting frequency and timing
3. Content format recommendations
4. Engagement strategies
5. Growth tactics

Make it specific and actionable.
`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a LinkedIn growth strategist. Create personalized content strategies based on user data and performance metrics.'
          },
          {
            role: 'user',
            content: strategyPrompt
          }
        ],
        max_tokens: 1200,
        temperature: 0.4
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Failed to generate strategy';
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
};