/*
This file is used by typeorm to generate migrations in nx scripts.
 */

import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';

import { DbConfigService } from './app/db-config.service';
import { validate } from './app/env.validation';

config();

const validatedConfig = validate(process.env);
const configService = new ConfigService(validatedConfig) as ConfigService<
	typeof validatedConfig,
	true
>;

export default new DataSource(new DbConfigService(configService).createTypeOrmOptions());
