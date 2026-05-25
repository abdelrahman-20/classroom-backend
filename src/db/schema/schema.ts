// import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
// // Define the 'demo_users' table
// export const demoUsers = pgTable('demo_users', {
//   id: serial('id').primaryKey(),
//   name: text('name').notNull(),
//   email: text('email').notNull().unique(),
//   createdAt: timestamp('created_at').defaultNow().notNull(),
// });
// // Export types for type-safe queries
// export type User = typeof demoUsers.$inferSelect;
// export type NewUser = typeof demoUsers.$inferInsert;

import { relations } from "drizzle-orm";
import { pgTable, integer, timestamp, varchar } from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
};

export const departments = pgTable("departments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  ...timestamps,
});

export const subjects = pgTable("subjects", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  departmentId: integer("departmentId")
    .notNull()
    .references(() => departments.id, { onDelete: "restrict" }),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  ...timestamps,
});

export const departmentRelations = relations(departments, ({ many }) => ({
  subjects: many(subjects),
}));

export const subjectRelations = relations(subjects, ({ one, many }) => ({
  department: one(departments, {
    fields: [subjects.departmentId], // FK on subjects table
    references: [departments.id], // PK on departments table
  }),
}));

export type Department = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;

export type Subject = typeof departments.$inferSelect;
export type NewSubject = typeof departments.$inferInsert;
