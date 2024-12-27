import { drizzle } from "drizzle-orm/neon-serverless";
import { neon, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as schema from "@db/schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure neon to use WebSocket for better connection handling
neonConfig.webSocketConstructor = ws;

// Create SQL client
const sql = neon(databaseUrl);

// Create the database instance with proper typing
export const db = drizzle(sql, { schema });

export async function initializeDatabase() {
  try {
    console.log('Starting database initialization...');
    // Test the connection
    const result = await sql`SELECT NOW()`;
    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}