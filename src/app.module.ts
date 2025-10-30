import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { PostModule } from './post/post.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MultiValidationPipe, TrimWhitespacePipe } from './common/pipes';
import { AppEventEmitter } from './common/events/event-emitter.service';
import serverConfig from './config';
import { AppFilter } from './common/filters/app.filter';

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
      useClass: AppFilter
    }
  ],
  exports: [AppEventEmitter],
})
export class AppModule {}
