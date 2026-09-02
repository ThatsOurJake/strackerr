import { ForbiddenException } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { csrfProtection } from "./csrf.middleware";

const createResponse = () => ({
  cookie: jest.fn(),
  locals: {},
}) as unknown as Response;

describe("csrfProtection", () => {
  it("issues a token for web page requests", () => {
    const request = { path: "/add", method: "GET", cookies: {} } as Request;
    const response = createResponse();
    const next = jest.fn();

    csrfProtection(request, response, next as unknown as NextFunction);

    expect(response.cookie).toHaveBeenCalledWith(
      "csrf_token",
      expect.any(String),
      expect.objectContaining({ httpOnly: false, sameSite: "strict", secure: false }),
    );
    expect(response.locals.csrfToken).toEqual(expect.any(String));
    expect(next).toHaveBeenCalledWith();
  });

  it("rejects a web POST with a mismatched token", () => {
    const request = {
      path: "/add",
      method: "POST",
      cookies: { csrf_token: "cookie-token" },
      body: { _csrf: "request-token" },
      header: jest.fn(),
    } as unknown as Request;
    const next = jest.fn();

    csrfProtection(request, createResponse(), next as unknown as NextFunction);

    expect(next.mock.calls[0][0]).toBeInstanceOf(ForbiddenException);
  });

  it("removes a valid form token before DTO validation", () => {
    const body = { _csrf: "matching-token", username: "jake" };
    const request = {
      path: "/auth/login",
      method: "POST",
      cookies: { csrf_token: "matching-token" },
      body,
      header: jest.fn(),
    } as unknown as Request;
    const next = jest.fn();

    csrfProtection(request, createResponse(), next as unknown as NextFunction);

    expect(body).toEqual({ username: "jake" });
    expect(next).toHaveBeenCalledWith();
  });

  it("does not apply to API routes", () => {
    const request = { path: "/api/v1/logs", method: "POST" } as Request;
    const next = jest.fn();

    csrfProtection(request, createResponse(), next as unknown as NextFunction);

    expect(next).toHaveBeenCalledWith();
  });
});
