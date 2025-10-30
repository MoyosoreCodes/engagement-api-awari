import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { GraphQLModule } from '@nestjs/graphql';
import { MongooseModule } from '@nestjs/mongoose';

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
      subscriptions: {
        'graphql-ws': true,
        'subscriptions-transport-ws': true,
      },
      context: ({ req, connection }) => {
        if (connection) return { req: connection.context };
        return { req };
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
