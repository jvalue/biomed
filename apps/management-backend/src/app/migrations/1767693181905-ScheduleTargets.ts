import { MigrationInterface, QueryRunner } from 'typeorm';

export class ScheduleTargets1767693181905 implements MigrationInterface {
	name = 'ScheduleTargets1767693181905';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE "targets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "displayName" character varying NOT NULL, "url" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdById" uuid, CONSTRAINT "UQ_5c02cb35beb5a610ad869f652ea" UNIQUE ("displayName"), CONSTRAINT "UQ_7d0852eac33f6a4e0ea88d988ee" UNIQUE ("url"), CONSTRAINT "PK_87084f49e9de9dd6a3e83906584" PRIMARY KEY ("id"))`,
		);
		await queryRunner.query(
			`CREATE TABLE "schedules" ("name" character varying NOT NULL, "namespace" character varying NOT NULL, "crawlerTemplateName" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "createdById" uuid, CONSTRAINT "PK_70fc5bf5c3a8c657b4e133599bd" PRIMARY KEY ("name", "namespace"))`,
		);
		await queryRunner.query(
			`CREATE TABLE "schedules_targets" ("schedule_name" character varying NOT NULL, "schedule_namespace" character varying NOT NULL, "target_id" uuid NOT NULL, CONSTRAINT "PK_9150eb948f7ecb61f1e2260e1b7" PRIMARY KEY ("schedule_name", "schedule_namespace", "target_id"))`,
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_a68474c897a540729cbb5084af" ON "schedules_targets" ("schedule_name", "schedule_namespace") `,
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_6237aeb52c4ebadcf5d9bb5235" ON "schedules_targets" ("target_id") `,
		);
		await queryRunner.query(
			`ALTER TABLE "targets" ADD CONSTRAINT "FK_0033f5cdf6e9c5cea3c4141a398" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "schedules" ADD CONSTRAINT "FK_de50f08bc143c26d6e245675708" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "schedules_targets" ADD CONSTRAINT "FK_a68474c897a540729cbb5084af4" FOREIGN KEY ("schedule_name", "schedule_namespace") REFERENCES "schedules"("name","namespace") ON DELETE CASCADE ON UPDATE CASCADE`,
		);
		await queryRunner.query(
			`ALTER TABLE "schedules_targets" ADD CONSTRAINT "FK_6237aeb52c4ebadcf5d9bb5235e" FOREIGN KEY ("target_id") REFERENCES "targets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "schedules_targets" DROP CONSTRAINT "FK_6237aeb52c4ebadcf5d9bb5235e"`,
		);
		await queryRunner.query(
			`ALTER TABLE "schedules_targets" DROP CONSTRAINT "FK_a68474c897a540729cbb5084af4"`,
		);
		await queryRunner.query(
			`ALTER TABLE "schedules" DROP CONSTRAINT "FK_de50f08bc143c26d6e245675708"`,
		);
		await queryRunner.query(
			`ALTER TABLE "targets" DROP CONSTRAINT "FK_0033f5cdf6e9c5cea3c4141a398"`,
		);
		await queryRunner.query(`DROP INDEX "public"."IDX_6237aeb52c4ebadcf5d9bb5235"`);
		await queryRunner.query(`DROP INDEX "public"."IDX_a68474c897a540729cbb5084af"`);
		await queryRunner.query(`DROP TABLE "schedules_targets"`);
		await queryRunner.query(`DROP TABLE "schedules"`);
		await queryRunner.query(`DROP TABLE "targets"`);
	}
}
