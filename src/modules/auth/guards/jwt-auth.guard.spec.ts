import { ExecutionContext } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";

describe("JwtAuthGuard", () => {
	let guard: JwtAuthGuard;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [JwtAuthGuard],
		}).compile();

		guard = module.get<JwtAuthGuard>(JwtAuthGuard);
	});

	it("should be defined", () => {
		expect(guard).toBeDefined();
	});

	describe("handleRequest", () => {
		it("should redirect to /login when no user is provided", () => {
			const mockResponse = {
				redirect: jest.fn(),
			};

			const mockContext = {
				switchToHttp: jest.fn().mockReturnValue({
					getResponse: jest.fn().mockReturnValue(mockResponse),
				}),
			};

			guard.handleRequest(
				null,
				null,
				null,
				mockContext as unknown as ExecutionContext,
			);

			expect(mockResponse.redirect).toHaveBeenCalledWith("/login");
		});

		it("should return user when authentication succeeds", () => {
			const mockUser = {
				id: "user-1",
				userId: "user-1",
				username: "testuser",
				isAdmin: false,
			};

			const mockContext = {
				switchToHttp: jest.fn(),
			};

			const result = guard.handleRequest(
				null,
				mockUser,
				null,
				mockContext as unknown as ExecutionContext,
			);

			expect(result).toBe(mockUser);
		});

		it("should redirect to /login on JWT error", () => {
			const mockResponse = {
				redirect: jest.fn(),
			};

			const mockContext = {
				switchToHttp: jest.fn().mockReturnValue({
					getResponse: jest.fn().mockReturnValue(mockResponse),
				}),
			};

			const error = new Error("Invalid token");

			guard.handleRequest(
				error,
				null,
				null,
				mockContext as unknown as ExecutionContext,
			);

			expect(mockResponse.redirect).toHaveBeenCalledWith("/login");
		});
	});
});
