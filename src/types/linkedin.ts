export interface LinkedInProfile {
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  email: string;
  email_verified: boolean;
  locale: string;
}

export interface ChangelogEvent {
  id: number;
  capturedAt: number;
  processedAt: number;
  owner: string;
  actor: string;
  resourceName: string;
  resourceId: string;
  method: 'CREATE' | 'UPDATE' | 'DELETE';
  activity: any;
  processedActivity: any;
}

export interface ChangelogResponse {
  elements: ChangelogEvent[];
  paging: {
    start: number;
    count: number;
    total?: number;
    links?: Array<{
      rel: string;
      href: string;
    }>;
  };
}

export interface SnapshotData {
  elements: Array<{
    snapshotDomain: string;
    snapshotData: any[];
  }>;
  paging: {
    start: number;
    count: number;
    links?: Array<{
      rel: string;
      href: string;
    }>;
  };
}

export interface PostData {
  id: string;
  text: string;
  media?: any[];
  timestamp: number;
  likes: number;
  comments: number;
  shares: number;
  impressions?: number;
  resourceName?: string;
}

export interface EngagementMetrics {
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalImpressions: number;
  averageEngagement: number;
  bestPerformingPost?: PostData;
  engagementRate: number;
}