#!/usr/bin/env node
/**
 * Gemini Web Image Generator — Shadow DOM + Network Intercept
 * Usage: node scripts/gemini_generate.mjs <keyword> <prompt>
 */

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync, existsSync, statSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const GENERATED_DIR = resolve(PROJECT_ROOT, 'generated');

const [,, keyword, ...promptParts] = process.argv;
if (!keyword) { console.error('Usage: node gemini_generate.mjs <keyword> <prompt>'); process.exit(1); }
const prompt = promptParts.join(' ');
const outputPath = resolve(GENERATED_DIR, `${keyword}.png`);
const debugPath = resolve(GENERATED_DIR, `_debug_${keyword}.png`);

if (!existsSync(GENERATED_DIR)) mkdirSync(GENERATED_DIR, { recursive: true });

const INPUT_SELECTORS = [
  'rich-textarea .ql-editor',
  'rich-textarea',
  'div.ql-editor[contenteditable="true"]',
  'div[contenteditable="true"][role="textbox"]',
  'div[contenteditable="true"]',
];

// Google static/UI CDN patterns to skip
const SKIP_URL_PATTERNS = [
  'gstatic.com',
  'google.com/images',
  'googleusercontent.com/a/',  // profile photos
  'favicon',
  'icon',
  'logo',
  'sparkle',
  'avatar',
  'profile',
];

async function waitForChatReady(page, timeoutMs = 120000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const url = page.url();
      if (!url.includes('gemini.google.com')) {
        process.stdout.write('\r🔐 로그인 중... 완료 후 자동 진행됩니다.          ');
        await page.waitForNavigation({ url: '**/gemini.google.com/**', timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(2000);
        continue;
      }
      for (const sel of INPUT_SELECTORS) {
        const el = await page.$(sel).catch(() => null);
        if (el && await el.isVisible().catch(() => false)) return { el, sel };
      }
    } catch {}
    await page.waitForTimeout(1500);
  }
  return null;
}

// Traverse all shadow DOMs to find large images
async function findGeneratedImages(page) {
  return await page.evaluate(() => {
    const results = [];
    function traverse(root) {
      for (const img of root.querySelectorAll('img')) {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        if (w > 100 && h > 100) {
          const src = img.currentSrc || img.src || '';
          // Skip Google UI assets
          if (!src.includes('gstatic.com') &&
              !src.includes('favicon') &&
              !src.includes('sparkle') &&
              !src.includes('logo') &&
              !src.includes('avatar')) {
            results.push({ src, w, h, area: w * h });
          }
        }
      }
      for (const el of root.querySelectorAll('*')) {
        if (el.shadowRoot) traverse(el.shadowRoot);
      }
    }
    traverse(document);
    return results.sort((a, b) => b.area - a.area);
  });
}

// Download image from URL (with page's cookies/auth)
async function fetchImageViaPage(page, src) {
  return await page.evaluate(async (url) => {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const buffer = await resp.arrayBuffer();
    return Array.from(new Uint8Array(buffer));
  }, src);
}

(async () => {
  console.log(`\n🎨 아이콘 생성: "${keyword}"`);
  console.log(`📝 프롬프트: ${prompt.slice(0, 80)}...\n`);

  // Use a dedicated Playwright Chrome profile (login persists between runs)
  const PROFILE_DIR = resolve(PROJECT_ROOT, '.chrome-profile');
  if (!existsSync(PROFILE_DIR)) mkdirSync(PROFILE_DIR, { recursive: true });

  const isFirstRun = existsSync(resolve(PROFILE_DIR, 'Default')) === false;
  if (isFirstRun) {
    console.log('⚠️  첫 실행: Chrome이 열리면 Google 계정으로 로그인해주세요.');
    console.log('   로그인 완료 후 gemini.google.com으로 이동하면 자동으로 진행됩니다.\n');
  }

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    channel: 'chrome',
    headless: false,
    args: ['--start-maximized', '--no-first-run', '--no-default-browser-check'],
    viewport: null,
  });

  const page = await context.newPage();
  page.on('dialog', d => d.dismiss().catch(() => {}));

  // --- Network intercept: log candidate images (filter UI assets) ---
  const networkImages = new Map(); // url -> buffer
  context.on('response', async (response) => {
    const url = response.url();
    const ct = response.headers()['content-type'] || '';
    if (!ct.startsWith('image/')) return;
    if (SKIP_URL_PATTERNS.some(p => url.includes(p))) return;
    try {
      const buf = await response.body();
      if (buf.length > 50 * 1024) { // > 50KB
        networkImages.set(url, buf);
        console.log(`\n📡 후보 이미지: ${url.slice(0, 100)} (${Math.round(buf.length / 1024)}KB)`);
      }
    } catch {}
  });

  console.log('🌐 gemini.google.com 열기...');
  await page.goto('https://gemini.google.com', { waitUntil: 'domcontentloaded', timeout: 30000 });

  console.log('⌨️  채팅 입력창 대기...');
  const found = await waitForChatReady(page, 120000);
  if (!found) {
    await page.screenshot({ path: debugPath });
    console.error(`\n❌ 입력창 없음. 스크린샷: ${debugPath}`);
    await context.close(); process.exit(1);
  }
  console.log(`\n✅ 입력창: ${found.sel}`);
  await page.waitForTimeout(800);

  let inputEl = await page.$(found.sel).catch(() => null);
  if (!inputEl) {
    const re = await waitForChatReady(page, 10000);
    inputEl = re?.el;
  }
  if (!inputEl) { console.error('❌ 입력창 재취득 실패'); await context.close(); process.exit(1); }

  await inputEl.click({ force: true }).catch(() => {});
  await page.waitForTimeout(400);
  const geminiPrompt = `Generate an image: ${prompt}`;
  await page.keyboard.type(geminiPrompt, { delay: 5 });
  await page.waitForTimeout(400);
  await page.keyboard.press('Enter');
  console.log('✉️  전송 완료\n');

  // --- Wait: watch for "Creating your image" text, then disappear ---
  console.log('⏳ 이미지 생성 대기...');
  try {
    // Wait for generation to start
    await page.locator('text=/Creating your image|이미지.*생성/i').waitFor({ timeout: 30000 });
    console.log('✅ 이미지 생성 시작 감지');
    // Wait for it to complete (disappear = done)
    await page.locator('text=/Creating your image|이미지.*생성/i').waitFor({ state: 'hidden', timeout: 180000 });
    console.log('✅ 이미지 생성 완료');
  } catch {
    console.log('⚠️  생성 텍스트 감지 실패 — 60초 대기');
    await page.waitForTimeout(60000);
  }

  await page.waitForTimeout(2000); // slight settling delay
  await page.screenshot({ path: debugPath, fullPage: false });
  console.log(`📸 완료 후 스크린샷: ${debugPath}`);

  // --- Try 1: Network-intercepted images ---
  if (networkImages.size > 0) {
    const [url, buf] = [...networkImages.entries()].sort((a, b) => b[1].length - a[1].length)[0];
    writeFileSync(outputPath, buf);
    const size = statSync(outputPath).size;
    console.log(`✅ 네트워크 캡처 저장: ${outputPath} (${Math.round(size / 1024)}KB)`);
    await context.close();
    console.log('🎉 완료!');
    return;
  }

  // --- Try 2: Shadow DOM image traversal ---
  console.log('🔍 Shadow DOM에서 이미지 탐색...');
  const domImages = await findGeneratedImages(page);
  console.log(`   발견된 이미지: ${domImages.length}개`, domImages.map(i => `${i.w}x${i.h} ${i.src.slice(0, 60)}`));

  for (const img of domImages) {
    if (!img.src || img.src.startsWith('blob:')) continue;
    const bytes = await fetchImageViaPage(page, img.src);
    if (bytes && bytes.length > 50 * 1024) {
      writeFileSync(outputPath, Buffer.from(bytes));
      console.log(`✅ DOM 이미지 저장: ${outputPath} (${Math.round(bytes.length / 1024)}KB)`);
      await context.close();
      console.log('🎉 완료!');
      return;
    }
  }

  // --- Try 3: Screenshot the response area ---
  console.log('📷 응답 영역 스크린샷으로 폴백...');
  // Find the response container using locator (shadow DOM aware)
  try {
    const respLocator = page.locator('model-response, response-container, .response-content').last();
    await respLocator.screenshot({ path: outputPath, type: 'png' });
    const size = statSync(outputPath).size;
    console.log(`✅ 응답 영역 스크린샷 저장: ${outputPath} (${Math.round(size / 1024)}KB)`);
    await context.close();
    console.log('🎉 완료!');
    return;
  } catch (e) {
    console.log(`⚠️  응답 영역 스크린샷 실패: ${e.message}`);
  }

  await page.screenshot({ path: outputPath, fullPage: false });
  const size = statSync(outputPath).size;
  console.log(`⚠️  전체 페이지 폴백 저장: ${outputPath} (${Math.round(size / 1024)}KB)`);
  console.log('   → 이미지를 확인하고 필요시 수동으로 크롭하세요.');
  await context.close();
})().catch(async err => {
  console.error(`\n❌ 오류: ${err.message}`);
  process.exit(1);
});
