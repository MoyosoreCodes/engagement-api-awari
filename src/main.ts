import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApplicationConfig } from './config/app.config';
import { Environments } from './common/enum';

async function bootstrap() {
  const logger = new Logger();
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const { server, environment } =
    configService.getOrThrow<ApplicationConfig>('app');

  app.use(
    helmet({
      contentSecurityPolicy:
        environment === Environments.DEVELOPMENT ? false : undefined,
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.enableCors({
    origin: [/http(s)?:\/\/localhost:/],
    methods: 'GET,POST',
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Content-Disposition',
      'Accept',
      'Authorization',
      'Cache-control',
      'If-None-Match',
      'Access-Control-Allow-Origin',
    ],
    credentials: true,
  });
  await app.listen(server.port);
  logger.log(
    `Server running on: ${environment === Environments.DEVELOPMENT ? 'http://localhost:' : ''}${server.port}`,
  );
}
bootstrap();
