import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
} from "@nestjs/common";
import { UsersService } from "../../users/users.service";

@Injectable()
export class AdminGuard implements CanActivate {
	constructor(private readonly usersService: UsersService) { }

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest();
		const user = request.user;

		if (!user?.userId) {
			throw new ForbiddenException("User not authenticated");
		}

		// Always re-query the DB to get the live admin status
		const dbUser = await this.usersService.findById(user.userId);

		if (!dbUser?.isAdmin) {
			throw new ForbiddenException("Admin access required");
		}

		return true;
	}
}
