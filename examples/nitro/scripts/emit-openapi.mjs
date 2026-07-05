// Boot the built server, snapshot /_openapi.json, write it to disk.
// This is the "build artifact" half of the RFC: nitro build → openapi.json → SDK codegen.
import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";

const port = process.env.PORT || 3210;
const child = spawn("node", [".output/server/index.mjs"], {
  env: { ...process.env, PORT: String(port), NITRO_PORT: String(port) },
  stdio: ["ignore", "ignore", "inherit"],
});

try {
  let spec;
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`http://localhost:${port}/_openapi.json`);
      if (res.ok) {
        spec = await res.json();
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  if (!spec) throw new Error("Server did not respond on /_openapi.json");
  await writeFile("openapi.json", JSON.stringify(spec, null, 2) + "\n");
  console.log(
    `✔ openapi.json written — ${Object.keys(spec.paths).length} paths, ` +
      `${Object.keys(spec.components?.schemas || {}).length} component schemas`,
  );
} finally {
  child.kill();
}
