
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  DATABASE_URL: z.string(),
  OPENAI_API_KEY: z.string(),
  VITE_APPWRITE_ENDPOINT: z.string(),
  VITE_APPWRITE_PROJECT_ID: z.string(),
});

export const validateEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error('Invalid environment variables:', error);
    process.exit(1);
  }
};
