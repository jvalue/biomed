import {
	ValidationArguments,
	ValidatorConstraint,
	ValidatorConstraintInterface,
} from 'class-validator';
import { CronExpressionParser } from 'cron-parser';

/**
 * Validator to check if a string is a valid cron expression.
 */
@ValidatorConstraint({ name: 'IsCronExpression', async: false })
export class IsCronExpression implements ValidatorConstraintInterface {
	validate(value: string, _args: ValidationArguments) {
		try {
			CronExpressionParser.parse(value);
			return true;
		} catch {
			return false;
		}
	}

	defaultMessage(_args: ValidationArguments) {
		return 'Invalid cron expression.';
	}
}
