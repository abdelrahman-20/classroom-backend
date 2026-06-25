import { and, desc, eq, getTableColumns, ilike, or, sql } from "drizzle-orm";
import { Router } from "express";
import { departments, subjects } from "../db/schema/schema";
import { db } from "../db/db";

const subjectsRouter = Router();

// Get All Subjects with Optional Search, Filtering, and Pagination
subjectsRouter.get("/", async (req, res) => {
  try {
    const { search, department, page = 1, limit = 10 } = req.query;

    const currentPage = Math.max(1, +page);
    const limitPerPage = Math.max(1, +limit);
    const offset = (currentPage - 1) * limitPerPage;

    const filterConditions = [];

    // If Search Query Exists => Filter By Subject Name or Code
    if (search) {
      filterConditions.push(
        or(
          ilike(subjects.name, `%${search}%`),
          ilike(subjects.code, `%${search}%`),
        ),
      );
    }

    // If Department Exists => Filter By Department Name
    if (department) {
      filterConditions.push(ilike(departments.name, `%${department}%`));
    }

    // Combine All Filters
    const whereClause =
      filterConditions.length > 0 ? and(...filterConditions) : undefined;

    const countResults = await db
      .select({ count: sql<number>`count(*)` })
      .from(subjects)
      .leftJoin(departments, eq(subjects.departmentID, departments.id))
      .where(whereClause);

    const totalCount = Number(countResults[0]?.count) ?? 0;

    const subjectsList = await db
      .select({
        ...getTableColumns(subjects),
        department: { ...getTableColumns(departments) },
      })
      .from(subjects)
      .leftJoin(departments, eq(subjects.departmentID, departments.id))
      .where(whereClause)
      .orderBy(desc(subjects.createdAt))
      .limit(limitPerPage)
      .offset(offset);

    res.status(200).json({
      msg: "This Route To Get All Subjects",
      data: subjectsList,
      pagination: {
        page: currentPage,
        limit: limitPerPage,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitPerPage),
      },
    });
  } catch (error) {
    console.log(`Get /subjects error: ${error}`);
    res.status(500).json({ message: "Failed To Get Subjects" });
  }
});

export default subjectsRouter;
