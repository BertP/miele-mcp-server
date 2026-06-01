import { z } from 'zod';
import * as dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  MIELE_CLIENT_ID: z.string().min(1, "MIELE_CLIENT_ID is required"),
  MIELE_CLIENT_SECRET: z.string().min(1, "MIELE_CLIENT_SECRET is required"),
  MIELE_REDIRECT_URI: z.string().url("MIELE_REDIRECT_URI must be a valid URL"),
  MIELE_AUTH_URL: z.string().url(),
  MIELE_TOKEN_URL: z.string().url(),
  MIELE_API_BASE_URL: z.string().url().optional(),
  MIELE_SCOPES: z.string().default('openid mcs_thirdparty_read'),
  DATABASE_PATH: z.string().default('./miele-mcp.sqlite'),
  SESSION_SECRET: z.string().min(8, "SESSION_SECRET must be at least 8 characters long"),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Config = z.infer<typeof envSchema>;

let config: Config;

try {
  config = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Invalid environment variables:');
    error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }
  throw error;
}

export { config };
