import { and, desc, eq, getColumns, ilike, or, sql } from "drizzle-orm";
import db from "../database";
import { classes, departments, subjects, user } from "../database/schema";
import { Request, Response } from "express";

const escapeLike = (input: string) => input.replace(/([%_\\])/g, "\\$1");

export const getAllDepartments = async (req: Request, res: Response) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const currentPage = Math.max(1, parseInt(String(page), 10) || 1);
    const limitPerPage = Math.min(100, parseInt(String(limit), 10) || 10);
    const offset = (currentPage - 1) * limitPerPage;

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
      .limit(limitPerPage)
      .offset(offset);

    res.status(200).json({
      data: departmentsList,
      pagination: {
        page: currentPage,
        limit: limitPerPage,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitPerPage),
      },
    });
  } catch (error) {
    console.error(`Can't Get /Departments:`, error);
    res.status(500).json({ error: String(error) });
  }
};
