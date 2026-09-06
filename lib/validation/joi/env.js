import Joi from 'joi';

/**
 * SERVER-ONLY env validation, run once at boot.
 *
 * This is the boundary between Joi and Zod in this codebase:
 *
 *   Joi  →  server-only config that never reaches a browser (this file).
 *   Zod  →  anything crossing the network or touching the client:
 *           forms, Server Actions, route handler bodies, webhook payloads.
 *
 * Never validate the same shape in both. Two schemas for one thing drift,
 * and the one that drifts is always the one guarding the money.
 *
 * Joi is ~145KB and Node-only, so it must never be imported from a Client
 * Component. If you find yourself wanting Joi on the client, use Zod.
 */
const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),

  NEXT_PUBLIC_SITE_URL: Joi.string().uri().required(),

  DATABASE_URL: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }).required(),
  REDIS_URL: Joi.string().uri({ scheme: ['redis', 'rediss'] }).optional(),

  RAZORPAY_KEY_ID: Joi.string().allow('').optional(),
  RAZORPAY_KEY_SECRET: Joi.string().allow('').optional(),
  RAZORPAY_WEBHOOK_SECRET: Joi.string().allow('').optional(),

  WHATSAPP_API_TOKEN: Joi.string().allow('').optional(),
  WHATSAPP_PHONE_ID: Joi.string().allow('').optional(),
})
  .unknown(true)
  .required();

let cached;

export function getEnv() {
  if (cached) return cached;

  const { value, error } = envSchema.validate(process.env, {
    abortEarly: false,
    stripUnknown: false,
  });

  if (error) {
    const details = error.details.map((d) => `  · ${d.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  cached = value;
  return cached;
}
