import { drizzle } from "drizzle-orm/node-postgres";
import pkg from 'pg';
const { Pool } = pkg;
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create a PostgreSQL pool with better error handling and connection management
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

// Add error handler for the pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  // Don't exit process, just log the error and attempt recovery
  console.error('Database pool error occurred, attempting to recover...');
});

// Test database connection with retries
async function testConnection(retries = 3, delay = 2000): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      await client.query('SELECT 1'); // Verify we can actually execute queries
      console.log('Successfully connected to the database');
      client.release();
      return true;
    } catch (err) {
      console.error(`Database connection attempt ${i + 1} failed:`, err);
      if (i === retries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return false;
}

// Initialize database connection
async function initializeDatabase() {
  try {
    await testConnection();
    console.log('Database connection established successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

// Create drizzle database instance with query logging in development
const db = drizzle(pool, {
  schema,
  logger: process.env.NODE_ENV !== 'production',
});

export { db, pool, testConnection, initializeDatabase };