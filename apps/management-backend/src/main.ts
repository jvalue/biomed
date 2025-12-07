import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';

async function bootstrap(): Promise<INestApplication> {
	const app = await NestFactory.create(AppModule);
	app.setGlobalPrefix('api/v1');
	app.enableCors({
		origin: 'http://localhost:4201',
	});
	const config = new DocumentBuilder()
		.setTitle('Crawler Management Backend')
		.setVersion('1.0')
		.build();
	const documentFactory = () => SwaggerModule.createDocument(app, config);
	SwaggerModule.setup('crawler-management-backend/api', app, documentFactory);

	return app;
}

export const viteNodeApp = bootstrap();
if (process.env.NODE_ENV !== 'development') {
	viteNodeApp.then(async (app) => {
		await app.listen(process.env.PORT || 3002);
	});
}
