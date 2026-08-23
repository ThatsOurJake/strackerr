import type { AuthenticatedUser } from "../modules/auth/authenticated-user.interface";

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
