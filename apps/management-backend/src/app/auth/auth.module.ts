import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { AbilityFactory } from './ability-factory';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ApiKeyEntity } from './entity/api-key.entity';
import { PermissionsGuard } from './guards/permissions.guard';
import { ApiKeyStrategy } from './strategies/api-key.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

@Global()
@Module({
	imports: [
		TypeOrmModule.forFeature([ApiKeyEntity]),
		UsersModule,
		PassportModule.register({ defaultStrategy: 'jwt' }),
		JwtModule.registerAsync({
			imports: [ConfigModule],
			useFactory: (configService: ConfigService) => {
				const secret = configService.get<string>('JWT_SECRET');
				if (!secret) {
					throw new Error('JWT_SECRET is required');
				}
				return {
					secret,
					signOptions: {
						expiresIn: '30m',
					},
				};
			},
			inject: [ConfigService],
		}),
	],
	controllers: [AuthController],
	providers: [AuthService, JwtStrategy, ApiKeyStrategy, AbilityFactory, PermissionsGuard],
	exports: [AbilityFactory, JwtModule, PermissionsGuard],
})
export class AuthModule {}
