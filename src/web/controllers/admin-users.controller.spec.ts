import type { Response } from "express";
import type { AuthenticatedUser } from "../../modules/auth/authenticated-user.interface";
import type { UsersService } from "../../modules/users/users.service";
import { AdminWebController } from "./admin-users.controller";

jest.mock("@paralleldrive/cuid2", () => ({
  createId: jest.fn(() => "mock-cuid-id"),
}));

const admin: AuthenticatedUser = { userId: "admin-1", username: "admin", isAdmin: true };

describe("AdminWebController", () => {
  let usersService: {
    findAll: jest.Mock;
    createByAdmin: jest.Mock;
    delete: jest.Mock;
    changePassword: jest.Mock;
  };
  let controller: AdminWebController;
  let response: { render: jest.Mock; redirect: jest.Mock; status: jest.Mock };

  beforeEach(() => {
    usersService = {
      findAll: jest.fn().mockResolvedValue([{ id: "user-1" }]),
      createByAdmin: jest.fn(),
      delete: jest.fn(),
      changePassword: jest.fn(),
    };
    controller = new AdminWebController(usersService as unknown as UsersService);
    response = {
      render: jest.fn(),
      redirect: jest.fn(),
      status: jest.fn(),
    };
    response.status.mockReturnValue(response);
  });

  it("lists users with the current admin ID", async () => {
    await controller.listUsers("saved", response as unknown as Response, admin);

    expect(response.render).toHaveBeenCalledWith("admin/users", {
      title: "Manage Users",
      users: [{ id: "user-1" }],
      currentUserId: "admin-1",
      success: "saved",
    });
  });

  it("creates a user and redirects with an encoded confirmation", async () => {
    usersService.createByAdmin.mockResolvedValue({ username: "Jane Doe" });

    await controller.createUser(
      { username: "Jane Doe", password: "password" },
      response as unknown as Response,
    );

    expect(usersService.createByAdmin).toHaveBeenCalledWith("Jane Doe", "password");
    expect(response.redirect).toHaveBeenCalledWith(
      "/admin/users?success=User%20Jane%20Doe%20created%20successfully",
    );
  });

  it("renders creation errors with the current user list", async () => {
    usersService.createByAdmin.mockRejectedValue(new Error("Username exists"));

    await controller.createUser(
      { username: "taken", password: "password" },
      response as unknown as Response,
    );

    expect(response.render).toHaveBeenCalledWith("admin/users", {
      title: "Manage Users",
      users: [{ id: "user-1" }],
      error: "Username exists",
    });
  });

  it("prevents an admin from deleting their own account", async () => {
    await controller.deleteUser("admin-1", response as unknown as Response, admin);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(usersService.delete).not.toHaveBeenCalled();
    expect(response.render).toHaveBeenCalledWith("admin/users", expect.objectContaining({
      error: "Cannot delete your own account",
    }));
  });

  it("deletes another user", async () => {
    await controller.deleteUser("user-2", response as unknown as Response, admin);

    expect(usersService.delete).toHaveBeenCalledWith("user-2");
    expect(response.render).toHaveBeenCalledWith("admin/users", expect.objectContaining({
      success: "User deleted successfully",
    }));
  });

  it("changes another user's password", async () => {
    await controller.changePassword(
      "user-2",
      { newPassword: "new-password" },
      response as unknown as Response,
    );

    expect(usersService.changePassword).toHaveBeenCalledWith("user-2", "new-password");
    expect(response.render).toHaveBeenCalledWith("admin/users", expect.objectContaining({
      success: "Password changed successfully",
    }));
  });
});
