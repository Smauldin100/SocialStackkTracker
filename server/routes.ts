import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { db } from "@db";
import { posts, comments, users, reactions } from "@db/schema";
import { eq, desc, and, isNull } from "drizzle-orm";

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

  // Enhanced user profile endpoints
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

  // Enhanced posts endpoints with reactions
  app.post("/api/posts", authMiddleware, async (req, res) => {
    try {
      const { content, attachments } = req.body;
      if (!content?.trim()) {
        return res.status(400).json({ error: "Content is required" });
      }

      const [post] = await db
        .insert(posts)
        .values({
          authorId: (req.user as UserType).id,
          content: content.trim(),
          attachments,
        })
        .returning();

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

  // Get posts with reactions and nested comments
  app.get("/api/posts", async (req, res) => {
    try {
      const allPosts = await db.query.posts.findMany({
        orderBy: [desc(posts.createdAt)],
        with: {
          author: true,
          comments: {
            where: isNull(comments.parentId),
            with: {
              author: true,
              reactions: true,
            },
            orderBy: [desc(comments.createdAt)],
          },
          reactions: true,
        },
      });
      res.json(allPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  // Enhanced comments with threading support
  app.post("/api/posts/:postId/comments", authMiddleware, async (req, res) => {
    try {
      const { content, parentId } = req.body;
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
          parentId: parentId || null,
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

  // Reaction endpoints
  app.post("/api/reactions", authMiddleware, async (req, res) => {
    try {
      const { postId, commentId, type } = req.body;

      const [reaction] = await db
        .insert(reactions)
        .values({
          userId: (req.user as UserType).id,
          postId: postId || null,
          commentId: commentId || null,
          type,
        })
        .returning();

      // Update counts
      if (postId) {
        await db
          .update(posts)
          .set({ likesCount: posts.likesCount + 1 })
          .where(eq(posts.id, postId));
      } else if (commentId) {
        await db
          .update(comments)
          .set({ likesCount: comments.likesCount + 1 })
          .where(eq(comments.id, commentId));
      }

      const message = JSON.stringify({ type: 'NEW_REACTION', reaction });
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });

      res.json(reaction);
    } catch (error) {
      console.error('Error creating reaction:', error);
      res.status(500).json({ error: "Failed to create reaction" });
    }
  });

  // Delete reaction
  app.delete("/api/reactions/:reactionId", authMiddleware, async (req, res) => {
    try {
      const reactionId = parseInt(req.params.reactionId);
      const [reaction] = await db
        .delete(reactions)
        .where(and(
          eq(reactions.id, reactionId),
          eq(reactions.userId, (req.user as UserType).id)
        ))
        .returning();

      if (reaction.postId) {
        await db
          .update(posts)
          .set({ likesCount: posts.likesCount - 1 })
          .where(eq(posts.id, reaction.postId));
      } else if (reaction.commentId) {
        await db
          .update(comments)
          .set({ likesCount: comments.likesCount - 1 })
          .where(eq(comments.id, reaction.commentId));
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting reaction:', error);
      res.status(500).json({ error: "Failed to delete reaction" });
    }
  });

  // User profile endpoint (original, kept for completeness if needed)
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