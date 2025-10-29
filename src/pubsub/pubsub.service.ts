import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis, { RedisOptions } from 'ioredis';
import { getRedisConfig } from 'src/config/redis.config';

@Injectable()
export class PubSubService implements OnModuleInit {
  private pubSub: RedisPubSub | PubSub;
  private readonly logger = new Logger(PubSubService.name);

  onModuleInit() {
    const { host, port } = getRedisConfig();

    try {
      const options: RedisOptions = {
        host,
        port,
        retryStrategy(times: number) {
          return Math.min(times * 50, 2000);
        },
      };

      const publisher = new Redis(options);
      const subscriber = new Redis(options);

      publisher.on('error', (e) =>
        this.logger.error('Redis publisher error', e),
      );
      subscriber.on('error', (e) =>
        this.logger.error('Redis subscriber error', e),
      );

      this.pubSub = new RedisPubSub({
        publisher,
        subscriber,
      });
    } catch (error) {
      this.logger.error(error);
      this.pubSub = new PubSub();
    }
  }

  publish(trigger: string, payload: any) {
    return this.pubSub.publish(trigger, payload);
  }

  asyncIterator(trigger: string) {
    return this.pubSub.asyncIterator(trigger);
  }
}
