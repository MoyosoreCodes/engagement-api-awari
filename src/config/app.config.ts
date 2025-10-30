import { registerAs } from '@nestjs/config';

import { readFileSync } from 'fs';
import path from 'path';
import { z } from 'zod';

import { Environments } from '../common/enum';
import { validateEnv } from '../common/utils';

const appSchema = z.object({
  NODE_ENV: z.enum(Environments),
  PORT: z.string().nonempty(),
});

function getPackageConfig() {
  const content = readFileSync(
    path.join(__dirname, '..', '..', 'package.json'),
    'utf-8',
  );

  return JSON.parse(content);
}

export type AppConfig = z.infer<typeof appSchema>;

export function getAppConfig() {
  const env: AppConfig = validateEnv(appSchema, 'app');
  const pkg = getPackageConfig();

  const name = pkg.name ?? 'adsVase';
  const version = pkg.version;
  const license = pkg.license;
  const description = pkg.description ?? pkg.name;
  const environment = env.NODE_ENV;

  return {
    name,
    description,
    license,
    version,
    server: {
      port: env.PORT,
    },
    environment,
  };
}

export type ApplicationConfig = ReturnType<typeof getAppConfig>;

export default registerAs('app', (): ApplicationConfig => getAppConfig());
