import express, { Request, Response } from "express";
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
import { classes, subjects, user } from "../database/schema";
const escapeLike = (input: string) => input.replace(/([%_\\])/g, "\\$1");

export const getAllClasses = async (req: Request, res: Response) => {
  try {
    const { search, subject, teacher, page = 1, limit = 10 } = req.query;

    const currentPage = Math.max(1, parseInt(String(page), 10) || 1);
    const limitPerPage = Math.min(100, parseInt(String(limit), 10) || 10);
    const offset = (currentPage - 1) * limitPerPage;
    const teacherTable = aliasedTable(user, "teacher");
    const filterConditions: any[] = [];

    if (search) {
      const value = escapeLike(String(search));
      filterConditions.push(
        or(
          ilike(classes.name, `%${value}%`),
          ilike(classes.inviteCode, `%${value}%`),
        ),
      );
    }

    if (subject) {
      const value = escapeLike(String(subject).trim());
      filterConditions.push(ilike(subjects.name, `%${value}%`));
    }

    if (teacher) {
      const value = escapeLike(String(teacher).trim());
      filterConditions.push(ilike(teacherTable.name, `%${value}%`));
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
        subject: {
          ...getColumns(subjects),
        },
        teacher: {
          ...getColumns(teacherTable),
        },
      })
      .from(classes)
      .leftJoin(subjects, eq(classes.subjectId, subjects.id))
      .leftJoin(teacherTable, eq(classes.teacherId, teacherTable.id))
      .where(whereClauses)
      .orderBy(desc(classes.createdAt))
      .limit(limitPerPage)
      .offset(offset);

    res.status(200).json({
      data: classesList,
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

export const createClass = async (req: Request, res: Response) => {
  try {
    const [createdClass] = await db
      .insert(classes)
      .values({
        ...req.body,
        inviteCode: Math.random().toString(36).substring(2, 9),
        schedules: [],
      })
      .returning({ id: classes.id });

    if (!createdClass)
      throw Error("Messing Class Info !!, Can't Create The Class !!");

    res.status(201).json({
      data: createdClass,
    });
  } catch (error) {
    console.error(`POST /classes error: ${error}`);
    res.status(500).json({
      error,
    });
  }
};
