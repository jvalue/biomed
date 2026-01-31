import { MigrationInterface, QueryRunner } from 'typeorm';

export class RunTimezone1769439239264 implements MigrationInterface {
	name = 'RunTimezone1769439239264';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "crawler_run_metrics" DROP COLUMN "runStartedAt"`);
		await queryRunner.query(
			`ALTER TABLE "crawler_run_metrics" ADD "runStartedAt" TIMESTAMP WITH TIME ZONE`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "crawler_run_metrics" DROP COLUMN "runStartedAt"`);
		await queryRunner.query(`ALTER TABLE "crawler_run_metrics" ADD "runStartedAt" TIMESTAMP`);
	}
}
