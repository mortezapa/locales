#!/usr/bin/env node
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = new URL('.', import.meta.url).pathname;
const EN_DIR = join(ROOT, 'en');

const PLURAL_SUFFIXES = ['_zero', '_one', '_two', '_few', '_many', '_other'];

function getKeys(p) {
  return new Set(Object.keys(JSON.parse(readFileSync(p, 'utf8'))));
}
function getNamespaces(dir) {
  return readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
}
function isPluralVariant(key, enKeys) {
  for (const suffix of PLURAL_SUFFIXES) {
    if (!key.endsWith(suffix)) continue;
    const base = key.slice(0, -suffix.length);
    if (PLURAL_SUFFIXES.some((s) => enKeys.has(base + s))) return true;
  }
  return false;
}

let failed = false;
const enNs = getNamespaces(EN_DIR);
const locales = readdirSync(ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== 'en' && !d.name.startsWith('.'))
  .map((d) => d.name).sort();

for (const locale of locales) {
  const dir = join(ROOT, locale);
  for (const ns of enNs) {
    const lp = join(dir, ns);
    if (!existsSync(lp)) { console.error(`MISSING  ${locale}/${ns}`); failed = true; continue; }
    const enKeys = getKeys(join(EN_DIR, ns));
    const miss = [...enKeys].filter((k) => !getKeys(lp).has(k));
    const ext  = [...getKeys(lp)].filter((k) => !enKeys.has(k) && !isPluralVariant(k, enKeys));
    if (miss.length) { console.error(`MISSING KEYS in ${locale}/${ns}:`, miss); failed = true; }
    if (ext.length)  { console.error(`EXTRA KEYS in ${locale}/${ns}:`, ext);  failed = true; }
  }
  const extraNs = getNamespaces(dir).filter((ns) => !enNs.includes(ns));
  if (extraNs.length) { console.error(`EXTRA NAMESPACES in ${locale}/:`, extraNs); failed = true; }
}

if (failed) { console.error('\nKey parity check FAILED.'); process.exit(1); }
console.log(`Key parity PASSED (${locales.length} locale(s), ${enNs.length} namespace(s)).`);
