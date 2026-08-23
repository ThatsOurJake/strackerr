import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Post,
	Query,
	Res,
	UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import { UsersService } from "../../users/users.service";
import { AuthenticatedUser } from "../authenticated-user.interface";
import { CurrentUser } from "../decorators/current-user.decorator";
import { AdminGuard } from "../guards/admin.guard";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";

interface CreateUserBody {
	username: string;
	password: string;
}

interface ChangePasswordBody {
	newPassword: string;
}

@Controller("admin")
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminWebController {
	constructor(private readonly usersService: UsersService) { }

	@Get("users")
	async listUsers(
		@Query("success") success: string | undefined,
		@Res() res: Response,
		@CurrentUser() user: AuthenticatedUser,
	) {
		const users = await this.usersService.findAll();
		res.render("admin/users", {
			title: "Manage Users",
			users,
			currentUserId: user.userId,
			success,
		});
	}

	@Post("users")
	async createUser(@Body() body: CreateUserBody, @Res() res: Response) {
		try {
			const user = await this.usersService.createByAdmin(
				body.username,
				body.password,
			);
			return res.redirect(
				`/admin/users?success=${encodeURIComponent(`User ${user.username} created successfully`)}`,
			);
		} catch (error: unknown) {
			const users = await this.usersService.findAll();
			return res.render("admin/users", {
				title: "Manage Users",
				users,
				error: error instanceof Error ? error.message : "Failed to create user",
			});
		}
	}

	@Delete("users/:id")
	async deleteUser(
		@Param("id") id: string,
		@Res() res: Response,
		@CurrentUser() user: AuthenticatedUser,
	) {
		if (id === user.userId) {
			const users = await this.usersService.findAll();
			return res.status(400).render("admin/users", {
				title: "Manage Users",
				users,
				error: "Cannot delete your own account",
			});
		}

		try {
			await this.usersService.delete(id);
			const users = await this.usersService.findAll();
			return res.render("admin/users", {
				title: "Manage Users",
				users,
				success: "User deleted successfully",
			});
		} catch {
			const users = await this.usersService.findAll();
			return res.render("admin/users", {
				title: "Manage Users",
				users,
				error: "Failed to delete user",
			});
		}
	}

	@Post("users/:id/password")
	async changePassword(
		@Param("id") id: string,
		@Body() body: ChangePasswordBody,
		@Res() res: Response,
	) {
		try {
			await this.usersService.changePassword(id, body.newPassword);
			const users = await this.usersService.findAll();
			return res.render("admin/users", {
				title: "Manage Users",
				users,
				success: "Password changed successfully",
			});
		} catch {
			const users = await this.usersService.findAll();
			return res.render("admin/users", {
				title: "Manage Users",
				users,
				error: "Failed to change password",
			});
		}
	}
}
