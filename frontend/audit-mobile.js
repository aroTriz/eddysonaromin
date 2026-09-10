const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const pages = [
    '/', '/shop', '/services', '/blog', '/projects', '/experience', '/stack', '/certifications', '/recommendations', '/about', '/contact'
  ];
  const viewports = [320, 375, 390, 768, 1024];
  for (const vw of viewports) {
    console.log(\n=== Viewport  ===);
    const context = await browser.newContext({ viewport: { width: vw, height: 800 } });
    const page = await context.newPage();
    for (const p of pages) {
      try {
        await page.goto('http://localhost:5173' + p, { waitUntil: 'domcontentloaded', timeout: 10000 });
        await page.waitForTimeout(500);
        const res = await page.evaluate(() => {
          const vw = window.innerWidth;
          const sw = document.documentElement.scrollWidth;
          const hasHScroll = sw > vw + 1;
          const small = Array.from(document.querySelectorAll('a, button')).filter(el=>{
            const r=el.getBoundingClientRect();
            return r.width>0 && r.height>0 && (r.width<44 || r.height<44);
          }).length;
          return {hasHScroll, small, sw, vw};
        });
        const status = (!res.hasHScroll && res.small===0) ? 'PASS' : 'FAIL';
        console.log(${status}  | HScroll: (>) small:);
        if (res.hasHScroll || res.small>0) {
          const details = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a, button')).filter(el=>{
              const r=el.getBoundingClientRect();
              return r.width>0&&r.height>0&&(r.width<44||r.height<44);
            }).slice(0,2).map(el=> ({txt:el.innerText.slice(0,20), cls:el.className.slice(0,50), w:Math.round(el.getBoundingClientRect().width), h:Math.round(el.getBoundingClientRect().height)}));
          });
          console.log('  details:', JSON.stringify(details));
        }
      } catch(e) { console.log(ERROR : ); }
    }
    await context.close();
  }
  await browser.close();
})();
