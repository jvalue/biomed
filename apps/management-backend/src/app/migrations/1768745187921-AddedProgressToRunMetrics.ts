import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedProgressToRunMetrics1768745187921 implements MigrationInterface {
	name = 'AddedProgressToRunMetrics1768745187921';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "crawler_run_metrics" ADD "progress" integer`);
		await queryRunner.query(
			`COMMENT ON COLUMN "crawler_run_metrics"."progress" IS 'Progress of the crawler run (0-100)'`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`COMMENT ON COLUMN "crawler_run_metrics"."progress" IS 'Progress of the crawler run (0-100)'`,
		);
		await queryRunner.query(`ALTER TABLE "crawler_run_metrics" DROP COLUMN "progress"`);
	}
}
