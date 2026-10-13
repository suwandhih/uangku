/**
 * Periksa ringkasan bulan — MENGAPA angka berbeda dengan catatan lama?
 * Hanya alat baca. Tidak mengubah data.
 */
import { bukaUangku } from '../server/db/index.js';

const db = bukaUangku(true);

const TAG_KECUALI = ['Transfer', 'Koreksi', 'Pinjam', 'Hutang', 'Reimburse'];
const ph = TAG_KECUALI.map(() => '?').join(',');

function ringkas(label: string, bulanAwal: string, bulanAkhir: string) {
  const D = db
    .prepare(
      `SELECT t.tag, COUNT(*) n, SUM(t.amount) total
       FROM transactions t JOIN journals j ON j.id = t.journal_id
       WHERE j.type='D' AND t.date>=? AND t.date<=?
         AND t.deleted_at IS NULL AND COALESCE(t.is_historical,0)=0
       GROUP BY t.tag ORDER BY total DESC`
    )
    .all(bulanAwal, bulanAkhir) as any[];

  const K = db
    .prepare(
      `SELECT t.tag, COUNT(*) n, SUM(t.amount) total
       FROM transactions t JOIN journals j ON j.id = t.journal_id
       WHERE j.type='K' AND t.date>=? AND t.date<=?
         AND t.deleted_at IS NULL AND COALESCE(t.is_historical,0)=0
       GROUP BY t.tag ORDER BY total DESC`
    )
    .all(bulanAwal, bulanAkhir) as any[];

  const jumlah = (arr: any[], kecuali: boolean) =>
    arr.reduce((s, x) => (kecuali && TAG_KECUALI.includes(x.tag) ? s : s + x.total), 0);

  console.log(`\n=== ${label} ===`);
  console.log('MASUK (D):');
  D.forEach((x) => console.log('   ', (x.tag || '(kosong)').padEnd(14), String(x.n).padStart(4), x.total.toFixed(2).padStart(15)));
  console.log('KELUAR (K):');
  K.forEach((x) => console.log('   ', (x.tag || '(kosong)').padEnd(14), String(x.n).padStart(4), x.total.toFixed(2).padStart(15)));

  const masuk = jumlah(D, true);
  const keluar = jumlah(K, true);
  console.log('   masuk  (tanpa 5 tag kecuali) :', masuk.toFixed(2));
  console.log('   keluar (tanpa 5 tag kecuali) :', keluar.toFixed(2));
  console.log('   selisih                      :', (masuk - keluar).toFixed(2));
  console.log('   masuk  (SEMUA tag)           :', jumlah(D, false).toFixed(2));
  console.log('   keluar (SEMUA tag)           :', jumlah(K, false).toFixed(2));
}

ringkas('September 2026', '2026-09-01', '2026-09-30');
ringkas('Agustus 2026', '2026-08-01', '2026-08-31');

// Berapa banyak transaksi yang tanggalnya DI LUAR bulan berjalan (untuk uji batas akhir)
const luar = db
  .prepare(
    `SELECT COUNT(*) n, SUM(t.amount) total FROM transactions t
     WHERE t.date > '2026-09-30' AND t.date <= '2026-10-31'
       AND t.deleted_at IS NULL AND COALESCE(t.is_historical,0)=0`
  )
  .get() as any;
console.log('\nTransaksi setelah 30 Sep s/d 31 Okt:', luar.n, 'jumlah', luar.total);

const luarTahun = db
  .prepare(
    `SELECT COUNT(*) n, SUM(t.amount) total FROM transactions t
     WHERE t.date > '2026-09-30'
       AND t.deleted_at IS NULL AND COALESCE(t.is_historical,0)=0`
  )
  .get() as any;
console.log('Transaksi setelah 30 Sep (semua):', luarTahun.n, 'jumlah', luarTahun.total);

db.close();
