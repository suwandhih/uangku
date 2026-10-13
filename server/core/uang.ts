/**
 * ============================================================
 * core/uang.ts — ATURAN UANG (satu-satunya tempat)
 * ============================================================
 *
 * 🔴 ATURAN (agents.md C7): hitung dalam SEN (integer).
 *    DILARANG memakai angka pecahan mengambang untuk uang.
 *
 * ⚠️ DILARANG menulis Math.round / toFixed untuk uang di tempat lain.
 *    Semua lewat berkas ini.
 */

/** 1 rupiah = 100 sen. Semua hitungan uang dikerjakan dalam sen. */
export const SEN = 100;

/* ------------------------------------------------------------------
   KONVERSI
   ------------------------------------------------------------------ */

/** Rupiah (boleh pecahan) → sen (integer). 18.000,30 → 1800030 */
export function keSen(rupiah: number): number {
  return Math.round(rupiah * SEN);
}

/** Sen (integer) → rupiah (angka). 1800030 → 18000.3 */
export function keRupiah(sen: number): number {
  return sen / SEN;
}

/* ------------------------------------------------------------------
   PEMBULATAN — hanya 3 cara, dipilih sadar (bukan diam-diam)
   ------------------------------------------------------------------ */

/** Bulatkan ke rupiah utuh (sen dibuang setengah ke atas). */
export function bulatkanRupiah(sen: number): number {
  return Math.round(sen / SEN) * SEN;
}

/** Bulatkan ke bawah (dipakai kalau bank membuang sisa). */
export function bulatkanBawah(sen: number): number {
  return Math.floor(sen / SEN) * SEN;
}

/** Bulatkan ke atas (dipakai kalau bank menaikkan sisa). */
export function bulatkanAtas(sen: number): number {
  return Math.ceil(sen / SEN) * SEN;
}

/* ------------------------------------------------------------------
   TAMBAH / KURANG — integer, tidak ada pembulatan tak sengaja
   ------------------------------------------------------------------ */

export function tambahSen(...nilai: number[]): number {
  return nilai.reduce((a, b) => a + b, 0);
}

export function kurangSen(a: number, b: number): number {
  return a - b;
}

/** Persen dari nilai sen. 20% dari 12739726 sen → 2547945 sen (dibulatkan) */
export function persenSen(sen: number, persen: number): number {
  return Math.round((sen * persen) / 100);
}

/* ------------------------------------------------------------------
   FORMAT TAMPILAN (Indonesia)
   ------------------------------------------------------------------ */

/** 18000.3 → "18.000,3" · 1800030 sen → "18.000,30" */
export function formatRupiah(sen: number, desimal = 0): string {
  const r = keRupiah(sen);
  return r.toLocaleString('id-ID', {
    minimumFractionDigits: desimal,
    maximumFractionDigits: desimal,
  });
}

/** 18000.3 → "18.000,30" (selalu 2 desimal — untuk bunga/pajak) */
export function formatRupiah2(sen: number): string {
  return formatRupiah(sen, 2);
}

/** 18000.3 → "+18.000,30" · -18000.3 → "−18.000,30" (pakai minus panjang) */
export function formatBertanda(sen: number, desimal = 0): string {
  const tanda = sen < 0 ? '−' : '+';
  return tanda + formatRupiah(Math.abs(sen), desimal);
}

/* ------------------------------------------------------------------
   BACA INPUT BAPAK
   ------------------------------------------------------------------ */

/**
 * Baca tulisan angka dari Bapak → sen.
 * Menerima: "18.000" · "18.000,30" · "18000.3" · "Rp 18.000"
 * Kalau tidak bisa dibaca → null (JANGAN diam-diam jadi 0).
 */
export function bacaAngka(teks: string | number | null | undefined): number | null {
  if (teks === null || teks === undefined) return null;
  if (typeof teks === 'number') {
    if (!Number.isFinite(teks)) return null;
    return keSen(teks);
  }

  let s = String(teks).trim();
  if (!s) return null;
  s = s.replace(/rp/gi, '').replace(/\s/g, '');
  if (!/^-?[\d.,]+$/.test(s)) return null;

  const negatif = s.startsWith('-');
  s = s.replace('-', '');

  const adaKoma = s.includes(',');
  const adaTitik = s.includes('.');

  if (adaKoma && adaTitik) {
    /* Format Indonesia: titik = ribuan, koma = desimal */
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (adaKoma) {
    /* Hanya koma → desimal */
    s = s.replace(',', '.');
  } else if (adaTitik) {
    /* Hanya titik: kalau 3 digit di belakang → pemisah ribuan */
    const bagian = s.split('.');
    const belakang = bagian[bagian.length - 1] ?? '';
    s = belakang.length === 3 ? s.replace(/\./g, '') : s;
  }

  const angka = Number(s);
  if (!Number.isFinite(angka)) return null;
  return keSen(negatif ? -angka : angka);
}
