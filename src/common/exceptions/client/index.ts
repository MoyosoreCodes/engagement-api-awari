import { HttpException, HttpStatus } from '@nestjs/common';

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
    super(
      'Payload validation failed',
      { errors },
      HttpStatus.PRECONDITION_FAILED,
    );
  }
}
