
import express from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupAuth } from "./auth";
import { db, testConnection } from "@db";

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

// Basic route
app.get('/', (req, res) => {
    res.send('Backend is running!');
});

(async () => {
  try {
    // Test database connection
    await testConnection();
    console.log("Database connection successful");

    // Validate OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }

    // Set up authentication routes
    setupAuth(app);

    // Register all other routes
    const server = registerRoutes(app);

    // Error handling middleware
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Server error:', err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server is running on http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error('Fatal error during startup:', error);
    process.exit(1);
  }
})();
