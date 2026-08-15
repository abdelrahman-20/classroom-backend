import { relations } from "drizzle-orm/_relations";
import { integer, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

const timeStamps = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
};

export const departments = pgTable("departments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 20 }).unique().notNull(),
  description: varchar("description", { length: 255 }),
  ...timeStamps,
});

export const subjects = pgTable("subjects", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 20 }).unique().notNull(),
  description: varchar("description", { length: 255 }),
  departmentId: integer("department_id")
    .notNull()
    .references(() => departments.id),
  ...timeStamps,
});

// One department has many subjects
export const departmentRelations = relations(departments, ({ many }) => ({
  subjects: many(subjects),
}));

// One subject belongs to one department
export const subjectRelations = relations(subjects, ({ one }) => ({
  department: one(departments, {
    fields: [subjects.departmentId], // FK on subjects table
    references: [departments.id], // PK on departments table
  }),
}));

export const Department = typeof departments.$inferSelect;
export const NewDepartment = typeof departments.$inferInsert;

export const Subject = typeof subjects.$inferSelect;
export const NewSubject = typeof subjects.$inferInsert;
