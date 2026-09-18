import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from '../utils/apiError';
import { AuthTokenPayload } from '../types/express';

// Verifies the JWT from the Authorization header and attaches the payload to req.user.
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new ApiError(401, 'Missing or invalid Authorization header');
  }

  const token = header.slice('Bearer '.length);
  try {
    req.user = jwt.verify(token, env.jwt.secret) as AuthTokenPayload;
    next();
  } catch {
    throw new ApiError(401, 'Invalid or expired token');
  }
}
