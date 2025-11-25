import { plainToClass } from 'class-transformer';
import { IsNumber, IsString, validateSync } from 'class-validator';

export class EnvironmentVariables {
	@IsNumber({ maxDecimalPlaces: 0, allowInfinity: false, allowNaN: false })
	PORT!: number;

	@IsString()
	STAGE!: string;

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
	ARGO_BASE_URL!: string;
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
