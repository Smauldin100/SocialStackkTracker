import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from 'zod';

/**
 * User table schema
 * Stores user account information and preferences
 * @property {number} id - Unique identifier for the user
 * @property {string} username - Unique username for authentication
 * @property {string} password - Hashed password for authentication
 * @property {string} email - User's email address for notifications
 * @property {Object} preferences - JSON object storing user preferences
 * @property {Date} createdAt - Timestamp of account creation
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  email: text("email").unique().notNull(),
  preferences: jsonb("preferences").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Watchlist table schema
 * Stores user-created watchlists of stocks
 * @property {number} id - Unique identifier for the watchlist
 * @property {number} userId - Reference to the user who owns this watchlist
 * @property {string} name - Name of the watchlist
 * @property {Date} createdAt - Timestamp of watchlist creation
 */
export const watchlists = pgTable("watchlists", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Stock table schema
 * Stores stock information and alerts for watchlists
 * @property {number} id - Unique identifier for the stock entry
 * @property {string} symbol - Stock symbol (e.g., AAPL, GOOGL)
 * @property {number} watchlistId - Reference to the associated watchlist
 * @property {Object[]} alerts - Array of alert configurations for this stock
 */
export const stocks = pgTable("stocks", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").unique().notNull(),
  watchlistId: integer("watchlist_id").references(() => watchlists.id, { onDelete: 'cascade' }).notNull(),
  alerts: jsonb("alerts").default([]).notNull(),
});

/**
 * Social Account table schema
 * Stores linked social media account credentials
 * @property {number} id - Unique identifier for the social account
 * @property {number} userId - Reference to the user who owns this account
 * @property {string} platform - Social media platform identifier
 * @property {string} accountId - Platform-specific account identifier
 * @property {string} accessToken - OAuth access token
 * @property {string} refreshToken - OAuth refresh token
 * @property {Date} expiresAt - Token expiration timestamp
 */
export const socialAccounts = pgTable("social_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  platform: text("platform").notNull(),
  accountId: text("account_id").notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
});

/**
 * AI Insights table schema
 * Stores AI-generated insights and analysis
 * @property {number} id - Unique identifier for the insight
 * @property {number} userId - Reference to the user this insight is for
 * @property {string} type - Type of insight (e.g., 'sentiment', 'trend', 'prediction')
 * @property {string} content - The actual insight content
 * @property {Date} createdAt - Timestamp when the insight was generated
 */
export const aiInsights = pgTable("ai_insights", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: text("type").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Posts table schema
 * Stores user-generated posts and their engagement metrics
 * @property {number} id - Unique identifier for the post
 * @property {number} userId - Reference to the post author
 * @property {string} content - Post content
 * @property {Date} createdAt - Timestamp of post creation
 * @property {number} likes - Number of likes on the post
 * @property {number} shares - Number of times the post was shared
 */
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  likes: integer("likes").default(0).notNull(),
  shares: integer("shares").default(0).notNull(),
});

/**
 * Database Relations Configuration
 * Defines relationships between tables for better query optimization
 */
export const usersRelations = relations(users, ({ many }) => ({
  watchlists: many(watchlists),
  socialAccounts: many(socialAccounts),
  aiInsights: many(aiInsights),
  posts: many(posts),
}));

export const watchlistsRelations = relations(watchlists, ({ one, many }) => ({
  user: one(users, {
    fields: [watchlists.userId],
    references: [users.id],
  }),
  stocks: many(stocks),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  user: one(users, {
    fields: [posts.userId],
    references: [users.id],
  }),
}));

/**
 * Zod Schema Validation
 * Defines validation rules for data input/output
 */
export const insertUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  email: z.string().email("Invalid email format"),
});

export const selectUserSchema = createSelectSchema(users);

// Schema validation for other entities
export const insertWatchlistSchema = createInsertSchema(watchlists);
export const selectWatchlistSchema = createSelectSchema(watchlists);

export const insertStockSchema = createInsertSchema(stocks);
export const selectStockSchema = createSelectSchema(stocks);

export const insertSocialAccountSchema = createInsertSchema(socialAccounts);
export const selectSocialAccountSchema = createSelectSchema(socialAccounts);

export const insertAiInsightSchema = createInsertSchema(aiInsights);
export const selectAiInsightSchema = createSelectSchema(aiInsights);

export const insertPostSchema = createInsertSchema(posts, {
  id: undefined,
  createdAt: undefined,
  likes: undefined,
  shares: undefined,
});
export const selectPostSchema = createSelectSchema(posts);

/**
 * Type Exports
 * TypeScript type definitions for use throughout the application
 */
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type SelectUser = typeof users.$inferSelect;

export type Watchlist = typeof watchlists.$inferSelect;
export type NewWatchlist = typeof watchlists.$inferInsert;

export type Stock = typeof stocks.$inferSelect;
export type NewStock = typeof stocks.$inferInsert;

export type SocialAccount = typeof socialAccounts.$inferSelect;
export type NewSocialAccount = typeof socialAccounts.$inferInsert;

export type AiInsight = typeof aiInsights.$inferSelect;
export type NewAiInsight = typeof aiInsights.$inferInsert;

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;