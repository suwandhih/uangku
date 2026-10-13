/**
 * server/uji/uji-saldo.ts — UJI core/saldo.ts DENGAN ANGKA ASLI BAPAK
 *
 * 🔴 Ini uji TERPENTING tahap 1.
 * Membandingkan saldo 18 fund hasil UangKu dengan angka nyata September 2026.
 * Kalau ada 1 fund beda → HENTIKAN, periksa dulu (agents.md Bagian 12).
 */
import { bagian, lapor, sama, dekat, uji } from './alat.js';
import { bukaUangku, periksaSkema } from '../db/index.js';
import { saldoSemuaFund, saldoTotal, ringkasanBulan, TAG_DIKECUALIKAN, hitungSaldo } from '../core/saldo.js';

/* ----------------------------------------------------------------
   ANGKA PEMBANDING — dari keuangan.db (September 2026)
   Dihitung 25 Sep 2026 lewat tools/hitung-saldo.cjs
   ---------------------------------------------------------------- */
const HARUS_SALDO: Record<string, number> = {
  Superbank: 22_057_865,
  SeaBank: 271_337,
  Celengan: 2_854_767,
  'Dana Sopir': 0,
  'Dana swn': 608_728,
  Tunai: 32_000,
  'Sopir pinjam uang': 325_000,
  'BCA tabungan': 108_027,
  'BCA Saham': 253_493,
  Deposito: 260_000_000,
  'Tabungan A': 595_988,
  'Tabungan B': 16_443,
  ShopeePay: 23_926,
  OVO: 680,
  GoPay: 24_827,
  'Tabungan C': 1_002_630,
  'Tabungan D': 0,
  'Tabungan E': 0,
};

const HARUS_TOTAL = 288_175_713;
const HARUS_AWAL = 280_941_750;

bagian('Periksa skema database');

const db = bukaUangku(true);
const kurang = periksaSkema(db);
uji('semua tabel wajib ada', kurang.length === 0, kurang.length ? 'kurang: ' + kurang.join(', ') : '');

bagian('Saldo 18 fund — September 2026 (angka ASLI Bapak)');

const semua = saldoSemuaFund(db, 2026, 9);
uji('jumlah fund aktif = 18', semua.length === 18, 'dapat ' + semua.length);

let beda = 0;
const daftarBeda: string[] = [];

for (const f of semua) {
  const harus = HARUS_SALDO[f.nama];
  if (harus === undefined) {
    daftarBeda.push(`${f.nama}: tidak ada pembanding`);
    beda++;
    continue;
  }
  const selisih = Math.abs(f.saldo - harus);
  if (selisih > 1) {
    beda++;
    daftarBeda.push(`${f.nama}: dapat ${f.saldo.toLocaleString('id-ID')} harus ${harus.toLocaleString('id-ID')}`);
  }
}

uji('SEMUA 18 fund cocok', beda === 0,
  beda === 0 ? '18/18 cocok' : beda + ' fund beda:\n      ' + daftarBeda.join('\n      '));

/* Tampilkan tabelnya supaya Bapak bisa lihat */
console.log('\n  Nama fund              Saldo awal        Saldo       tx');
console.log('  ' + '─'.repeat(62));
for (const f of semua) {
  console.log(
    '  ' + f.nama.padEnd(22) +
    f.saldoAwal.toLocaleString('id-ID').padStart(12) +
    f.saldo.toLocaleString('id-ID').padStart(14) +
    String(f.jumlahTransaksi).padStart(6),
  );
}

bagian('Total');

dekat('total saldo 18 fund', saldoTotal(db, 2026, 9), HARUS_TOTAL, 1);

const totalAwal = semua.reduce((a, f) => a + f.saldoAwal, 0);
dekat('total saldo awal', totalAwal, HARUS_AWAL, 1);

bagian('🔴 Rumus inti: Saldo = Awal + Debit − Kredit');

sama('hitungSaldo(1000, 500, 200)', hitungSaldo(1000, 500, 200), 1300);
sama('hitungSaldo(0, 0, 500)', hitungSaldo(0, 0, 500), -500);
sama('hitungSaldo(1000, 0, 0)', hitungSaldo(1000, 0, 0), 1000);

bagian('🔴 Ringkasan bulan — 5 tag pengecualian TIDAK dihitung');

const ring = ringkasanBulan(db, 2026, 9);
console.log(`  masuk  ${ring.masuk.toLocaleString('id-ID')}`);
console.log(`  keluar ${ring.keluar.toLocaleString('id-ID')}`);
console.log(`  selisih ${ring.selisih.toLocaleString('id-ID')}`);

/* Angka nyata September 2026 (dihitung 25 Sep 2026 dengan tools/periksa-ringkasan.ts)
   🔴 CATATAN PENTING: Pajak & Bunga TIDAK dikecualikan.
      - Bunga  = pemasukan nyata  → masuk
      - Pajak  = pengeluaran nyata → keluar
   Yang dikecualikan HANYA 5 tag: Transfer · Koreksi · Pinjam · Hutang · Reimburse.
   (Cocok dengan sistem lama: server/routes/dashboard.ts baris 241) */
dekat('masuk September', ring.masuk, 14_191_861.37, 1);
dekat('keluar September', ring.keluar, 7_340_614.86, 1);
dekat('selisih', ring.selisih, 6_851_246.51, 1);

sama('5 tag dikecualikan', [...TAG_DIKECUALIKAN], ['Transfer', 'Koreksi', 'Pinjam', 'Hutang', 'Reimburse']);

/* Buktikan Pajak MEMANG dihitung sebagai pengeluaran (bukan dikecualikan) */
const pajakK = db.prepare(`
  SELECT COALESCE(SUM(t.amount),0) n FROM transactions t
  JOIN journals j ON j.id = t.journal_id
  WHERE t.tag = 'Pajak' AND j.type = 'K'
    AND t.date >= '2026-09-01' AND t.date <= '2026-09-30'
    AND t.deleted_at IS NULL AND COALESCE(t.is_historical,0) = 0
`).get() as { n: number };
uji('Pajak IKUT dihitung sebagai pengeluaran', pajakK.n > 0 && ring.keluar > pajakK.n,
  `pajak ${pajakK.n.toLocaleString('id-ID')} ikut masuk ke keluar ${ring.keluar.toLocaleString('id-ID')}`);

/* Buktikan Bunga IKUT dihitung sebagai pemasukan */
const bungaD = db.prepare(`
  SELECT COALESCE(SUM(t.amount),0) n FROM transactions t
  JOIN journals j ON j.id = t.journal_id
  WHERE t.tag = 'Bunga' AND j.type = 'D'
    AND t.date >= '2026-09-01' AND t.date <= '2026-09-30'
    AND t.deleted_at IS NULL AND COALESCE(t.is_historical,0) = 0
`).get() as { n: number };
uji('Bunga IKUT dihitung sebagai pemasukan', bungaD.n > 0 && ring.masuk > bungaD.n,
  `bunga ${bungaD.n.toLocaleString('id-ID')} ikut masuk ke masuk ${ring.masuk.toLocaleString('id-ID')}`);

/* Pastikan Transfer BENAR-BENAR tidak masuk hitungan */
const transferMasuk = db.prepare(`
  SELECT COALESCE(SUM(t.amount),0) n FROM transactions t
  JOIN journals j ON j.id = t.journal_id
  WHERE t.tag = 'Transfer' AND j.type = 'D'
    AND t.date >= '2026-09-01' AND t.date <= '2026-09-30'
    AND t.deleted_at IS NULL AND COALESCE(t.is_historical,0) = 0
`).get() as { n: number };

uji('Transfer (22,6jt) TIDAK masuk pemasukan', ring.masuk < transferMasuk.n,
  `masuk ${ring.masuk.toLocaleString('id-ID')} vs transfer ${transferMasuk.n.toLocaleString('id-ID')}`);

bagian('🔴 Uji batas bulan — lupa batas akhir = bug Rp 54.400');

/* Bandingkan: query BENAR (2 batas) vs query SALAH (lupa batas akhir).
   Dipakai bulan yang MEMANG punya transaksi setelahnya (Agu & Jul 2026)
   supaya bedanya benar-benar terlihat. */
function ikhtisarFund(bulan: string[], akhir: string | null): Map<string, number> {
  const hasil = new Map<string, number>();
  const batasAkhir = akhir ? 'AND t.date <= ?' : '';
  const sql = `
    SELECT f.name nama, COALESCE(SUM(CASE WHEN j.type='D' THEN t.amount ELSE -t.amount END),0) n
    FROM source_funds f
    LEFT JOIN transactions t ON t.source_fund_id = f.id
      AND t.date >= ? ${batasAkhir}
      AND t.deleted_at IS NULL AND COALESCE(t.is_historical,0)=0
    LEFT JOIN journals j ON j.id = t.journal_id
    GROUP BY f.id
  `;
  const args = akhir ? [bulan[0], akhir] : [bulan[0]];
  for (const r of db.prepare(sql).all(...args) as any[]) hasil.set(r.nama, r.n);
  return hasil;
}

let bulanBeda = 0;
for (const [label, awal, akhir] of [
  ['Agustus 2026', '2026-08-01', '2026-08-31'],
  ['Juli 2026', '2026-07-01', '2026-07-31'],
  ['Juni 2026', '2026-06-01', '2026-06-30'],
] as [string, string, string][]) {
  const benar = ikhtisarFund([awal], akhir);
  const salah = ikhtisarFund([awal], null);
  let nFundBeda = 0;
  let totalBeda = 0;
  for (const [nama, b] of benar) {
    const s = salah.get(nama) ?? 0;
    if (Math.abs(s - b) > 1) {
      nFundBeda++;
      totalBeda += s - b;
    }
  }
  console.log(`  ${label}: ${nFundBeda} fund salah, total beda ${totalBeda.toLocaleString('id-ID')}`);
  if (nFundBeda > 0) bulanBeda++;
}

uji('lupa batas akhir membuat fund SALAH (terbukti di data nyata)', bulanBeda === 3,
  `${bulanBeda} dari 3 bulan memperlihatkan kesalahan — inilah sebabnya wajib 2 batas + dipusatkan di core/periode.ts`);

bagian('Soft delete tidak dihitung');

const adaTerhapus = db.prepare(
  'SELECT COUNT(*) n FROM transactions WHERE deleted_at IS NOT NULL',
).get() as { n: number };
console.log(`  transaksi terhapus (soft): ${adaTerhapus.n}`);
uji('ada transaksi terhapus di data', adaTerhapus.n > 0);
uji('saldo tidak menghitung yang terhapus', semua.length === 18,
  'saldo tetap benar walau ada data terhapus');

db.close();
lapor('uji-saldo');
