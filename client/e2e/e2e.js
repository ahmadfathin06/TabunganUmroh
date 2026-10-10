/* Full-flow E2E: register -> create plan -> deposit -> upload proof -> admin verify -> balance check
 * Plus negative cases: wrong-password login, proof submit without file, proof >2MB, unsupported MIME.
 *
 * Portable, tanpa path Chrome hardcoded:
 *   - PUPPETEER_EXECUTABLE_PATH  (opsional) path Chrome/Chromium/Edge.
 *   - Bila kosong, script mencari executable lewat `puppeteer` (bila terpasang),
 *     lokasi umum per OS, lalu PATH (`command -v`). Cocok untuk Windows/Linux/macOS.
 *
 * Konfigurasi lewat environment (semua opsional):
 *   E2E_BASE_URL           default http://localhost:5173
 *   E2E_ADMIN_EMAIL        default admin@tabunganku.com (akun seed)
 *   E2E_ADMIN_PASSWORD     default Admin@123456   (akun seed)
 *   E2E_USER_PASSWORD      default Password123
 *   E2E_SCREENSHOT_DIR     default client/e2e/shots (git-ignored)
 *   E2E_KEEP_ARTIFACTS     'true' untuk menyimpan berkas sementara
 *
 * Berkas uji (proof/big/txt) ditulis ke folder temporer OS, BUKAN ke repo,
 * supaya tidak ada data/bukti yang ikut ter-commit.
 *
 * Forms are submitted via their <form> element (requestSubmit) to avoid clicking the wrong
 * same-text button (e.g. navbar "Masuk" vs login submit, header "Buat Rencana" vs modal submit).
 */
const puppeteer = require('puppeteer-core');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const BASE = process.env.E2E_BASE_URL || 'http://localhost:5173';
const ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL || 'admin@tabunganku.com',
  password: process.env.E2E_ADMIN_PASSWORD || 'Admin@123456',
};
const USER_PASSWORD = process.env.E2E_USER_PASSWORD || 'Password123';
const SHOTS = process.env.E2E_SCREENSHOT_DIR || path.join(__dirname, 'shots');

const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tabunganku-e2e-'));
const PROOF = path.join(TMP_DIR, 'proof.png');
const BIG = path.join(TMP_DIR, 'big.png');
const TXT = path.join(TMP_DIR, 'catatan.txt');

// 1x1 transparent PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

// >2MB incompressible data (2.5MB) — lolos filter MIME (.png) tapi ditolak multer LIMIT_FILE_SIZE.
const BIG_PNG = crypto.randomBytes(2.5 * 1024 * 1024);

const ts = Date.now().toString().slice(-8);
const USER = { name: `Tester ${ts}`, email: `tester${ts}@mail.com`, phone: `0812${ts}` };

let browser;
let _page;
let passed = 0;
const results = [];

function log(msg) {
  console.log(`  -> ${msg}`);
}

/** Cari executable Chrome secara portabel. */
function resolveChromePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;

  // Bila paket `puppeteer` (bukan -core) terpasang, ia membawa Chromium sendiri.
  try {
    const bundled = require('puppeteer').executablePath?.();
    if (bundled && fs.existsSync(bundled)) return bundled;
  } catch {
    /* puppeteer tidak terpasang — lanjut ke pencarian manual */
  }

  const byPlatform = {
    win32: [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      process.env.LOCALAPPDATA
        ? path.join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe')
        : '',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    ],
    darwin: [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    ],
    linux: [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
    ],
  }[process.platform] || [];

  for (const candidate of byPlatform) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }

  for (const bin of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'chrome', 'msedge']) {
    try {
      const found = execSync(`command -v ${bin}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
      if (found && fs.existsSync(found)) return found;
    } catch {
      /* binary tidak ada — coba berikutnya */
    }
  }

  throw new Error(
    'Chrome/Chromium tidak ditemukan. Set PUPPETEER_EXECUTABLE_PATH ke path executable browser.'
  );
}

async function ok(name, fn) {
  try {
    await fn();
    passed += 1;
    results.push(`PASS ${name}`);
    console.log(`PASS: ${name}`);
  } catch (err) {
    results.push(`FAIL ${name}: ${err.message}`);
    console.error(`FAIL: ${name} -> ${err.message}`);
    if (_page) {
      await _page
        .screenshot({ path: path.join(SHOTS, `fail-${name.replace(/\W+/g, '_')}.png`) })
        .catch(() => {});
    }
    throw err;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForText(text, timeout = 30000) {
  await _page.waitForFunction(
    (t) => document.body?.innerText?.toLowerCase().includes(t.toLowerCase()),
    { timeout },
    text
  );
}

/* Submit the <form> that contains the given input id — no text matching needed */
async function submitFormOfInput(inputId) {
  const submitted = await _page.evaluate((id) => {
    const input = document.getElementById(id);
    if (!input) return false;
    const form = input.closest('form');
    if (!form) return false;
    if (typeof form.requestSubmit === 'function') {
      form.requestSubmit();
    } else {
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
    return true;
  }, inputId);
  if (!submitted) throw new Error(`form not found for input #${inputId}`);
}

/* Type into input #id (with pre-clear) */
async function typeInto(selector, value) {
  await _page.waitForSelector(selector, { timeout: 15000 });
  await _page.click(selector, { clickCount: 3 });
  await _page.type(selector, value, { delay: 10 });
}

/* Click the Nth (0-based) button whose innerText contains `match` */
async function clickNthByText(match, nth = 0) {
  const clicked = await _page.evaluate(
    (m, n) => {
      const els = [...document.querySelectorAll('button, a')].filter((e) =>
        (e.innerText || '').trim().includes(m)
      );
      const el = els[n];
      if (!el) return `not found (have ${els.length} matches: ${els.map((e) => e.innerText.trim()).join(' | ')})`;
      el.click();
      return true;
    },
    match,
    nth
  );
  if (clicked !== true) throw new Error(`click "${match}"#${nth}: ${clicked}`);
}

async function logout() {
  // JS click (not mouse) so an overlapping toast can't swallow it
  await _page.evaluate(() => document.querySelector('button[title="Keluar"]')?.click());
  try {
    await _page.waitForFunction(() => window.location.pathname === '/login', { timeout: 6000 });
  } catch {
    log('logout nav slow — clearing session manually');
    await _page.evaluate(() => {
      ['accessToken', 'refreshToken', 'user'].forEach((k) => localStorage.removeItem(k));
    });
    await _page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
  }
}

async function main() {
  fs.mkdirSync(SHOTS, { recursive: true });
  fs.writeFileSync(PROOF, PNG);
  fs.writeFileSync(BIG, BIG_PNG);
  fs.writeFileSync(TXT, 'bukan gambar');

  console.log(`E2E base URL : ${BASE}`);
  console.log(`Chrome path  : ${resolveChromePath()}`);

  browser = await puppeteer.launch({
    executablePath: resolveChromePath(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1400,950'],
    defaultViewport: { width: 1400, height: 950 },
  });
  _page = await browser.newPage();
  _page.setDefaultTimeout(30000);
  _page.on('pageerror', (e) => console.error('  [pageerror]', e.message.slice(0, 200)));

  /* ---------------- 0. NEGATIVE: LOGIN ---------------- */
  await ok('fail-login: wrong password rejected', async () => {
    await _page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
    await typeInto('#email', ADMIN.email);
    await typeInto('#password', 'WrongPass123');
    await submitFormOfInput('password');
    await waitForText('Email atau password salah', 15000);
    const pathname = await _page.evaluate(() => window.location.pathname);
    if (pathname !== '/login') throw new Error(`expected to stay on /login, got ${pathname}`);
    await _page.screenshot({ path: path.join(SHOTS, '00-login-rejected.png') });
  });

  /* ---------------- 1. REGISTER ---------------- */
  await ok('register: open form', async () => {
    await _page.goto(`${BASE}/register`, { waitUntil: 'networkidle2' });
    await _page.waitForSelector('#name', { timeout: 15000 });
  });

  await ok('register: fill + submit', async () => {
    await typeInto('#name', USER.name);
    await typeInto('#email', USER.email);
    await typeInto('#phone', USER.phone);
    await typeInto('#password', USER_PASSWORD);
    await typeInto('#confirmPassword', USER_PASSWORD);
    await _page.screenshot({ path: path.join(SHOTS, '01-register-filled.png') });
    await submitFormOfInput('confirmPassword');
    await waitForText('Registrasi berhasil');
  });

  await ok('register: redirected to dashboard', async () => {
    await _page.waitForFunction(() => window.location.pathname === '/dashboard', { timeout: 15000 });
    await waitForText('Assalamu');
    await sleep(600);
    await _page.screenshot({ path: path.join(SHOTS, '02-dashboard-new-user.png') });
  });

  /* ---------------- 2. CREATE PLAN ---------------- */
  await ok('plan: open modal', async () => {
    // User baru tidak punya rencana → CTA-nya "Buat Rencana Pertama"
    // (fallback ke "Rencana Baru" kalau sudah ada rencana).
    try {
      await clickNthByText('Buat Rencana Pertama', 0);
    } catch {
      await clickNthByText('Rencana Baru', 0);
    }
    await _page.waitForSelector('#createPkg', { timeout: 15000 });
  });

  await ok('plan: submit', async () => {
    await _page.select('#createPkg', await _page.$eval('#createPkg option', (o) => o.value));
    await typeInto('#depMonthly', '1500000');
    await _page.screenshot({ path: path.join(SHOTS, '03-plan-modal.png') });
    await submitFormOfInput('depMonthly');
    await waitForText('Rencana tabungan dibuat');
  });

  await ok('plan: visible on dashboard', async () => {
    await waitForText('Terkumpul');
    await sleep(900); // let plan card animate in
    await _page.screenshot({ path: path.join(SHOTS, '04-plan-created.png') });
  });

  /* ---------------- 3. DEPOSIT ---------------- */
  await ok('deposit: open + fill', async () => {
    // QuickActions pertama: label "Setor Tabungan" (dulu "Setor Sekarang")
    await clickNthByText('Setor Tabungan', 0);
    await _page.waitForSelector('#depAmount', { timeout: 15000 });
    await typeInto('#depAmount', '500000');
    await _page.screenshot({ path: path.join(SHOTS, '05-deposit-form.png') });
  });

  await ok('deposit: create transfer instruction', async () => {
    await submitFormOfInput('depAmount');
    await waitForText('Transfer tepat sejumlah');
    await _page.screenshot({ path: path.join(SHOTS, '06-transfer-info.png') });
  });

  await ok('deposit: close instruction modal', async () => {
    await clickNthByText('Selesai & Upload Bukti', 0);
    await sleep(600);
  });

  /* ---------------- 3b. NEGATIVE: UPLOAD PROOF ---------------- */
  const closeTopModal = () =>
    _page.evaluate(() => {
      const btns = [...document.querySelectorAll('button[aria-label="Tutup"]')];
      btns[btns.length - 1]?.click();
    });

  await ok('fail-proof: submit without file', async () => {
    await clickNthByText('Bukti', 0);
    await _page.waitForSelector('#upFile', { timeout: 15000 });
    await waitForText('Setoran Menunggu');
    await submitFormOfInput('upFile');
    await waitForText('Pilih setoran dan file bukti', 10000);
    await _page.screenshot({ path: path.join(SHOTS, '08a-proof-no-file.png') });
    await closeTopModal();
    await sleep(400);
  });

  await ok('fail-proof: file >2MB rejected', async () => {
    await clickNthByText('Bukti', 0);
    await _page.waitForSelector('#upFile', { timeout: 15000 });
    const input = await _page.$('#upFile');
    await input.uploadFile(BIG);
    await waitForText('big.png', 8000);
    await submitFormOfInput('upFile');
    await waitForText('melebihi batas', 15000);
    await _page.screenshot({ path: path.join(SHOTS, '08b-proof-oversize.png') });
    await closeTopModal();
    await sleep(400);
  });

  await ok('fail-proof: unsupported MIME rejected', async () => {
    await clickNthByText('Bukti', 0);
    await _page.waitForSelector('#upFile', { timeout: 15000 });
    const input = await _page.$('#upFile');
    await input.uploadFile(TXT);
    await waitForText('catatan.txt', 8000);
    await submitFormOfInput('upFile');
    // Pesan dari server: "File type tidak diizinkan. Hanya JPG, PNG, PDF."
    await waitForText('tidak diizinkan', 15000);
    await _page.screenshot({ path: path.join(SHOTS, '08c-proof-bad-mime.png') });
    await closeTopModal();
    await sleep(400);
  });

  /* ---------------- 4. UPLOAD PROOF ---------------- */
  await ok('proof: open upload modal', async () => {
    await clickNthByText('Bukti', 0);
    await _page.waitForSelector('#upFile', { timeout: 15000 });
    await waitForText('Setoran Menunggu');
  });

  await ok('proof: attach file + submit', async () => {
    const input = await _page.$('#upFile');
    await input.uploadFile(PROOF);
    await waitForText('proof.png', 8000);
    await _page.screenshot({ path: path.join(SHOTS, '07-proof-attached.png') });
    await submitFormOfInput('upFile');
    await waitForText('Bukti transfer terkirim');
  });

  await ok('proof: shows in history as PENDING', async () => {
    await sleep(1200);
    await waitForText('Menunggu Verifikasi');
    await _page.screenshot({ path: path.join(SHOTS, '08-pending-history.png') });
  });

  /* ---------------- 5. ADMIN VERIFY ---------------- */
  await ok('admin: logout user, login admin', async () => {
    await logout();
    await typeInto('#email', ADMIN.email);
    await typeInto('#password', ADMIN.password);
    await submitFormOfInput('password');
    await _page.waitForFunction(() => window.location.pathname === '/admin', { timeout: 20000 });
    await waitForText('Panel Admin');
  });

  await ok('admin: pending deposit visible with proof', async () => {
    await waitForText('MENUNGGU VERIFIKASI');
    await waitForText(USER.name);
    await _page.screenshot({ path: path.join(SHOTS, '09-admin-verify.png') });
  });

  await ok('admin: approve deposit', async () => {
    await clickNthByText('Approve', 0);
    await waitForText('di-approve');
    await sleep(900);
    await _page.screenshot({ path: path.join(SHOTS, '10-admin-approved.png') });
  });

  /* ---------------- 6. USER SEES RESULT ---------------- */
  await ok('user: logout admin, login user', async () => {
    await logout();
    await typeInto('#email', USER.email);
    await typeInto('#password', USER_PASSWORD);
    await submitFormOfInput('password');
    await _page.waitForFunction(() => window.location.pathname === '/dashboard', { timeout: 20000 });
  });

  await ok('user: balance updated to include deposit', async () => {
    await waitForText('Rencana Tabungan');
    await sleep(1000);
    const body = await _page.evaluate(() => document.body.innerText);
    if (!body.includes('500.000')) throw new Error('approved deposit amount not reflected on dashboard');
    await _page.screenshot({ path: path.join(SHOTS, '11-user-balance-updated.png') });
  });

  await browser.close();
  console.log(`\n=== ${passed} steps passed — FULL FLOW GREEN ===`);
}

const cleanupTmp = () => {
  if (process.env.E2E_KEEP_ARTIFACTS === 'true') return;
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
};

main()
  .then(() => {
    cleanupTmp();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('\n=== E2E FAILED ===');
    console.error(err.message);
    results.forEach((r) => console.log(r));
    if (browser) await browser.close().catch(() => {});
    cleanupTmp();
    process.exit(1);
  });
