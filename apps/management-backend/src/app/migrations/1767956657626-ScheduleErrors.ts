import { MigrationInterface, QueryRunner } from 'typeorm';

export class ScheduleErrors1767956657626 implements MigrationInterface {
	name = 'ScheduleErrors1767956657626';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "schedules" ADD "lastCheckedTemplateVersionLabel" character varying`,
		);
		await queryRunner.query(
			`ALTER TABLE "schedules" ADD "activeErrors" jsonb NOT NULL DEFAULT '{}'`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "schedules" DROP COLUMN "activeErrors"`);
		await queryRunner.query(
			`ALTER TABLE "schedules" DROP COLUMN "lastCheckedTemplateVersionLabel"`,
		);
	}
}
