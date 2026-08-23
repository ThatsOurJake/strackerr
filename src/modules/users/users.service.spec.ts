import { ForbiddenException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { EncryptionService } from "./encryption.service";
import { UsersService } from "./users.service";

jest.mock("@paralleldrive/cuid2", () => ({
	createId: jest.fn(() => "mock-cuid-id"),
}));

describe("UsersService", () => {
	let service: UsersService;
	let prisma: PrismaService;
	let encryption: EncryptionService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				UsersService,
				{
					provide: PrismaService,
					useValue: {
						user: {
							count: jest.fn(),
							create: jest.fn(),
							findUnique: jest.fn(),
							findMany: jest.fn(),
							delete: jest.fn(),
							update: jest.fn(),
						},
						userMetadataKey: {
							upsert: jest.fn(),
							findUnique: jest.fn(),
							findMany: jest.fn(),
							delete: jest.fn(),
						},
					},
				},
				{
					provide: EncryptionService,
					useValue: {
						encrypt: jest.fn(),
						decrypt: jest.fn(),
					},
				},
			],
		}).compile();

		service = module.get<UsersService>(UsersService);
		prisma = module.get<PrismaService>(PrismaService);
		encryption = module.get<EncryptionService>(EncryptionService);
	});

	describe("create", () => {
		it("should create first user with admin=true", async () => {
			const mockUser = {
				id: "user-1",
				username: "admin",
				passwordHash: "hashed",
				apiKey: "key-1",
				isAdmin: true,
				createdAt: new Date(),
			};

			jest.spyOn(prisma.user, "count").mockResolvedValue(0);
			jest.spyOn(prisma.user, "create").mockResolvedValue(mockUser);

			const result = await service.create("admin", "password123");

			expect(prisma.user.count).toHaveBeenCalled();
			expect(result.isAdmin).toBe(true);
			expect("passwordHash" in result).toBe(false);
		});

		it("should throw ForbiddenException when users already exist", async () => {
			jest.spyOn(prisma.user, "count").mockResolvedValue(1);

			await expect(service.create("user", "password123")).rejects.toThrow(
				ForbiddenException,
			);
		});

		it("should hash password with bcrypt", async () => {
			jest.spyOn(prisma.user, "count").mockResolvedValue(0);
			jest.spyOn(prisma.user, "create").mockResolvedValue({
				id: "user-1",
				username: "test",
				passwordHash: expect.any(String),
				apiKey: expect.any(String),
				isAdmin: true,
				createdAt: new Date(),
			});

			const result = await service.create("test", "password123");

			expect(result.id).toBe("user-1");
		});
	});

	describe("createByAdmin", () => {
		it("should create a non-admin user without checking registration status", async () => {
			jest.spyOn(prisma.user, "create").mockResolvedValue({
				id: "user-2",
				username: "member",
				passwordHash: "hashed",
				apiKey: "key-2",
				isAdmin: false,
				createdAt: new Date(),
			});

			const result = await service.createByAdmin("member", "password123");

			expect(prisma.user.count).not.toHaveBeenCalled();
			expect(prisma.user.create).toHaveBeenCalledWith({
				data: {
					username: "member",
					passwordHash: expect.any(String),
					apiKey: "mock-cuid-id",
					isAdmin: false,
				},
			});
			expect(result.isAdmin).toBe(false);
		});
	});

	describe("findByUsername", () => {
		it("should find user by username", async () => {
			const mockUser = {
				id: "user-1",
				username: "testuser",
				passwordHash: "hashed",
				apiKey: "key-1",
				isAdmin: false,
				createdAt: new Date(),
			};

			jest.spyOn(prisma.user, "findUnique").mockResolvedValue(mockUser);

			const result = await service.findByUsername("testuser");

			expect(prisma.user.findUnique).toHaveBeenCalledWith({
				where: { username: "testuser" },
			});
			if (!result) {
				throw new Error("Expected user to be found");
			}
			expect(result.username).toBe("testuser");
		});

		it("should return null when user not found", async () => {
			jest.spyOn(prisma.user, "findUnique").mockResolvedValue(null);

			const result = await service.findByUsername("nonexistent");

			expect(result).toBeNull();
		});
	});

	describe("findById", () => {
		it("should find user by id", async () => {
			const mockUser = {
				id: "user-1",
				username: "testuser",
				passwordHash: "hashed",
				apiKey: "key-1",
				isAdmin: true,
				createdAt: new Date(),
			};

			jest.spyOn(prisma.user, "findUnique").mockResolvedValue(mockUser);

			const result = await service.findById("user-1");

			expect(prisma.user.findUnique).toHaveBeenCalledWith({
				where: { id: "user-1" },
			});
			if (!result) {
				throw new Error("Expected user to be found");
			}
			expect(result.id).toBe("user-1");
		});
	});

	describe("regenerateApiKey", () => {
		it("should generate new API key and return it", async () => {
			jest.spyOn(prisma.user, "update").mockResolvedValue({
				id: "user-1",
				username: "testuser",
				passwordHash: "hashed",
				apiKey: "mock-cuid-id",
				isAdmin: false,
				createdAt: new Date(),
			});

			const result = await service.regenerateApiKey("user-1");

			expect(prisma.user.update).toHaveBeenCalledWith({
				where: { id: "user-1" },
				data: { apiKey: expect.any(String) },
			});
			expect(result).toBe("mock-cuid-id");
		});
	});

	describe("changePassword", () => {
		it("should hash and update password", async () => {
			jest.spyOn(prisma.user, "update").mockResolvedValue({
				id: "user-1",
				username: "testuser",
				passwordHash: "new-hashed",
				apiKey: "key-1",
				isAdmin: false,
				createdAt: new Date(),
			});

			await service.changePassword("user-1", "newpassword123");

			expect(prisma.user.update).toHaveBeenCalledWith({
				where: { id: "user-1" },
				data: { passwordHash: expect.any(String) },
			});
		});
	});

	describe("Encryption - upsertMetadataKey", () => {
		it("should encrypt and save metadata key", async () => {
			jest.spyOn(encryption, "encrypt").mockReturnValue({
				encrypted: "encrypted-data",
				iv: "iv-data",
			});

			jest.spyOn(prisma.userMetadataKey, "upsert").mockResolvedValue({
				id: "key-1",
				userId: "user-1",
				provider: "tmdb",
				keyEnc: "encrypted-data",
				keyIv: "iv-data",
			});

			await service.upsertMetadataKey("user-1", "tmdb", "plainkey");

			expect(encryption.encrypt).toHaveBeenCalledWith("plainkey");
			expect(prisma.userMetadataKey.upsert).toHaveBeenCalled();
		});
	});

	describe("Encryption - getDecryptedKey", () => {
		it("should decrypt and return metadata key", async () => {
			jest.spyOn(prisma.userMetadataKey, "findUnique").mockResolvedValue({
				id: "key-1",
				userId: "user-1",
				provider: "tmdb",
				keyEnc: "encrypted-data",
				keyIv: "iv-data",
			});

			jest.spyOn(encryption, "decrypt").mockReturnValue("plainkey");

			const result = await service.getDecryptedKey("user-1", "tmdb");

			expect(encryption.decrypt).toHaveBeenCalledWith(
				"encrypted-data",
				"iv-data",
			);
			expect(result).toBe("plainkey");
		});

		it("should return null when key not found", async () => {
			jest.spyOn(prisma.userMetadataKey, "findUnique").mockResolvedValue(null);

			const result = await service.getDecryptedKey("user-1", "nonexistent");

			expect(result).toBeNull();
		});
	});

	describe("listProviderKeysForUser", () => {
		it("should return list of configured providers", async () => {
			const mockKeys = [
				{
					id: "key-1",
					userId: "user-1",
					provider: "tmdb",
					keyEnc: "",
					keyIv: "",
				},
				{
					id: "key-2",
					userId: "user-1",
					provider: "igdb",
					keyEnc: "",
					keyIv: "",
				},
			];

			jest
				.spyOn(prisma.userMetadataKey, "findMany")
				.mockResolvedValue(mockKeys);

			const result = await service.listProviderKeysForUser("user-1");

			expect(result).toHaveLength(2);
			expect(result[0].provider).toBe("tmdb");
			expect(result[0].configured).toBe(true);
		});
	});

	describe("sanitizeUser", () => {
		it("should not include passwordHash in response", async () => {
			const mockUser = {
				id: "user-1",
				username: "testuser",
				passwordHash: "hashed",
				apiKey: "key-1",
				isAdmin: false,
				createdAt: new Date(),
			};

			jest.spyOn(prisma.user, "findMany").mockResolvedValue([mockUser]);

			const result = await service.findAll();

			expect("passwordHash" in result[0]).toBe(false);
			expect(result[0].username).toBe("testuser");
		});
	});
});
