import { SocialMediaPost } from '../../client/src/lib/social-media';

export class InstagramAPI {
  private appId: string;
  private appSecret: string;
  private accessToken: string | null = null;

  constructor({ appId, appSecret }: { appId: string; appSecret: string }) {
    this.appId = appId;
    this.appSecret = appSecret;
  }

  async initialize(): Promise<void> {
    // Instagram uses the same Graph API as Facebook
    try {
      const response = await fetch(
        `https://api.instagram.com/oauth/access_token?client_id=${this.appId}&client_secret=${this.appSecret}&grant_type=client_credentials`
      );
      
      if (!response.ok) {
        throw new Error('Failed to initialize Instagram API');
      }
      
      const data = await response.json();
      this.accessToken = data.access_token;
    } catch (error) {
      console.error('Instagram API initialization failed:', error);
      throw error;
    }
  }

  async getAuthorizationUrl(): Promise<string> {
    const redirectUri = `${process.env.APP_URL}/api/social/instagram/callback`;
    return `https://api.instagram.com/oauth/authorize?client_id=${this.appId}&redirect_uri=${redirectUri}&scope=basic&response_type=code`;
  }

  async handleCallback(code: string): Promise<void> {
    try {
      const redirectUri = `${process.env.APP_URL}/api/social/instagram/callback`;
      const response = await fetch(
        `https://api.instagram.com/oauth/access_token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: this.appId,
            client_secret: this.appSecret,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
            code,
          }),
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to exchange code for access token');
      }
      
      const data = await response.json();
      this.accessToken = data.access_token;
    } catch (error) {
      console.error('Failed to handle Instagram callback:', error);
      throw error;
    }
  }

  async searchHashtag(symbol: string): Promise<SocialMediaPost[]> {
    try {
      if (!this.accessToken) {
        throw new Error('Not authenticated with Instagram');
      }

      // Search for hashtag
      const response = await fetch(
        `https://graph.instagram.com/v18.0/ig_hashtag_search?q=${symbol}&access_token=${this.accessToken}`
      );

      if (!response.ok) {
        throw new Error('Failed to search Instagram hashtag');
      }

      const { data } = await response.json();
      if (!data?.length) {
        return [];
      }

      // Get recent media
      const hashtagId = data[0].id;
      const mediaResponse = await fetch(
        `https://graph.instagram.com/v18.0/${hashtagId}/recent_media?access_token=${this.accessToken}`
      );

      if (!mediaResponse.ok) {
        throw new Error('Failed to fetch Instagram posts');
      }

      const mediaData = await mediaResponse.json();
      
      return mediaData.data.map((post: any) => ({
        platform: 'instagram',
        content: post.caption,
        engagement: {
          likes: post.like_count || 0,
          comments: post.comments_count || 0,
          shares: 0,
        },
        timestamp: post.timestamp,
        author: {
          name: post.username,
          id: post.owner.id,
          profileUrl: `https://instagram.com/${post.username}`,
        },
      }));
    } catch (error) {
      console.error('Failed to search Instagram posts:', error);
      throw error;
    }
  }
}
