import type { Router } from 'express';
import { BaseSocialMediaService } from './base';
import type { Post, SocialAccount } from "@db/schema";
import { db, eq, and } from './db'

class InstagramService extends BaseSocialMediaService {
  constructor() {
    super(
      'instagram',
      process.env.INSTAGRAM_APP_ID!,
      process.env.INSTAGRAM_APP_SECRET!,
      `${process.env.APP_URL}/api/instagram/callback`
    );
  }

  async authenticate(code: string) {
    try {
      const params = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri,
      });

      const response = await fetch(
        `https://api.instagram.com/oauth/access_token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params,
        }
      );

      if (!response.ok) {
        throw new Error('Failed to authenticate with Instagram');
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
        grant_type: 'refresh_token',
        client_secret: this.clientSecret,
        access_token: refreshToken,
      });

      const response = await fetch(
        `https://graph.instagram.com/refresh_access_token?${params}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        throw new Error('Failed to refresh Instagram access token');
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
        `https://graph.instagram.com/me?fields=id,username,followers_count,follows_count&access_token=${accessToken}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch Instagram profile');
      }

      const data = await response.json();
      return {
        id: data.id,
        username: data.username,
        followers: data.followers_count,
        following: data.follows_count,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async createPost(account: SocialAccount, post: Partial<Post>) {
    try {
      // First, upload media if present
      let mediaId;
      if (post.attachments && post.attachments.length > 0) {
        const mediaResponse = await fetch(
          `https://graph.instagram.com/me/media`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image_url: post.attachments[0],
              caption: post.content,
              access_token: account.accessToken,
            }),
          }
        );

        if (!mediaResponse.ok) {
          throw new Error('Failed to upload media to Instagram');
        }

        const mediaData = await mediaResponse.json();
        mediaId = mediaData.id;
      }

      // Then publish the post
      const response = await fetch(
        `https://graph.instagram.com/me/media_publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creation_id: mediaId,
            access_token: account.accessToken,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to create Instagram post');
      }

      const data = await response.json();
      return {
        id: data.id,
        url: `https://instagram.com/p/${data.id}`,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async deletePost(account: SocialAccount, postId: string) {
    try {
      const response = await fetch(
        `https://graph.instagram.com/${postId}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access_token: account.accessToken,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete Instagram post');
      }
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getPostAnalytics(account: SocialAccount, postId: string) {
    try {
      const response = await fetch(
        `https://graph.instagram.com/${postId}/insights?metric=impressions,reach,engagement&access_token=${account.accessToken}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch Instagram post analytics');
      }

      const data = await response.json();
      return {
        impressions: data.data[0]?.values[0]?.value || 0,
        reaches: data.data[1]?.values[0]?.value || 0,
        engagements: data.data[2]?.values[0]?.value || 0,
        shares: 0, // Instagram API doesn't provide share metrics directly
        saves: 0,  // Instagram API doesn't provide save metrics directly
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getAccountAnalytics(account: SocialAccount) {
    try {
      const response = await fetch(
        `https://graph.instagram.com/me/insights?metric=impressions,reach,follower_count,profile_views&period=day&access_token=${account.accessToken}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch Instagram account analytics');
      }

      const data = await response.json();

      // Get recent posts for engagement calculation
      const postsResponse = await fetch(
        `https://graph.instagram.com/me/media?fields=engagement&access_token=${account.accessToken}`,
        { method: 'GET' }
      );

      const postsData = await postsResponse.json();
      const totalEngagement = postsData.data.reduce((sum: number, post: any) => sum + (post.engagement || 0), 0);
      const avgEngagement = totalEngagement / (postsData.data.length || 1);

      return {
        followers: data.data.find((metric: any) => metric.name === 'follower_count')?.values[0]?.value || 0,
        following: 0, // Not available in Instagram Insights API
        posts: postsData.data.length,
        avgEngagement,
        reachRate: (data.data.find((metric: any) => metric.name === 'reach')?.values[0]?.value || 0) / 100,
        topPostTypes: {}, // Would require additional API calls to calculate
        audienceDemo: {}, // Would require additional API calls to calculate
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Additional methods for Instagram-specific features
  async getFeed(account: SocialAccount) {
    try {
      const response = await fetch(
        `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&access_token=${account.accessToken}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch Instagram feed');
      }

      return await response.json();
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getNotifications(account: SocialAccount) {
    try {
      // Instagram Graph API doesn't provide direct notifications
      // We'll implement a workaround by checking recent activities
      const response = await fetch(
        `https://graph.instagram.com/me/media?fields=comments{text,timestamp,username},like_count&access_token=${account.accessToken}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch Instagram notifications');
      }

      const data = await response.json();
      const notifications = [];

      // Process recent comments and likes as notifications
      for (const post of data.data) {
        if (post.comments) {
          notifications.push(...post.comments.data.map((comment: any) => ({
            type: 'comment',
            username: comment.username,
            content: comment.text,
            timestamp: comment.timestamp,
            postId: post.id
          })));
        }

        if (post.like_count > 0) {
          notifications.push({
            type: 'likes',
            count: post.like_count,
            postId: post.id
          });
        }
      }

      return notifications;
    } catch (error) {
      return this.handleError(error);
    }
  }
}

const instagramService = new InstagramService();

export function setupInstagramRoutes(router: Router) {
  router.get('/instagram/auth', (req, res) => {
    const state = Math.random().toString(36).substring(7);
    const params = new URLSearchParams({
      client_id: process.env.INSTAGRAM_APP_ID!,
      redirect_uri: `${process.env.APP_URL}/api/instagram/callback`,
      scope: 'instagram_basic,instagram_content_publish,instagram_manage_insights',
      response_type: 'code',
      state,
    });

    res.redirect(`https://api.instagram.com/oauth/authorize?${params}`);
  });

  router.get('/instagram/callback', async (req, res) => {
    try {
      const { code } = req.query;
      if (!code || typeof code !== 'string') {
        throw new Error('Invalid authorization code');
      }

      const authResult = await instagramService.authenticate(code);
      // Store tokens in database
      res.redirect('/dashboard?connected=instagram');
    } catch (error) {
      console.error('Instagram authentication failed:', error);
      res.redirect('/dashboard?error=instagram_auth_failed');
    }
  });

  // Feed endpoint
  router.get('/instagram/feed', async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Get user's Instagram account from database
      const [account] = await db
        .select()
        .from(socialAccounts)
        .where(and(
          eq(socialAccounts.userId, req.user.id),
          eq(socialAccounts.platform, 'instagram'),
          eq(socialAccounts.isActive, true)
        ))
        .limit(1);

      if (!account) {
        return res.status(404).json({ error: 'Instagram account not connected' });
      }

      const feed = await instagramService.getFeed(account);
      res.json(feed);
    } catch (error) {
      console.error('Failed to fetch Instagram feed:', error);
      res.status(500).json({ error: 'Failed to fetch Instagram feed' });
    }
  });

  // Notifications endpoint
  router.get('/instagram/notifications', async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Get user's Instagram account from database
      const [account] = await db
        .select()
        .from(socialAccounts)
        .where(and(
          eq(socialAccounts.userId, req.user.id),
          eq(socialAccounts.platform, 'instagram'),
          eq(socialAccounts.isActive, true)
        ))
        .limit(1);

      if (!account) {
        return res.status(404).json({ error: 'Instagram account not connected' });
      }

      const notifications = await instagramService.getNotifications(account);
      res.json(notifications);
    } catch (error) {
      console.error('Failed to fetch Instagram notifications:', error);
      res.status(500).json({ error: 'Failed to fetch Instagram notifications' });
    }
  });
}

export { instagramService };