import { randomBytes } from "crypto";

export const generateInviteCode = () =>
  randomBytes(4).toString("hex").toUpperCase();
