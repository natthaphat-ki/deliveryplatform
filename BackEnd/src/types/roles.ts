// Domain roles shared across the system (mirrors the `roles` table).
export type Role = 'customer' | 'delivery' | 'admin';

export const ROLES: Role[] = ['customer', 'delivery', 'admin'];
