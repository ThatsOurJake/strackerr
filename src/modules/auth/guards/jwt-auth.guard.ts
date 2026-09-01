import { ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { AuthenticatedUser } from "../authenticated-user.interface";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const canActivate = await super.canActivate(context);
		const request = context.switchToHttp().getRequest();
		return Boolean(canActivate && request.user);
	}

	handleRequest<TUser = AuthenticatedUser>(
		error: unknown,
		user: AuthenticatedUser | null,
		_info: unknown,
		_context: ExecutionContext,
	): TUser {
		if (error || !user) {
			throw new UnauthorizedException("Authentication required");
		}
		return user as TUser;
	}
}
