import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import db from "../database";
import * as schema from "../database/schema";
import { setSessionCookie } from "better-auth/cookies";

if (!process.env.FRONTEND_URL) throw new Error("FRONTEND_URL must be provided");
if (!process.env.BETTER_AUTH_SECRET)
  throw new Error("BETTER_AUTH_SECRET must be provided");

const socialProviders = {
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
      }
    : {}),
  ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
    ? {
        github: {
          clientId: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
        },
      }
    : {}),
};

const trustedOrigins = [
  process.env.FRONTEND_URL,
  "https://classroom-frontend-one-iota.vercel.app",
];
if (process.env.NODE_ENV !== "production") {
  trustedOrigins.push(
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
  );
}

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders,
  user: {
    additionalFields: {
      role: {
        type: ["student", "teacher", "admin"],
        required: true,
        defaultValue: "student",
        input: false,
      },
      imageCldPubId: {
        type: "string",
        required: false,
        input: true,
      },
    },
  },
  advanced: {
    cookies: {
      session_token: {
        name: "authentication_token",
      },
    },
  },
});
