import type { Router } from 'express';
import { TikTokAPI } from './tiktok-api';

const tiktokApi = new TikTokAPI({
  clientKey: process.env.TIKTOK_CLIENT_KEY!,
  clientSecret: process.env.TIKTOK_CLIENT_SECRET!,
});

export function setupTikTokRoutes(router: Router) {
  router.post('/tiktok/init', async (req, res) => {
    try {
      await tiktokApi.initialize();
      res.json({ success: true });
    } catch (error) {
      console.error('TikTok initialization failed:', error);
      res.status(500).json({ error: 'Failed to initialize TikTok API' });
    }
  });

  router.post('/tiktok/connect', async (req, res) => {
    try {
      const authUrl = await tiktokApi.getAuthorizationUrl();
      res.json({ authUrl });
    } catch (error) {
      console.error('TikTok connection failed:', error);
      res.status(500).json({ error: 'Failed to connect to TikTok' });
    }
  });

  router.get('/tiktok/callback', async (req, res) => {
    try {
      const { code } = req.query;
      if (!code || typeof code !== 'string') {
        throw new Error('Invalid authorization code');
      }

      await tiktokApi.handleCallback(code);
      res.redirect('/dashboard');
    } catch (error) {
      console.error('TikTok callback failed:', error);
      res.redirect('/dashboard?error=tiktok_auth_failed');
    }
  });

  router.get('/tiktok/posts/:symbol', async (req, res) => {
    try {
      const { symbol } = req.params;
      const posts = await tiktokApi.searchPosts(symbol);
      res.json(posts);
    } catch (error) {
      console.error('TikTok posts fetch failed:', error);
      res.status(500).json({ error: 'Failed to fetch TikTok posts' });
    }
  });
}
