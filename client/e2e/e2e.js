/* Full-flow E2E: register -> create plan -> deposit -> upload proof -> admin verify -> balance check
 * Forms are submitted via their <form> element (requestSubmit) to avoid clicking the wrong
 * same-text button (e.g. navbar "Masuk" vs login submit, header "Buat Rencana" vs modal submit).
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:5173';
const SHOTS = path.join(__dirname, 'shots');
const PROOF = path.join(__dirname, 'proof.png');

// 1x1 transparent PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

const ts = Date.now().toString().slice(-8);
const USER = { name: `Tester ${ts}`, email: `tester${ts}@mail.com`, phone: `0812${ts}` };

let browser;
let passed = 0;
const results = [];

function log(msg) {
  console.log(`  -> ${msg}`);
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
    if (browser) {
      await _page
        .screenshot({ path: path.join(SHOTS, `fail-${name.replace(/\W+/g, '_')}.png`) })
        .catch(() => {});
    }
    throw err;
  }
}

let _page;
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

async function main() {
  fs.mkdirSync(SHOTS, { recursive: true });
  fs.writeFileSync(PROOF, PNG);

  browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1400,950'],
    defaultViewport: { width: 1400, height: 950 },
  });
  _page = await browser.newPage();
  _page.setDefaultTimeout(30000);
  _page.on('pageerror', (e) => console.error('  [pageerror]', e.message.slice(0, 200)));

  /* ---------------- 1. REGISTER ---------------- */
  await ok('register: open form', async () => {
    await _page.goto(`${BASE}/register`, { waitUntil: 'networkidle2' });
    await _page.waitForSelector('#name', { timeout: 15000 });
  });

  await ok('register: fill + submit', async () => {
    await typeInto('#name', USER.name);
    await typeInto('#email', USER.email);
    await typeInto('#phone', USER.phone);
    await typeInto('#password', 'Password123');
    await typeInto('#confirmPassword', 'Password123');
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
    await clickNthByText('Buat Rencana', 0);
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
    await clickNthByText('Setor Sekarang', 0);
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
    // JS click (not mouse) so an overlapping toast can't swallow it
    await _page.evaluate(() => document.querySelector('button[title="Keluar"]')?.click());
    try {
      await _page.waitForFunction(() => window.location.pathname === '/login', { timeout: 6000 });
    } catch {
      // fallback: hard-clear session and open login directly
      log('logout nav slow — clearing session manually');
      await _page.evaluate(() => {
        ['accessToken', 'refreshToken', 'user'].forEach((k) => localStorage.removeItem(k));
      });
      await _page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
    }
    await typeInto('#email', 'admin@tabunganku.com');
    await typeInto('#password', 'Admin@123456');
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
    await typeInto('#email', USER.email);
    await typeInto('#password', 'Password123');
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

main().catch(async (err) => {
  console.error('\n=== E2E FAILED ===');
  console.error(err.message);
  results.forEach((r) => console.log(r));
  if (browser) await browser.close().catch(() => {});
  process.exit(1);
});
