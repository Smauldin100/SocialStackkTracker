import { drizzle } from "drizzle-orm/node-postgres";
import pkg from 'pg';
const { Pool } = pkg;
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Enhanced PostgreSQL pool configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

// Create drizzle instance with improved configuration
export const db = drizzle(pool, {
  schema,
  logger: process.env.NODE_ENV !== 'production',
});

// Improved error handling for the connection pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  console.warn('Database pool error occurred, attempting recovery...');
});

pool.on('connect', (client) => {
  client.on('error', (err) => {
    console.error('Database client error:', err);
  });
});

// Enhanced connection testing
async function testConnection(retries = 3, delay = 2000): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    let client;
    try {
      client = await pool.connect();
      await client.query('SELECT current_timestamp');
      console.log('Database connection successful');
      return true;
    } catch (err) {
      console.error(`Database connection attempt ${i + 1} failed:`, err);
      if (i === retries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, delay));
    } finally {
      if (client) {
        try {
          client.release(true);
        } catch (releaseErr) {
          console.error('Error releasing client:', releaseErr);
        }
      }
    }
  }
  return false;
}

// Enhanced database initialization
async function initializeDatabase() {
  try {
    console.log('Starting database initialization...');

    // Test basic connection
    await testConnection();

    // Verify schema access
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`
        SELECT EXISTS (
          SELECT 1 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        );
      `);
      await client.query('COMMIT');
      console.log('Schema verification successful');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Schema verification failed:', err);
      throw err;
    } finally {
      client.release();
    }

    // Test drizzle query
    try {
      await db.query.users.findMany({
        limit: 1,
      });
      console.log('Drizzle ORM initialized successfully');
    } catch (err) {
      console.error('Drizzle initialization failed:', err);
      throw err;
    }

    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

// Cleanup handlers
async function cleanupPool() {
  try {
    await pool.end();
    console.log('Database pool closed successfully');
  } catch (err) {
    console.error('Error during pool cleanup:', err);
    process.exit(1);
  }
}

process.on('SIGINT', cleanupPool);
process.on('SIGTERM', cleanupPool);

export { pool, testConnection, initializeDatabase };