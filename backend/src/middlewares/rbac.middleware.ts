import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { sendForbidden } from '../utils/response.util';

type RoleType = 'ADMIN' | 'MEMBER';

export const requireRole = (...roles: RoleType[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role as RoleType | undefined;
    if (!userRole || !roles.includes(userRole)) {
      sendForbidden(res, `Required role: ${roles.join(' or ')}`);
      return;
    }
    next();
  };
};
