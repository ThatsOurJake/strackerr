import { randomBytes, timingSafeEqual } from "node:crypto";
import { ForbiddenException } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

const CSRF_COOKIE_NAME = "csrf_token";

const tokensMatch = (cookieToken: string, requestToken: string): boolean => {
  const cookieBuffer = Buffer.from(cookieToken);
  const requestBuffer = Buffer.from(requestToken);

  return (
    cookieBuffer.length === requestBuffer.length &&
    timingSafeEqual(cookieBuffer, requestBuffer)
  );
};

export const csrfProtection = (
  request: Request,
  response: Response,
  next: NextFunction,
): void => {
  if (request.path.startsWith("/api/")) {
    next();
    return;
  }

  const cookieToken = request.cookies?.[CSRF_COOKIE_NAME] as string | undefined;

  if (request.method === "POST") {
    const bodyToken = request.body?._csrf as string | undefined;
    const headerToken = request.header("X-CSRF-Token");
    const requestToken = bodyToken ?? headerToken;

    if (!cookieToken || !requestToken || !tokensMatch(cookieToken, requestToken)) {
      next(new ForbiddenException("Invalid CSRF token"));
      return;
    }

    if (request.body?._csrf !== undefined) {
      delete request.body._csrf;
    }
  }

  const csrfToken = cookieToken ?? randomBytes(32).toString("hex");
  if (!cookieToken) {
    response.cookie(CSRF_COOKIE_NAME, csrfToken, {
      httpOnly: false,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });
  }

  response.locals.csrfToken = csrfToken;
  next();
};
