/**
 * ============================================================
 * core/bunga.ts — RUMUS BUNGA & PAJAK (satu-satunya tempat)
 * ============================================================
 *
 * 🔴 ATURAN (agents.md Bagian 10):
 *   • Rumus HANYA di berkas ini. Sistem lama punya 3 tempat → selisih 1 sen berulang.
 *   • Hitung dalam SEN (integer) — lihat core/uang.ts.
 *   • Rate WAJIB diisi. DILARANG memakai angka cadangan diam-diam.
 *     Bug nyata 30 Agu: rate kosong → diam-diam pakai 7,5% (angka deposito)
 *     → bunga tabungan jadi 1,5x lebih besar.
 *
 * Rumus:
 *   Bunga = Pokok × Rate/100 × Hari/365
 *   Pajak = Bunga × RatePajak/100
 */

import { keSen, persenSen, bulatkanRupiah } from './uang.js';

/** Rate per jenis simpanan — BEDA (keputusan Bapak 25 Sep 2026) */
export const RATE_TABUNGAN = 5.0;  // % p.a — tabungan biasa
export const RATE_DEPOSITO = 7.5;  // % p.a — deposito berjangka
export const RATE_PAJAK = 20.0;    // % — dipotong dari bunga

export type JenisSimpanan = 'tabungan' | 'deposito';

/** Cara membulatkan — bisa dipilih per rutin (meniru cara bank) */
export type MetodePembulatan =
  | 'akhir'      // ① bulatkan sekali di akhir (bawaan, paling umum)
  | 'harian'     // ② bulatkan per hari lalu jumlahkan
  | 'basis360'   // ③ pakai 360 hari
  | 'manual';    // ④ Bapak isi angka bank

export interface BahanBunga {
  pokokRupiah: number;
  ratePersen: number;
  jumlahHari: number;
  metode: MetodePembulatan;
  /** Hanya untuk metode 'manual' — angka nyata dari mutasi bank */
  angkaBankRupiah?: number;
}

export interface HasilBunga {
  bungaRupiah: number;
  pajakRupiah: number;
  netoRupiah: number;
  /** Jejak hitungan — disimpan, bukan cuma hasil (agents.md 10.7) */
  jejak: {
    pokok: number;
    rate: number;
    hari: number;
    metode: MetodePembulatan;
    basisHari: number;
    angkaBank: number | null;
    selisih: number;
  };
}

/** Hitung basis hari menurut metode. */
function basisHari(metode: MetodePembulatan): number {
  return metode === 'basis360' ? 360 : 365;
}

/**
 * 🔴 HITUNG BUNGA — satu-satunya fungsi.
 * @throws kalau rate tidak masuk akal (DILARANG memakai angka cadangan)
 */
export function hitungBunga(bahan: BahanBunga): HasilBunga {
  const { pokokRupiah, ratePersen, jumlahHari, metode, angkaBankRupiah } = bahan;

  /* 🔴 VALIDASI — cegah bug "rate kosong diam-diam pakai 7,5%" */
  if (!Number.isFinite(ratePersen) || ratePersen <= 0) {
    throw new Error(
      'core/bunga.ts: rate WAJIB diisi dan > 0. ' +
      'Tidak boleh memakai angka cadangan diam-diam (bug 30 Agu 2026).',
    );
  }
  if (!Number.isFinite(pokokRupiah) || pokokRupiah <= 0) {
    throw new Error('core/bunga.ts: pokok WAJIB > 0.');
  }
  if (!Number.isFinite(jumlahHari) || jumlahHari <= 0) {
    throw new Error('core/bunga.ts: jumlah hari WAJIB > 0.');
  }

  const basis = basisHari(metode);
  const pokokSen = keSen(pokokRupiah);

  let bungaSen: number;

  if (metode === 'harian') {
    /* ② Bulatkan per hari, lalu jumlahkan (meniru bank harian) */
    const perHari = pokokSen * (ratePersen / 100) / basis;
    bungaSen = Math.round(perHari) * jumlahHari;
  } else {
    /* ① ③ — hitung sekali, baru dibulatkan */
    bungaSen = Math.round((pokokSen * ratePersen * jumlahHari) / (100 * basis));
  }

  let selisihSen = 0;
  if (metode === 'manual') {
    /* ④ Pakai angka Bapak dari mutasi bank; simpan selisihnya */
    const bankSen = keSen(angkaBankRupiah ?? 0);
    selisihSen = bankSen - bungaSen;
    bungaSen = bankSen;
  }

  const pajakSen = persenSen(bungaSen, RATE_PAJAK);
  const netoSen = bungaSen - pajakSen;

  return {
    bungaRupiah: bungaSen / 100,
    pajakRupiah: pajakSen / 100,
    netoRupiah: netoSen / 100,
    jejak: {
      pokok: pokokRupiah,
      rate: ratePersen,
      hari: jumlahHari,
      metode,
      basisHari: basis,
      angkaBank: metode === 'manual' ? (angkaBankRupiah ?? 0) : null,
      selisih: selisihSen / 100,
    },
  };
}

/**
 * Hitung PAJAK saja dari bunga yang sudah diketahui.
 * Dipakai saat koreksi manual / hapus pajak.
 */
export function hitungPajak(bungaRupiah: number, ratePajak = RATE_PAJAK): number {
  return persenSen(keSen(bungaRupiah), ratePajak) / 100;
}

/** Rate bawaan menurut jenis simpanan. */
export function rateBawaan(jenis: JenisSimpanan): number {
  return jenis === 'deposito' ? RATE_DEPOSITO : RATE_TABUNGAN;
}
