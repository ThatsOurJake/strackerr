import { Controller, Get, Res } from "@nestjs/common";
import { Response } from "express";
import { AppService } from "./app.service";
import { UsersService } from "./users/users.service";

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly usersService: UsersService,
  ) { }

  @Get()
  async getHome(@Res() res: Response) {
    if (res.req.user) {
      return res.render("home", this.appService.getHomeViewModel());
    }

    const users = await this.usersService.findAll();
    return res.redirect(users.length === 0 ? "/register" : "/login");
  }
}
