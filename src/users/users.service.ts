import { ForbiddenException, Injectable } from "@nestjs/common";
import { createId } from "@paralleldrive/cuid2";
import { User } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { EncryptionService } from "./encryption.service";

@Injectable()
export class UsersService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly encryptionService: EncryptionService,
	) { }

	async create(username: string, password: string) {
		// Check if users already exist
		const userCount = await this.prisma.user.count();

		if (userCount > 0) {
			throw new ForbiddenException(
				"Users already exist. Registration is closed.",
			);
		}

		const passwordHash = await bcrypt.hash(password, 12);
		const apiKey = createId();

		const user = await this.prisma.user.create({
			data: {
				username,
				passwordHash,
				apiKey,
				isAdmin: true, // First user is admin
			},
		});

		return this.sanitizeUser(user);
	}

	async createByAdmin(username: string, password: string) {
		const passwordHash = await bcrypt.hash(password, 12);
		const apiKey = createId();

		const user = await this.prisma.user.create({
			data: {
				username,
				passwordHash,
				apiKey,
				isAdmin: false,
			},
		});

		return this.sanitizeUser(user);
	}

	async findByUsername(username: string) {
		return this.prisma.user.findUnique({
			where: { username },
		});
	}

	async findById(id: string) {
		return this.prisma.user.findUnique({
			where: { id },
		});
	}

	async findAll() {
		const users = await this.prisma.user.findMany();
		return users.map((user) => this.sanitizeUser(user));
	}

	async delete(userId: string) {
		return this.prisma.user.delete({
			where: { id: userId },
		});
	}

	async changePassword(userId: string, newPassword: string) {
		const passwordHash = await bcrypt.hash(newPassword, 12);
		return this.prisma.user.update({
			where: { id: userId },
			data: { passwordHash },
		});
	}

	async regenerateApiKey(userId: string) {
		const newApiKey = createId();
		await this.prisma.user.update({
			where: { id: userId },
			data: { apiKey: newApiKey },
		});
		return newApiKey;
	}

	async upsertMetadataKey(userId: string, provider: string, plainKey: string) {
		const { encrypted, iv } = this.encryptionService.encrypt(plainKey);
		return this.prisma.userMetadataKey.upsert({
			where: {
				userId_provider: { userId, provider },
			},
			create: {
				userId,
				provider,
				keyEnc: encrypted,
				keyIv: iv,
			},
			update: {
				keyEnc: encrypted,
				keyIv: iv,
			},
		});
	}

	async getDecryptedKey(userId: string, provider: string) {
		const metadataKey = await this.prisma.userMetadataKey.findUnique({
			where: {
				userId_provider: { userId, provider },
			},
		});

		if (!metadataKey) {
			return null;
		}

		return this.encryptionService.decrypt(
			metadataKey.keyEnc,
			metadataKey.keyIv,
		);
	}

	async deleteMetadataKey(userId: string, provider: string) {
		return this.prisma.userMetadataKey.delete({
			where: {
				userId_provider: { userId, provider },
			},
		});
	}

	async listProviderKeysForUser(userId: string) {
		const keys = await this.prisma.userMetadataKey.findMany({
			where: { userId },
		});
		return keys.map((key) => ({
			provider: key.provider,
			configured: true,
		}));
	}

	private sanitizeUser(user: User) {
		const { passwordHash, ...sanitized } = user;
		return sanitized;
	}
}
