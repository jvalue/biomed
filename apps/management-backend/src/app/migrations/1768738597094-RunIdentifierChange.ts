import { MigrationInterface, QueryRunner } from 'typeorm';

export class RunIdentifierChange1768738597094 implements MigrationInterface {
	name = 'RunIdentifierChange1768738597094';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "crawler_run_events" DROP CONSTRAINT "FK_c0120bf478d5a094bfecf9074e0"`,
		);
		await queryRunner.query(
			`ALTER TABLE "crawler_run_events" ADD "run_namespace" character varying NOT NULL`,
		);
		await queryRunner.query(
			`ALTER TABLE "crawler_run_metrics" ADD "runNamespace" character varying NOT NULL`,
		);
		await queryRunner.query(
			`ALTER TABLE "crawler_run_metrics" DROP CONSTRAINT "PK_37317bb412b57782b515e4ff03d"`,
		);
		await queryRunner.query(
			`ALTER TABLE "crawler_run_metrics" ADD CONSTRAINT "PK_63c5231818fbc1d9f9a82327c43" PRIMARY KEY ("runId", "runNamespace")`,
		);
		await queryRunner.query(
			`ALTER TABLE "crawler_run_events" ADD CONSTRAINT "FK_b86f7b9aded9e2edf44a2ef68ca" FOREIGN KEY ("run_id", "run_namespace") REFERENCES "crawler_run_metrics"("runId","runNamespace") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "crawler_run_events" DROP CONSTRAINT "FK_b86f7b9aded9e2edf44a2ef68ca"`,
		);
		await queryRunner.query(
			`ALTER TABLE "crawler_run_metrics" DROP CONSTRAINT "PK_63c5231818fbc1d9f9a82327c43"`,
		);
		await queryRunner.query(
			`ALTER TABLE "crawler_run_metrics" ADD CONSTRAINT "PK_37317bb412b57782b515e4ff03d" PRIMARY KEY ("runId")`,
		);
		await queryRunner.query(`ALTER TABLE "crawler_run_metrics" DROP COLUMN "runNamespace"`);
		await queryRunner.query(`ALTER TABLE "crawler_run_events" DROP COLUMN "run_namespace"`);
		await queryRunner.query(
			`ALTER TABLE "crawler_run_events" ADD CONSTRAINT "FK_c0120bf478d5a094bfecf9074e0" FOREIGN KEY ("run_id") REFERENCES "crawler_run_metrics"("runId") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
	}
}
