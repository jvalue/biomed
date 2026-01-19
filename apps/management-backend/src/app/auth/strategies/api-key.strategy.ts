import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { HeaderAPIKeyStrategy } from 'passport-headerapikey';
import { AuthService } from '../auth.service';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(HeaderAPIKeyStrategy, 'api-key') {
	constructor(private readonly authService: AuthService) {
		super({ header: 'X-API-KEY', prefix: '' }, false);
	}

	async validate(apiKey: string): Promise<boolean> {
		const validatedKey = await this.authService.validateApiKey(apiKey);
		if (!validatedKey) {
			throw new UnauthorizedException('Invalid API Key');
		}
		return true;
	}
}
