import { MigrationInterface, QueryRunner } from 'typeorm';

export class ApiKeys1768820430974 implements MigrationInterface {
	name = 'ApiKeys1768820430974';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE "api_keys" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "hash" character varying NOT NULL, "prefix" character varying NOT NULL, "description" character varying NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "lastUsedAt" TIMESTAMP, "created_by_id" uuid NOT NULL, CONSTRAINT "UQ_598a14447f592c12d1fe22ba918" UNIQUE ("hash"), CONSTRAINT "PK_5c8a79801b44bd27b79228e1dad" PRIMARY KEY ("id"))`,
		);
		await queryRunner.query(
			`ALTER TABLE "api_keys" ADD CONSTRAINT "FK_3afd227c6cb003779abe2a88b4e" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "api_keys" DROP CONSTRAINT "FK_3afd227c6cb003779abe2a88b4e"`,
		);
		await queryRunner.query(`DROP TABLE "api_keys"`);
	}
}
