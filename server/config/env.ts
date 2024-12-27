import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  DATABASE_URL: z.string(),
  VITE_APPWRITE_ENDPOINT: z.string(),
  VITE_APPWRITE_PROJECT_ID: z.string(),
  // Social Media API Keys (to be added later when integrating)
  FACEBOOK_APP_ID: z.string().optional(),
  FACEBOOK_APP_SECRET: z.string().optional(),
  INSTAGRAM_APP_ID: z.string().optional(),
  INSTAGRAM_APP_SECRET: z.string().optional(),
  TIKTOK_APP_ID: z.string().optional(),
  TIKTOK_APP_SECRET: z.string().optional(),
});

export const validateEnv = () => {
  try {
    const env = envSchema.parse(process.env);
    return env;
  } catch (error) {
    console.error('Invalid environment variables:', error);
    process.exit(1);
  }
};

export type Env = z.infer<typeof envSchema>;