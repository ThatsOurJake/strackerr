import { Controller, Get, Query, Res } from "@nestjs/common";
import { Response } from "express";
import { UsersService } from "../../modules/users/users.service";

@Controller()
export class AuthWebController {
	constructor(private readonly usersService: UsersService) { }

	@Get("login")
	async getLogin(@Query("error") error: string | undefined, @Res() res: Response) {
		const userCount = await this.usersService.findAll();

		// If already authenticated, redirect to home
		if (res.req.user) {
			return res.redirect("/");
		}

		res.render("login", {
			title: "Login",
			showRegisterLink: userCount.length === 0,
			error,
		});
	}

	@Get("register")
	async getRegister(@Res() res: Response) {
		const userCount = await this.usersService.findAll();

		// If users already exist, redirect to login
		if (userCount.length > 0) {
			return res.redirect("/login");
		}

		// If already authenticated, redirect to home
		if (res.req.user) {
			return res.redirect("/");
		}

		res.render("register", {
			title: "Register",
		});
	}
}
