import { UnauthorizedException } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

const isUserAuthorized = (roles: String[]) => {
  return (req: Request, res: Response, next: NextFunction): NextFunction | void => {
    if (!roles.includes(req['user'].role)) {
        throw new UnauthorizedException('User does not have the required role')
    }
    next();
  }
}

export default isUserAuthorized;