/*
 * cek-sama-cloud.cjs — PEMBUKTI: data server SAMA PERSIS dengan keuangan.db
 *
 *   keuangan.db  ──(salinan-kerja.cjs)──►  uangku.db  ──(siapkan-cloud.cjs)──►  server
 *
 * Alat ini membandingkan TIGA hal sekaligus:
 *   ① jumlah baris tiap tabel
 *   ② sidik jari SHA-256 seluruh isi tabel (baris + kolom, urut)
 *   ③ saldo 18 fund bulan terakhir
 *
 * Jalankan:  node tools\cek-sama-cloud.cjs
 * Keluar dengan kode 1 kalau ada SATU saja yang beda.
 *
 * 🔴 keuangan.db dibuka HANYA BACA (readonly) — aturan B2.
 */
const fs = require('fs');
const crypto = require('crypto');
const D = require('c:/data/UangKu/node_modules/better-sqlite3');
const { Client } = require('c:/data/UangKu/node_modules/pg');

const KEUANGAN = 'c:/data/keuangan/data/keuangan.db';
const SALINAN = 'c:/data/UangKu/data/uangku.db';
const ENV = 'c:/data/UangKu/.env';
const SKEMA = 'uangku';

const TABEL = [
  'source_funds', 'tags', 'journals', 'wishlist', 'transactions',
  'monthly_snapshots', 'audit_log', 'app_settings', 'tax_config',
  'recurring', 'shopping_list', 'investments', 'users',
  'ai_knowledge', 'ai_analyses',
];

function bacaEnv() {
  return Object.fromEntries(
    fs.readFileSync(ENV, 'utf8').split(/\r?\n/)
      .filter((l) => l.includes('=') && !l.startsWith('#'))
      .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
  );
}

/* Nilai diseragamkan supaya SQLite & PostgreSQL menghasilkan teks yang sama.
   ⚠️ Penting: driver `pg` mengembalikan BIGINT sebagai TEKS ("2"), sedangkan
   better-sqlite3 mengembalikan ANGKA (2). Itu beda cara baca, bukan beda isi.
   Jadi penyeragaman mengikuti JENIS KOLOM dari skema SQLite — bukan jenis nilai. */
function seragam(v, jenis) {
  if (v === null || v === undefined) return '\u0000';
  if (Buffer.isBuffer(v)) return v.toString('hex');
  if (jenis === 'angka') {
    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(6) : String(v);
  }
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'boolean') return v ? '1' : '0';
  return String(v);
}

/* INTEGER / REAL / NUMERIC / DECIMAL → 'angka', sisanya 'teks' */
function jenisKolom(tipe) {
  return /INT|REAL|FLOA|DOUB|NUMERIC|DECIMAL/i.test(String(tipe || '')) ? 'angka' : 'teks';
}

function sidik(baris, kolom, jenis) {
  const h = crypto.createHash('sha256');
  for (const r of baris) {
    for (const k of kolom) h.update(seragam(r[k], jenis[k])).update('\u001f');
    h.update('\u001e');
  }
  return h.digest('hex').slice(0, 16);
}

(async () => {
  const env = bacaEnv();
  const sqlite = new D(SALINAN, { readonly: true });
  const keu = new D(KEUANGAN, { readonly: true });
  const pg = new Client({
    connectionString: env.LB_OWNER_URL,
    ssl: { rejectUnauthorized: false },
  });
  await pg.connect();

  console.log('=== PEMBUKTI: keuangan.db  ==  uangku.db  ==  server ===\n');

  let beda = 0;
  const laporan = [];

  for (const t of TABEL) {
    /* kolom + jenisnya diambil dari SQLite (skema asli) */
    const info = sqlite.prepare(`PRAGMA table_info("${t}")`).all();
    const kolom = info.map((c) => c.name);
    if (kolom.length === 0) { laporan.push({ t, catatan: 'tabel tidak ada di salinan' }); continue; }
    const jenis = Object.fromEntries(info.map((c) => [c.name, jenisKolom(c.type)]));

    const urut = kolom.includes('id') ? 'id' : kolom[0];
    const daftarKolom = kolom.map((k) => `"${k}"`).join(', ');

    const a = keu.prepare(`SELECT ${daftarKolom} FROM "${t}" ORDER BY "${urut}"`).all();
    const b = sqlite.prepare(`SELECT ${daftarKolom} FROM "${t}" ORDER BY "${urut}"`).all();
    const c = (await pg.query(`SELECT ${daftarKolom} FROM "${SKEMA}"."${t}" ORDER BY "${urut}"`)).rows;

    const sa = sidik(a, kolom, jenis);
    const sb = sidik(b, kolom, jenis);
    const sc = sidik(c, kolom, jenis);

    const cocok = a.length === b.length && b.length === c.length && sa === sb && sb === sc;
    if (!cocok) beda++;

    laporan.push({ t, n: a.length, sa, sb, sc, cocok, kolom: kolom.length });
  }

  console.log('tabel'.padEnd(20) + 'baris'.padStart(7) + '  keuangan.db      uangku.db        server           status');
  console.log('-'.repeat(88));
  for (const r of laporan) {
    if (r.catatan) { console.log(r.t.padEnd(20) + '  ' + r.catatan); continue; }
    console.log(
      r.t.padEnd(20) + String(r.n).padStart(7) + '  ' +
      r.sa.padEnd(17) + r.sb.padEnd(17) + r.sc.padEnd(17) +
      (r.cocok ? 'SAMA' : 'BEDA'),
    );
  }

  /* ---- saldo 18 fund bulan terakhir ---- */
  const bulan = sqlite.prepare(
    "SELECT MAX(substr(date,1,7)) b FROM transactions WHERE deleted_at IS NULL AND is_historical=0",
  ).get().b;
  const [th, bl] = bulan.split('-').map(Number);
  const akhir = new Date(Date.UTC(th, bl, 0)).getUTCDate();
  const dari = `${bulan}-01`;
  const sampai = `${bulan}-${String(akhir).padStart(2, '0')}`;

  const sqlSaldo = (ph, awalan) => `
    SELECT f.id, f.name,
      COALESCE(s.saldo_awal, 0)
      + COALESCE(SUM(CASE WHEN j.type = 'D' THEN t.amount ELSE 0 END), 0)
      - COALESCE(SUM(CASE WHEN j.type = 'K' THEN t.amount ELSE 0 END), 0) AS saldo
    FROM ${awalan}source_funds f
    LEFT JOIN ${awalan}monthly_snapshots s ON s.source_fund_id = f.id AND s.year = ${ph[0]} AND s.month = ${ph[1]}
    LEFT JOIN ${awalan}transactions t ON t.source_fund_id = f.id
      AND t.date >= ${ph[2]} AND t.date <= ${ph[3]} AND t.deleted_at IS NULL
      AND COALESCE(t.is_historical, 0) = 0
    LEFT JOIN ${awalan}journals j ON j.id = t.journal_id
    WHERE f.deleted_at IS NULL
    GROUP BY f.id, f.name, s.saldo_awal
    ORDER BY f.id`;

  const sKeu = keu.prepare(sqlSaldo(['?', '?', '?', '?'], '')).all(th, bl, dari, sampai);
  const sSal = sqlite.prepare(sqlSaldo(['?', '?', '?', '?'], '')).all(th, bl, dari, sampai);
  const sPg = (await pg.query(sqlSaldo(['$1', '$2', '$3', '$4'], `"${SKEMA}".`), [th, bl, dari, sampai])).rows;

  console.log(`\n=== SALDO 18 FUND — ${bulan} ===`);
  console.log('fund'.padEnd(22) + 'keuangan.db'.padStart(18) + 'uangku.db'.padStart(18) + 'server'.padStart(18) + '   status');
  console.log('-'.repeat(88));
  let bedaSaldo = 0;
  let total = 0;
  for (let i = 0; i < sKeu.length; i++) {
    const a = Number(sKeu[i].saldo);
    const b = Number(sSal[i].saldo);
    const c = Number(sPg[i].saldo);
    const sama = Math.abs(a - b) < 0.005 && Math.abs(b - c) < 0.005;
    if (!sama) bedaSaldo++;
    total += c;
    console.log(
      String(sKeu[i].name).padEnd(22) +
      a.toFixed(2).padStart(18) + b.toFixed(2).padStart(18) + c.toFixed(2).padStart(18) +
      '   ' + (sama ? 'SAMA' : 'BEDA'),
    );
  }
  console.log('-'.repeat(88));
  console.log('TOTAL'.padEnd(22) + ''.padStart(18) + ''.padStart(18) + total.toFixed(2).padStart(18));

  sqlite.close();
  keu.close();
  await pg.end();

  const gagal = beda + bedaSaldo;
  console.log(
    gagal === 0
      ? `\n✅ IDENTIK 100% — ${laporan.length} tabel, ${sKeu.length} fund. Data server = c:\\data\\keuangan`
      : `\n⚠️  ${beda} tabel beda · ${bedaSaldo} saldo fund beda — JANGAN dipakai dulu, periksa`,
  );
  process.exit(gagal === 0 ? 0 : 1);
})().catch((e) => { console.error('GALAT:', e.message); process.exit(1); });
