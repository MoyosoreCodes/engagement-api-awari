import { registerAs } from '@nestjs/config';
import { z } from 'zod';
import { validateEnv } from '../common/utils';

const dbSchema = z.object({
  MONGODB_URI: z.string().nonempty(),
});

type DBConfig = z.infer<typeof dbSchema>;

export function getDbConfig() {
  const env: DBConfig = validateEnv(dbSchema, 'Mongo DB');

  const options: Record<string, any> = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  };

  return {
    uri: env.MONGODB_URI,
    options,
  };
}

export type DatabaseConfig = ReturnType<typeof getDbConfig>;

export default registerAs('database', (): DatabaseConfig => getDbConfig());
