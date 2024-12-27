import express from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupAuth } from "./auth";
import { initializeDatabase, testConnection } from "@db";

const app = express();

// Enhanced middleware setup with proper CORS configuration and error handling
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || true
    : 'http://localhost:5000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request logging middleware with timestamp
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', async (_, res) => {
  try {
    // Test database connection as part of health check
    await testConnection(1, 1000);
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      message: 'Service temporarily unavailable'
    });
  }
});

async function startServer() {
  let dbInitialized = false;

  try {
    console.log("Starting server initialization...");

    // Initialize database first with retries
    try {
      await initializeDatabase();
      console.log("Database initialization successful");
      dbInitialized = true;
    } catch (dbError) {
      console.error("Database initialization failed:", dbError);
      throw new Error("Failed to initialize database");
    }

    // Only proceed with auth and route setup if database is initialized
    if (!dbInitialized) {
      throw new Error("Cannot proceed without database connection");
    }

    // Set up authentication
    setupAuth(app);
    console.log("Authentication setup completed");

    // Register all routes
    const server = registerRoutes(app);
    console.log("Routes registered successfully");

    // Enhanced error handling middleware
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      const timestamp = new Date().toISOString();
      console.error(`[${timestamp}] Server error:`, {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
      });

      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      // Don't expose internal errors in production
      const response = process.env.NODE_ENV === 'production' 
        ? { message: status === 500 ? 'Internal Server Error' : message }
        : { message, stack: err.stack };

      res.status(status).json(response);
    });

    // Start server with proper port type handling
    const port = parseInt(process.env.PORT || '5000', 10);
    server.listen(port, "0.0.0.0", () => {
      console.log(`Server running at http://0.0.0.0:${port}`);
    });

    // Graceful shutdown handler
    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);

      // Close the HTTP server first
      server.close(() => {
        console.log('HTTP server closed');

        // Exit after cleanup
        process.exit(0);
      });
    };

    // Handle termination signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught exceptions and rejections
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      shutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      // Don't exit immediately for unhandled rejections
      // but log them for monitoring
    });

  } catch (error) {
    console.error('Fatal error during startup:', error);
    process.exit(1);
  }
}

// Start the server with error handling
startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});