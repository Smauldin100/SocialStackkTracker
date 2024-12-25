import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import OpenAI from "openai";
import { db } from "@db";
import { posts, users } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { setupAuth } from "./auth";

// Configure OpenAI with the provided API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Set up authentication routes
  setupAuth(app);

  // Social media endpoints
  app.post("/api/social/posts", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const { content } = req.body;
      if (!content?.trim()) {
        return res.status(400).send("Content is required");
      }

      const [post] = await db
        .insert(posts)
        .values({
          userId: req.user.id,
          content,
        })
        .returning();

      res.json(post);
    } catch (error) {
      console.error('Error creating post:', error);
      res.status(500).json({ error: "Failed to create post" });
    }
  });

  app.get("/api/social/feed", async (req, res) => {
    try {
      const feedPosts = await db.query.posts.findMany({
        orderBy: [desc(posts.createdAt)],
        limit: 50,
        with: {
          user: {
            columns: {
              username: true,
            },
          },
        },
      });

      const formattedPosts = feedPosts.map(post => ({
        id: post.id.toString(),
        platform: 'internal',
        author: {
          name: post.user.username,
        },
        content: post.content,
        timestamp: post.createdAt.toISOString(),
        engagement: {
          likes: post.likes,
          shares: post.shares,
        },
      }));

      res.json(formattedPosts);
    } catch (error) {
      console.error('Error fetching social feed:', error);
      res.status(500).json({ error: "Failed to fetch social feed" });
    }
  });

  // WebSocket server for real-time stock updates
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: "/api/ws"  // Specify a path to avoid conflicts with Vite HMR
  });

  wss.on("connection", (ws) => {
    console.log("New WebSocket connection established");

    ws.on("message", async (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === "SUBSCRIBE_STOCK") {
          const { symbol } = data;
          console.log(`Client subscribed to stock: ${symbol}`);

          // Simulate real-time stock updates
          const interval = setInterval(() => {
            if (ws.readyState === ws.OPEN) {
              const price = Math.random() * 100 + 100;
              ws.send(JSON.stringify({
                type: "STOCK_UPDATE",
                symbol,
                data: {
                  price,
                  timestamp: new Date().toISOString()
                }
              }));
            } else {
              clearInterval(interval);
            }
          }, 5000);

          ws.on("close", () => {
            clearInterval(interval);
            console.log(`Client unsubscribed from stock: ${symbol}`);
          });
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });
  });

  // Stock data endpoints
  app.get("/api/stocks/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      // Simulated stock data
      const prices = Array.from({ length: 20 }, (_, i) => ({
        timestamp: new Date(Date.now() - i * 86400000).toISOString(),
        price: Math.random() * 100 + 100,
        volume: Math.floor(Math.random() * 1000000),
      }));

      res.json({ symbol, prices });
    } catch (error) {
      console.error('Error fetching stock data:', error);
      res.status(500).json({ error: "Failed to fetch stock data" });
    }
  });

  // AI insights endpoint
  app.get("/api/ai/insights/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o", // Using the latest model as specified
        messages: [
          {
            role: "system",
            content: "You are a financial analyst. Analyze the stock and provide insights in JSON format with the following structure: { sentiment: 'positive' | 'neutral' | 'negative', summary: string, recommendation: string, confidence: number }",
          },
          {
            role: "user",
            content: `Analyze ${symbol} stock performance`,
          },
        ],
        response_format: { type: "json_object" },
      });

      if (!completion.choices[0].message.content) {
        throw new Error('No content in OpenAI response');
      }

      const insights = JSON.parse(completion.choices[0].message.content);
      res.json(insights);
    } catch (error) {
      console.error('OpenAI API error:', error);
      res.status(500).json({ error: "Failed to generate insights" });
    }
  });

  // Social media insights endpoint
  app.post("/api/social/insights", async (req, res) => {
    try {
      const { posts } = req.body;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Analyze social media posts and provide insights in JSON format with the following structure: { trending: string[], sentiment: number, suggestions: string[] }",
          },
          {
            role: "user",
            content: `Analyze these social media posts: ${JSON.stringify(posts)}`,
          },
        ],
        response_format: { type: "json_object" },
      });

      if (!completion.choices[0].message.content) {
        throw new Error('No content in OpenAI response');
      }

      const insights = JSON.parse(completion.choices[0].message.content);
      res.json(insights);
    } catch (error) {
      console.error('Social media analysis error:', error);
      res.status(500).json({ error: "Failed to analyze social media data" });
    }
  });

  return httpServer;
}