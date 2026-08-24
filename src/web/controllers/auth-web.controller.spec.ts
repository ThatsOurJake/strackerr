import type { Response } from "express";
import type { AuthenticatedUser } from "../../modules/auth/authenticated-user.interface";
import type { UsersService } from "../../modules/users/users.service";
import { AuthWebController } from "./auth-web.controller";

jest.mock("@paralleldrive/cuid2", () => ({
  createId: jest.fn(() => "mock-cuid-id"),
}));

const authenticatedUser: AuthenticatedUser = {
  userId: "user-1",
  username: "tester",
  isAdmin: false,
};

const createResponse = (user?: AuthenticatedUser) => ({
  req: { user },
  redirect: jest.fn(),
  render: jest.fn(),
});

describe("AuthWebController", () => {
  let findAll: jest.Mock;
  let controller: AuthWebController;

  beforeEach(() => {
    findAll = jest.fn();
    controller = new AuthWebController({ findAll } as unknown as UsersService);
  });

  it("shows registration from login only before the first user exists", async () => {
    findAll.mockResolvedValue([]);
    const response = createResponse();

    await controller.getLogin("bad login", response as unknown as Response);

    expect(response.render).toHaveBeenCalledWith("login", {
      title: "Login",
      showRegisterLink: true,
      error: "bad login",
    });
  });

  it("redirects authenticated users away from login", async () => {
    findAll.mockResolvedValue([{ id: "user-1" }]);
    const response = createResponse(authenticatedUser);

    await controller.getLogin(undefined, response as unknown as Response);

    expect(response.redirect).toHaveBeenCalledWith("/");
    expect(response.render).not.toHaveBeenCalled();
  });

  it("redirects registration to login after any user exists", async () => {
    findAll.mockResolvedValue([{ id: "user-1" }]);
    const response = createResponse();

    await controller.getRegister(response as unknown as Response);

    expect(response.redirect).toHaveBeenCalledWith("/login");
  });

  it("redirects an authenticated first user away from registration", async () => {
    findAll.mockResolvedValue([]);
    const response = createResponse(authenticatedUser);

    await controller.getRegister(response as unknown as Response);

    expect(response.redirect).toHaveBeenCalledWith("/");
  });

  it("renders registration for an unauthenticated first visitor", async () => {
    findAll.mockResolvedValue([]);
    const response = createResponse();

    await controller.getRegister(response as unknown as Response);

    expect(response.render).toHaveBeenCalledWith("register", { title: "Register" });
  });
});
