/**
 * h3 v1 compat shim: h3 v1 has no `defineValidatedHandler` and no Standard
 * Schema support, so this package ships its own: it validates query/headers/
 * body with the schemas' own `~standard.validate` (400 on failure) and
 * attaches `validate` + `meta` onto the handler function, where the spec
 * route reads them at runtime (same contract as h3 v2 / the main branch).
 *
 * App routes import it from `nitro-openapi-schemas/h3`, the v2 counterpart
 * of `nitro/h3` on the v3 line.
 */
import { createError, defineEventHandler, getQuery, getRequestHeaders, readBody } from "h3";
import type {
  EventHandler,
  EventHandlerObject,
  EventHandlerRequest,
  EventHandlerResponse,
} from "h3";

interface StandardSchema {
  "~standard": {
    vendor: string;
    version: number;
    validate: (
      value: unknown,
    ) =>
      | { value: unknown; issues?: undefined }
      | { issues: readonly unknown[] }
      | Promise<{ value: unknown; issues?: undefined } | { issues: readonly unknown[] }>;
  };
}

export interface ValidateSchemas {
  body?: StandardSchema;
  query?: StandardSchema;
  headers?: StandardSchema;
}

export interface HandlerMeta {
  openAPI?: Record<string, any>;
  [key: string]: unknown;
}

export type ValidatedHandler<
  Request extends EventHandlerRequest = EventHandlerRequest,
  Response = EventHandlerResponse,
> = EventHandler<Request, Response> & { validate?: ValidateSchemas; meta?: HandlerMeta };

export function defineValidatedHandler<
  Request extends EventHandlerRequest = EventHandlerRequest,
  Response = EventHandlerResponse,
>(
  def: EventHandlerObject<Request, Response> & {
    validate?: ValidateSchemas;
    meta?: HandlerMeta;
  },
): ValidatedHandler<Request, Response> {
  const { validate, meta } = def;
  const handler = defineEventHandler<Request, any>({
    ...def,
    handler: async (event) => {
      if (validate?.query) {
        await validatePart(validate.query, getQuery(event), "query");
      }
      if (validate?.headers) {
        await validatePart(validate.headers, getRequestHeaders(event), "headers");
      }
      if (validate?.body && event.method !== "GET" && event.method !== "HEAD") {
        await validatePart(validate.body, await readBody(event), "body");
      }
      return def.handler(event);
    },
  });
  return Object.assign(handler, { validate, meta });
}

async function validatePart(schema: StandardSchema, value: unknown, part: string): Promise<void> {
  const result = await schema["~standard"].validate(value);
  if (result.issues) {
    throw createError({
      status: 400,
      statusMessage: "Validation Error",
      message: `Invalid ${part}`,
      data: result.issues,
    });
  }
}
