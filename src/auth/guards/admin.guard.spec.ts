import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { UsersService } from "../../users/users.service";
import { AdminGuard } from "../guards/admin.guard";

jest.mock("@paralleldrive/cuid2", () => ({
	createId: jest.fn(() => "mock-cuid-id"),
}));

describe("AdminGuard", () => {
	let guard: AdminGuard;
	let usersService: UsersService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				AdminGuard,
				{
					provide: UsersService,
					useValue: {
						findById: jest.fn(),
					},
				},
			],
		}).compile();

		guard = module.get<AdminGuard>(AdminGuard);
		usersService = module.get<UsersService>(UsersService);
	});

	describe("canActivate", () => {
		it("should allow access when user is admin", async () => {
			const mockUser = {
				userId: "user-1",
				username: "admin",
				isAdmin: true,
			};

			const mockDbUser = {
				id: "user-1",
				username: "admin",
				isAdmin: true,
				passwordHash: "hashed",
				apiKey: "key-1",
				createdAt: new Date(),
			};

			jest.spyOn(usersService, "findById").mockResolvedValue(mockDbUser);

			const mockContext = {
				switchToHttp: jest.fn().mockReturnValue({
					getRequest: jest.fn().mockReturnValue({
						user: mockUser,
					}),
				}),
			};

			const result = await guard.canActivate(
				mockContext as unknown as ExecutionContext,
			);

			expect(result).toBe(true);
			expect(usersService.findById).toHaveBeenCalledWith("user-1");
		});

		it("should deny access when user is not admin", async () => {
			const mockUser = {
				userId: "user-1",
				username: "normaluser",
				isAdmin: false,
			};

			const mockDbUser = {
				id: "user-1",
				username: "normaluser",
				isAdmin: false,
				passwordHash: "hashed",
				apiKey: "key-1",
				createdAt: new Date(),
			};

			jest.spyOn(usersService, "findById").mockResolvedValue(mockDbUser);

			const mockContext = {
				switchToHttp: jest.fn().mockReturnValue({
					getRequest: jest.fn().mockReturnValue({
						user: mockUser,
					}),
				}),
			};

			await expect(
				guard.canActivate(mockContext as unknown as ExecutionContext),
			).rejects.toThrow(ForbiddenException);
		});

		it("should deny access when user not found in DB", async () => {
			const mockUser = {
				userId: "nonexistent",
				username: "ghost",
				isAdmin: true,
			};

			jest.spyOn(usersService, "findById").mockResolvedValue(null);

			const mockContext = {
				switchToHttp: jest.fn().mockReturnValue({
					getRequest: jest.fn().mockReturnValue({
						user: mockUser,
					}),
				}),
			};

			await expect(
				guard.canActivate(mockContext as unknown as ExecutionContext),
			).rejects.toThrow(ForbiddenException);
		});

		it("should re-query DB on every request (prevent JWT-based auth)", async () => {
			const mockUser = {
				userId: "user-1",
				username: "user",
				isAdmin: true, // JWT says admin, but DB will say otherwise
			};

			const mockDbUser = {
				id: "user-1",
				username: "user",
				isAdmin: false, // Admin was revoked in DB
				passwordHash: "hashed",
				apiKey: "key-1",
				createdAt: new Date(),
			};

			jest.spyOn(usersService, "findById").mockResolvedValue(mockDbUser);

			const mockContext = {
				switchToHttp: jest.fn().mockReturnValue({
					getRequest: jest.fn().mockReturnValue({
						user: mockUser,
					}),
				}),
			};

			// Should deny because DB says not admin, regardless of JWT
			await expect(
				guard.canActivate(mockContext as unknown as ExecutionContext),
			).rejects.toThrow(ForbiddenException);

			expect(usersService.findById).toHaveBeenCalled();
		});

		it("should throw when user not authenticated", async () => {
			const mockContext = {
				switchToHttp: jest.fn().mockReturnValue({
					getRequest: jest.fn().mockReturnValue({
						user: null,
					}),
				}),
			};

			await expect(
				guard.canActivate(mockContext as unknown as ExecutionContext),
			).rejects.toThrow(ForbiddenException);
		});
	});
});
