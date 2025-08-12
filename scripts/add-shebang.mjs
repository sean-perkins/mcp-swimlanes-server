import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const distEntry = resolve(process.cwd(), "dist/index.js");
const content = await readFile(distEntry, "utf8");
const shebang = "#!/usr/bin/env node\n";
if (!content.startsWith(shebang)) {
  await writeFile(distEntry, shebang + content, "utf8");
}
// Make executable bit is typically handled by npm on install via bin mapping.
