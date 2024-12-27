import express from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupAuth } from "./auth";
import { initializeDatabase } from "@db";

const app = express();

// Enhanced middleware setup with proper CORS configuration
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

// Health check endpoint
app.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function startServer() {
  try {
    // Initialize database first
    await initializeDatabase();
    console.log("Database initialization successful");

    // Set up authentication
    setupAuth(app);
    console.log("Authentication setup completed");

    // Register all routes
    const server = registerRoutes(app);
    console.log("Routes registered successfully");

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

    // Start server with proper port type handling
    const port = parseInt(process.env.PORT || '5000', 10);
    server.listen(port, "0.0.0.0", () => {
      console.log(`Server running at http://0.0.0.0:${port}`);
    });

    // Graceful shutdown handler
    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    };

    // Handle termination signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error('Fatal error during startup:', error);
    process.exit(1);
  }
}

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});