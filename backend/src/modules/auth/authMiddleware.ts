import type { NextFunction, Request, RequestHandler, Response } from "express";

import { errors } from "../../shared/errors";
import { getCurrentUserFromHeaders } from "./authService";
import type { AuthenticatedUser } from "./authTypes";
import { hasPermission } from "./rbac";

export type CurrentUserSession = {
  sessionId: string;
  user: AuthenticatedUser;
};

export type AuthenticatedRequest = Request & {
  currentUser?: CurrentUserSession;
};

export const requireCurrentUser: RequestHandler = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const current = await getCurrentUserFromHeaders(req.headers);
    if (!current) throw errors.unauthorized("login is required");
    (req as AuthenticatedRequest).currentUser = current;
    next();
  } catch (error) {
    next(error);
  }
};

export const requirePermission = (permission: string): RequestHandler => async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!(req as AuthenticatedRequest).currentUser) {
      await new Promise<void>((resolve, reject) => {
        requireCurrentUser(req, res, (error?: unknown) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }

    const current = (req as AuthenticatedRequest).currentUser;
    if (!current || !hasPermission(current.user, permission)) {
      throw errors.forbidden("permission is required", { permission });
    }

    next();
  } catch (error) {
    next(error);
  }
};

export function getRequiredCurrentUser(req: Request) {
  const current = (req as AuthenticatedRequest).currentUser;
  if (!current) throw errors.unauthorized("login is required");
  return current;
}
