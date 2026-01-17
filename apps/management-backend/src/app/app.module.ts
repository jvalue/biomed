import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminBootstrapService } from './auth/admin-bootstrap.service';
import { AuthModule } from './auth/auth.module';
import { CrawlerRunsModule } from './crawler-runs/crawler-runs.module';
import { CrawlerTemplatesModule } from './crawler-templates/crawler-templates.module';
import { DbConfigService } from './db-config.service';
import { DemoModule } from './demo/demo.module';
import { validate } from './env.validation';
import { HealthModule } from './health/health.module';
import { TargetsModule } from './health/targets/targets.module';
import { KubernetesClientModule } from './kubernetes-client/kubernetes-client.module';
import { CrawlerRunMetricsModule } from './metrics/crawler-run-metrics/crawler-run-metrics.module';
import { OrchestratorSyncModule } from './orchestrator-sync/orchestrator-sync.module';
import { SchedulesModule } from './schedules/schedules.module';
import { UsersModule } from './users/users.module';

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
		CrawlerRunsModule,
		CrawlerTemplatesModule,
		SchedulesModule,
		HealthModule,
		TargetsModule,
		KubernetesClientModule,
		OrchestratorSyncModule,
		CrawlerRunMetricsModule,
	],
	controllers: [AppController],
	providers: [AppService, AdminBootstrapService],
})
export class AppModule {}
