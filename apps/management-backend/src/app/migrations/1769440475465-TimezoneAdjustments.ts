import { MigrationInterface, QueryRunner } from 'typeorm';

export class TimezoneAdjustments1769440475465 implements MigrationInterface {
	name = 'TimezoneAdjustments1769440475465';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "approvedAt"`);
		await queryRunner.query(`ALTER TABLE "users" ADD "approvedAt" TIMESTAMP WITH TIME ZONE`);
		await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "createdAt"`);
		await queryRunner.query(
			`ALTER TABLE "users" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
		);
		await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "updatedAt"`);
		await queryRunner.query(
			`ALTER TABLE "users" ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
		);
		await queryRunner.query(`ALTER TABLE "api_keys" DROP COLUMN "createdAt"`);
		await queryRunner.query(
			`ALTER TABLE "api_keys" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
		);
		await queryRunner.query(`ALTER TABLE "api_keys" DROP COLUMN "lastUsedAt"`);
		await queryRunner.query(`ALTER TABLE "api_keys" ADD "lastUsedAt" TIMESTAMP WITH TIME ZONE`);
		await queryRunner.query(`ALTER TABLE "schedules" DROP COLUMN "createdAt"`);
		await queryRunner.query(
			`ALTER TABLE "schedules" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
		);
		await queryRunner.query(`ALTER TABLE "targets" DROP COLUMN "createdAt"`);
		await queryRunner.query(
			`ALTER TABLE "targets" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
		);
		await queryRunner.query(`ALTER TABLE "targets" DROP COLUMN "updatedAt"`);
		await queryRunner.query(
			`ALTER TABLE "targets" ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "targets" DROP COLUMN "updatedAt"`);
		await queryRunner.query(
			`ALTER TABLE "targets" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`,
		);
		await queryRunner.query(`ALTER TABLE "targets" DROP COLUMN "createdAt"`);
		await queryRunner.query(
			`ALTER TABLE "targets" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`,
		);
		await queryRunner.query(`ALTER TABLE "schedules" DROP COLUMN "createdAt"`);
		await queryRunner.query(
			`ALTER TABLE "schedules" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`,
		);
		await queryRunner.query(`ALTER TABLE "api_keys" DROP COLUMN "lastUsedAt"`);
		await queryRunner.query(`ALTER TABLE "api_keys" ADD "lastUsedAt" TIMESTAMP`);
		await queryRunner.query(`ALTER TABLE "api_keys" DROP COLUMN "createdAt"`);
		await queryRunner.query(
			`ALTER TABLE "api_keys" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`,
		);
		await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "updatedAt"`);
		await queryRunner.query(`ALTER TABLE "users" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
		await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "createdAt"`);
		await queryRunner.query(`ALTER TABLE "users" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
		await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "approvedAt"`);
		await queryRunner.query(`ALTER TABLE "users" ADD "approvedAt" TIMESTAMP`);
	}
}
