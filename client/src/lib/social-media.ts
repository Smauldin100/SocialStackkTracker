import { useToast } from '@/hooks/use-toast';

interface SocialMediaPost {
  platform: 'facebook' | 'instagram' | 'tiktok';
  content: string;
  engagement: {
    likes: number;
    shares: number;
    comments: number;
  };
  sentiment?: number;
  timestamp: string;
  author: {
    name: string;
    id: string;
    profileUrl?: string;
  };
}

interface PlatformAuth {
  facebook?: boolean;
  instagram?: boolean;
  tiktok?: boolean;
}

class SocialMediaService {
  private static instance: SocialMediaService;
  private authStatus: PlatformAuth = {};
  
  private constructor() {}

  static getInstance(): SocialMediaService {
    if (!SocialMediaService.instance) {
      SocialMediaService.instance = new SocialMediaService();
    }
    return SocialMediaService.instance;
  }

  async initializePlatforms() {
    try {
      // Initialize Facebook SDK
      await this.initFacebookSDK();
      // Initialize Instagram API
      await this.initInstagramAPI();
      // Initialize TikTok API
      await this.initTikTokAPI();
    } catch (error) {
      console.error('Failed to initialize social media platforms:', error);
      throw new Error('Social media initialization failed');
    }
  }

  private async initFacebookSDK() {
    try {
      window.fbAsyncInit = () => {
        FB.init({
          appId: import.meta.env.VITE_FACEBOOK_APP_ID,
          cookie: true,
          xfbml: true,
          version: 'v18.0'
        });
        this.authStatus.facebook = true;
      };

      // Load Facebook SDK
      (function(d, s, id) {
        var js, fjs = d.getElementsByTagName(s)[0];
        if (d.getElementById(id)) return;
        js = d.createElement(s) as HTMLScriptElement;
        js.id = id;
        js.src = "https://connect.facebook.net/en_US/sdk.js";
        fjs.parentNode?.insertBefore(js, fjs);
      }(document, 'script', 'facebook-jssdk'));
    } catch (error) {
      console.error('Facebook SDK initialization failed:', error);
      this.authStatus.facebook = false;
    }
  }

  private async initInstagramAPI() {
    try {
      const response = await fetch('/api/social/instagram/init', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Instagram API initialization failed');
      }
      
      this.authStatus.instagram = true;
    } catch (error) {
      console.error('Instagram API initialization failed:', error);
      this.authStatus.instagram = false;
    }
  }

  private async initTikTokAPI() {
    try {
      const response = await fetch('/api/social/tiktok/init', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('TikTok API initialization failed');
      }
      
      this.authStatus.tiktok = true;
    } catch (error) {
      console.error('TikTok API initialization failed:', error);
      this.authStatus.tiktok = false;
    }
  }

  async connectFacebook(): Promise<boolean> {
    return new Promise((resolve) => {
      FB.login((response) => {
        if (response.authResponse) {
          this.authStatus.facebook = true;
          resolve(true);
        } else {
          this.authStatus.facebook = false;
          resolve(false);
        }
      }, { scope: 'public_profile,pages_show_list,pages_read_engagement' });
    });
  }

  async connectInstagram(): Promise<boolean> {
    try {
      const response = await fetch('/api/social/instagram/connect', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Instagram connection failed');
      }
      
      this.authStatus.instagram = true;
      return true;
    } catch (error) {
      console.error('Instagram connection failed:', error);
      this.authStatus.instagram = false;
      return false;
    }
  }

  async connectTikTok(): Promise<boolean> {
    try {
      const response = await fetch('/api/social/tiktok/connect', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('TikTok connection failed');
      }
      
      this.authStatus.tiktok = true;
      return true;
    } catch (error) {
      console.error('TikTok connection failed:', error);
      this.authStatus.tiktok = false;
      return false;
    }
  }

  async fetchStockMentions(symbol: string): Promise<SocialMediaPost[]> {
    try {
      const [facebookPosts, instagramPosts, tiktokPosts] = await Promise.allSettled([
        this.authStatus.facebook ? this.fetchFacebookPosts(symbol) : Promise.resolve([]),
        this.authStatus.instagram ? this.fetchInstagramPosts(symbol) : Promise.resolve([]),
        this.authStatus.tiktok ? this.fetchTikTokPosts(symbol) : Promise.resolve([]),
      ]);

      const allPosts: SocialMediaPost[] = [];

      if (facebookPosts.status === 'fulfilled') allPosts.push(...facebookPosts.value);
      if (instagramPosts.status === 'fulfilled') allPosts.push(...instagramPosts.value);
      if (tiktokPosts.status === 'fulfilled') allPosts.push(...tiktokPosts.value);

      return allPosts.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      console.error('Failed to fetch stock mentions:', error);
      throw new Error('Failed to fetch social media mentions');
    }
  }

  private async fetchFacebookPosts(symbol: string): Promise<SocialMediaPost[]> {
    return new Promise((resolve, reject) => {
      FB.api(
        '/search',
        'GET',
        { q: symbol, type: 'post', fields: 'message,created_time,from,reactions.summary(total_count),shares' },
        (response: any) => {
          if (!response || response.error) {
            reject(new Error('Failed to fetch Facebook posts'));
            return;
          }

          const posts: SocialMediaPost[] = response.data.map((post: any) => ({
            platform: 'facebook',
            content: post.message,
            engagement: {
              likes: post.reactions?.summary?.total_count || 0,
              shares: post.shares?.count || 0,
              comments: 0, // Requires additional API call
            },
            timestamp: post.created_time,
            author: {
              name: post.from.name,
              id: post.from.id,
              profileUrl: `https://facebook.com/${post.from.id}`,
            },
          }));

          resolve(posts);
        }
      );
    });
  }

  private async fetchInstagramPosts(symbol: string): Promise<SocialMediaPost[]> {
    try {
      const response = await fetch(`/api/social/instagram/posts/${symbol}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch Instagram posts');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Instagram posts fetch failed:', error);
      return [];
    }
  }

  private async fetchTikTokPosts(symbol: string): Promise<SocialMediaPost[]> {
    try {
      const response = await fetch(`/api/social/tiktok/posts/${symbol}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch TikTok posts');
      }
      
      return await response.json();
    } catch (error) {
      console.error('TikTok posts fetch failed:', error);
      return [];
    }
  }

  getAuthStatus(): PlatformAuth {
    return { ...this.authStatus };
  }
}

export const socialMediaService = SocialMediaService.getInstance();
export type { SocialMediaPost, PlatformAuth };
