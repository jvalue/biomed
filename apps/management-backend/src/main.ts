import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap(): Promise<INestApplication> {
	const app = await NestFactory.create(AppModule);
	app.setGlobalPrefix('api/v1');
	app.enableCors({
		origin: 'http://localhost:4201',
	});
	return app;
}

export const viteNodeApp = bootstrap();
if (process.env.NODE_ENV !== 'development') {
	viteNodeApp.then(async (app) => {
		await app.listen(process.env.PORT || 3002);
	});
}
