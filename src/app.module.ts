import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { GraphQLModule } from '@nestjs/graphql';
import { MongooseModule } from '@nestjs/mongoose';
import { v4 as uuidV4 } from 'uuid';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppEventEmitter } from './common/events/event-emitter.service';
import { AppFilter } from './common/filters/app.filter';
import { MultiValidationPipe, TrimWhitespacePipe } from './common/pipes';
import serverConfig from './config';
import { PostModule } from './post/post.module';
import { RequestMiddleware } from './common/middleware/request.middleware';
import { LoggerMiddleware } from './common/middleware/logger.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
      load: [...serverConfig],
      envFilePath: '.env',
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const db = configService.get('database') as {
          uri: string;
          options?: Record<string, any>;
        };
        return {
          uri: db.uri,
          ...(db.options || {}),
        };
      },
    }),
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      maxListeners: 10,
    }),

    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      sortSchema: true,
      graphiql: true,
      formatError: (error) => ({
        success: false,
        status: error.extensions?.status || 500,
        message: error.message,
        errors: error.extensions?.errors || null,
        requestId: error.extensions?.requestId,
        timestamp: error.extensions?.timestamp,
      }),
      subscriptions: {
        'graphql-ws': {
          onConnect: (context) => {
            const headers = context.connectionParams || {};
            const requestId = headers['x-request-id'] || uuidV4();

            return {
              headers,
              requestId,
            };
          },
        },
        'subscriptions-transport-ws': {
          onConnect: (connectionParams) => {
            const headers = connectionParams || {};
            const requestId = headers['x-request-id'] || uuidV4();

            return {
              headers,
              requestId,
            };
          },
        },
      },
      context: ({ req, extra }) => {
        if (req) {
          const requestId = (req.headers['x-request-id'] as string) || uuidV4();
          req.requestId = requestId?.trim();
          return { req };
        }

        if (extra && extra.requestId)
          return {
            req: { headers: extra.headers, requestId: extra.requestId },
          };

        return { req: { headers: {}, requestId: uuidV4() } };
      },
    }),
    PostModule,
  ],
  controllers: [AppController],
  providers: [
    AppEventEmitter,
    AppService,
    {
      provide: APP_PIPE,
      useFactory: () => new MultiValidationPipe([new TrimWhitespacePipe()]),
    },
    {
      provide: APP_FILTER,
      useClass: AppFilter,
    },
  ],
  exports: [AppEventEmitter],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestMiddleware, LoggerMiddleware).forRoutes('*');
  }
}
