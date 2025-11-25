import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap(): Promise<INestApplication> {
	const app = await NestFactory.create(AppModule);
	app.setGlobalPrefix('api/v1');
	return app;
}

export const viteNodeApp = bootstrap();
console.log(process.env.NODE_ENV);
if (process.env.NODE_ENV !== 'development') {
	viteNodeApp.then(async (app) => {
		await app.listen(process.env.PORT || 3002);
	});
}
