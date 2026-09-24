import { plainToClass } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, validateSync } from 'class-validator';

export class EnvironmentVariables {
	@IsOptional()
	@IsNumber({ maxDecimalPlaces: 0, allowInfinity: false, allowNaN: false })
	PORT?: number = 3002;

	@IsString()
	STAGE!: string;

	@IsString()
	NODE_ENV!: string;

	@IsString()
	DATABASE_HOST!: string;

	@IsNumber({ maxDecimalPlaces: 0, allowInfinity: false, allowNaN: false })
	DATABASE_PORT!: number;

	@IsString()
	DATABASE_USER!: string;

	@IsString()
	DATABASE_PASSWORD!: string;

	@IsString()
	DATABASE_DATABASE!: string;

	@IsString()
	KUBE_BEARER_TOKEN!: string;

	@IsString()
	KUBE_CONFIG_PATH!: string;

	@IsString()
	ARGO_BASE_URL!: string;

	@IsString()
	ADMIN_USERNAME!: string;

	@IsString()
	ADMIN_PASSWORD!: string;

	@IsString()
	JWT_SECRET!: string;

	@IsBoolean()
	ORCHESTRATOR_SYNC_ENABLED!: boolean;
}

export function validate(config: Record<string, unknown>): EnvironmentVariables {
	const validatedConfig = plainToClass(EnvironmentVariables, config, {
		enableImplicitConversion: true,
	});
	const errors = validateSync(validatedConfig, {
		skipMissingProperties: false,
	});

	if (errors.length > 0) {
		throw new Error(errors.toString());
	}
	return validatedConfig;
}
