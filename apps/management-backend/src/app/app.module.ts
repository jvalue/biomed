import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminBootstrapService } from './auth/admin-bootstrap.service';
import { AuthModule } from './auth/auth.module';
import { DbConfigService } from './db-config.service';
import { DemoModule } from './demo/demo.module';
import { validate } from './env.validation';
import { SchedulesModule } from './schedules/schedules.module';
import { UsersModule } from './users/users.module';
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
		UsersModule,
		AuthModule,
		WorkflowRunsModule,
		WorkflowTemplatesModule,
		SchedulesModule,
	],
	controllers: [AppController],
	providers: [AppService, AdminBootstrapService],
})
export class AppModule {}
