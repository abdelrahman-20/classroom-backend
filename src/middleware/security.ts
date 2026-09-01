import { NextFunction, Request, Response } from "express";
import { RateLimitRole } from "../type";
import aj from "../config/arcjet";
import { ArcjetNodeRequest, slidingWindow } from "@arcjet/node";

const securityMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (process.env.NODE_ENV === "test") return next();

  try {
    const role: RateLimitRole = req.user?.role ?? "guest";
    let limit: number, message: string;

    switch (role) {
      case "admin":
        limit = 20;
        message =
          "Admin Request Limit Exceeded (20 Requests Per Minute), Slow Down!";
        break;

      case "teacher":
      case "student":
        limit = 10;
        message = "Request Limit Exceeded (10 Requests Per Minute), Slow Down!";
        break;

      default:
        limit = 5;
        message =
          "Request Limit Exceeded (5 Requests Per Minute), Please Sign-Up For Higher Limits";
        break;
    }

    const client = aj.withRule(
      slidingWindow({
        mode: "LIVE",
        interval: "1m",
        max: limit,
      }),
    );

    const arcjetRequest: ArcjetNodeRequest = {
      headers: req.headers,
      method: req.method,
      url: req.originalUrl ?? req.url,
    };

    const decision = await client.protect(arcjetRequest);

    if (decision.isDenied()) {
      if (decision.reason.isBot()) {
        return res.status(403).json({
          error: "Forbidden",
          message: "Bot activity detected. Access denied.",
        });
      }

      if (decision.reason.isRateLimit()) {
        return res.status(429).json({
          error: "Too Many Requests",
          message: message,
        });
      }

      return res.status(403).json({
        error: "Forbidden",
        message: "Request denied by security policy.",
      });
    }

    next();
  } catch (error) {
    console.error("Arcjet Middleware Error: ", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Something Went Wrong With The Security Middleware.",
    });
  }
};

export default securityMiddleware;
