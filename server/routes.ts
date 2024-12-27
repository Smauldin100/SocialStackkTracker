import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { db } from "@db";
import { posts, comments, follows, users } from "@db/schema";
import { eq, desc, and } from "drizzle-orm";
import { sql } from 'drizzle-orm';

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

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: "/api/ws",
  });

  // Posts endpoints
  app.post("/api/posts", authMiddleware, async (req, res) => {
    try {
      const { content, mediaUrls } = req.body;
      if (!content?.trim()) {
        return res.status(400).send("Content is required");
      }

      const [post] = await db
        .insert(posts)
        .values({
          userId: req.user!.id,
          content,
          mediaUrls: mediaUrls || [],
        })
        .returning();

      res.json(post);
    } catch (error) {
      console.error('Error creating post:', error);
      res.status(500).json({ error: "Failed to create post" });
    }
  });

  app.get("/api/posts", async (req, res) => {
    try {
      const allPosts = await db.query.posts.findMany({
        orderBy: [desc(posts.createdAt)],
        with: {
          user: true,
          comments: {
            with: {
              user: true,
            },
          },
        },
      });
      res.json(allPosts);
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

      if (!content?.trim()) {
        return res.status(400).send("Content is required");
      }

      const [comment] = await db
        .insert(comments)
        .values({
          postId,
          userId: req.user!.id,
          content,
        })
        .returning();

      res.json(comment);
    } catch (error) {
      console.error('Error creating comment:', error);
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  // Follow/Unfollow endpoints
  app.post("/api/users/:userId/follow", authMiddleware, async (req, res) => {
    try {
      const followingId = parseInt(req.params.userId);
      const followerId = req.user!.id;

      if (followerId === followingId) {
        return res.status(400).json({ error: "Cannot follow yourself" });
      }

      const [follow] = await db
        .insert(follows)
        .values({
          followerId,
          followingId,
        })
        .returning();

      res.json(follow);
    } catch (error) {
      console.error('Error following user:', error);
      res.status(500).json({ error: "Failed to follow user" });
    }
  });

  app.delete("/api/users/:userId/follow", authMiddleware, async (req, res) => {
    try {
      const followingId = parseInt(req.params.userId);
      const followerId = req.user!.id;

      await db
        .delete(follows)
        .where(and(
          eq(follows.followerId, followerId),
          eq(follows.followingId, followingId)
        ));

      res.json({ message: "Unfollowed successfully" });
    } catch (error) {
      console.error('Error unfollowing user:', error);
      res.status(500).json({ error: "Failed to unfollow user" });
    }
  });

  // User profile endpoint
  app.get("/api/users/:userId/profile", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

      const [user] = await db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
          displayName: users.displayName,
          bio: users.bio,
          avatarUrl: users.avatarUrl,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const [{ count: followersCount }] = await db
        .select({ count: sql`count(*)::int` })
        .from(follows)
        .where(eq(follows.followingId, userId));

      const [{ count: followingCount }] = await db
        .select({ count: sql`count(*)::int` })
        .from(follows)
        .where(eq(follows.followerId, userId));

      res.json({
        ...user,
        followersCount,
        followingCount,
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ error: "Failed to fetch user profile" });
    }
  });

  // Real-time updates via WebSocket
  wss.on("connection", (ws) => {
    console.log("New WebSocket connection established");

    ws.on("message", async (message) => {
      try {
        const data = JSON.parse(message.toString());

        // Handle different types of real-time updates
        switch (data.type) {
          case "NEW_POST":
            // Broadcast new post to all connected clients
            wss.clients.forEach((client) => {
              if (client !== ws && client.readyState === ws.OPEN) {
                client.send(JSON.stringify({
                  type: "NEW_POST",
                  post: data.post
                }));
              }
            });
            break;

          case "NEW_COMMENT":
            // Broadcast new comment to all connected clients
            wss.clients.forEach((client) => {
              if (client !== ws && client.readyState === ws.OPEN) {
                client.send(JSON.stringify({
                  type: "NEW_COMMENT",
                  comment: data.comment
                }));
              }
            });
            break;
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });
  });

  return httpServer;
}