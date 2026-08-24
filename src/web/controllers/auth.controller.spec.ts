import type { Response } from "express";
import type { AuthService } from "../../modules/auth/auth.service";
import type { UsersService } from "../../modules/users/users.service";
import { AuthController } from "./auth.controller";

jest.mock("@paralleldrive/cuid2", () => ({
  createId: jest.fn(() => "mock-cuid-id"),
}));

describe("AuthController", () => {
  let authService: { generateJwt: jest.Mock; validateUser: jest.Mock };
  let usersService: { create: jest.Mock };
  let controller: AuthController;
  let response: {
    cookie: jest.Mock;
    redirect: jest.Mock;
    clearCookie: jest.Mock;
  };

  beforeEach(() => {
    authService = { generateJwt: jest.fn().mockReturnValue("jwt-token"), validateUser: jest.fn() };
    usersService = { create: jest.fn() };
    controller = new AuthController(
      authService as unknown as AuthService,
      usersService as unknown as UsersService,
    );
    response = { cookie: jest.fn(), redirect: jest.fn(), clearCookie: jest.fn() };
    delete process.env.NODE_ENV;
  });

  it("registers a user, sets a secure auth cookie policy, and redirects home", async () => {
    usersService.create.mockResolvedValue({ id: "user-1", username: "tester", isAdmin: true });

    await controller.register(
      { username: "tester", password: "password" },
      response as unknown as Response,
    );

    expect(authService.generateJwt).toHaveBeenCalledWith("user-1", "tester", true);
    expect(response.cookie).toHaveBeenCalledWith("strackr_token", "jwt-token", {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    expect(response.redirect).toHaveBeenCalledWith("/");
  });

  it("does not issue a token for invalid login credentials", async () => {
    authService.validateUser.mockResolvedValue(null);

    await controller.login(
      { username: "tester", password: "wrong" },
      response as unknown as Response,
    );

    expect(authService.generateJwt).not.toHaveBeenCalled();
    expect(response.cookie).not.toHaveBeenCalled();
    expect(response.redirect).toHaveBeenCalledWith("/login?error=Invalid username or password");
  });

  it("sets the production secure flag for a valid login", async () => {
    process.env.NODE_ENV = "production";
    authService.validateUser.mockResolvedValue({ id: "user-1", username: "tester", isAdmin: false });

    await controller.login(
      { username: "tester", password: "password" },
      response as unknown as Response,
    );

    expect(response.cookie).toHaveBeenCalledWith(
      "strackr_token",
      "jwt-token",
      expect.objectContaining({ secure: true, httpOnly: true, sameSite: "strict" }),
    );
    expect(response.redirect).toHaveBeenCalledWith("/");
  });

  it("clears the auth cookie on logout", async () => {
    await controller.logout(response as unknown as Response);

    expect(response.clearCookie).toHaveBeenCalledWith("strackr_token");
    expect(response.redirect).toHaveBeenCalledWith("/login");
  });
});
