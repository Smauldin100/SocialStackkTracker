import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, insertUserSchema, type User as SelectUser } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";

/**
 * Cryptographic utilities for password hashing and verification
 * Uses scrypt for secure password hashing with salt
 */
const scryptAsync = promisify(scrypt);
const crypto = {
  /**
   * Hash a password using scrypt with a random salt
   * @param {string} password - The plain text password to hash
   * @returns {Promise<string>} The hashed password with salt, format: 'hash.salt'
   */
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },

  /**
   * Compare a supplied password against a stored hash
   * @param {string} suppliedPassword - The password to verify
   * @param {string} storedPassword - The stored hash.salt combination
   * @returns {Promise<boolean>} True if passwords match
   */
  compare: async (suppliedPassword: string, storedPassword: string) => {
    const [hashedPassword, salt] = storedPassword.split(".");
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = (await scryptAsync(
      suppliedPassword,
      salt,
      64
    )) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  },
};

// Type declaration for Express User
declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

/**
 * Configure authentication middleware and routes
 * Sets up Passport.js with local strategy and session management
 * @param {Express} app - Express application instance
 */
export function setupAuth(app: Express) {
  // Initialize session store
  const MemoryStore = createMemoryStore(session);
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID || "porygon-supremacy",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: app.get("env") === "production",
      sameSite: "lax",
    },
    store: new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
  };

  // Production settings
  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  // Set up middleware
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure Passport local strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`Attempting login for user: ${username}`);

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (!user) {
          console.log(`Login failed: User ${username} not found`);
          return done(null, false, { message: "Incorrect username." });
        }

        const isMatch = await crypto.compare(password, user.password);
        if (!isMatch) {
          console.log(`Login failed: Invalid password for user ${username}`);
          return done(null, false, { message: "Incorrect password." });
        }

        console.log(`Login successful for user: ${username}`);
        return done(null, user);
      } catch (err) {
        console.error('Login error:', err);
        return done(err);
      }
    })
  );

  // Session serialization
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        console.error(`Session invalid: User ${id} not found`);
        return done(null, false);
      }

      done(null, user);
    } catch (err) {
      console.error('Session error:', err);
      done(err);
    }
  });

  /**
   * User Registration Endpoint
   * Creates a new user account with hashed password
   * @route POST /api/register
   * @param {Object} req.body - Registration data (username, password, email)
   * @returns {Object} New user data or error message
   */
  app.post("/api/register", async (req, res, next) => {
    try {
      console.log('Registration attempt:', req.body);

      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        const errorMessage = "Invalid input: " + result.error.errors.map(e => e.message).join(", ");
        console.log('Registration validation failed:', errorMessage);
        return res.status(400).send(errorMessage);
      }

      const { username, password, email } = result.data;

      // Check for existing user
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        console.log(`Registration failed: Username ${username} already exists`);
        return res.status(400).send("Username already exists");
      }

      // Create new user with hashed password
      const hashedPassword = await crypto.hash(password);
      const [newUser] = await db
        .insert(users)
        .values({
          username,
          password: hashedPassword,
          email,
          preferences: {},
        })
        .returning();

      console.log(`User registered successfully: ${username}`);

      // Auto-login after registration
      req.login(newUser, (err) => {
        if (err) {
          console.error('Auto-login after registration failed:', err);
          return next(err);
        }
        return res.json({
          message: "Registration successful",
          user: { id: newUser.id, username: newUser.username, email: newUser.email },
        });
      });
    } catch (error) {
      console.error('Registration error:', error);
      next(error);
    }
  });

  /**
   * User Login Endpoint
   * Authenticates user credentials
   * @route POST /api/login
   * @param {Object} req.body - Login credentials (username, password)
   * @returns {Object} User data or error message
   */
  app.post("/api/login", (req, res, next) => {
    console.log('Login attempt:', { username: req.body.username });

    passport.authenticate("local", (err: any, user: Express.User | false, info: IVerifyOptions) => {
      if (err) {
        console.error('Login error:', err);
        return next(err);
      }

      if (!user) {
        console.log('Login failed:', info.message);
        return res.status(400).send(info.message ?? "Login failed");
      }

      req.logIn(user, (err) => {
        if (err) {
          console.error('Session creation error:', err);
          return next(err);
        }

        console.log(`Login successful: ${user.username}`);
        return res.json({
          message: "Login successful",
          user: { id: user.id, username: user.username, email: user.email },
        });
      });
    })(req, res, next);
  });

  /**
   * User Logout Endpoint
   * Ends user session
   * @route POST /api/logout
   * @returns {Object} Success message
   */
  app.post("/api/logout", (req, res) => {
    const username = req.user?.username;
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).send("Logout failed");
      }
      console.log(`User logged out: ${username}`);
      res.json({ message: "Logout successful" });
    });
  });

  /**
   * Get Current User Endpoint
   * Returns current authenticated user's data
   * @route GET /api/user
   * @returns {Object} User data or unauthorized status
   */
  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      const { id, username, email } = req.user;
      return res.json({ id, username, email });
    }
    res.status(401).send("Not logged in");
  });
}