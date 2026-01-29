import { MigrationInterface, QueryRunner } from 'typeorm';

export class RunEvents1768638111874 implements MigrationInterface {
	name = 'RunEvents1768638111874';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TYPE "public"."crawler_run_events_type_enum" AS ENUM('INFO', 'WARNING', 'ERROR')`,
		);
		await queryRunner.query(
			`CREATE TABLE "crawler_run_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "run_id" character varying NOT NULL, "type" "public"."crawler_run_events_type_enum" NOT NULL, "message" text NOT NULL, "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_505d1dcea41b7ea3f390e0ca9cc" PRIMARY KEY ("id"))`,
		);
		await queryRunner.query(
			`ALTER TABLE "crawler_run_events" ADD CONSTRAINT "FK_c0120bf478d5a094bfecf9074e0" FOREIGN KEY ("run_id") REFERENCES "crawler_run_metrics"("runId") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "crawler_run_events" DROP CONSTRAINT "FK_c0120bf478d5a094bfecf9074e0"`,
		);
		await queryRunner.query(`DROP TABLE "crawler_run_events"`);
		await queryRunner.query(`DROP TYPE "public"."crawler_run_events_type_enum"`);
	}
}
