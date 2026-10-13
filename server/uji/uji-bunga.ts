/**
 * server/uji/uji-bunga.ts — UJI core/bunga.ts
 * Memakai ANGKA NYATA dari keuangan.db (3 contoh yang sudah ada di mockup)
 */
import { bagian, lapor, sama, dekat, uji } from './alat.js';
import {
  hitungBunga, hitungPajak, rateBawaan,
  RATE_TABUNGAN, RATE_DEPOSITO, RATE_PAJAK,
} from '../core/bunga.js';

bagian('Rate — tabungan BEDA dengan deposito (keputusan Bapak)');

sama('tabungan 5,0% p.a', RATE_TABUNGAN, 5.0);
sama('deposito 7,5% p.a', RATE_DEPOSITO, 7.5);
sama('pajak 20%', RATE_PAJAK, 20.0);
sama('rate bawaan tabungan', rateBawaan('tabungan'), 5.0);
sama('rate bawaan deposito', rateBawaan('deposito'), 7.5);
uji('tabungan ≠ deposito', (RATE_TABUNGAN as number) !== (RATE_DEPOSITO as number));

bagian('🔴 Contoh 1 — Deposito 7,5% · 100jt · 31 hari (angka nyata Bapak)');

const c1 = hitungBunga({
  pokokRupiah: 100_000_000,
  ratePersen: RATE_DEPOSITO,
  jumlahHari: 31,
  metode: 'akhir',
});
/* Nyata: bunga 636.986,30 · pajak 127.397,26 · neto 509.589,04 */
dekat('bunga 31 hari', c1.bungaRupiah, 636986.30, 0.01);
dekat('pajak 20%', c1.pajakRupiah, 127397.26, 0.01);
dekat('neto', c1.netoRupiah, 509589.04, 0.01);
sama('jejak: basis hari', c1.jejak.basisHari, 365);
sama('jejak: pokok tercatat', c1.jejak.pokok, 100_000_000);
sama('jejak: metode', c1.jejak.metode, 'akhir');

bagian('Contoh 2 — Tabungan 5,0% · 10jt · 31 hari');

const c2 = hitungBunga({
  pokokRupiah: 10_000_000,
  ratePersen: RATE_TABUNGAN,
  jumlahHari: 31,
  metode: 'akhir',
});
dekat('bunga tabungan 31 hari', c2.bungaRupiah, 42465.75, 0.01);
dekat('pajak 20%', c2.pajakRupiah, 8493.15, 0.01);
dekat('neto', c2.netoRupiah, 33972.60, 0.01);

bagian('🔴 Bukti bug 30 Agu: tabungan dihitung 1,5x lebih besar');

const pakaiTabungan = hitungBunga({ pokokRupiah: 10_000_000, ratePersen: RATE_TABUNGAN, jumlahHari: 31, metode: 'akhir' });
const pakaiDeposito  = hitungBunga({ pokokRupiah: 10_000_000, ratePersen: RATE_DEPOSITO,  jumlahHari: 31, metode: 'akhir' });
const rasio = pakaiDeposito.bungaRupiah / pakaiTabungan.bungaRupiah;
dekat('rate deposito / tabungan = 1,5', rasio, 1.5, 0.001);
uji('rate salah → bunga melambung 1,5x', rasio > 1.4);

bagian('🔴 Rate KOSONG harus DITOLAK (jangan pakai angka cadangan)');

let tertangkap = false;
try {
  hitungBunga({ pokokRupiah: 1_000_000, ratePersen: 0, jumlahHari: 30, metode: 'akhir' });
} catch { tertangkap = true; }
uji('rate 0 ditolak', tertangkap);

tertangkap = false;
try {
  hitungBunga({ pokokRupiah: 1_000_000, ratePersen: NaN, jumlahHari: 30, metode: 'akhir' });
} catch { tertangkap = true; }
uji('rate NaN ditolak', tertangkap);

tertangkap = false;
try {
  hitungBunga({ pokokRupiah: 0, ratePersen: 5, jumlahHari: 30, metode: 'akhir' });
} catch { tertangkap = true; }
uji('pokok 0 ditolak', tertangkap);

bagian('Metode pembulatan — bisa dipilih per bank');

const akhir   = hitungBunga({ pokokRupiah: 10_000_000, ratePersen: 5, jumlahHari: 31, metode: 'akhir' });
const harian  = hitungBunga({ pokokRupiah: 10_000_000, ratePersen: 5, jumlahHari: 31, metode: 'harian' });
const b360    = hitungBunga({ pokokRupiah: 10_000_000, ratePersen: 5, jumlahHari: 31, metode: 'basis360' });
const manual  = hitungBunga({ pokokRupiah: 10_000_000, ratePersen: 5, jumlahHari: 31, metode: 'manual', angkaBankRupiah: 42500 });

sama('basis 360 hari', b360.jejak.basisHari, 360);
uji('basis 360 → bunga lebih besar', b360.bungaRupiah > akhir.bungaRupiah);
uji('harian bisa beda dengan akhir (pembulatan)', harian.bungaRupiah !== akhir.bungaRupiah);
sama('manual pakai angka bank', manual.bungaRupiah, 42500);
uji('manual mencatat selisih', manual.jejak.selisih !== 0);
uji('jejak angka bank terisi', manual.jejak.angkaBank === 42500);

bagian('Pajak saja (untuk koreksi manual)');

dekat('pajak 20% dari 636.986,30', hitungPajak(636986.3), 127397.26, 0.01);
dekat('pajak 20% dari 42.465,75', hitungPajak(42465.75), 8493.15, 0.01);

lapor('uji-bunga');
