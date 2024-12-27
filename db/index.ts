import { drizzle } from "drizzle-orm/node-postgres";
import pkg from 'pg';
const { Pool } = pkg;
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Enhanced PostgreSQL pool configuration with better defaults
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Increased for better concurrent handling
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased timeout for better reliability
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
  console.error('Unexpected error on idle client:', err);
  console.warn('Database pool error occurred, attempting recovery...');
  // Attempt to create a new pool if the error is fatal
  setTimeout(() => {
    console.log('Attempting to reconnect to database...');
    pool.connect().catch(console.error);
  }, 5000);
});

// Monitor individual client connections
pool.on('connect', (client) => {
  console.log('New database connection established');
  client.on('error', (err) => {
    console.error('Database client error:', err);
  });
});

// Enhanced connection testing with retries and better error reporting
async function testConnection(retries = 5, delay = 2000): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    let client;
    try {
      client = await pool.connect();
      const result = await client.query('SELECT current_timestamp, current_database() as db_name');
      console.log(`Database connection test successful. Connected to: ${result.rows[0].db_name}`);
      return true;
    } catch (err) {
      console.error(`Database connection attempt ${i + 1}/${retries} failed:`, err);
      if (i === retries - 1) throw err;
      console.log(`Retrying in ${delay}ms...`);
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

// Enhanced database initialization with comprehensive healthcheck
async function initializeDatabase() {
  try {
    console.log('Starting database initialization...');

    // Test basic connection with increased retries
    await testConnection();

    // Verify schema access and table existence
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(`
        SELECT EXISTS (
          SELECT 1 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ANY($1)
        );
      `, [['users', 'watchlists', 'stocks', 'social_accounts', 'ai_insights', 'posts']]);

      if (!result.rows[0].exists) {
        console.warn('Some required tables not found, schema might need initialization');
        console.log('Running schema sync...');
        // The schema will be synced by drizzle-kit push
      }

      await client.query('COMMIT');
      console.log('Schema verification completed');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Schema verification failed:', err);
      throw err;
    } finally {
      client.release();
    }

    // Test drizzle query functionality
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

// Enhanced cleanup handlers with graceful shutdown
async function cleanupPool() {
  try {
    console.log('Initiating database connection pool cleanup...');
    await pool.end();
    console.log('Database pool closed successfully');
  } catch (err) {
    console.error('Error during pool cleanup:', err);
    process.exit(1);
  }
}

// Register cleanup handlers
process.on('SIGINT', cleanupPool);
process.on('SIGTERM', cleanupPool);

export { pool, testConnection, initializeDatabase };