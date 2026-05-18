import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const srcDir = new URL("../src", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) files.push(...(await walk(p)));
    else if (/\.(tsx?|jsx?)$/.test(e.name)) files.push(p);
  }
  return files;
}

const bad = [];
for (const file of await walk(srcDir)) {
  const buf = await readFile(file);
  const body = buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf ? buf.subarray(3) : buf;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(body);
  } catch {
    bad.push(file);
  }
}

if (bad.length) {
  console.error("Not valid UTF-8:\n" + bad.join("\n"));
  process.exit(1);
}
console.log("All source files are UTF-8.");
