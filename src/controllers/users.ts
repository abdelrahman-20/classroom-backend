import { and, desc, eq, getColumns, ilike, or, sql } from "drizzle-orm";
import { user } from "../database/schema/auth";
import db from "../database";
import { Request, Response } from "express";

const escapeLike = (input: string) => input.replace(/([%_\\])/g, "\\$1");

const getAllUsers = async (req: Request, res: Response) => {
  try {
    const { search, role, page = 1, limit = 10 } = req.query;

    const currentPage = Math.max(1, parseInt(String(page), 10) || 1);
    const limitPerPage = Math.min(100, parseInt(String(limit), 10) || 10);
    const offset = (currentPage - 1) * limitPerPage;

    const filterConditions: any[] = [];

    if (search) {
      const value = escapeLike(String(search));
      filterConditions.push(
        or(ilike(user.name, `%${value}%`), ilike(user.email, `%${value}%`)),
      );
    }

    if (role) {
      filterConditions.push(eq(user.role, role as any));
    }

    const whereClauses =
      filterConditions.length > 0 ? and(...filterConditions) : undefined;

    const countResults = await db
      .select({ count: sql<number>`count(*)` })
      .from(user)
      .where(whereClauses);

    const totalCount = countResults[0]?.count ?? 0;

    const usersList = await db
      .select({ ...getColumns(user) })
      .from(user)
      .where(whereClauses)
      .orderBy(desc(user.createdAt))
      .limit(limitPerPage)
      .offset(offset);

    res.status(200).json({
      data: usersList,
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
};

export default getAllUsers;
