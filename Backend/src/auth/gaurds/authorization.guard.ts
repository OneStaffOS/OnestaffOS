import { ForbiddenException } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

const isUserAuthorized = (roles: String[]) => {
  return (req: Request, res: Response, next: NextFunction): NextFunction | void => {
    if (!roles.includes(req['user'].role)) {
        throw new ForbiddenException('You do not have the required role to access this page')
    }
    next();
  }
}

export default isUserAuthorized;