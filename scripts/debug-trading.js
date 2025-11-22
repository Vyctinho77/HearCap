import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', (msg) => {
    console.log('[browser]', msg.type(), msg.text());
  });

  await page.goto('http://127.0.0.1:4173/trade/GNX', { waitUntil: 'networkidle' });

  const info = await page.evaluate(() => {
    const iframe = document.querySelector('iframe');
    const rect = iframe ? iframe.getBoundingClientRect() : null;
    const liquidity = document.querySelector('[class*="liquidityColumn"]');
    const toolbar = document.querySelector('[class*="chartToolbar"]');

    return {
      iframePresent: Boolean(iframe),
      iframeRect: rect ? { width: Math.round(rect.width), height: Math.round(rect.height) } : null,
      liquidityDisplay: liquidity ? getComputedStyle(liquidity).display : null,
      toolbarDisplay: toolbar ? getComputedStyle(toolbar).display : null,
    };
  });

  console.log(info);

  await browser.close();
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

