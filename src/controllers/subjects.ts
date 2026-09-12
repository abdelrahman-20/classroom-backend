import { and, desc, eq, getColumns, ilike, or, sql } from "drizzle-orm";
import { Request, Response } from "express";
import db from "../database";
import { classes, departments, subjects } from "../database/schema";
import { logActivity } from "../lib/activity";
import { escapeLike, paginationMeta, parsePagination } from "../lib/pagination";

export const getAllSubjects = async (req: Request, res: Response) => {
  try {
    const { search, department } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    const filterConditions: ReturnType<typeof and>[] = [];

    if (search) {
      const s = escapeLike(String(search));
      filterConditions.push(
        or(ilike(subjects.code, `%${s}%`), ilike(subjects.name, `%${s}%`))!,
      );
    }

    if (department) {
      const d = escapeLike(String(department).trim());
      filterConditions.push(ilike(departments.name, `%${d}%`)!);
    }

    const whereClauses =
      filterConditions.length > 0 ? and(...filterConditions) : undefined;

    const countResults = await db
      .select({ count: sql<number>`count(*)` })
      .from(subjects)
      .leftJoin(departments, eq(subjects.departmentId, departments.id))
      .where(whereClauses);

    const totalCount = countResults[0]?.count ?? 0;

    const subjectsList = await db
      .select({
        ...getColumns(subjects),
        department: { ...getColumns(departments) },
      })
      .from(subjects)
      .leftJoin(departments, eq(subjects.departmentId, departments.id))
      .where(whereClauses)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(subjects.createdAt));

    res.status(200).json({
      data: subjectsList,
      pagination: paginationMeta(page, limit, totalCount),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
};

export const getSubjectById = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "Invalid subject ID" });
  }

  const [subject] = await db
    .select({
      ...getColumns(subjects),
      department: { ...getColumns(departments) },
    })
    .from(subjects)
    .leftJoin(departments, eq(subjects.departmentId, departments.id))
    .where(eq(subjects.id, id));

  if (!subject) {
    return res.status(404).json({ error: "Subject not found" });
  }

  res.status(200).json({ data: subject });
};

export const createSubject = async (req: Request, res: Response) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Only admins can create subjects" });
  }

  try {
    const { name, code, description, departmentId } = req.body;
    const [created] = await db
      .insert(subjects)
      .values({ name, code, description, departmentId })
      .returning();

    await logActivity({
      actorId: req.user.id,
      action: "created",
      entityType: "subject",
      entityId: created.id,
      metadata: { name, code },
    });

    res.status(201).json({ data: created });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
};

export const updateSubject = async (req: Request, res: Response) => {
  if (req.user?.role !== "admin" && req.user?.role !== "teacher") {
    return res
      .status(403)
      .json({ error: "Only admins and teachers can update subjects" });
  }

  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "Invalid subject ID" });
  }

  try {
    const { name, code, description, departmentId } = req.body;
    const [updated] = await db
      .update(subjects)
      .set({ name, code, description, departmentId })
      .where(eq(subjects.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Subject not found" });
    }

    await logActivity({
      actorId: req.user!.id,
      action: "updated",
      entityType: "subject",
      entityId: id,
    });

    res.status(200).json({ data: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
};

export const deleteSubject = async (req: Request, res: Response) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Only admins can delete subjects" });
  }

  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "Invalid subject ID" });
  }

  const [classCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(classes)
    .where(eq(classes.subjectId, id));

  if ((classCount?.count ?? 0) > 0) {
    return res.status(409).json({
      error: `Cannot delete subject — ${classCount.count} class(es) linked`,
      classCount: classCount.count,
    });
  }

  const [deleted] = await db
    .delete(subjects)
    .where(eq(subjects.id, id))
    .returning();

  if (!deleted) {
    return res.status(404).json({ error: "Subject not found" });
  }

  await logActivity({
    actorId: req.user!.id,
    action: "deleted",
    entityType: "subject",
    entityId: id,
  });

  res.status(200).json({ data: deleted });
};
