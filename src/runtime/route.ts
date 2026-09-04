import { defineEventHandler, getRequestURL } from "h3";
// @ts-expect-error virtual module provided by ../index.ts
import { routes, config } from "#nitro-openapi-schemas";
import { toOpenAPIDocument, type RouteEntry } from "./generator.ts";

let cached: Promise<Record<string, any>> | undefined;

export default defineEventHandler((event) => {
  // The first request's origin becomes the servers[] entry, the document is cached after that.
  const origin = getRequestURL(event).origin;
  return (cached ??= toOpenAPIDocument(routes as RouteEntry[], {
    info: config.info,
    servers: [{ url: origin }],
  }));
});
