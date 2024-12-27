import express from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupAuth } from "./auth";
import { db, pool, testConnection } from "@db";
import { sql } from "drizzle-orm";

const app = express();
const PORT = Number(process.env.PORT) || 5000;

// Enhanced middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || true
    : 'http://localhost:5000',
  credentials: true
}));

// Basic health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

(async () => {
  try {
    // Test database connection with retries
    await testConnection();
    console.log("Database connection successful");

    // Validate database schema
    await db.execute(sql`SELECT 1`);
    console.log("Database schema validation successful");

    // Validate required environment variables
    const requiredEnvVars = [
      'FACEBOOK_APP_ID',
      'FACEBOOK_APP_SECRET',
      'INSTAGRAM_APP_ID',
      'INSTAGRAM_APP_SECRET',
      'TIKTOK_CLIENT_KEY',
      'TIKTOK_CLIENT_SECRET'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      console.warn(`Warning: Missing environment variables: ${missingVars.join(', ')}`);
      console.warn('Some features may be limited');
    }

    // Set up authentication routes
    setupAuth(app);

    // Register all other routes
    const server = registerRoutes(app);

    // Enhanced error handling middleware
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Server error:', err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      // Don't expose internal errors in production
      const response = process.env.NODE_ENV === 'production' 
        ? { message: status === 500 ? 'Internal Server Error' : message }
        : { message, stack: err.stack };

      res.status(status).json(response);
    });

    // Start server with automatic port selection
    const startServer = async (initialPort: number): Promise<void> => {
      let currentPort = initialPort;
      const maxAttempts = 10;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          await new Promise((resolve, reject) => {
            const serverInstance = server.listen(currentPort, "0.0.0.0", () => {
              console.log(`Server is running on http://0.0.0.0:${currentPort}`);
              resolve(undefined);
            });

            serverInstance.on('error', (error: NodeJS.ErrnoException) => {
              if (error.code === 'EADDRINUSE') {
                console.log(`Port ${currentPort} is in use, trying next port...`);
                currentPort++;
                serverInstance.close();
              } else {
                reject(error);
              }
            });

            // Handle graceful shutdown
            const shutdown = async () => {
              console.log('\nGraceful shutdown initiated...');
              serverInstance.close(async () => {
                console.log('HTTP server closed');
                try {
                  await pool.end();
                  console.log('Database connections closed');
                } catch (err) {
                  console.error('Error closing database connections:', err);
                }
                process.exit(0);
              });
            };

            process.on('SIGTERM', shutdown);
            process.on('SIGINT', shutdown);
          });
          break;
        } catch (error) {
          if (attempt === maxAttempts - 1) {
            throw new Error('Could not find an available port after maximum attempts');
          }
        }
      }
    };

    await startServer(PORT);
  } catch (error) {
    console.error('Fatal error during startup:', error);
    process.exit(1);
  }
})();