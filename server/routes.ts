import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import OpenAI from "openai";
import { db } from "@db";
import { posts, users } from "@db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { setupAuth } from "./auth";
import { socialMediaRouter } from "./social-media";

// Configure OpenAI with proper error handling
let openai: OpenAI | null = null;
try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    console.log("OpenAI API initialized successfully");
  } else {
    console.warn("OpenAI API key not found. AI features will be disabled.");
  }
} catch (error) {
  console.error("Failed to initialize OpenAI:", error);
}

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Set up authentication routes first
  setupAuth(app);

  // Add authentication check middleware for protected routes
  const authMiddleware = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    next();
  };

  // Register social media routes with error handling and auth middleware
  app.use('/api/social', authMiddleware, (req, res, next) => {
    // Check for required environment variables
    const requiredEnvVars = {
      'Facebook': ['FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET'],
      'Instagram': ['INSTAGRAM_APP_ID', 'INSTAGRAM_APP_SECRET'],
      'TikTok': ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET']
    };

    const missingVars: string[] = [];
    Object.entries(requiredEnvVars).forEach(([platform, vars]) => {
      vars.forEach(varName => {
        if (!process.env[varName]) {
          missingVars.push(varName);
        }
      });
    });

    if (missingVars.length > 0) {
      console.warn(`Warning: Missing social media environment variables: ${missingVars.join(', ')}`);
      // Continue with limited functionality instead of blocking the request
    }

    next();
  }, socialMediaRouter);

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

  // Enhanced social media snapshot endpoint
  app.get("/api/social/snapshot/:symbol", async (req, res) => {
    if (!openai) {
      return res.status(503).json({ error: "AI features are currently unavailable", message: "OpenAI API key is not configured" });
    }
    try {
      const { symbol } = req.params;

      // Get posts mentioning the stock symbol using SQL ILIKE for case-insensitive search
      const socialPosts = await db.query.posts.findMany({
        where: sql`${posts.content} ILIKE ${`%${symbol}%`}`,
        orderBy: [desc(posts.createdAt)],
        limit: 100,
      });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Analyze social media sentiment for stock ${symbol}. Generate a comprehensive snapshot including overall sentiment, confidence level, trending topics, and key insights. Format response as JSON with the structure: {
              overallSentiment: "positive" | "neutral" | "negative",
              confidence: number,
              trendingTopics: string[],
              keyInsights: string[],
              volume: number,
              recentMentions: { platform: string, count: number, sentiment: number }[]
            }`,
          },
          {
            role: "user",
            content: `Analyze these social media posts about ${symbol}: ${JSON.stringify(socialPosts)}`,
          },
        ],
        response_format: { type: "json_object" },
      });

      if (!completion.choices[0].message.content) {
        throw new Error('No content in OpenAI response');
      }

      const snapshot = JSON.parse(completion.choices[0].message.content);
      res.json(snapshot);
    } catch (error) {
      console.error('Social snapshot generation error:', error);
      res.status(500).json({ error: "Failed to generate social media snapshot" });
    }
  });


  // WebSocket server for real-time stock updates with proper error handling
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: "/api/ws",  // Specify a path to avoid conflicts with Vite HMR
    clientTracking: true, // Enable client tracking for proper cleanup
  });

  // Handle WebSocket server errors
  wss.on('error', (error) => {
    console.error('WebSocket server error:', error);
  });

  // Clean up on server close
  httpServer.on('close', () => {
    wss.clients.forEach(client => {
      try {
        client.terminate();
      } catch (error) {
        console.error('Error terminating client:', error);
      }
    });
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

  // AI insights endpoint with graceful degradation
  app.get("/api/ai/insights/:symbol", async (req, res) => {
    if (!openai) {
      return res.status(503).json({
        error: "AI features are currently unavailable",
        message: "OpenAI API key is not configured"
      });
    }

    try {
      const { symbol } = req.params;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
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

  // Social media insights endpoint with graceful degradation
  app.post("/api/social/insights", async (req, res) => {
    if (!openai) {
      return res.status(503).json({
        error: "AI features are currently unavailable",
        message: "OpenAI API key is not configured"
      });
    }

    try {
      const { posts } = req.body;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Analyze social media posts and provide detailed sentiment analysis in JSON format with the following structure: { positive: number, neutral: number, negative: number, overallMood: number, trendingTopics: string[] }. The numbers should be between 0 and 1, representing the proportion of posts in each category. overallMood should be a number between 0 and 1 representing the overall sentiment.",
          },
          {
            role: "user",
            content: `Analyze these social media posts for sentiment and topics: ${JSON.stringify(posts)}`,
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