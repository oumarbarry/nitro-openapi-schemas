import { defineHandler } from "h3";
// @ts-expect-error virtual module provided by ../index.ts
import { routes, config } from "#nitro-openapi-schemas";
import { toOpenAPIDocument, type RouteEntry } from "./generator.ts";

let cached: Promise<Record<string, any>> | undefined;

export default defineHandler((event) => {
  // ponytail: first request's origin wins the servers[] entry; fine for a spec route
  const origin = new URL(event.req.url).origin;
  return (cached ??= toOpenAPIDocument(routes as RouteEntry[], {
    info: config.info,
    servers: [{ url: origin }],
  }));
});
