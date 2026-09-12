import { randomUUID } from "crypto";
import { and, desc, eq, getColumns, ilike, or, sql } from "drizzle-orm";
import { user } from "../database/schema/auth";
import db from "../database";
import { Request, Response } from "express";
import { classes } from "../database/schema";
import { logActivity } from "../lib/activity";
import { escapeLike, paginationMeta, parsePagination } from "../lib/pagination";
import { UserRole } from "../type.d";

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const { search, role } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    const filterConditions: ReturnType<typeof eq>[] = [];

    if (search) {
      const value = escapeLike(String(search));
      filterConditions.push(
        or(ilike(user.name, `%${value}%`), ilike(user.email, `%${value}%`))!,
      );
    }

    if (role) {
      filterConditions.push(eq(user.role, role as UserRole));
    }

    // Teachers and students can only list themselves
    if (req.user?.role === "teacher" || req.user?.role === "student") {
      filterConditions.push(eq(user.id, req.user.id));
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
      .limit(limit)
      .offset(offset);

    res.status(200).json({
      data: usersList,
      pagination: paginationMeta(page, limit, totalCount),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  const { id } = req.params;

  // Validate ID is a string
  if (typeof id !== "string") {
    return res.status(400).json({ error: "Invalid ID" });
  }

  if (req.user?.role !== "admin" && req.user?.id !== id) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  const [found] = await db
    .select({ ...getColumns(user) })
    .from(user)
    .where(sql`${user.id} = ${id}`);

  if (!found) {
    return res.status(404).json({ error: "User not found" });
  }

  res.status(200).json({ data: found });
};

export const createUser = async (req: Request, res: Response) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Only admins can create users" });
  }

  try {
    const { name, email, role, image, imageCldPubId } = req.body;

    const [created] = await db
      .insert(user)
      .values({
        id: randomUUID(),
        name,
        email,
        role: role ?? "student",
        emailVerified: false,
        image,
        imageCldPubId,
      })
      .returning();

    await logActivity({
      actorId: req.user.id,
      action: "created",
      entityType: "user",
      entityId: created.id,
      metadata: { email, role },
    });

    res.status(201).json({ data: created });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  const { id } = req.params;

  // Validate ID is a string
  if (typeof id !== "string") {
    return res.status(400).json({ error: "Invalid ID" });
  }

  if (req.user?.role !== "admin" && req.user?.id !== id) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  try {
    const { name, email, role, image, imageCldPubId } = req.body;
    const updateData: Record<string, unknown> = {
      name,
      email,
      image,
      imageCldPubId,
    };

    // Only admin can change roles
    if (req.user?.role === "admin" && role) {
      updateData.role = role;
    }

    const [updated] = await db
      .update(user)
      .set(updateData)
      .where(sql`${user.id} = ${id}`)
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "User not found" });
    }

    await logActivity({
      actorId: req.user!.id,
      action: "updated",
      entityType: "user",
      entityId: id,
    });

    res.status(200).json({ data: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Only admins can delete users" });
  }

  const { id } = req.params;

  // Validate ID is a string
  if (typeof id !== "string") {
    return res.status(400).json({ error: "Invalid ID" });
  }

  if (req.user.id === id) {
    return res.status(409).json({ error: "Cannot delete your own account" });
  }

  const [classCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(classes)
    .where(sql`${classes.teacherId} = ${id}`);

  if ((classCount?.count ?? 0) > 0) {
    return res.status(409).json({
      error: `Cannot delete user — assigned as teacher on ${classCount.count} class(es)`,
      classCount: classCount.count,
    });
  }

  const [deleted] = await db
    .delete(user)
    .where(sql`${user.id} = ${id}`)
    .returning();

  if (!deleted) {
    return res.status(404).json({ error: "User not found" });
  }

  await logActivity({
    actorId: req.user.id,
    action: "deleted",
    entityType: "user",
    entityId: id,
  });

  res.status(200).json({ data: deleted });
};
