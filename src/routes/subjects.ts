import { and, desc, eq, getTableColumns, ilike, or, sql } from "drizzle-orm";
import { Router } from "express";
import { departments, subjects } from "../db/schema/schema";
import { db } from "../db/db";

const subjectsRouter = Router();

// Get All Subjects with Optional Search, Filtering, and Pagination
subjectsRouter.get("/", async (req, res) => {
  try {
    // const { search, department, page = 1, limit = 10 } = req.query;
    // const currentPage = Math.max(1, +page);
    // const limitPerPage = Math.max(1, +limit);

    const { search, department, page = "1", limit = "10" } = req.query;
    const MAX_LIMIT = 100;

    const parsedPage =
      typeof page === "string"
        ? Number(page)
        : Number(Array.isArray(page) ? page[0] : NaN);
    const parsedLimit =
      typeof limit === "string"
        ? Number(limit)
        : Number(Array.isArray(limit) ? limit[0] : NaN);

    const currentPage =
      Number.isFinite(parsedPage) && parsedPage > 0
        ? Math.floor(parsedPage)
        : 1;
    const limitPerPage =
      Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(MAX_LIMIT, Math.floor(parsedLimit))
        : 10;

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
      const departmentValue =
        typeof department === "string"
          ? department
          : Array.isArray(department)
            ? typeof department[0] === "string"
              ? department[0]
              : ""
            : "";

      // Escape Special Characters in Department Value to Prevent SQL Injection
      const escapedDepartment = departmentValue.replace(/[%_\\]/g, "\\$1");
      filterConditions.push(ilike(departments.name, `%${escapedDepartment}%`));
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
        totalPages: Math.ceil(totalCount / limitPerPage),
        limit: limitPerPage,
        total: totalCount,
      },
    });
  } catch (error) {
    console.log(`Get /subjects error: ${error}`);
    res.status(500).json({ message: "Failed To Get Subjects" });
  }
});

export default subjectsRouter;
