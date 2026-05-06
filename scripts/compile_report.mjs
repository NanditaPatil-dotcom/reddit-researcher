#!/usr/bin/env node
// Proxy script so callers can run `node scripts/compile_report.mjs ...`
// and it will forward to reddit-researcher/scripts/compile_report.mjs

import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const proxyDir = new URL('.', import.meta.url).pathname; // .../project/scripts/
const target = resolve(proxyDir, '../reddit-researcher/scripts/compile_report.mjs');
const args = process.argv.slice(2);

const res = spawnSync(process.execPath, [target, ...args], { stdio: 'inherit' });
process.exit(res.status ?? 1);
