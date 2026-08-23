import { Controller, Get, Render } from "@nestjs/common";
import { AppService } from "./app.service";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Render("layouts/base")
  getHome(): {
		title: string;
		heading: string;
		description: string;
	} {
		return this.appService.getHomeViewModel();
	}
}
