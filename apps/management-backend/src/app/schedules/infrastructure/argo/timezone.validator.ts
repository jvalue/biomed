import {
	ValidationArguments,
	ValidatorConstraint,
	ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'IsIanaTimezone', async: false })
export class IsIanaTimezone implements ValidatorConstraintInterface {
	validate(value: string, _args: ValidationArguments) {
		if (!value || typeof value !== 'string') {
			return false;
		}

		try {
			new Intl.DateTimeFormat('en-US', { timeZone: value });
			return true;
		} catch {
			return false;
		}
	}

	defaultMessage(_args: ValidationArguments) {
		return 'Invalid timezone. Use a valid IANA timezone such as Europe/Berlin.';
	}
}
