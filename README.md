# LinkedIn Growth SaaS Platform

A comprehensive LinkedIn growth platform built with React, TypeScript, and LinkedIn's DMA (Data Member Agreement) APIs. This platform provides real-time analytics, content creation tools, and synergy management for professional LinkedIn growth.

## Features

### 🔐 Authentication & Security
- **Dual OAuth Flow**: Basic LinkedIn OAuth + DMA consent for data access
- **Secure Token Management**: Separate handling of basic and DMA tokens
- **Privacy Compliant**: Full compliance with LinkedIn's Data Member Agreement

### 📊 Real-Time Analytics
- **Live Dashboard**: Profile evaluation with 10 key metrics
- **Advanced Analytics**: Detailed charts and insights from LinkedIn DMA APIs
- **Performance Tracking**: Posts, engagement, and network growth metrics
- **Audience Analysis**: Industry, location, and connection insights

### 🤝 Synergy Partners
- **Partner Management**: Add and manage strategic LinkedIn partners
- **Cross-Engagement**: Track partner interactions and comments
- **AI Suggestions**: Smart comment recommendations for partner posts
- **Collaboration Tools**: Shared insights and engagement strategies

### 📝 Content Creation
- **PostGen**: AI-powered content generation and rewriting
- **PostPulse**: Historical post analysis with repurposing suggestions
- **Scheduler**: Content scheduling with media support
- **Creation Engine**: Content strategy and idea generation

### 🎯 Algorithm Insights
- **The Algo**: LinkedIn algorithm analysis and optimization tips
- **Performance Metrics**: Real-time algorithm performance tracking
- **Best Practices**: Data-driven posting recommendations

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **TailwindCSS** for styling
- **Framer Motion** for animations
- **Recharts** for data visualization
- **React Query** for data fetching and caching
- **Zustand** for state management

### Backend
- **Netlify Functions** (Node.js 20)
- **LinkedIn DMA APIs** for data access
- **OpenAI API** for content generation
- **Supabase** for database (optional synergy features)

### APIs & Integrations
- **LinkedIn Member Changelog API** - Real-time activity data
- **LinkedIn Member Snapshot API** - Historical profile data
- **LinkedIn OAuth 2.0** - Authentication
- **OpenAI GPT-4** - Content generation and analysis

## Getting Started

### Prerequisites
- Node.js 20+
- LinkedIn Developer Account with DMA access
- OpenAI API key (optional, for AI features)

### Environment Variables
Create a `.env` file with:

```env
# LinkedIn OAuth (Basic)
LINKEDIN_CLIENT_ID=your_basic_client_id
LINKEDIN_CLIENT_SECRET=your_basic_client_secret

# LinkedIn DMA
LINKEDIN_DMA_CLIENT_ID=your_dma_client_id
LINKEDIN_DMA_CLIENT_SECRET=your_dma_client_secret

# OpenAI (Optional)
VITE_OPENAI_API_KEY=your_openai_api_key

# Supabase (Optional, for Synergy features)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Deployment
URL=https://your-domain.com
```

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd linkedin-growth-saas
```

2. Install dependencies
```bash
npm install
```

3. Start development server
```bash
npm run dev
```

4. For local Netlify functions testing
```bash
npm run dev:netlify
```

## LinkedIn DMA Setup

### 1. Create LinkedIn App
1. Go to [LinkedIn Developer Portal](https://developer.linkedin.com/)
2. Create a new app with your company page
3. Add redirect URI: `https://your-domain.com/.netlify/functions/linkedin-oauth-callback`

### 2. Request DMA Access
1. In your LinkedIn app, go to "Products"
2. Request access to "Data Member Agreement"
3. Complete the DMA application process
4. Wait for approval (can take several weeks)

### 3. Configure Scopes
**Basic OAuth Scopes:**
- `openid`
- `profile`
- `email`
- `w_member_social`

**DMA Scopes:**
- `r_dma_portability_3rd_party`

## API Endpoints

### Authentication
- `GET /.netlify/functions/linkedin-oauth-start` - Initiate OAuth flow
- `GET /.netlify/functions/linkedin-oauth-callback` - Handle OAuth callback

### Data Fetching
- `GET /.netlify/functions/linkedin-profile` - Basic profile data
- `GET /.netlify/functions/linkedin-changelog` - Activity changelog
- `GET /.netlify/functions/linkedin-snapshot` - Historical snapshots
- `GET /.netlify/functions/linkedin-historical-posts` - Post history

### Analytics
- `GET /.netlify/functions/dashboard-data` - Dashboard metrics
- `GET /.netlify/functions/analytics-data` - Detailed analytics

### Content
- `POST /.netlify/functions/linkedin-post` - Create LinkedIn post

### Synergy (Optional)
- `GET /.netlify/functions/synergy-partners` - Partner management
- `GET /.netlify/functions/synergy-posts` - Partner posts
- `POST /.netlify/functions/synergy-suggest-comment` - AI comment suggestions

## Data Sources

### LinkedIn Member Changelog API
Real-time activity data including:
- Posts created (`ugcPosts`)
- Likes given/received (`socialActions/likes`)
- Comments made/received (`socialActions/comments`)
- Invitations sent/received (`invitations`)
- Messages sent (`messages`)

### LinkedIn Member Snapshot API
Historical profile data including:
- Profile information (`PROFILE`)
- Connections list (`CONNECTIONS`)
- Post history (`MEMBER_SHARE_INFO`)
- Skills (`SKILLS`)
- Experience (`POSITIONS`)
- Education (`EDUCATION`)

## Dashboard Metrics

### Profile Evaluation (10 Metrics)
1. **Profile Completeness** - Percentage of profile fields filled
2. **Posting Activity** - Posts in last 30 days
3. **Engagement Quality** - Average engagement per post
4. **Network Growth** - New connections in last 30 days
5. **Audience Relevance** - Industry diversity and professional connections
6. **Content Diversity** - Variety in content types
7. **Engagement Rate** - Total engagement vs network size
8. **Mutual Interactions** - Engagement given to others
9. **Profile Visibility** - Profile views and search appearances
10. **Professional Brand** - Professional signals and consistency

### Summary KPIs
- Total Connections
- Posts (Last 30 Days)
- Engagement Rate
- New Connections

### Mini Trends
- 7-day posting activity
- 7-day engagement trends

## Analytics Features

### Engagement Trends
- Posts and engagement over time
- Likes, comments, shares breakdown
- Best performing content identification

### Network Analysis
- Connection growth over time
- Industry distribution
- Geographic distribution
- Professional title analysis

### Content Performance
- Post type performance (text, image, video, article)
- Hashtag effectiveness
- Optimal posting times
- Content engagement correlation

### Audience Insights
- Viewer demographics
- Industry breakdown
- Company distribution
- Engagement patterns

## Caching Strategy

### PostPulse Cache
- 24-hour browser cache for historical posts
- Intelligent merging of historical and real-time data
- Graceful fallback when APIs are unavailable

### API Rate Limiting
- Intelligent request batching
- Exponential backoff on failures
- Cache-first approach for better performance

## Deployment

### Netlify Deployment
1. Connect your repository to Netlify
2. Set environment variables in Netlify dashboard
3. Deploy with build command: `npm run build`

### Environment Configuration
```toml
# netlify.toml
[build]
  command = "npm run build"
  functions = "netlify/functions"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
```

## Security Considerations

### Token Management
- Tokens stored securely in browser localStorage
- Automatic token refresh handling
- Secure transmission over HTTPS only

### Data Privacy
- Full compliance with LinkedIn DMA requirements
- User data processed only for analytics purposes
- No data sharing with third parties
- Clear data retention policies

### API Security
- CORS properly configured
- Rate limiting implemented
- Input validation on all endpoints
- Error handling without data leakage

## Troubleshooting

### Common Issues

1. **DMA Token Missing**
   - Ensure DMA access is approved by LinkedIn
   - Check environment variables are set correctly
   - Verify OAuth callback URL matches exactly

2. **No Data in Analytics**
   - Check if user has recent LinkedIn activity
   - Verify DMA permissions are granted
   - Check API rate limits

3. **Authentication Failures**
   - Verify LinkedIn app configuration
   - Check redirect URIs match exactly
   - Ensure client credentials are correct

### Debug Mode
Enable debug mode in Dashboard and Analytics to see:
- API response details
- Data processing steps
- Cache status
- Error details

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Check the troubleshooting section
- Review LinkedIn DMA documentation
- Open an issue on GitHub

## Roadmap

### Upcoming Features
- Advanced AI content suggestions
- Team collaboration features
- Custom analytics dashboards
- Integration with other social platforms
- Mobile app development

### Performance Improvements
- Server-side caching
- Real-time WebSocket updates
- Advanced data visualization
- Offline functionality