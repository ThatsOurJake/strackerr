import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class EncryptionService {
	private readonly algorithm = "aes-256-gcm";
	private readonly encryptionKey: Buffer;

	constructor(private config: ConfigService) {
		const keyHex = this.config.get("ENCRYPTION_KEY");
		if (!/^[0-9a-f]{64}$/i.test(keyHex ?? "")) {
			throw new Error(
				"ENCRYPTION_KEY must be a 64-character hexadecimal string",
			);
		}
		this.encryptionKey = Buffer.from(keyHex, "hex");
	}

	encrypt(plaintext: string): { encrypted: string; iv: string } {
		const iv = randomBytes(16);
		const cipher = createCipheriv(this.algorithm, this.encryptionKey, iv);

		let encrypted = cipher.update(plaintext, "utf8", "hex");
		encrypted += cipher.final("hex");

		const authTag = cipher.getAuthTag();
		const cipherWithTag = encrypted + authTag.toString("hex");

		return {
			encrypted: cipherWithTag,
			iv: iv.toString("hex"),
		};
	}

	decrypt(ciphertext: string, ivHex: string): string {
		const iv = Buffer.from(ivHex, "hex");
		const authTag = Buffer.from(ciphertext.slice(-32), "hex"); // GCM auth tag is 16 bytes (32 hex chars)
		const encrypted = ciphertext.slice(0, -32);

		const decipher = createDecipheriv(this.algorithm, this.encryptionKey, iv);
		decipher.setAuthTag(authTag);

		let decrypted = decipher.update(encrypted, "hex", "utf8");
		decrypted += decipher.final("utf8");

		return decrypted;
	}
}
