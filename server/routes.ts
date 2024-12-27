import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import type { WebSocket } from "ws";
import { db } from "@db";
import { posts, comments, users } from "@db/schema";
import { eq, desc } from "drizzle-orm";

type UserType = typeof users.$inferSelect;

export function registerRoutes(app: Express): Server {
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
    path: "/api/ws"
  });

  wss.on('connection', (ws: WebSocket) => {
    console.log('New WebSocket connection established');

    ws.on('error', console.error);
    ws.on('close', () => console.log('Client disconnected'));
  });

  // Posts endpoints
  app.post("/api/posts", authMiddleware, async (req, res) => {
    try {
      const { content } = req.body;
      if (!content?.trim()) {
        return res.status(400).json({ error: "Content is required" });
      }

      const [post] = await db
        .insert(posts)
        .values({
          authorId: (req.user as UserType).id,
          content: content.trim(),
        })
        .returning();

      // Notify connected clients about new post
      const postWithAuthor = await db.query.posts.findFirst({
        where: eq(posts.id, post.id),
        with: {
          author: true,
        },
      });

      wss.clients.forEach((client: WebSocket) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'NEW_POST', post: postWithAuthor }));
        }
      });

      res.json(postWithAuthor);
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
          author: true,
          comments: {
            with: {
              author: true,
            },
            orderBy: [desc(comments.createdAt)],
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
        return res.status(400).json({ error: "Content is required" });
      }

      const [comment] = await db
        .insert(comments)
        .values({
          postId,
          authorId: (req.user as UserType).id,
          content: content.trim(),
        })
        .returning();

      const commentWithAuthor = await db.query.comments.findFirst({
        where: eq(comments.id, comment.id),
        with: {
          author: true,
        },
      });

      // Notify connected clients about new comment
      wss.clients.forEach((client: WebSocket) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'NEW_COMMENT', comment: commentWithAuthor }));
        }
      });

      res.json(commentWithAuthor);
    } catch (error) {
      console.error('Error creating comment:', error);
      res.status(500).json({ error: "Failed to create comment" });
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
          avatarUrl: users.avatarUrl,
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