import { defineBuildConfig } from "obuild/config";

export default defineBuildConfig({
  entries: [
    // Node-side Nitro module + the h3 v1 shim: bundle to dist/*.mjs (+ .d.mts).
    { type: "bundle", input: ["./src/index.ts", "./src/h3.ts"] },
    // Runtime handlers are loaded by Nitro via file URL and transpiled in the
    // consumer build, so ship them as-is (keeps the `.ts` paths in index.ts +
    // route.ts valid). oxc just re-emits; no bundling. dts: false, the runtime is
    // never imported for types, so skip the unused .d.mts (and its TS9037 noise).
    { type: "transform", input: "./src/runtime", outDir: "./dist/runtime", dts: false },
  ],
});
