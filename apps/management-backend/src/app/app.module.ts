import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbConfigService } from './db-config.service';
import { DemoModule } from './demo/demo.module';
import { validate } from './env.validation';
import { WorkflowRunsModule } from './workflow-runs/workflow-runs.module';
import { WorkflowTemplatesModule } from './workflow-templates/workflow-templates.module';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			validate,
		}),
		TypeOrmModule.forRootAsync({
			imports: [ConfigModule],
			useClass: DbConfigService,
		}),
		DemoModule,
		WorkflowRunsModule,
		WorkflowTemplatesModule,
	],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}
