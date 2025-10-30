import { PubSub } from 'graphql-subscriptions';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis, { RedisOptions } from 'ioredis';
import { Logger } from '@nestjs/common';
import { getRedisConfig } from '../../config/redis.config';

const logger = new Logger('PubSub');

function initializePubSub(): RedisPubSub | PubSub {
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

    publisher.on('error', (e) => logger.error('Redis publisher error', e));
    subscriber.on('error', (e) => logger.error('Redis subscriber error', e));

    return new RedisPubSub({
      publisher,
      subscriber,
    });
  } catch (error) {
    logger.error(error);
    return new PubSub();
  }
}

export const redisPubSub = initializePubSub();
