import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  constructor(private readonly configService: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const isGraphQL = req.originalUrl?.includes('/graphql');

    if (isGraphQL) {
      next();
      return;
    }

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
