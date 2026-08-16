import { defineRelations } from "drizzle-orm";
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

export const relations = defineRelations(
  { departments, subjects },
  (helpers) => ({
    departments: {
      subjects: helpers.many.subjects({
        from: [helpers.departments.id],
        to: [helpers.subjects.departmentId],
      }),
    },
    subjects: {
      department: helpers.one.departments({
        from: [helpers.subjects.departmentId],
        to: [helpers.departments.id],
      }),
    },
  }),
);

export const Department = typeof departments.$inferSelect;
export const NewDepartment = typeof departments.$inferInsert;

export const Subject = typeof subjects.$inferSelect;
export const NewSubject = typeof subjects.$inferInsert;
