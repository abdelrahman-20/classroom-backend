import { and, desc, eq, getColumns, ilike, or, sql } from "drizzle-orm";
import { Request, Response } from "express";
import db from "../database";
import { classes, departments, subjects, user } from "../database/schema";
import { logActivity } from "../lib/activity";
import { escapeLike, paginationMeta, parsePagination } from "../lib/pagination";

export const getAllDepartments = async (req: Request, res: Response) => {
  try {
    const { search } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    const filterConditions = [];
    if (search) {
      const value = escapeLike(String(search).trim());
      filterConditions.push(
        or(
          ilike(departments.name, `%${value}%`),
          ilike(departments.code, `%${value}%`),
          ilike(departments.description, `%${value}%`),
        ),
      );
    }

    const whereClauses =
      filterConditions.length > 0 ? and(...filterConditions) : undefined;

    const countResults = await db
      .select({ count: sql<number>`count(*)` })
      .from(departments)
      .where(whereClauses);

    const totalCount = countResults[0]?.count ?? 0;
    const departmentColumns = getColumns(departments);

    const departmentsList = await db
      .select({
        ...departmentColumns,
        subjectCount: sql<number>`count(distinct ${subjects.id})`,
        teacherCount: sql<number>`count(distinct ${user.id})`,
      })
      .from(departments)
      .leftJoin(subjects, eq(subjects.departmentId, departments.id))
      .leftJoin(classes, eq(classes.subjectId, subjects.id))
      .leftJoin(user, eq(classes.teacherId, user.id))
      .where(whereClauses)
      .groupBy(
        departments.id,
        departments.name,
        departments.code,
        departments.description,
        departments.createdAt,
        departments.updatedAt,
      )
      .orderBy(desc(departments.createdAt))
      .limit(limit)
      .offset(offset);

    res.status(200).json({
      data: departmentsList,
      pagination: paginationMeta(page, limit, totalCount),
    });
  } catch (error) {
    console.error(`Can't Get /Departments:`, error);
    res.status(500).json({ error: String(error) });
  }
};

export const getDepartmentById = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "Invalid department ID" });
  }

  const [department] = await db
    .select({
      ...getColumns(departments),
      subjectCount: sql<number>`count(distinct ${subjects.id})`,
    })
    .from(departments)
    .leftJoin(subjects, eq(subjects.departmentId, departments.id))
    .where(eq(departments.id, id))
    .groupBy(
      departments.id,
      departments.name,
      departments.code,
      departments.description,
      departments.createdAt,
      departments.updatedAt,
    );

  if (!department) {
    return res.status(404).json({ error: "Department not found" });
  }

  res.status(200).json({ data: department });
};

export const createDepartment = async (req: Request, res: Response) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Only admins can create departments" });
  }

  try {
    const { name, code, description } = req.body;
    const [created] = await db
      .insert(departments)
      .values({ name, code, description })
      .returning();

    await logActivity({
      actorId: req.user.id,
      action: "created",
      entityType: "department",
      entityId: created.id,
      metadata: { name },
    });

    res.status(201).json({ data: created });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
};

export const updateDepartment = async (req: Request, res: Response) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Only admins can update departments" });
  }

  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "Invalid department ID" });
  }

  try {
    const { name, code, description } = req.body;
    const [updated] = await db
      .update(departments)
      .set({ name, code, description })
      .where(eq(departments.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Department not found" });
    }

    await logActivity({
      actorId: req.user!.id,
      action: "updated",
      entityType: "department",
      entityId: id,
    });

    res.status(200).json({ data: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
};

export const deleteDepartment = async (req: Request, res: Response) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Only admins can delete departments" });
  }

  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "Invalid department ID" });
  }

  const [subjectCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(subjects)
    .where(eq(subjects.departmentId, id));

  if ((subjectCount?.count ?? 0) > 0) {
    return res.status(409).json({
      error: `Cannot delete department — ${subjectCount.count} subject(s) linked`,
      subjectCount: subjectCount.count,
    });
  }

  const [deleted] = await db
    .delete(departments)
    .where(eq(departments.id, id))
    .returning();

  if (!deleted) {
    return res.status(404).json({ error: "Department not found" });
  }

  await logActivity({
    actorId: req.user!.id,
    action: "deleted",
    entityType: "department",
    entityId: id,
  });

  res.status(200).json({ data: deleted });
};
