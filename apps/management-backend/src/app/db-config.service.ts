import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import { DemoEntity } from './demo/entity/demo.entity';
import { EnvironmentVariables } from './env.validation';
import { TargetEntity } from './health/targets/entity/target.entity';
import { CrawlerRunMetricEntity } from './metrics/crawler-run-metrics/entity/crawler-run-metric.entity';
import { Demo1763983398209 } from './migrations/1763983398209-Demo';
import { User1765788929734 } from './migrations/1765788929734-User';
import { ScheduleTargets1767693181905 } from './migrations/1767693181905-ScheduleTargets';
import { ScheduleSuspendedFlag1767695540110 } from './migrations/1767695540110-ScheduleSuspendedFlag';
import { ScheduleErrors1767956657626 } from './migrations/1767956657626-ScheduleErrors';
import { RunMetrics1768636545550 } from './migrations/1768636545550-RunMetrics';
import { ScheduleEntity } from './schedules/entity/schedule.entity';
import { UserEntity } from './users/entity/user.entity';

@Injectable()
export class DbConfigService implements TypeOrmOptionsFactory {
	constructor(private readonly configService: ConfigService<EnvironmentVariables, true>) {}

	/**
	 * Used by NestJS to reach database.
	 * Keep in sync with migrations.main.ts
	 */
	createTypeOrmOptions(): TypeOrmModuleOptions & DataSourceOptions {
		return {
			type: 'postgres',
			host: this.configService.get('DATABASE_HOST'),
			port: this.configService.get('DATABASE_PORT'),
			username: this.configService.get('DATABASE_USER'),
			password: this.configService.get('DATABASE_PASSWORD'),
			database: this.configService.get('DATABASE_DATABASE'),
			entities: [DemoEntity, UserEntity, ScheduleEntity, TargetEntity, CrawlerRunMetricEntity],
			metadataTableName: 'typeorm_metadata_biomed',

			migrationsTableName: 'migrations_biomed',
			migrationsRun: true,
			migrations: [
				Demo1763983398209,
				User1765788929734,
				ScheduleTargets1767693181905,
				ScheduleSuspendedFlag1767695540110,
				ScheduleErrors1767956657626,
				RunMetrics1768636545550,
			],
			logging: true,
			logger: 'debug',
		};
	}
}
