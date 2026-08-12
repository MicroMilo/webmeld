import { readFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function exists(relativePath) {
  try {
    await stat(join(root, relativePath));
    return true;
  } catch {
    return false;
  }
}

function pngDimensions(buffer) {
  const signature = "89504e470d0a1a0a";
  assert(buffer.subarray(0, 8).toString("hex") === signature, "Invalid PNG signature");
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

const manifest = JSON.parse(await readFile(join(root, "manifest.json"), "utf8"));
const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
assert(manifest.manifest_version === 3, "manifest.json must use Manifest V3");
assert(/^\d+\.\d+\.\d+$/.test(manifest.version), "manifest version must use x.y.z");
assert(manifest.version === packageJson.version, "manifest.json and package.json versions must match");
assert(manifest.permissions?.includes("storage"), "storage permission is required");
assert(manifest.permissions?.includes("activeTab"), "activeTab permission is required");

const referencedFiles = new Set([
  manifest.background?.service_worker,
  ...Object.values(manifest.icons ?? {}),
  ...Object.values(manifest.action?.default_icon ?? {}),
  ...(manifest.content_scripts ?? []).flatMap((entry) => [...(entry.js ?? []), ...(entry.css ?? [])])
].filter(Boolean));

for (const relativePath of referencedFiles) {
  assert(await exists(relativePath), `Manifest references missing file: ${relativePath}`);
}

for (const size of [16, 32, 48, 128, 512]) {
  const relativePath = `assets/icons/icon-${size}.png`;
  const dimensions = pngDimensions(await readFile(join(root, relativePath)));
  assert(dimensions.width === size && dimensions.height === size, `${relativePath} must be ${size}x${size}`);
}

const socialPreview = pngDimensions(await readFile(join(root, "assets/brand/social-preview.png")));
assert(socialPreview.width === 1280 && socialPreview.height === 640, "social-preview.png must be 1280x640");

for (const requiredAsset of [
  "assets/brand/logo-mark.svg",
  "assets/brand/logo-lockup.svg",
  "assets/brand/logo-lockup.png",
  "assets/demo/webmeld-demo.gif",
  "assets/demo/webmeld-demo.mp4",
  "assets/demo/webmeld-preview.webp"
]) {
  assert(await exists(requiredAsset), `Missing repository asset: ${requiredAsset}`);
}

for (const markdownFile of [
  "README.md",
  "README.zh-CN.md",
  "PRIVACY.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "CHANGELOG.md",
  "docs/ARCHITECTURE.md",
  "docs/ARCHITECTURE.zh-CN.md",
  "docs/BRAND.md",
  "docs/BRAND.zh-CN.md"
]) {
  const source = await readFile(join(root, markdownFile), "utf8");
  const targets = [
    ...source.matchAll(/\]\((?!https?:|mailto:|#)([^)#]+)(?:#[^)]+)?\)/g),
    ...source.matchAll(/src=["'](?!https?:)([^"']+)["']/g)
  ].map((match) => match[1]);
  for (const target of targets) {
    const relativeTarget = join(dirname(markdownFile), target);
    assert(await exists(relativeTarget), `${markdownFile} references missing file: ${target}`);
  }
}

const runtimeSource = ["background.js", "content.js"].map((file) => readFile(join(root, file), "utf8"));
const joinedRuntime = (await Promise.all(runtimeSource)).join("\n");
assert(!/sk-[a-zA-Z0-9]{20,}/.test(joinedRuntime), "Possible API key found in runtime source");

console.log(`WebMeld ${manifest.version}: manifest, assets, docs, and source checks passed.`);
