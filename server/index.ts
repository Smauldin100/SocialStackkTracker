import express from "express";
import { registerRoutes } from "./routes";
import { setupAuth } from "./auth";
import { initializeDatabase } from "@db";
import { errorHandler } from './middleware/error'; // Added: Assuming this middleware exists
import { validateEnv } from './config/env';       // Added: Assuming this function exists

validateEnv(); // Added:  Validating environment variables

const app = express();

// Basic middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Simple request logging
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      console.log(logLine);
    }
  });

  next();
});

// Health check endpoint
app.get('/health', async (_, res) => {
  try {
    await initializeDatabase();
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({ status: 'error', message: 'Service unavailable' });
  }
});

// Register routes and add error handling middleware
app.use('/api', registerRoutes(app)); // Modified to use registerRoutes correctly
app.use(errorHandler); // Added: Using the errorHandler middleware


(async () => {
  try {
    console.log("Starting server initialization...");

    // Initialize database first.  Improved error handling.
    await initializeDatabase().catch(error => {
        console.error("Failed to initialize database:", error);
        process.exit(1); //Exit on database initialization failure
    });
    console.log("Database initialization successful");

    // Set up authentication
    setupAuth(app);
    console.log("Authentication setup completed");

    // Start server on port 5000
    const PORT = 5000;
    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running at http://0.0.0.0:${PORT}`);
    });

    // Graceful shutdown
    const shutdown = () => {
      console.log("\nStarting graceful shutdown...");
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    console.error('Fatal error during startup:', error);
    process.exit(1);
  }
})();