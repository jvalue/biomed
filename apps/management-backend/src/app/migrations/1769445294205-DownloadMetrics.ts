import { MigrationInterface, QueryRunner } from 'typeorm';

export class DownloadMetrics1769445294205 implements MigrationInterface {
	name = 'DownloadMetrics1769445294205';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "crawler_run_metrics" ADD "totalDatasetsToDownload" integer`,
		);
		await queryRunner.query(`ALTER TABLE "crawler_run_metrics" ADD "downloadedDatasets" integer`);
		await queryRunner.query(`ALTER TABLE "crawler_run_metrics" ADD "totalGBToDownload" integer`);
		await queryRunner.query(`ALTER TABLE "crawler_run_metrics" ADD "downloadedGB" integer`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "crawler_run_metrics" DROP COLUMN "downloadedGB"`);
		await queryRunner.query(`ALTER TABLE "crawler_run_metrics" DROP COLUMN "totalGBToDownload"`);
		await queryRunner.query(`ALTER TABLE "crawler_run_metrics" DROP COLUMN "downloadedDatasets"`);
		await queryRunner.query(
			`ALTER TABLE "crawler_run_metrics" DROP COLUMN "totalDatasetsToDownload"`,
		);
	}
}
