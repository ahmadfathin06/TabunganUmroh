/* Smoke test sementara: auto-login dari sesi tersimpan + CTA "Mulai Menabung" hilang. */
const puppeteer = require('puppeteer-core');

const BASE = 'http://127.0.0.1:5173';
const API = 'http://127.0.0.1:5000/api';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const ts = Date.now().toString().slice(-9);
const email = `smoke${ts}@example.test`;
const phone = `08${String(Date.now()).slice(-10)}`;
const password = 'SmokeTest123';

const results = [];
const check = (name, cond, extra = '') => {
  results.push({ name, ok: !!cond, extra });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? ` — ${extra}` : ''}`);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const reg = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: `Smoke ${ts}`, email, phone, password, confirmPassword: password }),
  });
  check('registrasi user uji', reg.status === 201, `status ${reg.status}`);

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu'],
    defaultViewport: { width: 1400, height: 950 },
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  const textOfBody = () => page.evaluate(() => document.body.innerText);
  const hasDashboardLink = () =>
    page.evaluate(() => [...document.querySelectorAll('a')].some((a) => a.textContent.includes('Dashboard Saya')));

  try {
    // Login sekali lewat email
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('#identifier');
    await page.type('#identifier', email);
    await page.type('#password', password);
    await page.evaluate(() => document.querySelector('#identifier').closest('form').requestSubmit());
    await page.waitForFunction(() => window.location.pathname === '/dashboard', { timeout: 30000 });
    check('login lewat email → /dashboard', true);

    // 1. Reload: sesi tetap tersimpan
    await page.reload({ waitUntil: 'networkidle2' });
    await sleep(800);
    check('reload dashboard → tetap login', await hasDashboardLink());
    check('reload dashboard → tetap di /dashboard', await page.evaluate(() => window.location.pathname) === '/dashboard');

    // 2. Buka web dari awal (landing) → langsung posisi login
    await page.goto(BASE, { waitUntil: 'networkidle2' });
    await sleep(800);
    const landingText = await textOfBody();
    check('buka web lagi → langsung login (navbar Dashboard Saya)', await hasDashboardLink());
    check('buka web lagi → CTA "Buka Dashboard" tampil', landingText.includes('Buka Dashboard'));
    check('buka web lagi → tidak ada teks "Mulai Menabung"', !landingText.includes('Mulai Menabung'));

    // 3. Access token hilang (mis. kedaluwarsa) → refresh token memulihkan sesi
    await page.evaluate(() => localStorage.removeItem('accessToken'));
    await page.goto(BASE, { waitUntil: 'networkidle2' });
    await sleep(1500);
    check('access token hilang → sesi dipulihkan via refresh token', await hasDashboardLink());
    const refreshed = await page.evaluate(() => !!localStorage.getItem('accessToken'));
    check('access token baru tersimpan setelah refresh', refreshed);

    // 4. Mobile: semua tombol "Mulai Menabung" hilang
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(BASE, { waitUntil: 'networkidle2' });
    await sleep(800);
    const mobileText = await textOfBody();
    check('mobile: tidak ada teks "Mulai Menabung"', !mobileText.includes('Mulai Menabung'));
    const mobileCta = await page.evaluate(() =>
      [...document.querySelectorAll('a')].some((a) => a.textContent.includes('Buka Dashboard'))
    );
    check('mobile: CTA "Buka Dashboard" tampil', mobileCta);

    // 5. Sesi tidak valid → kembali guest tanpa redirect paksa dari landing
    await page.evaluate(() => {
      localStorage.setItem('accessToken', 'invalid.token.value');
      localStorage.setItem('refreshToken', 'invalid.token.value');
    });
    await page.goto(BASE, { waitUntil: 'networkidle2' });
    await page.waitForFunction(() => document.body.innerText.includes('Mulai Menabung Sekarang'), { timeout: 20000 });
    check('sesi tidak valid → landing kembali mode guest', true);
    check('sesi tidak valid → tidak dipaksa redirect ke /login', await page.evaluate(() => window.location.pathname) === '/');

    // 6. Buka /dashboard tanpa sesi valid → tetap redirect ke /login
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle2' });
    await page.waitForFunction(() => window.location.pathname === '/login', { timeout: 20000 }).catch(() => {});
    check('/dashboard tanpa sesi → redirect /login', await page.evaluate(() => window.location.pathname) === '/login');
  } finally {
    await browser.close();
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} smoke checks lulus`);
  if (failed.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error('SMOKE ERROR:', err);
  process.exitCode = 1;
});
