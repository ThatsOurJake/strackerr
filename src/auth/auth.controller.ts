import { Body, Controller, HttpCode, Post, Res } from "@nestjs/common";
import { Response } from "express";
import { AuthService } from "./auth.service";
import { UsersService } from "../users/users.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  private setAuthCookie(res: Response, token: string): void {
    res.cookie("strackr_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  @Post("register")
  @HttpCode(200)
  async register(@Body() dto: RegisterDto, @Res() res: Response) {
    const user = await this.usersService.create(dto.username, dto.password);
    const token = this.authService.generateJwt(
      user.id,
      user.username,
      user.isAdmin,
    );

    this.setAuthCookie(res, token);
    res.redirect("/");
  }

  @Post("login")
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res() res: Response) {
    const user = await this.authService.validateUser(
      dto.username,
      dto.password,
    );

    if (!user) {
      return res.redirect("/login?error=Invalid username or password");
    }

    const token = this.authService.generateJwt(
      user.id,
      user.username,
      user.isAdmin,
    );

    this.setAuthCookie(res, token);
    res.redirect("/");
  }

  @Post("logout")
  @HttpCode(200)
  async logout(@Res() res: Response) {
    res.clearCookie("strackr_token");
    res.redirect("/login");
  }
}
