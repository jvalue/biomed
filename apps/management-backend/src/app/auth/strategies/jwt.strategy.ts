import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { UserStatus } from '../enums/user-status.enum';

// Defines User Information in JWT Token
interface JwtPayload {
	// User id
	sub: string;
	username: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor(
		private readonly configService: ConfigService,
		private readonly usersService: UsersService,
	) {
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			secretOrKey: configService.get('JWT_SECRET') || 'your-secret-key',
			ignoreExpiration: false,
		});
	}

	async validate(payload: JwtPayload) {
		const user = await this.usersService.findById(payload.sub);

		if (!user || user.status !== UserStatus.ACTIVE) {
			throw new UnauthorizedException('User not active');
		}

		return user;
	}
}
