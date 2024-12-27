import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations, type RelationConfig } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from 'zod';

// Users table schema with enhanced profile fields
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  email: text("email").unique().notNull(),
  displayName: text("display_name"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  location: text("location"),
  socialLinks: jsonb("social_links").$type<Record<string, string>>(),
  preferences: jsonb("preferences").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Posts table schema with enhanced engagement tracking
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  authorId: integer("author_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  attachments: jsonb("attachments").$type<string[]>(),
  likesCount: integer("likes_count").default(0).notNull(),
  sharesCount: integer("shares_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Comments table schema with threading support
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  postId: integer("post_id").references(() => posts.id, { onDelete: 'cascade' }).notNull(),
  authorId: integer("author_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  parentId: integer("parent_id").references(() => comments.id, { onDelete: 'set null' }),
  likesCount: integer("likes_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Post reactions for detailed engagement tracking
export const reactions = pgTable("reactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  postId: integer("post_id").references(() => posts.id, { onDelete: 'cascade' }),
  commentId: integer("comment_id").references(() => comments.id, { onDelete: 'cascade' }),
  type: text("type").notNull(), // 'like', 'heart', 'laugh', etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Define relationships
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  comments: many(comments),
  reactions: many(reactions),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
  comments: many(comments),
  reactions: many(reactions),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  post: one(posts, { fields: [comments.postId], references: [posts.id] }),
  author: one(users, { fields: [comments.authorId], references: [users.id] }),
  parent: one(comments, { fields: [comments.parentId], references: [comments.id] }),
  reactions: many(reactions),
}));

export const reactionsRelations = relations(reactions, ({ one }) => ({
  user: one(users, { fields: [reactions.userId], references: [users.id] }),
  post: one(posts, { fields: [reactions.postId], references: [posts.id] }),
  comment: one(comments, { fields: [reactions.commentId], references: [comments.id] }),
}));

// Schema validation with zod
export const insertUserSchema = createInsertSchema(users, {
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  bio: z.string().max(500, "Bio must not exceed 500 characters").optional(),
  location: z.string().max(100, "Location must not exceed 100 characters").optional(),
  socialLinks: z.record(z.string().url(), z.string()).optional(),
});

export const selectUserSchema = createSelectSchema(users);

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
export type Reaction = typeof reactions.$inferSelect;
export type NewReaction = typeof reactions.$inferInsert;