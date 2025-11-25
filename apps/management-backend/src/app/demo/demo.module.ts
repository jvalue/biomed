import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArgoClientModule } from '../argo-client/argo-client.module';
import { DemoController } from './demo.controller';
import { DemoService } from './demo.service';
import { DemoEntity } from './entity/demo.entity';

@Module({
	imports: [TypeOrmModule.forFeature([DemoEntity]), ArgoClientModule],
	controllers: [DemoController],
	providers: [DemoService],
})
export class DemoModule {}
