import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { env } from '../config/env';
import { AppError } from '../shared/types';

export interface JwtPayload {
  sub: string;
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
