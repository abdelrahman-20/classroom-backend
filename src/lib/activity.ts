import db from "../database";
import { activityLogs } from "../database/schema";

type LogActivityParams = {
  actorId?: string;
  action: string;
  entityType: string;
  entityId: string | number;
  metadata?: Record<string, unknown>;
};

export const logActivity = async ({
  actorId,
  action,
  entityType,
  entityId,
  metadata,
}: LogActivityParams) => {
  await db.insert(activityLogs).values({
    actorId: actorId ?? null,
    action,
    entityType,
    entityId: String(entityId),
    metadata,
  });
};
