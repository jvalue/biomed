import { MigrationInterface, QueryRunner } from 'typeorm';

export class RunMetrics1768636545550 implements MigrationInterface {
	name = 'RunMetrics1768636545550';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE "crawler_run_metrics" ("runId" character varying NOT NULL, "schedule_name" character varying, "schedule_namespace" character varying, "crawledDataSets" integer, "cacheHits" integer, CONSTRAINT "PK_37317bb412b57782b515e4ff03d" PRIMARY KEY ("runId")); COMMENT ON COLUMN "crawler_run_metrics"."cacheHits" IS 'Number of cache hits during this crawler run (regarding datasets)'`,
		);
		await queryRunner.query(
			`ALTER TABLE "crawler_run_metrics" ADD CONSTRAINT "FK_c4f5046c1d09adb4f161ef6fa62" FOREIGN KEY ("schedule_name", "schedule_namespace") REFERENCES "schedules"("name","namespace") ON DELETE SET NULL ON UPDATE NO ACTION`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "crawler_run_metrics" DROP CONSTRAINT "FK_c4f5046c1d09adb4f161ef6fa62"`,
		);
		await queryRunner.query(`DROP TABLE "crawler_run_metrics"`);
	}
}
