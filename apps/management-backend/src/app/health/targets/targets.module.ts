import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AbilityFactory } from '../../auth/ability-factory';
import { TargetEntity } from './entity/target.entity';
import { TargetsService } from './targets.service';

@Module({
	imports: [TypeOrmModule.forFeature([TargetEntity])],
	providers: [TargetsService, AbilityFactory],
	exports: [TargetsService],
})
export class TargetsModule {}
