import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import db from "../database";
import * as schema from "../database/schema";

if (!process.env.FRONTEND_URL) throw new Error("FRONTEND_URL must be provided");
if (!process.env.BETTER_AUTH_SECRET)
  throw new Error("BETTER_AUTH_SECRET must be provided");

const trustedOrigins = [process.env.FRONTEND_URL];
if (process.env.NODE_ENV !== "production") {
  trustedOrigins.push("http://localhost:3000", "http://localhost:5173");
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
  user: {
    additionalFields: {
      role: {
        type: ["student", "teacher", "admin"],
        required: true,
        defaultValue: "student",
        input: true,
      },
      imageCldPubId: {
        type: "string",
        required: false,
        input: true,
      },
    },
  },
});
