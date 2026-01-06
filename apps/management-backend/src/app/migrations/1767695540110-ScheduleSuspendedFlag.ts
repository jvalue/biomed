import { MigrationInterface, QueryRunner } from 'typeorm';

export class ScheduleSuspendedFlag1767695540110 implements MigrationInterface {
	name = 'ScheduleSuspendedFlag1767695540110';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "schedules" ADD "suspended" boolean NOT NULL DEFAULT false`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "schedules" DROP COLUMN "suspended"`);
	}
}
