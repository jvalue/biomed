import { MigrationInterface, QueryRunner } from 'typeorm';

export class RunStartedAt1768916293714 implements MigrationInterface {
	name = 'RunStartedAt1768916293714';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "crawler_run_metrics" ADD "runStartedAt" TIMESTAMP`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "crawler_run_metrics" DROP COLUMN "runStartedAt"`);
	}
}
