import type { Router } from 'express';
import { FacebookAPI } from './facebook-api';

const facebookApi = new FacebookAPI({
  appId: process.env.FACEBOOK_APP_ID!,
  appSecret: process.env.FACEBOOK_APP_SECRET!,
});

export function setupFacebookRoutes(router: Router) {
  router.post('/facebook/init', async (req, res) => {
    try {
      await facebookApi.initialize();
      res.json({ success: true });
    } catch (error) {
      console.error('Facebook initialization failed:', error);
      res.status(500).json({ error: 'Failed to initialize Facebook API' });
    }
  });

  router.post('/facebook/connect', async (req, res) => {
    try {
      const authUrl = await facebookApi.getAuthorizationUrl();
      res.json({ authUrl });
    } catch (error) {
      console.error('Facebook connection failed:', error);
      res.status(500).json({ error: 'Failed to connect to Facebook' });
    }
  });

  router.get('/facebook/callback', async (req, res) => {
    try {
      const { code } = req.query;
      if (!code || typeof code !== 'string') {
        throw new Error('Invalid authorization code');
      }

      await facebookApi.handleCallback(code);
      res.redirect('/dashboard');
    } catch (error) {
      console.error('Facebook callback failed:', error);
      res.redirect('/dashboard?error=facebook_auth_failed');
    }
  });

  router.get('/facebook/posts/:symbol', async (req, res) => {
    try {
      const { symbol } = req.params;
      const posts = await facebookApi.searchPosts(symbol);
      res.json(posts);
    } catch (error) {
      console.error('Facebook posts fetch failed:', error);
      res.status(500).json({ error: 'Failed to fetch Facebook posts' });
    }
  });
}
