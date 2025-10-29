import { registerAs } from '@nestjs/config';
import { z } from 'zod';
import { validateEnv } from '../common/utils';

const redisSchema = z.object({
  REDIS_HOST: z.string().nonempty(),
  REDIS_PORT: z.string().nonempty(),
});

type RedisENV = z.infer<typeof redisSchema>;

export function getRedisConfig() {
  const env: RedisENV = validateEnv(redisSchema, 'redis');

  return {
    host: env.REDIS_HOST,
    port: parseInt(env.REDIS_PORT, 10),
    url: `redis://${env.REDIS_HOST}:${env.REDIS_PORT}`,
  };
}

export type RedisConfig = ReturnType<typeof getRedisConfig>;

export default registerAs('redis', (): RedisConfig => getRedisConfig());