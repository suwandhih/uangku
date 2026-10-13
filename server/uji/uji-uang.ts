/**
 * server/uji/uji-uang.ts — UJI core/uang.ts
 * Memakai angka NYATA dari data Bapak (bunga 636.986,30 · pajak 127.397,26)
 */
import { bagian, lapor, sama, dekat, uji } from './alat.js';
import {
  keSen, keRupiah, bulatkanRupiah, persenSen,
  formatRupiah, formatRupiah2, formatBertanda, bacaAngka, SEN,
} from '../core/uang.js';

bagian('Konversi sen');

sama('1 rupiah = 100 sen', SEN, 100);
sama('18.000,30 → sen', keSen(18000.3), 1800030);
sama('sen → rupiah', keRupiah(1800030), 18000.3);
sama('bunga nyata 636.986,30 → sen', keSen(636986.3), 63698630);

bagian('Pembulatan');

sama('bulatkan 18.000,4', bulatkanRupiah(keSen(18000.4)), keSen(18000));
sama('bulatkan 18.000,5 ke atas', bulatkanRupiah(keSen(18000.5)), keSen(18001));

bagian('Persen (dipakai pajak 20%)');

/* 🔴 Angka NYATA dari keuangan.db: pajak 20% dari 636.986,30 = 127.397,26 */
dekat('pajak 20% dari 636.986,30', keRupiah(persenSen(keSen(636986.3), 20)), 127397.26, 0.005);
dekat('pajak 20% dari 636.986,30 (tx #2981) = 127.397,25',
  keRupiah(persenSen(keSen(636986.3), 20)), 127397.25, 0.02);

bagian('Format tampilan');

sama('format 18.000', formatRupiah(keSen(18000)), '18.000');
sama('format 2 desimal', formatRupiah2(keSen(636986.3)), '636.986,30');
sama('format bertanda +', formatBertanda(keSen(8500000)), '+8.500.000');
sama('format bertanda −', formatBertanda(keSen(-18000)), '−18.000');

bagian('Baca input Bapak');

sama('"18.000" → sen', bacaAngka('18.000'), keSen(18000));
sama('"18.000,30" → sen', bacaAngka('18.000,30'), keSen(18000.3));
sama('"18000.3" → sen', bacaAngka('18000.3'), keSen(18000.3));
sama('"Rp 18.000" → sen', bacaAngka('Rp 18.000'), keSen(18000));
sama('"636.986,30" → sen', bacaAngka('636.986,30'), keSen(636986.3));
sama('angka langsung 18000', bacaAngka(18000), keSen(18000));
uji('teks sampah → null (bukan 0)', bacaAngka('abc') === null);
uji('kosong → null (bukan 0)', bacaAngka('') === null);

lapor('uji-uang');
