import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const projectRoot = process.cwd();

const resolve = (...parts) => join(projectRoot, ...parts);

const packageJson = JSON.parse(readFileSync(resolve("package.json"), "utf-8"));

const assets = [
  {
    dependency: "htmx.org",
    source: resolve("node_modules", "htmx.org", "dist", "htmx.min.js"),
    destination: resolve("public", "vendor", "htmx", "htmx.min.js"),
  },
  {
    dependency: "echarts",
    source: resolve("node_modules", "echarts", "dist", "echarts.min.js"),
    destination: resolve("public", "vendor", "echarts", "echarts.min.js"),
  },
  {
    dependency: "lucide",
    source: resolve("node_modules", "lucide", "dist", "umd", "lucide.min.js"),
    destination: resolve("public", "vendor", "lucide", "lucide.min.js"),
  },
  {
    dependency: "@fontsource/dm-sans",
    source: resolve(
      "node_modules",
      "@fontsource",
      "dm-sans",
      "files",
      "dm-sans-latin-400-normal.woff2",
    ),
    destination: resolve("public", "fonts", "dm-sans-latin-400-normal.woff2"),
  },
  {
    dependency: "@fontsource/dm-sans",
    source: resolve(
      "node_modules",
      "@fontsource",
      "dm-sans",
      "files",
      "dm-sans-latin-500-normal.woff2",
    ),
    destination: resolve("public", "fonts", "dm-sans-latin-500-normal.woff2"),
  },
  {
    dependency: "@fontsource/outfit",
    source: resolve(
      "node_modules",
      "@fontsource",
      "outfit",
      "files",
      "outfit-latin-600-normal.woff2",
    ),
    destination: resolve("public", "fonts", "outfit-latin-600-normal.woff2"),
  },
  {
    dependency: "@fontsource/outfit",
    source: resolve(
      "node_modules",
      "@fontsource",
      "outfit",
      "files",
      "outfit-latin-700-normal.woff2",
    ),
    destination: resolve("public", "fonts", "outfit-latin-700-normal.woff2"),
  },
  {
    dependency: "@fontsource/outfit",
    source: resolve(
      "node_modules",
      "@fontsource",
      "outfit",
      "files",
      "outfit-latin-800-normal.woff2",
    ),
    destination: resolve("public", "fonts", "outfit-latin-800-normal.woff2"),
  },
];

for (const asset of assets) {
  if (!existsSync(asset.source)) {
    throw new Error(`Missing source file for ${asset.dependency}: ${asset.source}`);
  }

  mkdirSync(dirname(asset.destination), { recursive: true });
  cpSync(asset.source, asset.destination);
}

const manifest = {
  assets: assets.map((asset) => ({
    dependency: asset.dependency,
    version: packageJson.dependencies?.[asset.dependency] ?? "unknown",
    destination: asset.destination.replace(projectRoot, "").replaceAll("\\", "/"),
  })),
};

writeFileSync(
  resolve("public", "vendor", "asset-manifest.json"),
  JSON.stringify(manifest, null, 2),
  "utf-8",
);
