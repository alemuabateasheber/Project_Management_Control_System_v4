import type { Request } from 'express';

export interface RequestTenantContext {
  organizationId: string;
  membershipId: string;
  userId: string;
  permissions: readonly string[];
}

declare module 'express-serve-static-core' {
  interface Request {
    requestId?: string;
    pmcsUser?: RequestTenantContext;
  }
}

export type RequestWithId = Request;
