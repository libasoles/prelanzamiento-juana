// Lighthouse mobile sobre la home compilada. Falla si se pasan los umbrales.
// Uso: npm run build && npm run lighthouse
import { spawn } from 'node:child_process';
import { launch } from 'chrome-launcher';
import lighthouse from 'lighthouse';
import { chromium } from '@playwright/test';

const PORT = 4321;
const URL_HOME = `http://localhost:${PORT}/`;

// Umbrales = línea base actual (no se puede empeorar). Objetivo del ticket #10: perf 0.9, LCP 2500, TBT 200,
// seo 0.95 (hoy 0.69 sólo por robots.txt con Disallow: / en prelanzamiento).
const THRESHOLDS = {
  scores: { performance: 0.6, accessibility: 0.9, 'best-practices': 0.9, seo: 0.65 },
  metrics: { 'largest-contentful-paint': 4500, 'cumulative-layout-shift': 0.1, 'total-blocking-time': 1000 },
};

const server = spawn('npx', ['astro', 'preview', '--port', String(PORT)], { stdio: 'ignore' });
const stop = () => server.kill();
process.on('exit', stop);

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(URL_HOME)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('astro preview no arrancó');
}

let chrome;
try {
  await waitForServer();
  chrome = await launch({
    chromePath: chromium.executablePath(),
    chromeFlags: ['--headless=new', '--no-sandbox'],
  });
  const { lhr } = await lighthouse(URL_HOME, { port: chrome.port, output: 'json', logLevel: 'error' });

  const failures = [];
  for (const [id, min] of Object.entries(THRESHOLDS.scores)) {
    const score = lhr.categories[id].score;
    console.log(`${id.padEnd(15)} ${Math.round(score * 100)}`);
    if (score < min) failures.push(`${id}: ${score} < ${min}`);
  }
  for (const [id, max] of Object.entries(THRESHOLDS.metrics)) {
    const value = lhr.audits[id].numericValue;
    console.log(`${id.padEnd(26)} ${Math.round(value * 1000) / 1000}`);
    if (value > max) failures.push(`${id}: ${value} > ${max}`);
  }
  if (failures.length) {
    console.error('\nLighthouse bajo umbral:\n- ' + failures.join('\n- '));
    process.exitCode = 1;
  }
} finally {
  await chrome?.kill();
  stop();
}
