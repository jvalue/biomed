import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameRunIdToRunName1772197103315 implements MigrationInterface {
	name = 'RenameRunIdToRunName1772197103315';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "crawler_run_events" DROP CONSTRAINT "FK_b86f7b9aded9e2edf44a2ef68ca"`,
		);
		await queryRunner.query(
			`ALTER TABLE "crawler_run_events" RENAME COLUMN "run_id" TO "run_name"`,
		);
		await queryRunner.query(`ALTER TABLE "crawler_run_metrics" RENAME COLUMN "runId" TO "runName"`);
		await queryRunner.query(
			`ALTER TABLE "crawler_run_metrics" RENAME CONSTRAINT "PK_63c5231818fbc1d9f9a82327c43" TO "PK_b464dd13b9a39b1ac30197d4b36"`,
		);
		await queryRunner.query(
			`ALTER TABLE "crawler_run_events" ADD CONSTRAINT "FK_4c70018298a24d0b6eaf2317292" FOREIGN KEY ("run_name", "run_namespace") REFERENCES "crawler_run_metrics"("runName","runNamespace") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "crawler_run_events" DROP CONSTRAINT "FK_4c70018298a24d0b6eaf2317292"`,
		);
		await queryRunner.query(
			`ALTER TABLE "crawler_run_metrics" RENAME CONSTRAINT "PK_b464dd13b9a39b1ac30197d4b36" TO "PK_63c5231818fbc1d9f9a82327c43"`,
		);
		await queryRunner.query(`ALTER TABLE "crawler_run_metrics" RENAME COLUMN "runName" TO "runId"`);
		await queryRunner.query(
			`ALTER TABLE "crawler_run_events" RENAME COLUMN "run_name" TO "run_id"`,
		);
		await queryRunner.query(
			`ALTER TABLE "crawler_run_events" ADD CONSTRAINT "FK_b86f7b9aded9e2edf44a2ef68ca" FOREIGN KEY ("run_id", "run_namespace") REFERENCES "crawler_run_metrics"("runId","runNamespace") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
	}
}
