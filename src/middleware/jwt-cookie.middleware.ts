import { Injectable, NestMiddleware } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { NextFunction, Request, Response } from "express";
import { JwtPayload } from "../auth/authenticated-user.interface";

@Injectable()
export class JwtCookieMiddleware implements NestMiddleware {
	constructor(private readonly jwtService: JwtService) { }

	use(req: Request, res: Response, next: NextFunction) {
		const token = req.cookies?.strackr_token;

		if (token) {
			try {
				const payload = this.jwtService.verify<JwtPayload>(token);
				req.user = {
					userId: payload.sub,
					username: payload.username,
					isAdmin: payload.isAdmin,
				};
				res.locals.user = req.user;
			} catch { }
		}

		next();
	}
}
