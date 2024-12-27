import { drizzle } from "drizzle-orm/neon-http";
import { neon } from '@neondatabase/serverless';
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });

export async function initializeDatabase() {
  try {
    console.log('Starting database initialization...');
    await sql`SELECT NOW()`;
    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

// Clean up pool on app termination
// Removed as neon handles connection management differently.

//process.on('SIGTERM', () => pool.end());
//process.on('SIGINT', () => pool.end());

//export { pool }; //Removed as pool is no longer used.