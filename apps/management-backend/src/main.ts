import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';

async function bootstrap(): Promise<INestApplication> {
	const app = await NestFactory.create(AppModule, {
		// We want to see logs of the following levels
		logger:
			process.env.NODE_ENV === 'production'
				? ['fatal', 'error', 'warn', 'log']
				: ['fatal', 'error', 'warn', 'log', 'debug'],
	});

	// Used to validate data
	app.useGlobalPipes(
		new ValidationPipe({
			transform: true,
		}),
	);

	app.setGlobalPrefix('api/v1');
	app.enableCors({
		origin: 'http://localhost:4201',
	});
	// Swagger setup
	const config = new DocumentBuilder()
		.setTitle('Crawler Management Backend')
		.setVersion('1.0')
		.build();
	const documentFactory = () => SwaggerModule.createDocument(app, config);
	SwaggerModule.setup('api/v1/docs', app, documentFactory);

	return app;
}

export const viteNodeApp = bootstrap();
if (process.env.NODE_ENV !== 'development') {
	viteNodeApp.then(async (app) => {
		await app.listen(process.env.PORT || 3002);
	});
}
