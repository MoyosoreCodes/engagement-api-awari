import { Injectable, NestMiddleware } from '@nestjs/common';

import { NextFunction, Request, Response } from 'express';
import { v4 as uuidV4 } from 'uuid';

@Injectable()
export class RequestMiddleware implements NestMiddleware {
  use(
    req: Request & { requestId?: string; abortController?: any },
    res: Response,
    next: NextFunction,
  ) {
    const requestId = (req.headers['x-request-id'] as string) || uuidV4();
    const abortController = new AbortController();

    req.requestId = requestId.trim();
    req.abortController = abortController;

    req.on('close', () => {
      abortController.abort();
    });

    res.setHeader('x-request-id', requestId);

    next();
  }
}
