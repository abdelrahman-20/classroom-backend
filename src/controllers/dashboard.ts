import { and, desc, eq, gte, sql } from "drizzle-orm";
import { Request, Response } from "express";
import db from "../database";
import {
  activityLogs,
  classes,
  departments,
  enrollments,
  subjects,
  user,
} from "../database/schema";
import { getCapacityStatus } from "../lib/capacity";

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const role = req.user?.role ?? "student";
    const userId = req.user!.id;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let classFilter = sql`true`;
    if (role === "teacher") {
      classFilter = eq(classes.teacherId, userId);
    } else if (role === "student") {
      classFilter = sql`${classes.id} IN (SELECT class_id FROM enrollments WHERE student_id = ${userId})`;
    }

    const [userCount] =
      role === "admin"
        ? await db.select({ count: sql<number>`count(*)` }).from(user)
        : [{ count: 1 }];

    const [classCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(classes)
      .where(classFilter);

    const [enrollmentCount] =
      role === "student"
        ? await db
            .select({ count: sql<number>`count(*)` })
            .from(enrollments)
            .where(eq(enrollments.studentId, userId))
        : role === "teacher"
          ? await db
              .select({ count: sql<number>`count(*)` })
              .from(enrollments)
              .innerJoin(classes, eq(enrollments.classId, classes.id))
              .where(eq(classes.teacherId, userId))
          : await db
              .select({ count: sql<number>`count(*)` })
              .from(enrollments);

    const [deptCount] =
      role === "admin"
        ? await db.select({ count: sql<number>`count(*)` }).from(departments)
        : [{ count: 0 }];

    const enrollmentTrends = await db
      .select({
        date: sql<string>`date(${enrollments.createdAt})`,
        count: sql<number>`count(*)`,
      })
      .from(enrollments)
      .innerJoin(classes, eq(enrollments.classId, classes.id))
      .where(
        and(gte(enrollments.createdAt, thirtyDaysAgo), classFilter),
      )
      .groupBy(sql`date(${enrollments.createdAt})`)
      .orderBy(sql`date(${enrollments.createdAt})`);

    const classesByDept =
      role === "admin" || role === "teacher"
        ? await db
            .select({
              department: departments.name,
              count: sql<number>`count(distinct ${classes.id})`,
            })
            .from(classes)
            .innerJoin(subjects, eq(classes.subjectId, subjects.id))
            .innerJoin(departments, eq(subjects.departmentId, departments.id))
            .where(classFilter)
            .groupBy(departments.name)
        : [];

    const classCapacities = await db
      .select({
        id: classes.id,
        capacity: classes.capacity,
        enrollmentCount: sql<number>`count(${enrollments.id})`,
      })
      .from(classes)
      .leftJoin(enrollments, eq(enrollments.classId, classes.id))
      .where(classFilter)
      .groupBy(classes.id, classes.capacity);

    const capacityBuckets = { ok: 0, warning: 0, full: 0 };
    for (const c of classCapacities) {
      const status = getCapacityStatus(
        Number(c.enrollmentCount ?? 0),
        c.capacity,
      );
      capacityBuckets[status]++;
    }

    const userDistribution =
      role === "admin"
        ? await db
            .select({
              role: user.role,
              count: sql<number>`count(*)`,
            })
            .from(user)
            .groupBy(user.role)
        : [];

    const recentActivity = await db
      .select({
        id: activityLogs.id,
        action: activityLogs.action,
        entityType: activityLogs.entityType,
        entityId: activityLogs.entityId,
        metadata: activityLogs.metadata,
        createdAt: activityLogs.createdAt,
        actorName: user.name,
      })
      .from(activityLogs)
      .leftJoin(user, eq(activityLogs.actorId, user.id))
      .orderBy(desc(activityLogs.createdAt))
      .limit(20);

    const avgClassSize =
      classCapacities.length > 0
        ? classCapacities.reduce(
            (sum, c) => sum + Number(c.enrollmentCount ?? 0),
            0,
          ) / classCapacities.length
        : 0;

    const totalCapacity = classCapacities.reduce((s, c) => s + c.capacity, 0);
    const totalEnrolled = classCapacities.reduce(
      (s, c) => s + Number(c.enrollmentCount ?? 0),
      0,
    );
    const fillRate =
      totalCapacity > 0 ? (totalEnrolled / totalCapacity) * 100 : 0;

    res.status(200).json({
      data: {
        overview: {
          users: userCount?.count ?? 0,
          classes: classCount?.count ?? 0,
          enrollments: enrollmentCount?.count ?? 0,
          departments: deptCount?.count ?? 0,
        },
        enrollmentTrends,
        classesByDepartment: classesByDept,
        capacityStatus: capacityBuckets,
        userDistribution,
        activityFeed: recentActivity,
        metrics: {
          avgClassSize: Math.round(avgClassSize * 10) / 10,
          fillRate: Math.round(fillRate * 10) / 10,
          activeClasses: classCapacities.filter(
            (c) => Number(c.enrollmentCount ?? 0) > 0,
          ).length,
        },
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
};
