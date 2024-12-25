import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import OpenAI from "openai";
import { db } from "@db";
import { stocks, watchlists, socialAccounts, aiInsights } from "@db/schema";
import { eq } from "drizzle-orm";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is required");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

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

          // Clean up interval on connection close
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
    const { symbol } = req.params;

    // Simulated stock data
    const prices = Array.from({ length: 20 }, (_, i) => ({
      timestamp: new Date(Date.now() - i * 86400000).toISOString(),
      price: Math.random() * 100 + 100,
      volume: Math.floor(Math.random() * 1000000),
    }));

    res.json({ symbol, prices });
  });

  // Watchlist endpoints
  app.get("/api/watchlists", async (req, res) => {
    const result = await db.select().from(watchlists);
    res.json(result);
  });

  // Social media feed endpoint
  app.get("/api/social/feed", async (_req, res) => {
    // Simulated social media posts
    const posts = [
      {
        id: "1",
        platform: "twitter",
        author: {
          name: "Market Analyst",
          avatar: "https://api.dicebear.com/7.x/avatars/svg?seed=1",
        },
        content: "Tech stocks showing strong momentum today! #stocks #technology",
        timestamp: new Date().toISOString(),
        engagement: { likes: 120, shares: 45 },
      },
      {
        id: "2",
        platform: "linkedin",
        author: {
          name: "Financial Expert",
          avatar: "https://api.dicebear.com/7.x/avatars/svg?seed=2",
        },
        content: "Latest market analysis suggests bullish trends in the tech sector.",
        timestamp: new Date().toISOString(),
        engagement: { likes: 89, shares: 23 },
      },
    ];

    res.json(posts);
  });

  // AI insights endpoint
  app.get("/api/ai/insights/:symbol", async (req, res) => {
    const { symbol } = req.params;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
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

      const insights = JSON.parse(completion.choices[0].message.content);
      res.json(insights);
    } catch (error) {
      console.error('OpenAI API error:', error);
      res.status(500).json({ error: "Failed to generate insights" });
    }
  });

  return httpServer;
}