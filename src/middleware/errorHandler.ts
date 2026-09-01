import { NextFunction, Request, Response } from "express";

function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  console.log(err);

  const status =
    err?.status && Number(err.status) >= 400 ? Number(err.status) : 500;
  const message = err?.message || "Internal Server Error";

  const payload: any = { error: message };
  if (process.env.NODE_ENV === "development") payload.details = err;

  res.status(status).json(payload);
}

export default errorHandler;
