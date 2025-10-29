import { ZodError, ZodType } from 'zod';

type ValidationResult<T> = {
  data: T | null;
  error: null | string | Record<string, string>;
};

export function validate<T>(
  schema: ZodType<T>,
  payload: unknown,
  allowEmptyPayload = false,
): ValidationResult<T> {
  const isEmpty =
    payload == null ||
    (typeof payload === 'object' &&
      !Array.isArray(payload) &&
      Object.keys(payload as Record<string, unknown>).length === 0);

  if (!allowEmptyPayload && isEmpty) {
    return { data: null, error: 'Payload is empty' };
  }

  const result = schema.safeParse(payload);
  if (result.success) return { data: result.data, error: null };

  const errorObj = handleZodError(result.error);
  return { data: null, error: errorObj };
}

export function handleZodError(error: unknown) {
  return error instanceof ZodError
    ? error.issues.reduce<Record<string, string>>((acc, { path, message }) => {
        if (path.length) acc[String(path[0])] = message;
        return acc;
      }, {})
    : null;
}

export function validateEnv<T>(schema: ZodType<T>, configName?: string): T {
  const { data, error } = validate(schema, process.env, false);
  if (data) return data;

  let errorMessage =
    '\n!IMPORTANT check .env file to fix errors below. \n';
  errorMessage += configName
    ? `Error validating ${configName} configuration`
    : 'Error validating configuration';

  console.error(errorMessage);
  console.error(error);
  process.exit(1);
}

export const trimRecursive = <K>(obj: K): K => {
  if (!obj) return obj;

  if (Buffer.isBuffer(obj)) return obj;

  if (typeof obj === 'string') return obj.trim() as K;

  if (Array.isArray(obj)) return obj.map((x) => trimRecursive(x)) as K;

  if (typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, curr) => {
      acc[curr] = obj[curr] && trimRecursive(obj[curr]);

      return acc;
    }, {}) as K;
  }

  return obj;
};