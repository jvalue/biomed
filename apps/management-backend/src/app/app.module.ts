import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { validate } from 'class-validator';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbConfigService } from './db-config.service';

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
	],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}
