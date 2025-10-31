import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { NextFunction, Request, Response } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  constructor(private readonly configService: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    if (req.originalUrl.includes('/favicon.ico')) next();
    res.on('finish', () => {
      const { environment, version } = this.configService.get('app');
      const { method, originalUrl, body } = req;
      const { statusCode, statusMessage } = res;

      const log = {
        timestamp: new Date().toISOString(),
        level:
          statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info',
        environment,
        version,
        method,
        originalUrl,
        statusCode,
        statusMessage,
        body,
      };

      this.logger.log(JSON.stringify(log));
    });

    next();
  }
}
