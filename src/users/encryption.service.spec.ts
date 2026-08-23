import { ConfigService } from "@nestjs/config";
import { EncryptionService } from "./encryption.service";

describe("EncryptionService", () => {
	let service: EncryptionService;
	let configService: ConfigService;

	beforeEach(() => {
		const mockConfigService = {
			get: jest.fn((key: string) => {
				if (key === "ENCRYPTION_KEY") {
					// 32 bytes = 64 hex chars
					return "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
				}
				return null;
			}),
		};

		configService = mockConfigService as unknown as ConfigService;
		service = new EncryptionService(configService);
	});

	describe("encrypt", () => {
		it("should encrypt plaintext and return encrypted data with IV", () => {
			const plaintext = "my-secret-api-key";

			const result = service.encrypt(plaintext);

			expect(result.encrypted).toBeDefined();
			expect(result.iv).toBeDefined();
			expect(result.encrypted).not.toBe(plaintext);
			expect(result.iv).toMatch(/^[0-9a-f]+$/); // hex format
		});

		it("should generate different IV for each encryption", () => {
			const plaintext = "my-secret-api-key";

			const result1 = service.encrypt(plaintext);
			const result2 = service.encrypt(plaintext);

			expect(result1.iv).not.toBe(result2.iv);
			expect(result1.encrypted).not.toBe(result2.encrypted);
		});
	});

	describe("decrypt", () => {
		it("should decrypt ciphertext back to plaintext", () => {
			const plaintext = "my-secret-api-key";
			const { encrypted, iv } = service.encrypt(plaintext);

			const decrypted = service.decrypt(encrypted, iv);

			expect(decrypted).toBe(plaintext);
		});

		it("should preserve exact string content", () => {
			const plaintext = "tmdb_api_key_12345_special!@#$%^&*()";
			const { encrypted, iv } = service.encrypt(plaintext);

			const decrypted = service.decrypt(encrypted, iv);

			expect(decrypted).toBe(plaintext);
		});

		it("should fail to decrypt with wrong IV", () => {
			const plaintext = "my-secret-api-key";
			const { encrypted } = service.encrypt(plaintext);
			const wrongIv = "0000000000000000000000000000000000000000";

			expect(() => {
				service.decrypt(encrypted, wrongIv);
			}).toThrow();
		});

		it("should fail to decrypt with wrong key", () => {
			const plaintext = "my-secret-api-key";
			const { encrypted, iv } = service.encrypt(plaintext);

			// Create new service with different key
			const wrongConfigService = {
				get: jest.fn((key: string) => {
					if (key === "ENCRYPTION_KEY") {
						return "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
					}
					return null;
				}),
			};

			const wrongService = new EncryptionService(
				wrongConfigService as unknown as ConfigService,
			);

			expect(() => {
				wrongService.decrypt(encrypted, iv);
			}).toThrow();
		});
	});

	describe("round-trip encryption", () => {
		it("should preserve data through encrypt/decrypt cycle", () => {
			const testData = [
				"simple-key",
				"key_with_underscores",
				"123456789",
				"UPPERCASE_KEY",
				"mixed_Case_123",
				"",
				"a".repeat(1000),
			];

			testData.forEach((plaintext) => {
				const { encrypted, iv } = service.encrypt(plaintext);
				const decrypted = service.decrypt(encrypted, iv);

				expect(decrypted).toBe(plaintext);
			});
		});
	});

	describe("configuration validation", () => {
		it("should throw error if ENCRYPTION_KEY is missing", () => {
			const badConfigService = {
				get: jest.fn(() => null),
			};

			expect(() => {
				new EncryptionService(badConfigService as unknown as ConfigService);
			}).toThrow("ENCRYPTION_KEY must be a 64-character hexadecimal string");
		});

		it("should throw error if ENCRYPTION_KEY is wrong length", () => {
			const badConfigService = {
				get: jest.fn(() => "tooShort"),
			};

			expect(() => {
				new EncryptionService(badConfigService as unknown as ConfigService);
			}).toThrow("ENCRYPTION_KEY must be a 64-character hexadecimal string");
		});

		it("should throw error if ENCRYPTION_KEY is not hexadecimal", () => {
			const badConfigService = {
				get: jest.fn(() => "z".repeat(64)),
			};

			expect(() => {
				new EncryptionService(badConfigService as unknown as ConfigService);
			}).toThrow("ENCRYPTION_KEY must be a 64-character hexadecimal string");
		});
	});
});
