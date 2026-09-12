import { defineRelationsPart } from "drizzle-orm";
import { user } from "./auth";
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

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

export const classStatusEnum = pgEnum("class_status", [
  "active",
  "inactive",
  "archived",
]);

export const classes = pgTable(
  "classes",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    subjectId: integer("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    teacherId: text("teacher_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    inviteCode: text("invite_code").notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    bannerCldPubId: text("banner_cld_pub_id"),
    bannerUrl: text("banner_url"),
    description: text("description"),
    capacity: integer("capacity").default(50).notNull(),
    status: classStatusEnum().default("active").notNull(),
    schedules: jsonb("schedules")
      .$type<{ day: string; startTime: string; endTime: string }[]>()
      .notNull(),
    ...timeStamps,
  },
  (table) => [
    index("classes_subjectId_idx").on(table.subjectId),
    index("classes_teacherId_idx").on(table.teacherId),
  ],
);

export const activityLogs = pgTable("activity_logs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  actorId: text("actor_id").references(() => user.id, { onDelete: "set null" }),
  action: varchar("action", { length: 50 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: text("entity_id").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const enrollments = pgTable(
  "enrollments",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    studentId: text("student_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    classId: integer("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("enrollments_studentId_classId_uidx").on(
      table.studentId,
      table.classId,
    ),
    index("enrollments_studentId_idx").on(table.studentId),
    index("enrollments_classId_idx").on(table.classId),
  ],
);

export const relations = defineRelationsPart(
  { departments, subjects, classes, enrollments, activityLogs, user },
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
      classes: helpers.many.classes({
        from: [helpers.subjects.id],
        to: [helpers.classes.subjectId],
      }),
    },
    classes: {
      subject: helpers.one.subjects({
        from: [helpers.classes.subjectId],
        to: [helpers.subjects.id],
      }),
      teacher: helpers.one.user({
        from: [helpers.classes.teacherId],
        to: [helpers.user.id],
      }),
      enrollments: helpers.many.enrollments({
        from: [helpers.classes.id],
        to: [helpers.enrollments.classId],
      }),
    },
    enrollments: {
      student: helpers.one.user({
        from: [helpers.enrollments.studentId],
        to: [helpers.user.id],
      }),
      class: helpers.one.classes({
        from: [helpers.enrollments.classId],
        to: [helpers.classes.id],
      }),
    },
    activityLogs: {
      actor: helpers.one.user({
        from: [helpers.activityLogs.actorId],
        to: [helpers.user.id],
      }),
    },
  }),
);

export const Department = typeof departments.$inferSelect;
export const NewDepartment = typeof departments.$inferInsert;

export const Subject = typeof subjects.$inferSelect;
export const NewSubject = typeof subjects.$inferInsert;

export const Class = typeof classes.$inferSelect;
export const NewClass = typeof classes.$inferInsert;

export const Enrollment = typeof enrollments.$inferSelect;
export const NewEnrollment = typeof enrollments.$inferInsert;

export const ActivityLog = typeof activityLogs.$inferSelect;
export const NewActivityLog = typeof activityLogs.$inferInsert;
