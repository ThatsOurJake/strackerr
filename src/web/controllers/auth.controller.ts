import { Body, Controller, HttpCode, Post, Res } from "@nestjs/common";
import { Response } from "express";
import { AuthService } from "../../modules/auth/auth.service";
import { LoginDto } from "../../modules/auth/dto/login.dto";
import { RegisterDto } from "../../modules/auth/dto/register.dto";
import { UsersService } from "../../modules/users/users.service";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) { }

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
    try {
      const user = await this.usersService.create(dto.username, dto.password);
      const token = this.authService.generateJwt(
        user.id,
        user.username,
        user.isAdmin,
      );

      this.setAuthCookie(res, token);
      res.redirect("/");
    } catch (error) {
      res.status(400).render("register", {
        title: "Setup",
        error: error instanceof Error ? error.message : "Unable to create account",
        values: { username: dto.username },
      });
    }
  }

  @Post("login")
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res() res: Response) {
    const user = await this.authService.validateUser(
      dto.username,
      dto.password,
    );

    if (!user) {
      return res.status(400).render("login", {
        title: "Login",
        errors: { username: "Invalid username or password" },
        values: { username: dto.username },
        showRegisterLink: false,
      });
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
