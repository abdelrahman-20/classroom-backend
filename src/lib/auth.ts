import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import db from "../database";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  user: {
    additionalFields: {
      role: {
        type: ["student", "teacher", "admin"],
        required: false,
        defaultValue: "student",
        input: false,
      },
      imageCldPubId: {
        type: "string",
        required: false,
      },
    },
  },
});
