import { and, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { Request, Response } from "express";
import db from "../database";
import {
  classes,
  departments,
  enrollments,
  subjects,
  user,
} from "../database/schema";
import { escapeLike } from "../lib/pagination";

export const globalSearch = async (req: Request, res: Response) => {
  const q = String(req.query.q ?? "").trim();
  if (!q || q.length < 2) {
    return res.status(200).json({ data: [] });
  }

  const pattern = `%${escapeLike(q)}%`;
  const role = req.user?.role ?? "student";
  const userId = req.user!.id;
  const limit = 5;

  try {
    const results: Array<{
      type: string;
      id: string | number;
      title: string;
      subtitle?: string;
      url: string;
    }> = [];

    if (role === "admin") {
      const users = await db
        .select({ id: user.id, name: user.name, email: user.email })
        .from(user)
        .where(or(ilike(user.name, pattern), ilike(user.email, pattern))!)
        .limit(limit);

      results.push(
        ...users.map((u) => ({
          type: "user",
          id: u.id,
          title: u.name,
          subtitle: u.email,
          url: `/users/show/${u.id}`,
        })),
      );

      const depts = await db
        .select({ id: departments.id, name: departments.name, code: departments.code })
        .from(departments)
        .where(
          or(
            ilike(departments.name, pattern),
            ilike(departments.code, pattern),
          )!,
        )
        .limit(limit);

      results.push(
        ...depts.map((d) => ({
          type: "department",
          id: d.id,
          title: d.name,
          subtitle: d.code,
          url: `/departments/show/${d.id}`,
        })),
      );
    }

    const subjectResults = await db
      .select({ id: subjects.id, name: subjects.name, code: subjects.code })
      .from(subjects)
      .where(or(ilike(subjects.name, pattern), ilike(subjects.code, pattern))!)
      .limit(limit);

    results.push(
      ...subjectResults.map((s) => ({
        type: "subject",
        id: s.id,
        title: s.name,
        subtitle: s.code,
        url: `/subjects/show/${s.id}`,
      })),
    );

    let classFilter = sql`(${ilike(classes.name, pattern)} OR ${ilike(classes.inviteCode, pattern)})`;

    if (role === "teacher") {
      classFilter = and(classFilter, eq(classes.teacherId, userId))!;
    } else if (role === "student") {
      const enrolled = await db
        .select({ classId: enrollments.classId })
        .from(enrollments)
        .where(eq(enrollments.studentId, userId));
      const ids = enrolled.map((e) => e.classId);
      if (ids.length === 0) {
        return res.status(200).json({ data: results });
      }
      classFilter = and(
        classFilter,
        inArray(classes.id, ids),
      )!;
    }

    const classResults = await db
      .select({ id: classes.id, name: classes.name, inviteCode: classes.inviteCode })
      .from(classes)
      .where(classFilter)
      .limit(limit);

    results.push(
      ...classResults.map((c) => ({
        type: "class",
        id: c.id,
        title: c.name,
        subtitle: c.inviteCode,
        url: `/classes/show/${c.id}`,
      })),
    );

    res.status(200).json({ data: results.slice(0, 20) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
};
