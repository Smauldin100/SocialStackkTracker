import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { db } from "@db";
import { posts, comments, users, socialAccounts } from "@db/schema";
import { eq, desc, and } from "drizzle-orm";
import { setupFacebookRoutes } from "./social-media/facebook";
import { setupInstagramRoutes } from "./social-media/instagram";
import { setupTikTokRoutes } from "./social-media/tiktok";

type UserType = typeof users.$inferSelect;

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // WebSocket setup for real-time updates
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: "/api/ws"
  });

  wss.on('connection', function connection(ws) {
    console.log('New WebSocket client connected');

    ws.on('error', function error(err) {
      console.error('WebSocket error:', err);
    });

    ws.on('close', function close() {
      console.log('Client disconnected');
    });
  });

  // Authentication middleware
  const authMiddleware = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    next();
  };

  // Social Media Platform Routes
  setupFacebookRoutes(app);
  setupInstagramRoutes(app);
  setupTikTokRoutes(app);

  // Social metrics endpoint
  app.get("/api/social-metrics", authMiddleware, async (req, res) => {
    try {
      const userId = (req.user as UserType).id;

      // Get user's social accounts
      const userAccounts = await db.query.socialAccounts.findMany({
        where: eq(socialAccounts.userId, userId),
        with: {
          posts: true,
        }
      });

      // Calculate total metrics across all platforms
      const metrics = {
        totalAccounts: userAccounts.length,
        totalPosts: userAccounts.reduce((acc, account) => acc + account.posts.length, 0),
        platformMetrics: userAccounts.map(account => ({
          platform: account.platform,
          isActive: account.isActive,
          username: account.platformUsername,
          posts: account.posts.length,
        }))
      };

      res.json(metrics);
    } catch (error) {
      console.error('Error fetching social metrics:', error);
      res.status(500).json({ error: "Failed to fetch social metrics" });
    }
  });

  // Posts endpoints
  app.post("/api/posts", authMiddleware, async (req, res) => {
    try {
      const { content, platform, mediaUrls, scheduledFor } = req.body;
      const userId = (req.user as UserType).id;

      // Find the user's account for the specified platform
      const [account] = await db
        .select()
        .from(socialAccounts)
        .where(and(
          eq(socialAccounts.userId, userId),
          eq(socialAccounts.platform, platform),
          eq(socialAccounts.isActive, true)
        ))
        .limit(1);

      if (!account) {
        return res.status(404).json({ error: `No active ${platform} account found` });
      }

      const [post] = await db
        .insert(posts)
        .values({
          userId,
          socialAccountId: account.id,
          content,
          platform,
          mediaUrls: mediaUrls || null,
          scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
          status: scheduledFor ? 'scheduled' : 'draft'
        })
        .returning();

      // Notify connected clients about new post
      const message = JSON.stringify({ type: 'NEW_POST', post });
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });

      res.json(post);
    } catch (error) {
      console.error('Error creating post:', error);
      res.status(500).json({ error: "Failed to create post" });
    }
  });

  // Get posts with comments
  app.get("/api/posts", authMiddleware, async (req, res) => {
    try {
      const userId = (req.user as UserType).id;
      const { platform } = req.query;

      const query = {
        where: platform ? 
          and(
            eq(posts.userId, userId),
            eq(posts.platform, platform as string)
          ) : 
          eq(posts.userId, userId),
        orderBy: [desc(posts.createdAt)],
        with: {
          comments: {
            with: {
              user: true,
            },
            orderBy: [desc(comments.createdAt)],
          },
          socialAccount: true,
        },
      };

      const userPosts = await db.query.posts.findMany(query);
      res.json(userPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  // Comments endpoints
  app.post("/api/posts/:postId/comments", authMiddleware, async (req, res) => {
    try {
      const { content } = req.body;
      const postId = parseInt(req.params.postId);
      const userId = (req.user as UserType).id;

      if (!content?.trim()) {
        return res.status(400).json({ error: "Content is required" });
      }

      const [comment] = await db
        .insert(comments)
        .values({
          userId,
          postId,
          content: content.trim(),
        })
        .returning();

      const message = JSON.stringify({ type: 'NEW_COMMENT', comment });
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });

      res.json(comment);
    } catch (error) {
      console.error('Error creating comment:', error);
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  // Connected accounts endpoint
  app.get("/api/connected-accounts", authMiddleware, async (req, res) => {
    try {
      const userId = (req.user as UserType).id;

      const accounts = await db.query.socialAccounts.findMany({
        where: eq(socialAccounts.userId, userId),
        orderBy: [desc(socialAccounts.createdAt)],
      });

      res.json(accounts);
    } catch (error) {
      console.error('Error fetching connected accounts:', error);
      res.status(500).json({ error: "Failed to fetch connected accounts" });
    }
  });

  // Enhanced user profile endpoints (from original code)
  app.put("/api/users/profile", authMiddleware, async (req, res) => {
    try {
      const { bio, location, socialLinks, displayName } = req.body;
      const [updatedUser] = await db
        .update(users)
        .set({
          bio,
          location,
          socialLinks,
          displayName,
          updatedAt: new Date(),
        })
        .where(eq(users.id, (req.user as UserType).id))
        .returning();

      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });


  // User profile endpoint (from original code)
  app.get("/api/users/:userId/profile", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

      const [user] = await db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          bio: users.bio,
          location: users.location,
          socialLinks: users.socialLinks,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ error: "Failed to fetch user profile" });
    }
  });

  return httpServer;
}