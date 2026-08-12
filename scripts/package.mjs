import { cp, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const manifest = JSON.parse(await readFile(join(root, "manifest.json"), "utf8"));
const dist = join(root, "dist");
const stage = await mkdtemp(join(tmpdir(), "webmeld-package-"));
const output = join(dist, `webmeld-${manifest.version}.zip`);

const runtimeFiles = [
  "manifest.json",
  "background.js",
  "content.js",
  "content.css"
];

try {
  await mkdir(dist, { recursive: true });
  await rm(output, { force: true });
  for (const relativePath of runtimeFiles) {
    await cp(join(root, relativePath), join(stage, basename(relativePath)));
  }
  await mkdir(join(stage, "assets"), { recursive: true });
  await cp(join(root, "assets", "icons"), join(stage, "assets", "icons"), { recursive: true });

  const result = spawnSync("zip", ["-qr", output, "."], { cwd: stage, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`zip exited with status ${result.status}`);
  console.log(`Created ${output}`);
} finally {
  await rm(stage, { recursive: true, force: true });
}
