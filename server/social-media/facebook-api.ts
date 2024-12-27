import { SocialMediaPost } from '../../client/src/lib/social-media';

export class FacebookAPI {
  private appId: string;
  private appSecret: string;
  private accessToken: string | null = null;

  constructor({ appId, appSecret }: { appId: string; appSecret: string }) {
    this.appId = appId;
    this.appSecret = appSecret;
  }

  async initialize(): Promise<void> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/oauth/access_token?client_id=${this.appId}&client_secret=${this.appSecret}&grant_type=client_credentials`
      );
      
      if (!response.ok) {
        throw new Error('Failed to initialize Facebook API');
      }
      
      const data = await response.json();
      this.accessToken = data.access_token;
    } catch (error) {
      console.error('Facebook API initialization failed:', error);
      throw error;
    }
  }

  async getAuthorizationUrl(): Promise<string> {
    const redirectUri = `${process.env.APP_URL}/api/social/facebook/callback`;
    return `https://www.facebook.com/v18.0/dialog/oauth?client_id=${this.appId}&redirect_uri=${redirectUri}&scope=pages_show_list,pages_read_engagement`;
  }

  async handleCallback(code: string): Promise<void> {
    try {
      const redirectUri = `${process.env.APP_URL}/api/social/facebook/callback`;
      const response = await fetch(
        `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${this.appId}&redirect_uri=${redirectUri}&client_secret=${this.appSecret}&code=${code}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to exchange code for access token');
      }
      
      const data = await response.json();
      this.accessToken = data.access_token;
    } catch (error) {
      console.error('Failed to handle Facebook callback:', error);
      throw error;
    }
  }

  async searchPosts(symbol: string): Promise<SocialMediaPost[]> {
    try {
      if (!this.accessToken) {
        throw new Error('Not authenticated with Facebook');
      }

      const response = await fetch(
        `https://graph.facebook.com/v18.0/search?q=${symbol}&type=post&fields=message,created_time,from,reactions.summary(total_count),shares&access_token=${this.accessToken}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch Facebook posts');
      }

      const data = await response.json();
      
      return data.data.map((post: any) => ({
        platform: 'facebook',
        content: post.message,
        engagement: {
          likes: post.reactions?.summary?.total_count || 0,
          shares: post.shares?.count || 0,
          comments: 0,
        },
        timestamp: post.created_time,
        author: {
          name: post.from.name,
          id: post.from.id,
          profileUrl: `https://facebook.com/${post.from.id}`,
        },
      }));
    } catch (error) {
      console.error('Failed to search Facebook posts:', error);
      throw error;
    }
  }
}
