const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-webgl', '--use-angle=swiftshader']
  });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1
  });

  await page.goto('http://localhost:3000/', {
    waitUntil: 'domcontentloaded'
  });

  await page.waitForTimeout(5000);

  fs.mkdirSync('screenshots', { recursive: true });

  for (const percent of [0, 20, 40, 60, 80, 100]) {
    await page.evaluate((p) => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, maxScroll * p / 100);
    }, percent);

    await page.waitForTimeout(2000);

    await page.screenshot({
      path: `screenshots/loading-${percent}.png`
    });

    console.log(`Captured ${percent}%`);
  }

  await browser.close();
})();
