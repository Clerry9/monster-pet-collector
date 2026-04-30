import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const nodeModules = path.join(root, "node_modules");
const packagesToCheck = new Set(["react", "react-dom"]);
const packageLocations = new Map([...packagesToCheck].map((name) => [name, []]));
const peerWarnings = [];
const visited = new Set();

function readPackageJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function realPathSafe(file) {
  try {
    return fs.realpathSync(file);
  } catch {
    return file;
  }
}

function recordPackage(packageJsonPath) {
  const pkg = readPackageJson(packageJsonPath);
  if (!pkg?.name || !pkg.version) return;

  if (packagesToCheck.has(pkg.name)) {
    const realPackageJsonPath = realPathSafe(packageJsonPath);
    const locations = packageLocations.get(pkg.name);
    if (!locations.some((location) => location.realPackageJsonPath === realPackageJsonPath)) {
      locations.push({
        version: pkg.version,
        path: path.relative(root, path.dirname(realPackageJsonPath)),
        realPackageJsonPath,
      });
    }
  }

  if (pkg.name === "@react-three/fiber") {
    const reactMajor = getRootPackageMajor("react");
    const fiberMajor = Number.parseInt(pkg.version.split(".")[0], 10);
    if (reactMajor === 18 && fiberMajor >= 9) {
      peerWarnings.push(
        `@react-three/fiber ${pkg.version} requires React 19-style internals. Use @react-three/fiber ^8 with React 18.`,
      );
    }
  }
}

function getRootPackageMajor(name) {
  const pkg = readPackageJson(path.join(nodeModules, name, "package.json"));
  return pkg?.version ? Number.parseInt(pkg.version.split(".")[0], 10) : null;
}

function walk(dir) {
  const realDir = realPathSafe(dir);
  if (visited.has(realDir)) return;
  visited.add(realDir);

  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  const packageJsonPath = path.join(dir, "package.json");
  if (fs.existsSync(packageJsonPath)) recordPackage(packageJsonPath);

  for (const entry of entries) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
    if (entry.name === ".cache" || entry.name === ".vite") continue;
    walk(path.join(dir, entry.name));
  }
}

if (!fs.existsSync(nodeModules)) {
  console.error("React dependency check failed: node_modules is missing. Install dependencies first.");
  process.exit(1);
}

walk(nodeModules);

let failed = false;
for (const [name, locations] of packageLocations) {
  const versions = new Set(locations.map((location) => location.version));
  if (versions.size > 1) {
    failed = true;
    console.error(`\nMultiple ${name} versions detected (${[...versions].join(", ")}).`);
    console.table(locations.map(({ version, path }) => ({ package: name, version, path })));
  }
}

if (peerWarnings.length > 0) {
  failed = true;
  console.error("\nReact compatibility warnings:");
  for (const warning of peerWarnings) console.error(`- ${warning}`);
}

if (failed) {
  console.error("\nReact dependency check failed. Keep exactly one React and one React DOM version bundled.");
  process.exit(1);
}

for (const [name, locations] of packageLocations) {
  const [location] = locations;
  if (!location) {
    console.error(`React dependency check failed: ${name} was not found.`);
    process.exit(1);
  }
  console.log(`✓ ${name} ${location.version} (${location.path})`);
}
console.log("✓ React dependency check passed: one React and one React DOM version detected.");
