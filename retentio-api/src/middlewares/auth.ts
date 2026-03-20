import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { env } from '../config/env';
import { AppError } from '../shared/types';

/**
 * V2 JWT payload — multi-tenant aware
 *
 * sub            = user.id (global)
 * membership_id  = membership.id (per tenant)
 * tenant_id      = tenant.id
 * role           = role within that tenant
 */
export interface JwtPayload {
  sub: string;
  membership_id: string;
  tenant_id: string;
  email: string;
  name: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authGuard(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new AppError(401, 'Token não fornecido', 'AUTH_MISSING');
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    throw new AppError(401, 'Token inválido ou expirado', 'AUTH_INVALID');
  }
}

/**
 * Role guard — only allows specified roles within current tenant
 */
export function roleGuard(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError(401, 'Não autenticado', 'AUTH_MISSING');
    }
    if (!roles.includes(req.user.role)) {
      throw new AppError(403, 'Permissão insuficiente', 'FORBIDDEN');
    }
    next();
  };
}

/**
 * Convenience: extracts tenant_id from JWT for queries.
 * Throws if not authenticated.
 */
export function getTenantId(req: Request): string {
  if (!req.user?.tenant_id) {
    throw new AppError(401, 'Contexto de tenant ausente', 'TENANT_MISSING');
  }
  return req.user.tenant_id;
}

/**
 * Convenience: extracts membership_id from JWT.
 */
export function getMembershipId(req: Request): string {
  if (!req.user?.membership_id) {
    throw new AppError(401, 'Contexto de membership ausente', 'MEMBERSHIP_MISSING');
  }
  return req.user.membership_id;
}
