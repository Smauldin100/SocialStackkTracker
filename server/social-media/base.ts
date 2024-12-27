import type { Post, SocialAccount } from "@db/schema";

// Base interface for all social media platform services
export interface SocialMediaService {
  name: string;
  
  // Authentication
  authenticate(code: string): Promise<{ accessToken: string; refreshToken?: string }>;
  refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }>;
  
  // Profile operations
  getProfile(accessToken: string): Promise<{
    id: string;
    username: string;
    profileUrl?: string;
    followers?: number;
    following?: number;
  }>;
  
  // Post operations
  createPost(account: SocialAccount, post: Partial<Post>): Promise<{ id: string; url: string }>;
  deletePost(account: SocialAccount, postId: string): Promise<void>;
  getPostAnalytics(account: SocialAccount, postId: string): Promise<{
    impressions: number;
    reaches: number;
    engagements: number;
    shares: number;
    saves: number;
  }>;
  
  // Analytics
  getAccountAnalytics(account: SocialAccount): Promise<{
    followers: number;
    following: number;
    posts: number;
    avgEngagement: number;
    reachRate: number;
    topPostTypes: Record<string, number>;
    audienceDemo: Record<string, number>;
  }>;
}

// Base class for implementing platform-specific services
export abstract class BaseSocialMediaService implements SocialMediaService {
  constructor(
    public readonly name: string,
    protected readonly clientId: string,
    protected readonly clientSecret: string,
    protected readonly redirectUri: string
  ) {}

  abstract authenticate(code: string): Promise<{ accessToken: string; refreshToken?: string }>;
  abstract refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }>;
  abstract getProfile(accessToken: string): Promise<{
    id: string;
    username: string;
    profileUrl?: string;
    followers?: number;
    following?: number;
  }>;
  abstract createPost(account: SocialAccount, post: Partial<Post>): Promise<{ id: string; url: string }>;
  abstract deletePost(account: SocialAccount, postId: string): Promise<void>;
  abstract getPostAnalytics(account: SocialAccount, postId: string): Promise<{
    impressions: number;
    reaches: number;
    engagements: number;
    shares: number;
    saves: number;
  }>;
  abstract getAccountAnalytics(account: SocialAccount): Promise<{
    followers: number;
    following: number;
    posts: number;
    avgEngagement: number;
    reachRate: number;
    topPostTypes: Record<string, number>;
    audienceDemo: Record<string, number>;
  }>;

  protected handleError(error: any): never {
    console.error(`[${this.name}] API Error:`, error);
    throw new Error(`${this.name} API Error: ${error.message || 'Unknown error'}`);
  }
}
