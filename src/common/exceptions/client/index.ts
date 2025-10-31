import { HttpException, HttpStatus } from '@nestjs/common';

import { ZodSerializationException } from 'nestjs-zod';

import { handleZodError } from '../../../common/utils';
import { BaseExceptionHandler, IExceptionLogger } from '../interface';

export abstract class ClientException extends HttpException {
  constructor(
    message: string,
    details?: unknown,
    statusCode = HttpStatus.BAD_REQUEST,
  ) {
    super({ message, details }, statusCode);
  }
}

export class PayloadValidationException extends ClientException {
  constructor(errors: any) {
    super('Payload validation failed', errors, HttpStatus.PRECONDITION_FAILED);
  }
}

export class ClientExceptionHandler extends BaseExceptionHandler {
  constructor(logger: IExceptionLogger) {
    super(logger);
    this.options.shouldLog = true;
  }

  canHandle(exception: unknown): boolean {
    return exception instanceof HttpException && exception.getStatus() < 500;
  }

  protected getResponse(exception: HttpException) {
    const status = exception.getStatus();
    const response = exception.getResponse();
    const resBody =
      typeof response === 'string' ? { message: response } : (response as any);

    return {
      status,
      body: {
        message: resBody.message || exception.message,
        errors: resBody.details || resBody.error || null,
      },
    };
  }
}

export class SerializationHandler extends BaseExceptionHandler {
  constructor(logger: IExceptionLogger) {
    super(logger);
    this.options.shouldLog = true;
  }

  canHandle(exception: unknown): boolean {
    return exception instanceof ZodSerializationException;
  }

  protected getResponse(exception: ZodSerializationException) {
    const error = exception.getZodError();
    const errors = handleZodError(error);

    return {
      status: HttpStatus.BAD_REQUEST,
      body: {
        message: 'Serialization failed',
        errors,
      },
    };
  }
}
