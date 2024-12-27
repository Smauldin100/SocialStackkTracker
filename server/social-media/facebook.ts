import type { Router } from 'express';
import { BaseSocialMediaService } from './base';
import type { Post, SocialAccount } from "@db/schema";

class FacebookService extends BaseSocialMediaService {
  constructor() {
    super(
      'facebook',
      process.env.FACEBOOK_APP_ID!,
      process.env.FACEBOOK_APP_SECRET!,
      `${process.env.APP_URL}/api/facebook/callback`
    );
  }

  async authenticate(code: string) {
    try {
      const params = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri,
      });

      const response = await fetch(
        `https://graph.facebook.com/v18.0/oauth/access_token?${params}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        throw new Error('Failed to authenticate with Facebook');
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
        grant_type: 'fb_exchange_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        fb_exchange_token: refreshToken,
      });

      const response = await fetch(
        `https://graph.facebook.com/v18.0/oauth/access_token?${params}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        throw new Error('Failed to refresh Facebook access token');
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
        `https://graph.facebook.com/v18.0/me?fields=id,name,followers_count,friends_count&access_token=${accessToken}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch Facebook profile');
      }

      const data = await response.json();
      return {
        id: data.id,
        username: data.name,
        followers: data.followers_count,
        following: data.friends_count,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async createPost(account: SocialAccount, post: Partial<Post>) {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/me/feed`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: post.content,
            access_token: account.accessToken,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to create Facebook post');
      }

      const data = await response.json();
      return {
        id: data.id,
        url: `https://facebook.com/${data.id}`,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async deletePost(account: SocialAccount, postId: string) {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${postId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            access_token: account.accessToken,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete Facebook post');
      }
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getPostAnalytics(account: SocialAccount, postId: string) {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${postId}/insights?metric=post_impressions,post_reactions_by_type_total&access_token=${account.accessToken}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch Facebook post analytics');
      }

      const data = await response.json();
      return {
        impressions: data.data[0]?.values[0]?.value || 0,
        reaches: data.data[0]?.values[0]?.value || 0,
        engagements: Object.values(data.data[1]?.values[0]?.value || {}).reduce((a: number, b: number) => a + b, 0),
        shares: 0, // Need separate API call for shares
        saves: 0,  // Facebook doesn't provide saves metric
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getAccountAnalytics(account: SocialAccount) {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/me/insights?metric=page_impressions,page_engaged_users,page_post_engagements&access_token=${account.accessToken}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch Facebook account analytics');
      }

      const data = await response.json();
      return {
        followers: 0, // Need separate API call
        following: 0, // Need separate API call
        posts: 0,     // Need separate API call
        avgEngagement: data.data[2]?.values[0]?.value || 0,
        reachRate: (data.data[0]?.values[0]?.value || 0) / 100,
        topPostTypes: {},
        audienceDemo: {},
      };
    } catch (error) {
      return this.handleError(error);
    }
  }
}

const facebookService = new FacebookService();

export function setupFacebookRoutes(router: Router) {
  router.get('/facebook/auth', (req, res) => {
    const state = Math.random().toString(36).substring(7);
    const params = new URLSearchParams({
      client_id: process.env.FACEBOOK_APP_ID!,
      redirect_uri: `${process.env.APP_URL}/api/facebook/callback`,
      state,
      scope: 'public_profile,email,pages_show_list,pages_read_engagement,pages_manage_posts',
    });

    res.redirect(`https://www.facebook.com/v18.0/dialog/oauth?${params}`);
  });

  router.get('/facebook/callback', async (req, res) => {
    try {
      const { code, state } = req.query;
      if (!code || typeof code !== 'string') {
        throw new Error('Invalid authorization code');
      }

      const authResult = await facebookService.authenticate(code);
      // Store tokens in database
      res.redirect('/dashboard?connected=facebook');
    } catch (error) {
      console.error('Facebook authentication failed:', error);
      res.redirect('/dashboard?error=facebook_auth_failed');
    }
  });
}

export { facebookService };