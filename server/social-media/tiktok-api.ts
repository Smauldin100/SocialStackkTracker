import { SocialMediaPost } from '../../client/src/lib/social-media';

export class TikTokAPI {
  private clientKey: string;
  private clientSecret: string;
  private accessToken: string | null = null;

  constructor({ clientKey, clientSecret }: { clientKey: string; clientSecret: string }) {
    this.clientKey = clientKey;
    this.clientSecret = clientSecret;
  }

  async initialize(): Promise<void> {
    // TikTok requires client credentials for API access
    try {
      const response = await fetch(
        'https://open-api.tiktok.com/oauth/access_token/',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_key: this.clientKey,
            client_secret: this.clientSecret,
            grant_type: 'client_credentials',
          }),
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to initialize TikTok API');
      }
      
      const data = await response.json();
      this.accessToken = data.access_token;
    } catch (error) {
      console.error('TikTok API initialization failed:', error);
      throw error;
    }
  }

  async getAuthorizationUrl(): Promise<string> {
    const redirectUri = `${process.env.APP_URL}/api/social/tiktok/callback`;
    const csrfState = Math.random().toString(36).substring(7);
    
    return `https://www.tiktok.com/auth/authorize/?client_key=${this.clientKey}&scope=video.list&response_type=code&redirect_uri=${redirectUri}&state=${csrfState}`;
  }

  async handleCallback(code: string): Promise<void> {
    try {
      const redirectUri = `${process.env.APP_URL}/api/social/tiktok/callback`;
      const response = await fetch(
        'https://open-api.tiktok.com/oauth/access_token/',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_key: this.clientKey,
            client_secret: this.clientSecret,
            code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
          }),
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to exchange code for access token');
      }
      
      const data = await response.json();
      this.accessToken = data.access_token;
    } catch (error) {
      console.error('Failed to handle TikTok callback:', error);
      throw error;
    }
  }

  async searchPosts(symbol: string): Promise<SocialMediaPost[]> {
    try {
      if (!this.accessToken) {
        throw new Error('Not authenticated with TikTok');
      }

      const response = await fetch(
        `https://open-api.tiktok.com/video/search/?keyword=${symbol}&access_token=${this.accessToken}`
      );

      if (!response.ok) {
        throw new Error('Failed to search TikTok posts');
      }

      const data = await response.json();
      
      return data.videos.map((video: any) => ({
        platform: 'tiktok',
        content: video.desc,
        engagement: {
          likes: video.like_count || 0,
          comments: video.comment_count || 0,
          shares: video.share_count || 0,
        },
        timestamp: new Date(video.create_time * 1000).toISOString(),
        author: {
          name: video.author.nickname,
          id: video.author.id,
          profileUrl: `https://tiktok.com/@${video.author.unique_id}`,
        },
      }));
    } catch (error) {
      console.error('Failed to search TikTok posts:', error);
      throw error;
    }
  }
}
