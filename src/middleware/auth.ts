import { fromNodeHeaders } from "better-auth/node";
import { NextFunction, Request, Response } from "express";
import { auth } from "../lib/auth";
import { UserRole } from "../type.d";

export const attachSession = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const headers = { ...req.headers };
    const cookies = headers.cookie?.split(";").map((cookie) => cookie.trim());
    const hasAuthToken = cookies?.some((cookie) =>
      cookie.startsWith("auth_token="),
    );

    // If the request has no auth_token but has the legacy authentication_token, we will use it to get the session.
    // const legacyToken = cookies
    //   ?.find((cookie) => cookie.startsWith("authentication_token="))
    //   ?.slice("authentication_token=".length);

    // if (!hasAuthToken && legacyToken) {
    //   headers.cookie = `auth_token=${legacyToken}`;
    // }

    const session = await auth.api.getSession({
      headers: fromNodeHeaders(headers),
    });

    if (session?.user) {
      req.user = {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: (session.user as { role?: UserRole }).role ?? "student",
      };
    }
  } catch {
    // Unauthenticated requests continue without req.user
    // Throwing No Error => Will allow public routes to be processed
  }

  next();
};

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user?.id) {
    return res.status(401).json({ error: "Authentication required !!" });
  }
  next();
};

export const requireRole =
  (...roles: UserRole[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Authentication required !!" });
    }

    if (!req.user.role || !roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: "Unauthorized, Insufficient permissions !!" });
    }

    next();
  };
