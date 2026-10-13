/**
 * server/uji/uji-periode.ts — UJI core/periode.ts
 * Termasuk uji SENTINEL -1 (bug nyata 30 Agu: aplikasi macet)
 */
import { bagian, lapor, sama, uji } from './alat.js';
import {
  awalBulan, akhirBulan, rentangBulan, jumlahHari,
  bulanSebelumnya, bulanBerikutnya, selisihBulan,
  bacaTanggal, periodeDariTanggal, formatTanggal, formatBulan,
  targetKeTanggal, targetAkhirBulan, selisihHari, kunciBulan,
} from '../core/periode.js';

bagian('Batas bulan — WAJIB awal DAN akhir');

sama('awal September 2026', awalBulan(2026, 9), '2026-09-01');
sama('akhir September 2026', akhirBulan(2026, 9), '2026-09-30');
sama('akhir Februari 2026 (bukan kabisat)', akhirBulan(2026, 2), '2026-02-28');
sama('akhir Februari 2024 (kabisat)', akhirBulan(2024, 2), '2024-02-29');
sama('akhir Desember', akhirBulan(2026, 12), '2026-12-31');

const rentang = rentangBulan(2026, 9);
sama('rentang dari', rentang.dari, '2026-09-01');
sama('rentang sampai', rentang.sampai, '2026-09-30');
uji('rentang selalu punya 2 batas', !!rentang.dari && !!rentang.sampai);

bagian('Jumlah hari & pindah bulan');

sama('jumlah hari Sep', jumlahHari(2026, 9), 30);
sama('jumlah hari Feb 2026', jumlahHari(2026, 2), 28);
sama('bulan sebelum Jan → Des tahun lalu', bulanSebelumnya(2026, 1), { tahun: 2025, bulan: 12 });
sama('bulan sesudah Des → Jan tahun depan', bulanBerikutnya(2026, 12), { tahun: 2027, bulan: 1 });
sama('selisih Sep−Agu', selisihBulan({ tahun: 2026, bulan: 9 }, { tahun: 2026, bulan: 8 }), 1);
sama('selisih Sep−Jan', selisihBulan({ tahun: 2026, bulan: 9 }, { tahun: 2026, bulan: 1 }), 8);

bagian('🔴 SENTINEL target_day = -1 (bug 30 Agu)');

sama('target -1 = akhir bulan', targetKeTanggal(2026, 9, -1), '2026-09-30');
sama('target -1 di Feb = 28', targetKeTanggal(2026, 2, -1), '2026-02-28');
sama('target 15 = tanggal 15', targetKeTanggal(2026, 9, 15), '2026-09-15');
sama('target 31 di Sep dijepit ke 30', targetKeTanggal(2026, 9, 31), '2026-09-30');
sama('target 31 di Feb dijepit ke 28', targetKeTanggal(2026, 2, 31), '2026-02-28');
sama('target null = akhir bulan', targetKeTanggal(2026, 9, null), '2026-09-30');
uji('-1 dikenali sebagai sentinel', targetAkhirBulan(-1) === true);
uji('15 bukan sentinel', targetAkhirBulan(15) === false);

bagian('Baca & tulis tanggal');

sama('baca 2026-09-25', bacaTanggal('2026-09-25'), { tahun: 2026, bulan: 9, hari: 25 });
uji('tanggal sampah → null', bacaTanggal('abc') === null);
uji('bulan 13 → null', bacaTanggal('2026-13-01') === null);
sama('periode dari tanggal', periodeDariTanggal('2026-09-25'), { tahun: 2026, bulan: 9 });
sama('format panjang', formatTanggal('2026-09-25'), '25 Sep 2026');
sama('format bulan', formatBulan(2026, 9), 'September 2026');
sama('kunci bulan', kunciBulan(2026, 9), '2026-09');

bagian('Selisih hari (untuk bunga)');

sama('25 Sep − 25 Agu', selisihHari('2026-08-25', '2026-09-25'), 31);
sama('satu bulan penuh Sep', selisihHari('2026-09-01', '2026-09-30'), 29);
sama('sama → 0', selisihHari('2026-09-25', '2026-09-25'), 0);
sama('lintas tahun', selisihHari('2025-12-31', '2026-01-01'), 1);

lapor('uji-periode');
