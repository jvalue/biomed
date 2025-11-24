import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import { DemoEntity } from './demo/entity/demo.entity';
import { EnvironmentVariables } from './env.validation';
import { Demo1763983398209 } from './migrations/1763983398209-Demo';

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
			entities: [DemoEntity],
			metadataTableName: 'typeorm_metadata_biomed',

			migrationsTableName: 'migrations_biomed',
			migrationsRun: true,
			migrations: [Demo1763983398209],
			logging: true,
			logger: 'debug',
		};
	}
}
