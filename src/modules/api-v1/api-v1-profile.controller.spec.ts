import { NotFoundException } from "@nestjs/common";
import type { Request } from "express";
import type { UsersService } from "../users/users.service";
import { ApiV1ProfileController } from "./api-v1-profile.controller";

jest.mock("@paralleldrive/cuid2", () => ({ createId: jest.fn() }));

describe("ApiV1ProfileController", () => {
  it("returns basic profile details for the authenticated api user", async () => {
    const findById = jest.fn().mockResolvedValue({
      id: "user-1",
      username: "john",
      isAdmin: true,
      createdAt: new Date("2026-09-21T10:00:00.000Z"),
    });
    const controller = new ApiV1ProfileController({ findById } as unknown as UsersService);

    const response = await controller.getProfile({ user: { userId: "user-1" } } as Request);

    expect(findById).toHaveBeenCalledWith("user-1");
    expect(response).toEqual({
      data: {
        id: "user-1",
        username: "john",
        isAdmin: true,
        createdAt: new Date("2026-09-21T10:00:00.000Z"),
      },
    });
  });

  it("returns not found when authenticated user cannot be loaded", async () => {
    const controller = new ApiV1ProfileController({
      findById: jest.fn().mockResolvedValue(null),
    } as unknown as UsersService);

    await expect(
      controller.getProfile({ user: { userId: "missing" } } as Request),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
