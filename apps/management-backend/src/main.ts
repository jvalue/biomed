import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap(): Promise<INestApplication> {
	const app = await NestFactory.create(AppModule);
	app.setGlobalPrefix('api/v1');
	return app;
}

export const viteNodeApp = bootstrap();
