import { Catch, ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { ServerExceptionHandler } from '../exceptions/server';
import {
  ClientExceptionHandler,
  SerializationHandler,
} from '../exceptions/client';
import { ExceptionHandler, NestLoggerAdapter } from '../exceptions/interface';
import { getAppConfig } from 'src/config/app.config';
import { Environments } from '../enum';

@Catch()
export class AppFilter implements ExceptionFilter {
  private readonly handlers: ExceptionHandler[];

  constructor() {
    const { environment } = getAppConfig();
    const isProduction = environment == Environments.PRODUCTION;

    this.handlers = [
      new SerializationHandler(new NestLoggerAdapter('SerializationException')),
      new ClientExceptionHandler(new NestLoggerAdapter('ClientException')),
      new ServerExceptionHandler(
        new NestLoggerAdapter('ServerException'),
        isProduction,
      ),
    ];
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const handler = this.handlers.find((h) => h.canHandle(exception));
    handler!.handle(exception, host);
  }
}
