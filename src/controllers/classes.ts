import { Request, Response } from "express";
import {
  aliasedTable,
  and,
  desc,
  eq,
  getColumns,
  ilike,
  or,
  sql,
} from "drizzle-orm";
import db from "../database";
import {
  classes,
  departments,
  enrollments,
  subjects,
  user,
} from "../database/schema";
import { logActivity } from "../lib/activity";
import { getCapacityStatus } from "../lib/capacity";
import { generateInviteCode } from "../lib/invite";
import { escapeLike, paginationMeta, parsePagination } from "../lib/pagination";

const enrichClass = (
  cls: Record<string, unknown> & { capacity: number },
  enrollmentCount: number,
) => ({
  ...cls,
  enrollmentCount,
  capacityStatus: getCapacityStatus(enrollmentCount, cls.capacity),
});

export const getAllClasses = async (req: Request, res: Response) => {
  try {
    const { search, subject, teacher, status } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    const teacherTable = aliasedTable(user, "teacher");
    const filterConditions: ReturnType<typeof eq>[] = [];

    if (search) {
      const value = escapeLike(String(search));
      filterConditions.push(
        or(
          ilike(classes.name, `%${value}%`),
          ilike(classes.inviteCode, `%${value}%`),
        )!,
      );
    }

    if (subject) {
      const value = escapeLike(String(subject).trim());
      filterConditions.push(ilike(subjects.name, `%${value}%`)!);
    }

    if (teacher) {
      const value = escapeLike(String(teacher).trim());
      filterConditions.push(ilike(teacherTable.name, `%${value}%`)!);
    }

    if (status) {
      filterConditions.push(
        eq(classes.status, status as "active" | "inactive" | "archived"),
      );
    }

    // Teacher scoping
    if (req.user?.role === "teacher") {
      filterConditions.push(eq(classes.teacherId, req.user.id));
    }

    const whereClauses =
      filterConditions.length > 0 ? and(...filterConditions) : undefined;

    const countResults = await db
      .select({ count: sql<number>`count(*)` })
      .from(classes)
      .leftJoin(subjects, eq(classes.subjectId, subjects.id))
      .leftJoin(teacherTable, eq(classes.teacherId, teacherTable.id))
      .where(whereClauses);

    const totalCount = countResults[0]?.count ?? 0;

    const classesList = await db
      .select({
        ...getColumns(classes),
        subject: { ...getColumns(subjects) },
        teacher: { ...getColumns(teacherTable) },
        enrollmentCount: sql<number>`count(distinct ${enrollments.id})`,
      })
      .from(classes)
      .leftJoin(subjects, eq(classes.subjectId, subjects.id))
      .leftJoin(teacherTable, eq(classes.teacherId, teacherTable.id))
      .leftJoin(enrollments, eq(enrollments.classId, classes.id))
      .where(whereClauses)
      .groupBy(
        classes.id,
        classes.subjectId,
        classes.teacherId,
        classes.inviteCode,
        classes.name,
        classes.bannerCldPubId,
        classes.bannerUrl,
        classes.description,
        classes.capacity,
        classes.status,
        classes.schedules,
        classes.createdAt,
        classes.updatedAt,
        subjects.id,
        subjects.name,
        subjects.code,
        subjects.description,
        subjects.departmentId,
        subjects.createdAt,
        subjects.updatedAt,
        teacherTable.id,
        teacherTable.name,
        teacherTable.email,
        teacherTable.role,
        teacherTable.image,
        teacherTable.imageCldPubId,
        teacherTable.emailVerified,
        teacherTable.createdAt,
        teacherTable.updatedAt,
      )
      .orderBy(desc(classes.createdAt))
      .limit(limit)
      .offset(offset);

    const data = classesList.map((c) =>
      enrichClass(c, Number(c.enrollmentCount ?? 0)),
    );

    res.status(200).json({
      data,
      pagination: paginationMeta(page, limit, totalCount),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
};

export const getClassDetails = async (req: Request, res: Response) => {
  const classID = Number(req.params.id);

  if (!Number.isFinite(classID))
    return res.status(400).json({ error: "Invalid class ID" });

  const [classDetails] = await db
    .select({
      ...getColumns(classes),
      subject: { ...getColumns(subjects) },
      department: { ...getColumns(departments) },
      teacher: { ...getColumns(user) },
      enrollmentCount: sql<number>`count(distinct ${enrollments.id})`,
    })
    .from(classes)
    .leftJoin(subjects, eq(classes.subjectId, subjects.id))
    .leftJoin(user, eq(classes.teacherId, user.id))
    .leftJoin(departments, eq(subjects.departmentId, departments.id))
    .leftJoin(enrollments, eq(enrollments.classId, classes.id))
    .where(eq(classes.id, classID))
    .groupBy(
      classes.id,
      classes.subjectId,
      classes.teacherId,
      classes.inviteCode,
      classes.name,
      classes.bannerCldPubId,
      classes.bannerUrl,
      classes.description,
      classes.capacity,
      classes.status,
      classes.schedules,
      classes.createdAt,
      classes.updatedAt,
      subjects.id,
      subjects.name,
      subjects.code,
      subjects.description,
      subjects.departmentId,
      subjects.createdAt,
      subjects.updatedAt,
      departments.id,
      departments.name,
      departments.code,
      departments.description,
      departments.createdAt,
      departments.updatedAt,
      user.id,
      user.name,
      user.email,
      user.role,
      user.image,
      user.imageCldPubId,
      user.emailVerified,
      user.createdAt,
      user.updatedAt,
    );

  if (!classDetails)
    return res
      .status(404)
      .json({ error: `Class with ID: ${classID} Not Found` });

  // Teachers can only view their own classes. Students can browse class details
  // before enrolling, while enrollment data remains protected separately.
  if (req.user?.role === "teacher" && classDetails.teacherId !== req.user.id) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  const enrollmentCount = Number(classDetails.enrollmentCount ?? 0);

  res.status(200).json({
    data: enrichClass(classDetails, enrollmentCount),
  });
};

export const createClass = async (req: Request, res: Response) => {
  if (req.user?.role === "student") {
    return res.status(403).json({ error: "Students cannot create classes" });
  }

  try {
    const teacherId =
      req.user?.role === "teacher" ? req.user.id : req.body.teacherId;

    const [createdClass] = await db
      .insert(classes)
      .values({
        ...req.body,
        teacherId,
        inviteCode: generateInviteCode(),
        schedules: req.body.schedules ?? [],
      })
      .returning();

    if (!createdClass) throw Error("Missing class info — cannot create class");

    await logActivity({
      actorId: req.user!.id,
      action: "created",
      entityType: "class",
      entityId: createdClass.id,
      metadata: { name: req.body.name },
    });

    res.status(201).json({ data: createdClass });
  } catch (error) {
    console.error(`POST /classes error: ${error}`);
    res.status(500).json({ error: String(error) });
  }
};

export const updateClass = async (req: Request, res: Response) => {
  const classID = Number(req.params.id);
  if (!Number.isFinite(classID)) {
    return res.status(400).json({ error: "Invalid class ID" });
  }

  const [existing] = await db
    .select()
    .from(classes)
    .where(eq(classes.id, classID));

  if (!existing) {
    return res.status(404).json({ error: "Class not found" });
  }

  if (req.user?.role === "teacher" && existing.teacherId !== req.user.id) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  if (req.user?.role === "student") {
    return res.status(403).json({ error: "Students cannot update classes" });
  }

  try {
    const updateData = { ...req.body };
    delete updateData.inviteCode;

    if (req.user?.role === "teacher") {
      delete updateData.teacherId;
    }

    const [updated] = await db
      .update(classes)
      .set(updateData)
      .where(eq(classes.id, classID))
      .returning();

    await logActivity({
      actorId: req.user!.id,
      action: "updated",
      entityType: "class",
      entityId: classID,
    });

    res.status(200).json({ data: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
};

export const deleteClass = async (req: Request, res: Response) => {
  const classID = Number(req.params.id);
  if (!Number.isFinite(classID)) {
    return res.status(400).json({ error: "Invalid class ID" });
  }

  const [existing] = await db
    .select()
    .from(classes)
    .where(eq(classes.id, classID));

  if (!existing) {
    return res.status(404).json({ error: "Class not found" });
  }

  if (req.user?.role === "teacher" && existing.teacherId !== req.user.id) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  if (req.user?.role === "student") {
    return res.status(403).json({ error: "Students cannot delete classes" });
  }

  const [deleted] = await db
    .delete(classes)
    .where(eq(classes.id, classID))
    .returning();

  await logActivity({
    actorId: req.user!.id,
    action: "deleted",
    entityType: "class",
    entityId: classID,
  });

  res.status(200).json({ data: deleted });
};

export const regenerateInviteCode = async (req: Request, res: Response) => {
  const classID = Number(req.params.id);
  if (!Number.isFinite(classID)) {
    return res.status(400).json({ error: "Invalid class ID" });
  }

  const [existing] = await db
    .select()
    .from(classes)
    .where(eq(classes.id, classID));

  if (!existing) {
    return res.status(404).json({ error: "Class not found" });
  }

  if (req.user?.role === "teacher" && existing.teacherId !== req.user.id) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  if (req.user?.role === "student") {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  const newCode = generateInviteCode();
  const [updated] = await db
    .update(classes)
    .set({ inviteCode: newCode })
    .where(eq(classes.id, classID))
    .returning();

  await logActivity({
    actorId: req.user!.id,
    action: "updated",
    entityType: "class",
    entityId: classID,
    metadata: { action: "regenerate_invite" },
  });

  res.status(200).json({ data: updated });
};
