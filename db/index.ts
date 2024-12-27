import { drizzle } from "drizzle-orm/neon-http";
import { neon } from '@neondatabase/serverless';
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

// Create the SQL client with proper configuration
const sql = neon(process.env.DATABASE_URL);

// Create the database instance with schema
export const db = drizzle(sql, { schema });

/**
 * Initialize and test the database connection
 * @returns Promise<void>
 */
export async function initializeDatabase(): Promise<void> {
  try {
    console.log('Testing database connection...');

    // Test the connection with a simple query
    const result = await sql`SELECT current_database(), current_user, version()`;
    if (!result?.[0]) {
      throw new Error('Database connection test failed: No response');
    }

    console.log('Database connection successful:', {
      database: result[0].current_database,
      user: result[0].current_user,
      version: result[0].version?.split(' ')[0]
    });

  } catch (error) {
    console.error('Database initialization failed:', error);
    throw new Error(`Database connection failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Export types
export type {
  User,
  NewUser,
  Post,
  NewPost,
  Comment,
  NewComment,
  Follow,
  NewFollow
} from "@db/schema";