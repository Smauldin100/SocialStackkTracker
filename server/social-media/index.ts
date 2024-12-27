import { Router } from 'express';
import { setupFacebookRoutes } from './facebook';
import { setupInstagramRoutes } from './instagram';
import { setupTikTokRoutes } from './tiktok';

const router = Router();

// Initialize social media routes
setupFacebookRoutes(router);
setupInstagramRoutes(router);
setupTikTokRoutes(router);

export { router as socialMediaRouter };
