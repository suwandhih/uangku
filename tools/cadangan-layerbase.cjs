/**
 * cadangan-layerbase.cjs — CADANGAN uangku.db → PostgreSQL Layerbase (PC saja)
 *
 * 🔴 ATURAN:
 *   • uangku.db dibuka HANYA BACA (tidak diubah)
 *   • Tiap jalan membuat SKEMA BARU bernama cadangan_<waktu> — skema lama TIDAK dihapus (aturan E2)
 *   • Kredensial owner dibaca dari .env (LB_OWNER_URL) — tidak pernah ditampilkan
 *   • Hanya PC yang memakai kredensial ini. HP TIDAK memakai (lihat rencanakerja K26)
 *
 * Jalankan: node tools\cadangan-layerbase.cjs
 */
const fs = require('fs');
const path = require('path');
const D = require('c:/data/UangKu/node_modules/better-sqlite3');
const { Client } = require('c:/data/UangKu/node_modules/pg');

const SUMBER = 'c:/data/UangKu/data/uangku.db';
const ENV = 'c:/data/UangKu/.env';
const HOST = 'uangku-plus-pond-pooler.ovh2.cloud.layerbase.dev';
const BATAS_PARAM = 60000;

const env = Object.fromEntries(fs.readFileSync(ENV, 'utf8').split(/\r?\n/)
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }));
const owner = env.LB_OWNER_URL.match(/^postgresql:\/\/([^:]+):([^@]+)@/);

const petaTipe = (t) => {
  const u = String(t || '').toUpperCase();
  if (u.includes('INT')) return 'bigint';
  if (u.includes('REAL') || u.includes('FLOA') || u.includes('DOUB') || u.includes('NUM')) return 'double precision';
  return 'text';
};

(async () => {
  /* 1. Salin lokal (cadangan kedua di PC) — sumber tidak diubah */
  const folder = 'c:/data/UangKu/data/backups';
  fs.mkdirSync(folder, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
  fs.copyFileSync(SUMBER, path.join(folder, `uangku-${stamp}-sebelum-layerbase.db`));

  const sqlite = new D(SUMBER, { readonly: true, fileMustExist: true });
  const tabel = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(r => r.name);

  const pg = new Client({ host: HOST, port: 5432, user: owner[1], password: owner[2], database: 'uangku', ssl: { rejectUnauthorized: false } });
  await pg.connect();

  const skema = 'cadangan_' + new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
  await pg.query(`CREATE SCHEMA "${skema}"`);
  console.log(`Skema baru: ${skema} (skema lama tidak diubah)`);

  const hasil = [];
  for (const t of tabel) {
    const kol = sqlite.prepare(`PRAGMA table_info("${t}")`).all();
    const defKol = kol.map(k => `"${k.name}" ${petaTipe(k.type)}${k.pk ? ' PRIMARY KEY' : ''}`).join(', ');
    await pg.query(`CREATE TABLE "${skema}"."${t}" (${defKol})`);

    const baris = sqlite.prepare(`SELECT * FROM "${t}"`).all();
    const nama = kol.map(k => `"${k.name}"`).join(',');
    const per = Math.max(1, Math.min(500, Math.floor(BATAS_PARAM / kol.length)));
    for (let i = 0; i < baris.length; i += per) {
      const blok = baris.slice(i, i + per);
      const nilai = [];
      const param = [];
      blok.forEach((r) => {
        const ph = kol.map((k) => { param.push(r[k.name] === undefined ? null : r[k.name]); return '$' + param.length; });
        nilai.push('(' + ph.join(',') + ')');
      });
      await pg.query(`INSERT INTO "${skema}"."${t}" (${nama}) VALUES ${nilai.join(',')}`, param);
    }

    const dibaca = baris.length;
    const ditulis = Number((await pg.query(`SELECT COUNT(*) n FROM "${skema}"."${t}"`)).rows[0].n);
    hasil.push({ t, dibaca, ditulis, cocok: dibaca === ditulis });
  }

  sqlite.close();
  await pg.end();

  const gagal = hasil.filter(h => !h.cocok);
  for (const h of hasil) console.log(`${h.cocok ? 'OK ' : 'BEDA'} ${h.t.padEnd(20)} sqlite=${h.dibaca} layerbase=${h.ditulis}`);
  console.log(gagal.length === 0 ? `\n✅ CADANGAN SELESAI — ${hasil.length} tabel, semua jumlah baris cocok (skema ${skema})`
    : `\n⚠️ ${gagal.length} tabel tidak cocok`);
  process.exit(gagal.length === 0 ? 0 : 1);
})().catch((e) => { console.error('GALAT:', e.message); process.exit(1); });
