import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

import { ZodType } from 'zod';

import {
  ClientException,
  PayloadValidationException,
} from '../exceptions/client';
import { trimRecursive, validate } from '../utils';

export class TrimWhitespacePipe implements PipeTransform {
  transform(value: any, _metadata: ArgumentMetadata) {
    return trimRecursive(value);
  }
}

export class AppValidationPipe<T> implements PipeTransform<T> {
  constructor(
    private readonly schema: ZodType<T>,
    private readonly exception: new (errors: unknown) => ClientException,
  ) {}

  transform(value: unknown, _metadata: ArgumentMetadata): T {
    const { data, error } = validate(this.schema, value);
    if (!error && data) return data;
    throw new this.exception(error);
  }
}

@Injectable()
export class MultiValidationPipe implements PipeTransform {
  constructor(private readonly validators: PipeTransform[]) {}

  async transform(value: any, metadata: ArgumentMetadata) {
    let currentValue = value;

    for (const validator of this.validators) {
      currentValue = await validator.transform(currentValue, metadata);
    }

    return currentValue;
  }
}

export class PayloadValidationPipe<T> extends AppValidationPipe<T> {
  constructor(schema: ZodType<T>) {
    super(schema, PayloadValidationException);
  }
}
