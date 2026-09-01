import { ExecutionContext, Injectable } from "@nestjs/common";
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
		context: ExecutionContext,
	): TUser {
		if (error || !user) {
			const response = context.switchToHttp().getResponse();
			response.redirect("/login");
			return null as TUser;
		}
		return user as TUser;
	}
}
