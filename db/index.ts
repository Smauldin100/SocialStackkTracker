import { drizzle } from "drizzle-orm/neon-http";
import { neon, neonConfig } from '@neondatabase/serverless';
import { WebSocket } from 'ws';
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

// Configure neon to use WebSocket
neonConfig.webSocketConstructor = WebSocket;
const sql = neon(process.env.DATABASE_URL);

// Create the database instance with correct typing
export const db = drizzle(sql, { schema });

/**
 * Initialize and test the database connection
 */
export async function initializeDatabase(): Promise<void> {
  try {
    console.log('Testing database connection...');

    // Test connection with a simple query
    const result = await sql`SELECT current_database(), current_user;`;

    if (!result?.[0]) {
      throw new Error('Database connection test failed: No response');
    }

    console.log('Database connection successful:', {
      database: result[0].current_database,
      user: result[0].current_user
    });

  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

// Export schema types
export type {
  User,
  NewUser,
  Post,
  NewPost,
  Comment,
  NewComment,
  Reaction,
  NewReaction
} from "@db/schema";