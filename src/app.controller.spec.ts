import { Test, type TestingModule } from "@nestjs/testing";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthenticatedUser } from "./auth/authenticated-user.interface";
import { UsersService } from "./users/users.service";

jest.mock("@paralleldrive/cuid2", () => ({
  createId: jest.fn(() => "mock-cuid-id"),
}));

describe("AppController", () => {
  let appController: AppController;
  let usersService: { findAll: jest.Mock };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: UsersService,
          useValue: { findAll: jest.fn() },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    usersService = app.get(UsersService);
  });

  describe("root", () => {
    const createResponse = (user?: AuthenticatedUser) => {
      return {
        req: { user },
        redirect: jest.fn(),
        render: jest.fn(),
      };
    };

    it("redirects a first-time visitor to account setup", async () => {
      usersService.findAll.mockResolvedValue([]);
      const response = createResponse();

      await appController.getHome(response as never);

      expect(response.redirect).toHaveBeenCalledWith("/register");
    });

    it("redirects an unauthenticated returning visitor to login", async () => {
      usersService.findAll.mockResolvedValue([{ id: "user-1" }]);
      const response = createResponse();

      await appController.getHome(response as never);

      expect(response.redirect).toHaveBeenCalledWith("/login");
    });

    it("renders the home page for an authenticated visitor", async () => {
      const response = createResponse({
        userId: "user-1",
        username: "admin",
        isAdmin: true,
      });

      await appController.getHome(response as never);

      expect(response.render).toHaveBeenCalledWith(
        "home",
        expect.objectContaining({ title: "STrackerr - Home" }),
      );
      expect(usersService.findAll).not.toHaveBeenCalled();
    });
  });
});
