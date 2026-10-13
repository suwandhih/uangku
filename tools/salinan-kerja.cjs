/**
 * SALINAN KERJA — keuangan.db → uangku.db
 *
 * 🔴 ATURAN:
 *   • keuangan.db = PRODUKSI, HANYA DIBACA (aturan B2)
 *   • Salinan WAJIB lewat API backup SQLite — bukan copy file (aturan B7)
 *     (kalau copy file mentah, WAL 4 MB tidak ikut → data terbaru HILANG)
 *   • Salinan 1 arah: keuangan → uangku (aturan B6)
 *
 * Hasil: c:\data\UangKu\data\uangku.db
 */
const fs = require('fs');
const path = require('path');
const D = require('c:/data/keuangan/node_modules/better-sqlite3');

const SUMBER = 'c:/data/keuangan/data/keuangan.db';
const FOLDER = 'c:/data/UangKu/data';
const TUJUAN = path.join(FOLDER, 'uangku.db');

(async () => {
  if (!fs.existsSync(FOLDER)) fs.mkdirSync(FOLDER, { recursive: true });

  /* Backup lama dipindah dulu — jangan ditimpa (aturan C12: jangan biarkan file lama hidup) */
  if (fs.existsSync(TUJUAN)) {
    const cap = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const arsip = path.join(FOLDER, 'uangku-lama-' + cap + '.db');
    fs.renameSync(TUJUAN, arsip);
    console.log('Salinan lama dipindah → ' + path.basename(arsip));
  }

  /* 1. Buka sumber HANYA BACA */
  const src = new D(SUMBER, { readonly: true, fileMustExist: true });
  console.log('Sumber dibuka (HANYA BACA): ' + SUMBER);

  /* 2. Backup lewat API resmi — WAL ikut terbawa */
  await src.backup(TUJUAN);
  src.close();
  console.log('Backup API selesai → ' + TUJUAN);

  /* 3. Periksa hasil */
  const dst = new D(TUJUAN, { readonly: true, fileMustExist: true });
  const cek = (sql) => dst.prepare(sql).get();

  const tabel = dst.prepare("SELECT COUNT(*) n FROM sqlite_master WHERE type='table'").get().n;
  const tx     = cek('SELECT COUNT(*) n FROM transactions').n;
  const fund   = cek('SELECT COUNT(*) n FROM source_funds').n;
  const tag    = cek('SELECT COUNT(*) n FROM tags').n;
  const snap   = cek('SELECT COUNT(*) n FROM monthly_snapshots').n;
  const rutin  = cek('SELECT COUNT(*) n FROM recurring').n;
  const jurnal = cek('SELECT COUNT(*) n FROM journals').n;
  dst.close();

  const ukuran = (fs.statSync(TUJUAN).size / 1024).toFixed(0);

  console.log('\n=== ISI uangku.db ===');
  console.log('Tabel        : ' + tabel);
  console.log('transactions : ' + tx);
  console.log('source_funds : ' + fund);
  console.log('tags         : ' + tag);
  console.log('journals     : ' + jurnal);
  console.log('snapshots    : ' + snap);
  console.log('recurring    : ' + rutin);
  console.log('Ukuran file  : ' + ukuran + ' KB');
  console.log('\n✅ Salinan kerja siap. keuangan.db TIDAK disentuh (hanya baca).');
})();
