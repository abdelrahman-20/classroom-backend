import express from "express";
import { and, desc, eq, getColumns, ilike, or, sql } from "drizzle-orm";
import { departments, subjects } from "../database/schema/schema";
import db from "../database";

const subjectsRouter = express.Router();

// Escape user input for SQL LIKE/ILIKE patterns to reduce injection/abuse risk
const escapeLike = (input: string) => input.replace(/([%_\\])/g, "\\$1");

subjectsRouter.get("/", async (req: express.Request, res: express.Response) => {
  try {
    const { search, department, page = 1, limit = 10 } = req.query;

    // Pagination & Offset
    const currentPage = Math.max(1, parseInt(String(page), 10) || 1);
    const limitPerPage = Math.min(100, parseInt(String(limit), 10) || 10);
    const offset = (currentPage - 1) * limitPerPage;

    // Filtering (safe)
    const filterConditions: any[] = [];

    if (search) {
      const s = escapeLike(String(search));
      filterConditions.push(
        or(ilike(subjects.code, `%${s}%`), ilike(subjects.name, `%${s}%`)),
      );
    }

    if (department) {
      const dept = String(department).trim();
      const d = escapeLike(dept);
      filterConditions.push(ilike(departments.name, `%${d}%`));

      // const dept = String(department).trim();
      // // Prefer exact numeric department id matching when a number is provided
      // if (/^\d+$/.test(dept)) {
      //   filterConditions.push(eq(departments.id, Number(dept)));
      // } else {
      //   const d = escapeLike(dept);
      //   filterConditions.push(ilike(departments.name, `%${d}%`));
      // }
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
        department: {
          ...getColumns(departments),
        },
      })
      .from(subjects)
      .leftJoin(departments, eq(subjects.departmentId, departments.id))
      .where(whereClauses)
      .limit(limitPerPage)
      .offset(offset)
      .orderBy(desc(subjects.createdAt));

    res.status(200).json({
      data: subjectsList,
      pagination: {
        page: currentPage,
        limit: limitPerPage,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitPerPage),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
});

export default subjectsRouter;
