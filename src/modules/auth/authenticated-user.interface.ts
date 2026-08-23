export interface AuthenticatedUser {
  userId: string;
  username: string;
  isAdmin: boolean;
}

export interface JwtPayload {
  sub: string;
  username: string;
  isAdmin: boolean;
}
