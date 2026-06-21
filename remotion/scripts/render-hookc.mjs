import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, openBrowser } from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const bundled = await bundle({
  entryPoint: path.resolve(__dirname, "../src/index.ts"),
  webpackOverride: (c) => c,
});

const browser = await openBrowser("chrome", {
  browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium",
  chromiumOptions: { args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] },
  chromeMode: "chrome-for-testing",
});

// Allow CLI filtering: node render-remotion.mjs <pattern>
const filter = process.argv[2] || "";

const VARIANTS = ["hookC"];
const SIZES = [
  { label: "h-1080", file: "1920x1080" },
  { label: "h-720",  file: "1280x720"  },
  { label: "v-1080", file: "1080x1920" },
  { label: "v-720",  file: "720x1280"  },
];

const targets = [];
for (const v of VARIANTS) {
  for (const s of SIZES) {
    const id = `${v}-${s.label}`;
    if (filter && !id.includes(filter)) continue;
    targets.push({
      id,
      out: `/mnt/documents/monster-battle-${v}-${s.file}.mp4`,
    });
  }
}

console.log(`Rendering ${targets.length} target(s)...`);

for (const t of targets) {
  const composition = await selectComposition({
    serveUrl: bundled,
    id: t.id,
    puppeteerInstance: browser,
  });
  console.log(`-> ${t.id} (${composition.width}x${composition.height}) -> ${t.out}`);
  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: "h264",
    outputLocation: t.out,
    puppeteerInstance: browser,
    muted: true,
    concurrency: 1,
  });
}

await browser.close({ silent: false });
console.log("done");