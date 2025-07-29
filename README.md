# LinkedIn Growth SaaS

A comprehensive LinkedIn growth platform with real-time analytics, content creation tools, and synergy management.

## Features

- **Real-time Analytics**: Track LinkedIn performance with live data from LinkedIn's DMA API
- **Synergy Partners**: Build meaningful connections and engage strategically with mutual partners
- **Content Intelligence**: AI-powered insights to optimize content strategy and engagement
- **PostPulse**: Analyze and repurpose your historical LinkedIn posts
- **PostGen**: AI-powered content generation and rewriting
- **Scheduler**: Schedule posts for optimal timing
- **Creation Engine**: Generate content ideas based on your posting patterns
- **The Algo**: Understand LinkedIn's algorithm and optimize your strategy

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Netlify Functions (Node.js)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: LinkedIn OAuth 2.0 with DMA (Data Member Agreement)
- **State Management**: Zustand
- **Data Fetching**: TanStack Query
- **Charts**: Recharts
- **Icons**: Lucide React

## Project Structure

```
src/
├── components/
│   ├── auth/           # Authentication components
│   ├── dashboard/      # Dashboard components
│   ├── landing/        # Landing page components
│   ├── layout/         # Layout components (Header, Sidebar, etc.)
│   ├── modules/        # Feature modules
│   │   ├── Analytics.tsx
│   │   ├── CreationEngine.tsx
│   │   ├── DMATestPage.tsx
│   │   ├── PostGen.tsx
│   │   ├── PostPulse.tsx
│   │   ├── Scheduler.tsx
│   │   ├── Settings.tsx
│   │   ├── Synergy.tsx
│   │   └── TheAlgo.tsx
│   └── ui/             # Reusable UI components
├── hooks/              # Custom React hooks
├── services/           # API services and utilities
├── stores/             # Zustand stores
└── types/              # TypeScript type definitions

netlify/functions/      # Serverless functions
├── linkedin-oauth-start.js
├── linkedin-oauth-callback.js
├── linkedin-profile.js
├── linkedin-changelog.js
├── linkedin-snapshot.js
├── linkedin-historical-posts.js
├── linkedin-post.js
└── linkedin-media-download.js
```

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (Vite only)
npm run dev

# Start with Netlify Dev (includes functions)
npm run dev:netlify

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Environment Variables

Create a `.env` file in the root directory:

```env
# LinkedIn OAuth (Basic)
LINKEDIN_CLIENT_ID=your_basic_client_id
LINKEDIN_CLIENT_SECRET=your_basic_client_secret

# LinkedIn OAuth (DMA)
LINKEDIN_DMA_CLIENT_ID=your_dma_client_id
LINKEDIN_DMA_CLIENT_SECRET=your_dma_client_secret

# OpenAI (for content generation)
VITE_OPENAI_API_KEY=your_openai_api_key

# Supabase (for database)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Deployment
URL=https://your-domain.com
```

## LinkedIn DMA Integration

This project uses LinkedIn's Data Member Agreement (DMA) API to access user data with proper consent. The authentication flow includes:

1. **Basic OAuth**: Standard LinkedIn authentication for profile access
2. **DMA OAuth**: Additional consent for data portability and analytics

### Available LinkedIn APIs

- **Profile Data**: Basic profile information
- **Member Changelog**: Real-time activity feed (last 28 days)
- **Member Snapshot**: Historical data across multiple domains
- **UGC Posts**: User-generated content and posts
- **Social Actions**: Likes, comments, and shares
- **Connections**: Network connections and growth

### DMA Domains

The app can access the following LinkedIn data domains:

- `PROFILE`: Profile information and metrics
- `CONNECTIONS`: Network connections
- `MEMBER_SHARE_INFO`: Posts and shares
- `SKILLS`: Skills and endorsements
- `POSITIONS`: Work experience
- `EDUCATION`: Educational background
- `ALL_COMMENTS`: Comments made by the user
- `ALL_LIKES`: Likes given by the user

## Database Schema

The project uses Supabase with the following main tables:

- **users**: User profiles and LinkedIn integration
- **synergy_partners**: Mutual partnership relationships
- **post_cache**: Cached LinkedIn posts for performance
- **comment_cache**: Cached comments for cross-partner analysis
- **suggested_comments**: AI-generated comment suggestions

## API Endpoints

### Authentication
- `GET /.netlify/functions/linkedin-oauth-start` - Initiate LinkedIn OAuth
- `GET /.netlify/functions/linkedin-oauth-callback` - Handle OAuth callback

### LinkedIn Data
- `GET /.netlify/functions/linkedin-profile` - Get user profile
- `GET /.netlify/functions/linkedin-changelog` - Get activity changelog
- `GET /.netlify/functions/linkedin-snapshot` - Get snapshot data
- `GET /.netlify/functions/linkedin-historical-posts` - Get historical posts

### Content
- `POST /.netlify/functions/linkedin-post` - Create LinkedIn post

### Synergy (New)
- `GET /api/synergy/partners` - Get synergy partners
- `POST /api/synergy/partners` - Add synergy partner
- `GET /api/synergy/partners/:id/posts` - Get partner's posts
- `GET /api/synergy/comments` - Get cross-partner comments
- `POST /api/synergy/suggest-comment` - Generate AI comment suggestions

## Deployment

The project is configured for Netlify deployment:

```bash
# Build and deploy
npm run build

# Deploy to Netlify
netlify deploy --prod
```

## Features in Detail

### Synergy Partners
- Add mutual partners for strategic engagement
- View partner's latest posts with engagement metrics
- See cross-partner comments and interactions
- AI-powered comment suggestions for better engagement

### PostPulse
- Historical post analysis with 90-day data
- Intelligent caching for performance
- Post repurposing recommendations
- Advanced filtering and pagination

### Analytics
- Real-time LinkedIn performance metrics
- Engagement tracking and analysis
- Network growth insights
- Content performance optimization

### Content Creation
- AI-powered post generation
- Content strategy recommendations
- Posting schedule optimization
- Media upload and management

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is proprietary software. All rights reserved.