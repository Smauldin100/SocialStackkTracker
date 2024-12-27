import express from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupAuth } from "./auth";
import { initializeDatabase } from "@db";

const app = express();

// Basic middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors({
  origin: true,
  credentials: true,
}));

// Simple request logging
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      console.log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});

// Health check endpoint
app.get('/health', async (_, res) => {
  try {
    await initializeDatabase();
    res.json({ status: 'ok', timestamp: new Date().toISOString(), database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'error', message: 'Service unavailable', database: 'disconnected' });
  }
});

// Simple error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

(async () => {
  try {
    console.log("Starting server initialization...");

    // Initialize database first
    await initializeDatabase();
    console.log("Database initialization successful");

    // Set up authentication
    setupAuth(app);
    console.log("Authentication setup completed");

    // Register routes and get HTTP server
    const server = registerRoutes(app);
    console.log("Routes registered successfully");

    // Start server on port 5000
    const PORT = 5000;
    server.listen(PORT, "0.0.0.0", () => {
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