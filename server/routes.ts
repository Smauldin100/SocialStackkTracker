import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import OpenAI from "openai";
import { db } from "@db";
import { posts } from "@db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { setupAuth } from "./auth";
import { socialMediaRouter } from "./social-media";

// Configure OpenAI
let openai: OpenAI | null = null;
try {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("OpenAI API key not found. AI features will be disabled.");
  } else {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    console.log("OpenAI API initialized successfully");
  }
} catch (error) {
  console.error("Failed to initialize OpenAI:", error);
}

export function registerRoutes(app: Express): Server {
  // Create HTTP server
  const httpServer = createServer(app);

  // Authentication middleware
  const authMiddleware = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    next();
  };

  // WebSocket server setup
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: "/api/ws",
  });

  // Register social media routes
  app.use('/api/social', authMiddleware, socialMediaRouter);

  // Social media endpoints
  app.post("/api/social/posts", authMiddleware, async (req, res) => {
    try {
      const { content } = req.body;
      if (!content?.trim()) {
        return res.status(400).send("Content is required");
      }

      const [post] = await db
        .insert(posts)
        .values({
          userId: req.user!.id,
          content,
        })
        .returning();

      res.json(post);
    } catch (error) {
      console.error('Error creating post:', error);
      res.status(500).json({ error: "Failed to create post" });
    }
  });

  // WebSocket connection handler
  wss.on("connection", (ws) => {
    console.log("New WebSocket connection established");

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === "SUBSCRIBE_STOCK") {
          const { symbol } = data;
          console.log(`Client subscribed to stock: ${symbol}`);

          // Send periodic updates
          const interval = setInterval(() => {
            if (ws.readyState === ws.OPEN) {
              ws.send(JSON.stringify({
                type: "STOCK_UPDATE",
                symbol,
                data: {
                  price: Math.random() * 100 + 100,
                  timestamp: new Date().toISOString()
                }
              }));
            } else {
              clearInterval(interval);
            }
          }, 5000);

          ws.on("close", () => clearInterval(interval));
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });
  });

  return httpServer;
}