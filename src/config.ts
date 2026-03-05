import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  ODOO_URL: z.string().url(),
  ODOO_DB: z.string(),
  ODOO_USERNAME: z.string(),
  ODOO_PASSWORD: z.string(),

  ERPNEXT_URL: z.string().url(),
  ERPNEXT_API_KEY: z.string(),
  ERPNEXT_API_SECRET: z.string(),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("Environment Validation Failed:");
  console.error(result.error.issues);
  process.exit(1);
}

export const env = result.data;
