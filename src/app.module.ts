import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';

import serverConfig from './config';
import { APP_PIPE } from '@nestjs/core';
import { MultiValidationPipe, TrimWhitespacePipe } from './common/pipes';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
      load: [...serverConfig],
      envFilePath: '.env'
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
    EventEmitter2.fo
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
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
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useFactory: () => new MultiValidationPipe([new TrimWhitespacePipe()]),
    },
  ],
})
export class AppModule {}
