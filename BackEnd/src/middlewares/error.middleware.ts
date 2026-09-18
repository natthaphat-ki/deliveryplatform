import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/apiError';
import { env } from '../config/env';

// Centralized error handler; keep this as the last middleware registered in app.ts.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  const isApiError = err instanceof ApiError;
  const statusCode = isApiError ? err.statusCode : 500;
  const message = err instanceof Error ? err.message : 'Internal server error';

  if (!isApiError) {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(env.nodeEnv === 'development' && err instanceof Error ? { stack: err.stack } : {}),
  });
}
