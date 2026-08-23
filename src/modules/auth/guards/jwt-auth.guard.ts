import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { AuthenticatedUser } from "../authenticated-user.interface";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
	canActivate(context: ExecutionContext) {
		return super.canActivate(context);
	}

	handleRequest(
		error: unknown,
		user: AuthenticatedUser | null,
		_info: unknown,
		context: ExecutionContext,
	) {
		if (error || !user) {
			const response = context.switchToHttp().getResponse();
			return response.redirect("/login");
		}
		return user;
	}
}
