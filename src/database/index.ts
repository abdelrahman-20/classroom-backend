import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { relations } from "./schema/schema";

if (!process.env.DATABASE_URL)
  throw new Error(`Database URL Wasn't Provided !!`);

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle({ client: sql, relations });

export default db;
