import { ArgumentsHost, Logger } from '@nestjs/common';
import { GqlArgumentsHost, GqlContextType } from '@nestjs/graphql';

import { GraphQLError } from 'graphql';

export interface ExceptionHandler {
  canHandle(exception: unknown): boolean;
  handle(exception: unknown, host: ArgumentsHost): void;
}

export interface ExceptionHandlerOptions {
  shouldLog?: boolean;
}

export abstract class BaseExceptionHandler implements ExceptionHandler {
  protected options: ExceptionHandlerOptions = { shouldLog: true };

  constructor(protected readonly logger: IExceptionLogger) {}

  abstract canHandle(exception: any): boolean;

  protected abstract getResponse(exception: any): {
    status: number;
    body: Record<string, any>;
  };

  handle(exception: any, host: ArgumentsHost): void {
    const contextType = host.getType<GqlContextType>();

    if (contextType === 'graphql') {
      this.handleGraphQL(exception, host);
    } else if (contextType == 'http') {
      this.handleHttp(exception, host);
    }
  }

  protected handleGraphQL(exception: any, host: ArgumentsHost): void {
    const gqlHost = GqlArgumentsHost.create(host);
    const ctx = gqlHost.getContext();
    const requestId = ctx.req?.requestId;

    if (this.options.shouldLog) {
      this.logger.error('GraphQL Exception occurred', {
        requestId,
        message: exception.message,
        details: exception.details,
        stack: exception.stack,
      });
    }

    const { status, body } = this.getResponse(exception);

    throw new GraphQLError(body.message, {
      extensions: {
        status,
        errors: body.errors || null,
        requestId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  protected handleHttp(exception: any, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const requestId = request.requestId;

    if (this.options.shouldLog) {
      this.logger.error('HTTP Exception occurred', {
        requestId,
        method: request.method,
        url: request.originalUrl,
        name: exception.name || 'Error',
        message: exception.message,
        details: exception.details,
        stack: exception.stack,
      });
    }

    const { status, body } = this.getResponse(exception);

    response.status(status).json({
      success: false,
      ...body,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }
}

export interface IExceptionLogger {
  error(message: string, data?: Record<string, any>): void;
}

export class NestLoggerAdapter implements IExceptionLogger {
  private readonly logger: Logger;

  constructor(context?: string) {
    this.logger = new Logger(context || 'Exception');
  }

  error(message: string, data?: Record<string, any>): void {
    this.logger.error(data ? { message, ...data } : message);
  }
}
