import type { Router } from 'express';
import { InstagramAPI } from './instagram-api';

const instagramApi = new InstagramAPI({
  appId: process.env.INSTAGRAM_APP_ID!,
  appSecret: process.env.INSTAGRAM_APP_SECRET!,
});

export function setupInstagramRoutes(router: Router) {
  router.post('/instagram/init', async (req, res) => {
    try {
      await instagramApi.initialize();
      res.json({ success: true });
    } catch (error) {
      console.error('Instagram initialization failed:', error);
      res.status(500).json({ error: 'Failed to initialize Instagram API' });
    }
  });

  router.post('/instagram/connect', async (req, res) => {
    try {
      const authUrl = await instagramApi.getAuthorizationUrl();
      res.json({ authUrl });
    } catch (error) {
      console.error('Instagram connection failed:', error);
      res.status(500).json({ error: 'Failed to connect to Instagram' });
    }
  });

  router.get('/instagram/callback', async (req, res) => {
    try {
      const { code } = req.query;
      if (!code || typeof code !== 'string') {
        throw new Error('Invalid authorization code');
      }

      await instagramApi.handleCallback(code);
      res.redirect('/dashboard');
    } catch (error) {
      console.error('Instagram callback failed:', error);
      res.redirect('/dashboard?error=instagram_auth_failed');
    }
  });

  router.get('/instagram/posts/:symbol', async (req, res) => {
    try {
      const { symbol } = req.params;
      const posts = await instagramApi.searchHashtag(symbol);
      res.json(posts);
    } catch (error) {
      console.error('Instagram posts fetch failed:', error);
      res.status(500).json({ error: 'Failed to fetch Instagram posts' });
    }
  });
}
