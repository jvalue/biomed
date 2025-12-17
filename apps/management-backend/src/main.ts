import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app/app.module';

async function bootstrap(): Promise<INestApplication> {
	const app = await NestFactory.create(AppModule, {
		// We want to see logs of the following levels
		logger:
			process.env.NODE_ENV === 'production'
				? ['fatal', 'error', 'warn', 'log']
				: ['fatal', 'error', 'warn', 'log', 'debug'],
	});

	app.enableCors({
		origin: 'http://localhost:4201',
		credentials: true,
		methods: ['OPTIONS', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
		allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
		exposedHeaders: ['Set-Cookie'],
		optionsSuccessStatus: 204,
	});

	// Cookie parser to read cookies from requests
	app.use(cookieParser());

	// Used to validate data
	app.useGlobalPipes(
		new ValidationPipe({
			transform: true,
		}),
	);

	app.setGlobalPrefix('api/v1');

	// Swagger setup
	const config = new DocumentBuilder()
		.setTitle('Crawler Management Backend')
		.setVersion('1.0')
		.addBearerAuth(
			{
				type: 'http',
				scheme: 'bearer',
				bearerFormat: 'JWT',
				in: 'header',
			},
			'bearer',
		)
		.build();
	const documentFactory = () => {
		const doc = SwaggerModule.createDocument(app, config);
		// Add global security requirement
		doc.security = [{ bearer: [] }];
		return doc;
	};

	SwaggerModule.setup('api/v1/docs', app, documentFactory, {
		swaggerOptions: {
			persistAuthorization: true,
		},
	});

	return app;
}

export const viteNodeApp = bootstrap();
if (process.env.NODE_ENV !== 'development') {
	viteNodeApp.then(async (app) => {
		await app.listen(process.env.PORT || 3002);
	});
}
