import { Role } from './roles';

export interface AuthTokenPayload {
  userId: number;
  role: Role;
}

// Augment Express's Request with the authenticated user set by auth.middleware.
declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

export {};
