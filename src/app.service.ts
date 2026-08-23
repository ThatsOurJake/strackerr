import { Injectable } from "@nestjs/common";

@Injectable()
export class AppService {
	getHomeViewModel(): {
		title: string;
		heading: string;
		description: string;
	} {
		return {
			title: "STrackerr - Home",
			heading: "STrackerr",
			description: "Platform foundation is configured and ready for feature work.",
		};
	}
}
