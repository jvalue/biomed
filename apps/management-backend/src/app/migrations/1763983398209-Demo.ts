import { MigrationInterface, QueryRunner } from 'typeorm';

export class Demo1763983398209 implements MigrationInterface {
	name = 'Demo1763983398209';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE "Demo" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, CONSTRAINT "PK_a8e9b2aa41cc8244bbd95b3aef5" PRIMARY KEY ("id"))`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE "Demo"`);
	}
}
