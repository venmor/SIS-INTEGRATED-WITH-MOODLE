import { chromium } from 'playwright';
import fs from 'fs';

const baseURL = process.env.BASE_URL || 'http://localhost:8080';
const execPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || '/home/hangoma/.cache/ms-playwright/chromium-1243/chrome-linux/chrome';

async function run() {
  const browser = await chromium.launch({ 
    headless: true, 
    executablePath: execPath,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  
  const outdir = '/home/hangoma/final year report/moodle-features-screenshots';
  
  try {
    // Try to access Moodle admin pages
    const pages = [
      { path: '/admin/moodle', dir: 'admin-moodle-main', name: '01-moodle-admin-main.png' },
      { path: '/admin/moodle/maintenance', dir: 'admin-moodle-maintenance', name: '01-moodle-maintenance-windows.png' },
      { path: '/admin/moodle/mappings', dir: 'admin-moodle-mappings', name: '01-moodle-mappings.png' },
    ];
    
    for (const p of pages) {
      try {
        await page.goto(baseURL + p.path, { waitUntil: 'networkidle', timeout: 15000 });
        await page.waitForTimeout(2000);
        const dirPath = outdir + '/' + p.dir;
        fs.mkdirSync(dirPath, { recursive: true });
        await page.screenshot({ path: dirPath + '/' + p.name, fullPage: true });
        console.log('Saved:', p.path);
      } catch (e) {
        console.log('Failed:', p.path, e.message);
      }
    }
  } catch (e) {
    console.error(e);
  }
  
  await browser.close();
}

run();
