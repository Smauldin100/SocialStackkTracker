import type { Router } from 'express';
import { BaseSocialMediaService } from './base';
import type { Post, SocialAccount } from "@db/schema";
import { db } from "@db";
import { eq, and } from "drizzle-orm";
import { socialAccounts } from "@db/schema";

class TikTokService extends BaseSocialMediaService {
  constructor() {
    super(
      'tiktok',
      process.env.TIKTOK_APP_ID!,
      process.env.TIKTOK_APP_SECRET!,
      `${process.env.APP_URL}/api/tiktok/callback`
    );
  }

  async authenticate(code: string) {
    try {
      const params = new URLSearchParams({
        client_key: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
      });

      const response = await fetch(
        'https://open-api.tiktok.com/oauth/access_token/',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params,
        }
      );

      if (!response.ok) {
        throw new Error('Failed to authenticate with TikTok');
      }

      const data = await response.json();
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async refreshAccessToken(refreshToken: string) {
    try {
      const params = new URLSearchParams({
        client_key: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      });

      const response = await fetch(
        'https://open-api.tiktok.com/oauth/refresh_token/',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params,
        }
      );

      if (!response.ok) {
        throw new Error('Failed to refresh TikTok access token');
      }

      const data = await response.json();
      return { accessToken: data.access_token };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getProfile(accessToken: string) {
    try {
      const response = await fetch(
        'https://open-api.tiktok.com/user/info/',
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch TikTok profile');
      }

      const data = await response.json();
      return {
        id: data.user.id,
        username: data.user.display_name,
        followers: data.user.follower_count,
        following: data.user.following_count,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async createPost(account: SocialAccount, post: Partial<Post>) {
    try {
      const response = await fetch(
        'https://open-api.tiktok.com/share/video/upload/',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${account.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            video_url: post.attachments?.[0],
            description: post.content,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to create TikTok post');
      }

      const data = await response.json();
      return {
        id: data.video_id,
        url: `https://www.tiktok.com/@${account.platformUsername}/video/${data.video_id}`,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async deletePost(account: SocialAccount, postId: string) {
    try {
      const response = await fetch(
        `https://open-api.tiktok.com/video/delete/`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${account.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            video_id: postId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete TikTok post');
      }
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getPostAnalytics(account: SocialAccount, postId: string) {
    try {
      const response = await fetch(
        `https://open-api.tiktok.com/video/data/`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${account.accessToken}`,
          },
          body: JSON.stringify({
            video_id: postId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch TikTok post analytics');
      }

      const data = await response.json();
      return {
        impressions: data.stats.view_count || 0,
        reaches: data.stats.reach_count || 0,
        engagements: data.stats.engagement_count || 0,
        shares: data.stats.share_count || 0,
        saves: data.stats.bookmark_count || 0,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getAccountAnalytics(account: SocialAccount) {
    try {
      const response = await fetch(
        'https://open-api.tiktok.com/user/stats/',
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${account.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch TikTok account analytics');
      }

      const data = await response.json();
      return {
        followers: data.stats.follower_count || 0,
        following: data.stats.following_count || 0,
        posts: data.stats.video_count || 0,
        avgEngagement: data.stats.engagement_rate || 0,
        reachRate: (data.stats.reach_count || 0) / (data.stats.follower_count || 1),
        topPostTypes: data.stats.video_categories || {},
        audienceDemo: data.stats.audience_demographics || {},
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Additional TikTok-specific methods
  async getFeed(account: SocialAccount) {
    try {
      const response = await fetch(
        'https://open-api.tiktok.com/user/videos/',
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${account.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch TikTok feed');
      }

      return await response.json();
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getNotifications(account: SocialAccount) {
    try {
      const response = await fetch(
        'https://open-api.tiktok.com/notifications/list/',
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${account.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch TikTok notifications');
      }

      return await response.json();
    } catch (error) {
      return this.handleError(error);
    }
  }
}

const tiktokService = new TikTokService();

export function setupTikTokRoutes(router: Router) {
  router.get('/tiktok/auth', (req, res) => {
    const state = Math.random().toString(36).substring(7);
    const params = new URLSearchParams({
      client_key: process.env.TIKTOK_APP_ID!,
      redirect_uri: `${process.env.APP_URL}/api/tiktok/callback`,
      scope: 'user.info.basic,video.list,video.upload',
      response_type: 'code',
      state,
    });

    res.redirect(`https://open-api.tiktok.com/platform/oauth/connect/?${params}`);
  });

  router.get('/tiktok/callback', async (req, res) => {
    try {
      const { code } = req.query;
      if (!code || typeof code !== 'string') {
        throw new Error('Invalid authorization code');
      }

      const authResult = await tiktokService.authenticate(code);
      // Store tokens in database
      res.redirect('/dashboard?connected=tiktok');
    } catch (error) {
      console.error('TikTok authentication failed:', error);
      res.redirect('/dashboard?error=tiktok_auth_failed');
    }
  });

  // Feed endpoint
  router.get('/tiktok/feed', async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const [account] = await db
        .select()
        .from(socialAccounts)
        .where(and(
          eq(socialAccounts.userId, req.user.id),
          eq(socialAccounts.platform, 'tiktok'),
          eq(socialAccounts.isActive, true)
        ))
        .limit(1);

      if (!account) {
        return res.status(404).json({ error: 'TikTok account not connected' });
      }

      const feed = await tiktokService.getFeed(account);
      res.json(feed);
    } catch (error) {
      console.error('Failed to fetch TikTok feed:', error);
      res.status(500).json({ error: 'Failed to fetch TikTok feed' });
    }
  });

  // Notifications endpoint
  router.get('/tiktok/notifications', async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const [account] = await db
        .select()
        .from(socialAccounts)
        .where(and(
          eq(socialAccounts.userId, req.user.id),
          eq(socialAccounts.platform, 'tiktok'),
          eq(socialAccounts.isActive, true)
        ))
        .limit(1);

      if (!account) {
        return res.status(404).json({ error: 'TikTok account not connected' });
      }

      const notifications = await tiktokService.getNotifications(account);
      res.json(notifications);
    } catch (error) {
      console.error('Failed to fetch TikTok notifications:', error);
      res.status(500).json({ error: 'Failed to fetch TikTok notifications' });
    }
  });
  router.post('/tiktok/init', async (req, res) => {
    try {
      //This route is likely unnecessary with the new service implementation.  Consider removing.
      res.json({ success: true });
    } catch (error) {
      console.error('TikTok initialization failed:', error);
      res.status(500).json({ error: 'Failed to initialize TikTok API' });
    }
  });

  router.post('/tiktok/connect', async (req, res) => {
    try {
      //This route is likely unnecessary with the new service implementation. Consider removing.
      res.json({ authUrl: `${process.env.APP_URL}/api/tiktok/auth`});
    } catch (error) {
      console.error('TikTok connection failed:', error);
      res.status(500).json({ error: 'Failed to connect to TikTok' });
    }
  });

  router.get('/tiktok/posts/:symbol', async (req, res) => {
    try {
      const { symbol } = req.params;
      //This route needs reimplementation using the new service.  Requires further specification of how to fetch posts by symbol.
      res.json([]); // Placeholder - needs implementation
    } catch (error) {
      console.error('TikTok posts fetch failed:', error);
      res.status(500).json({ error: 'Failed to fetch TikTok posts' });
    }
  });
}

export { tiktokService };