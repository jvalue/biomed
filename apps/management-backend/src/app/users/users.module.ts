import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AbilityFactory } from '../auth/ability-factory';
import { UserEntity } from './entity/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
	imports: [TypeOrmModule.forFeature([UserEntity])],
	controllers: [UsersController],
	providers: [UsersService, AbilityFactory],
	exports: [UsersService],
})
export class UsersModule {}
