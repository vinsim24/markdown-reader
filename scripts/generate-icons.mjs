import { chromium } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const source = pathToFileURL(resolve('public/favicon.svg')).href;
const icons = [
  ['favicon-32.png', 32],
  ['apple-touch-icon.png', 180],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
];

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(source);

for (const [fileName, size] of icons) {
  await page.setViewportSize({ width: size, height: size });
  await page.locator('svg').evaluate((svg, renderedSize) => {
    svg.style.display = 'block';
    svg.style.width = `${renderedSize}px`;
    svg.style.height = `${renderedSize}px`;
  }, size);
  await page.locator('svg').screenshot({ path: resolve('public', fileName) });
}

await browser.close();
