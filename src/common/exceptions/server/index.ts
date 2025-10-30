import { HttpException, HttpStatus } from '@nestjs/common';

import { BaseExceptionHandler, IExceptionLogger } from '../interface';

export abstract class ServerException extends HttpException {
  constructor(message = 'Internal Server Error', details?: unknown) {
    super({ message, details }, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

export class ServerExceptionHandler extends BaseExceptionHandler {
  constructor(
    logger: IExceptionLogger,
    private readonly isProduction: boolean,
  ) {
    super(logger);
  }

  canHandle(): boolean {
    return true;
  }

  protected getResponse(exception: any) {
    const status = exception.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR;

    return {
      status,
      body: {
        message: this.isProduction
          ? 'Something went wrong, please try again later.'
          : exception.message || 'Internal Server Error',
        errors: this.isProduction ? null : exception.details || null,
      },
    };
  }
}
