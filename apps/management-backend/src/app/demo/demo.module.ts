import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DemoController } from './demo.controller';
import { DemoService } from './demo.service';
import { DemoEntity } from './entity/demo.entity';

@Module({
	imports: [TypeOrmModule.forFeature([DemoEntity])],
	controllers: [DemoController],
	providers: [DemoService],
})
export class DemoModule {}
