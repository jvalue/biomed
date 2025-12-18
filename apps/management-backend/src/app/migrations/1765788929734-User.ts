import { MigrationInterface, QueryRunner } from 'typeorm';

export class User1765788929734 implements MigrationInterface {
	name = 'User1765788929734';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TYPE "public"."users_status_enum" AS ENUM('pending', 'active', 'blocked')`,
		);
		await queryRunner.query(
			`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" character varying NOT NULL, "passwordHash" character varying NOT NULL, "permissions" text NOT NULL DEFAULT '', "status" "public"."users_status_enum" NOT NULL DEFAULT 'pending', "approvedBy" character varying, "approvedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE "users"`);
		await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
	}
}
