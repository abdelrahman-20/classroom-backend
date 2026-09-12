import { and, desc, eq, getColumns, sql } from "drizzle-orm";
import { Request, Response } from "express";
import db from "../database";
import { classes, enrollments, subjects, user } from "../database/schema";
import { logActivity } from "../lib/activity";
import { getCapacityStatus } from "../lib/capacity";
import { paginationMeta, parsePagination } from "../lib/pagination";

export const getMyEnrollments = async (req: Request, res: Response) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(enrollments)
      .where(eq(enrollments.studentId, req.user!.id));

    const enrollmentList = await db
      .select({
        ...getColumns(enrollments),
        class: { ...getColumns(classes) },
        subjectName: subjects.name,
        teacherName: user.name,
      })
      .from(enrollments)
      .innerJoin(classes, eq(enrollments.classId, classes.id))
      .leftJoin(subjects, eq(classes.subjectId, subjects.id))
      .leftJoin(user, eq(classes.teacherId, user.id))
      .where(eq(enrollments.studentId, req.user!.id))
      .orderBy(desc(enrollments.createdAt))
      .limit(limit)
      .offset(offset);

    res.status(200).json({
      data: enrollmentList,
      pagination: paginationMeta(page, limit, countResult?.count ?? 0),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
};

const canManageClass = async (
  req: Request,
  classId: number,
): Promise<{ allowed: boolean; classRow?: typeof classes.$inferSelect }> => {
  const [classRow] = await db
    .select()
    .from(classes)
    .where(eq(classes.id, classId));

  if (!classRow) return { allowed: false };

  if (req.user?.role === "admin") return { allowed: true, classRow };
  if (req.user?.role === "teacher" && classRow.teacherId === req.user.id) {
    return { allowed: true, classRow };
  }

  return { allowed: false, classRow };
};

export const getClassEnrollments = async (req: Request, res: Response) => {
  const classId = Number(req.params.id);
  if (!Number.isFinite(classId)) {
    return res.status(400).json({ error: "Invalid class ID" });
  }

  const { allowed, classRow } = await canManageClass(req, classId);

  if (!allowed && req.user?.role !== "student") {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  if (req.user?.role === "student") {
    const [enrolled] = await db
      .select()
      .from(enrollments)
      .where(
        and(
          eq(enrollments.classId, classId),
          eq(enrollments.studentId, req.user.id),
        ),
      );
    if (!enrolled) {
      return res.status(403).json({ error: "Not enrolled in this class" });
    }
  }

  const enrollmentList = await db
    .select({
      ...getColumns(enrollments),
      student: { ...getColumns(user) },
    })
    .from(enrollments)
    .leftJoin(user, eq(enrollments.studentId, user.id))
    .where(eq(enrollments.classId, classId))
    .orderBy(desc(enrollments.createdAt));

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(enrollments)
    .where(eq(enrollments.classId, classId));

  const enrollmentCount = countResult?.count ?? 0;

  res.status(200).json({
    data: enrollmentList,
    enrollmentCount,
    capacity: classRow?.capacity ?? 0,
    capacityStatus: classRow
      ? getCapacityStatus(enrollmentCount, classRow.capacity)
      : "ok",
  });
};

export const enrollStudent = async (req: Request, res: Response) => {
  const classId = Number(req.params.id);
  if (!Number.isFinite(classId)) {
    return res.status(400).json({ error: "Invalid class ID" });
  }

  const studentId =
    req.user?.role === "student" ? req.user.id : req.body.studentId;

  if (!studentId) {
    return res.status(400).json({ error: "studentId is required" });
  }

  const { allowed, classRow } = await canManageClass(req, classId);

  if (!allowed && req.user?.role === "student" && req.user.id !== studentId) {
    return res
      .status(403)
      .json({ error: "Students can only enroll themselves" });
  }

  if (!allowed && req.user?.role !== "student") {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  if (!classRow) {
    return res.status(404).json({ error: "Class not found" });
  }

  const [student] = await db.select().from(user).where(eq(user.id, studentId));

  if (!student || student.role !== "student") {
    return res.status(400).json({ error: "User must have student role" });
  }

  const [existing] = await db
    .select()
    .from(enrollments)
    .where(
      and(
        eq(enrollments.classId, classId),
        eq(enrollments.studentId, studentId),
      ),
    );

  if (existing) {
    return res.status(409).json({ error: "Student already enrolled" });
  }

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(enrollments)
    .where(eq(enrollments.classId, classId));

  const enrollmentCount = countResult?.count ?? 0;

  if (enrollmentCount >= classRow.capacity) {
    return res.status(409).json({ error: "Class is at full capacity" });
  }

  const [created] = await db
    .insert(enrollments)
    .values({ studentId, classId })
    .returning();

  await logActivity({
    actorId: req.user!.id,
    action: "enrolled",
    entityType: "enrollment",
    entityId: created.id,
    metadata: { classId, studentId },
  });

  res.status(201).json({ data: created });
};

export const unenrollStudent = async (req: Request, res: Response) => {
  const classId = Number(req.params.id);
  const studentId = String(req.params.studentId ?? "");

  if (!Number.isFinite(classId) || !studentId) {
    return res.status(400).json({ error: "Invalid parameters" });
  }

  const { allowed } = await canManageClass(req, classId);

  if (!allowed && req.user?.role === "student" && req.user.id !== studentId) {
    return res
      .status(403)
      .json({ error: "Students can only unenroll themselves" });
  }

  if (!allowed && req.user?.role !== "student") {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  const [deleted] = await db
    .delete(enrollments)
    .where(
      and(
        eq(enrollments.classId, classId),
        eq(enrollments.studentId, studentId),
      ),
    )
    .returning();

  if (!deleted) {
    return res.status(404).json({ error: "Enrollment not found" });
  }

  await logActivity({
    actorId: req.user!.id,
    action: "unenrolled",
    entityType: "enrollment",
    entityId: deleted.id,
    metadata: { classId, studentId },
  });

  res.status(200).json({ data: deleted });
};
