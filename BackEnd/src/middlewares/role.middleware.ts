import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/apiError';
import { Role } from '../types/roles';

// Restricts a route to one or more roles. Must run after authenticate().
export function authorize(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      throw new ApiError(403, 'You do not have permission to access this resource');
    }
    next();
  };
}
