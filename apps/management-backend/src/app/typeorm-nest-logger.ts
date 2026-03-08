import { Logger } from '@nestjs/common';
import { QueryRunner, Logger as TypeOrmLoggerInterface } from 'typeorm';

/**
 * Custom TypeORM logger that integrates with NestJS's logging system.
 */
export class TypeOrmNestLogger implements TypeOrmLoggerInterface {
	private readonly logger = new Logger('TypeORM');

	logQuery(query: string, parameters?: unknown[], _queryRunner?: QueryRunner) {
		const params = parameters?.length ? ` -- Parameters: ${JSON.stringify(parameters)}` : '';
		this.logger.debug(`Query: ${query}${params}`);
	}

	logQueryError(
		error: string | Error,
		query: string,
		parameters?: unknown[],
		_queryRunner?: QueryRunner,
	) {
		const params = parameters?.length ? ` -- Parameters: ${JSON.stringify(parameters)}` : '';
		this.logger.error(`Query Error: ${error} -- Query: ${query}${params}`);
	}

	logQuerySlow(time: number, query: string, parameters?: unknown[], _queryRunner?: QueryRunner) {
		const params = parameters?.length ? ` -- Parameters: ${JSON.stringify(parameters)}` : '';
		this.logger.warn(`Slow Query: ${time}ms -- Query: ${query}${params}`);
	}

	logSchemaBuild(message: string, _queryRunner?: QueryRunner) {
		this.logger.debug(`Schema Build: ${message}`);
	}

	logMigration(message: string, _queryRunner?: QueryRunner) {
		this.logger.log(`Migration: ${message}`);
	}

	log(level: 'log' | 'info' | 'warn', message: unknown, _queryRunner?: QueryRunner) {
		switch (level) {
			case 'log':
				this.logger.log(message);
				break;
			case 'info':
				this.logger.debug(message);
				break;
			case 'warn':
				this.logger.warn(message);
				break;
		}
	}
}
