import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { UsersService } from "../users/users.service";
import { AuthService } from "./auth.service";

jest.mock("@paralleldrive/cuid2", () => ({
  cuid: jest.fn(() => "mock-cuid-id"),
}));

jest.mock("bcrypt");

describe("AuthService", () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByUsername: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  describe("validateUser", () => {
    it("should return user with valid credentials", async () => {
      const mockUser = {
        id: "user-1",
        username: "testuser",
        passwordHash:
          "$2b$12$B9/QzX0xZ0p0E0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e",
        apiKey: "key-1",
        isAdmin: false,
        createdAt: new Date(),
      };

      jest.spyOn(usersService, "findByUsername").mockResolvedValue(mockUser);
      const bcrypt = require("bcrypt");
      jest.spyOn(bcrypt, "compare").mockResolvedValue(true);

      const result = await service.validateUser("testuser", "password123");

      expect(usersService.findByUsername).toHaveBeenCalledWith("testuser");
      expect(result).toBe(mockUser);
    });

    it("should return null when user not found", async () => {
      jest.spyOn(usersService, "findByUsername").mockResolvedValue(null);

      const result = await service.validateUser("nonexistent", "password123");

      expect(result).toBeNull();
    });

    it("should return null with invalid password", async () => {
      const mockUser = {
        id: "user-1",
        username: "testuser",
        passwordHash:
          "$2b$12$B9/QzX0xZ0p0E0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e",
        apiKey: "key-1",
        isAdmin: false,
        createdAt: new Date(),
      };

      jest.spyOn(usersService, "findByUsername").mockResolvedValue(mockUser);
      const bcrypt = require("bcrypt");
      jest.spyOn(bcrypt, "compare").mockResolvedValue(false);

      const result = await service.validateUser("testuser", "wrongpassword");

      expect(result).toBeNull();
    });
  });

  describe("generateJwt", () => {
    it("should generate JWT token with payload", () => {
      jest.spyOn(jwtService, "sign").mockReturnValue("token-123");

      const token = service.generateJwt("user-1", "testuser", true);

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: "user-1",
        username: "testuser",
        isAdmin: true,
      });
      expect(token).toBe("token-123");
    });

    it("should include isAdmin flag in JWT", () => {
      jest.spyOn(jwtService, "sign").mockReturnValue("token-123");

      service.generateJwt("user-1", "testuser", false);

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: "user-1",
        username: "testuser",
        isAdmin: false,
      });
    });
  });

  describe("verifyJwt", () => {
    it("should verify and return JWT payload", () => {
      const payload = {
        sub: "user-1",
        username: "testuser",
        isAdmin: true,
      };

      jest.spyOn(jwtService, "verify").mockReturnValue(payload);

      const result = service.verifyJwt("token-123");

      expect(jwtService.verify).toHaveBeenCalledWith("token-123");
      expect(result).toEqual(payload);
    });

    it("should throw on invalid token", () => {
      jest.spyOn(jwtService, "verify").mockImplementation(() => {
        throw new Error("Invalid token");
      });

      expect(() => {
        service.verifyJwt("invalid-token");
      }).toThrow("Invalid token");
    });
  });
});
