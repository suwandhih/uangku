/**
 * ============================================================
 * core/aturan.ts — VALIDASI (satu-satunya tempat)
 * ============================================================
 *
 * 🔴 ATURAN (agents.md C1):
 *   Validasi HANYA di sini. Jangan tulis validasi ganda tak konsisten.
 *
 * Setiap aturan di bawah lahir dari BUG NYATA — lihat prompt.md Bagian 11.
 */

import type { Database } from 'better-sqlite3';
import { bacaTanggal, selisihHari, type TanggalISO } from './periode.js';

export interface HasilValidasi {
  boleh: boolean;
  pesan: string[];
}

const ok: HasilValidasi = { boleh: true, pesan: [] };
function gagal(...pesan: string[]): HasilValidasi {
  return { boleh: false, pesan };
}

/* ------------------------------------------------------------------
   1. TANGGAL
   ------------------------------------------------------------------ */

/** Tanggal wajib format YYYY-MM-DD dan masuk akal. */
export function periksaTanggal(tanggal: TanggalISO): HasilValidasi {
  const p = bacaTanggal(tanggal);
  if (!p) return gagal(`Tanggal "${tanggal}" tidak sah. Format harus YYYY-MM-DD.`);
  return ok;
}

/** Tanggal tidak boleh di masa depan jauh (mis. salah tahun). */
export function periksaTanggalWajar(tanggal: TanggalISO, toleransiHari = 1): HasilValidasi {
  const cek = periksaTanggal(tanggal);
  if (!cek.boleh) return cek;
  const hari = selisihHari(tanggal, new Date().toISOString().slice(0, 10));
  if (hari < -toleransiHari) {
    return gagal(`Tanggal ${tanggal} masih ${Math.abs(hari)} hari di depan. Periksa lagi.`);
  }
  return ok;
}

/* ------------------------------------------------------------------
   2. JUMLAH
   ------------------------------------------------------------------ */

/**
 * 🔴 `amount` = TOTAL harga — JANGAN dikali qty.
 * Bug nyata 25 Jun: item belanja jadi berlipat.
 */
export function periksaJumlah(amount: number): HasilValidasi {
  if (!Number.isFinite(amount)) return gagal('Jumlah tidak sah.');
  if (amount <= 0) return gagal('Jumlah harus lebih dari 0.');
  return ok;
}

/** Peringatan (bukan larangan) kalau jumlah tidak wajar. */
export function periksaJumlahWajar(amount: number): HasilValidasi {
  if (amount > 1_000_000_000) {
    return gagal(`Jumlah ${amount.toLocaleString('id-ID')} lebih dari 1 miliar. Periksa lagi.`);
  }
  return ok;
}

/* ------------------------------------------------------------------
   3. TRANSFER
   ------------------------------------------------------------------ */

/**
 * 🔴 Fund tujuan transfer ≠ fund sumber.
 * Bug nyata 8 Agu: transfer ke diri sendiri.
 */
export function periksaTransfer(fundAsal: number, fundTujuan: number | null): HasilValidasi {
  if (fundTujuan === null) return ok;
  if (fundAsal === fundTujuan) {
    return gagal('Fund tujuan transfer sama dengan fund sumber. Pilih fund yang berbeda.');
  }
  return ok;
}

/* ------------------------------------------------------------------
   4. BULAN TERKUNCI
   ------------------------------------------------------------------ */

/** Bulan yang sudah diproses (is_locked = 1) → read-only. */
export function periksaBulanTerkunci(
  db: Database,
  tahun: number,
  bulan: number,
): HasilValidasi {
  const r = db
    .prepare(
      'SELECT COUNT(*) n FROM monthly_snapshots WHERE year = ? AND month = ? AND is_locked = 1',
    )
    .get(tahun, bulan) as { n: number };
  if (r.n > 0) {
    return gagal(
      `Bulan ${bulan}/${tahun} sudah DIPROSES (terkunci). Tidak bisa diubah — batalkan dulu prosesnya.`,
    );
  }
  return ok;
}

/* ------------------------------------------------------------------
   5. TAG
   ------------------------------------------------------------------ */

/**
 * 🔴 Tag sistem TIDAK BOLEH dihapus.
 * 🔴 Fund/tag yang masih dipakai transaksi tidak boleh dihapus.
 */
export function periksaHapusTag(db: Database, tagId: number): HasilValidasi {
  const t = db.prepare('SELECT name, is_system FROM tags WHERE id = ?').get(tagId) as
    | { name: string; is_system: number }
    | undefined;
  if (!t) return gagal('Tag tidak ditemukan.');
  if (t.is_system === 1) {
    return gagal(`Tag "${t.name}" adalah tag SISTEM — dipakai perhitungan otomatis. Tidak boleh dihapus.`);
  }
  const pakai = db
    .prepare('SELECT COUNT(*) n FROM transactions WHERE tag = ? AND deleted_at IS NULL')
    .get(t.name) as { n: number };
  if (pakai.n > 0) {
    return gagal(`Tag "${t.name}" masih dipakai ${pakai.n} transaksi. Tidak boleh dihapus.`);
  }
  return ok;
}

/** Fund yang masih dipakai transaksi tidak boleh dihapus. */
export function periksaHapusFund(db: Database, fundId: number): HasilValidasi {
  const f = db.prepare('SELECT name FROM source_funds WHERE id = ?').get(fundId) as
    | { name: string }
    | undefined;
  if (!f) return gagal('Fund tidak ditemukan.');
  const pakai = db
    .prepare('SELECT COUNT(*) n FROM transactions WHERE source_fund_id = ? AND deleted_at IS NULL')
    .get(fundId) as { n: number };
  if (pakai.n > 0) {
    return gagal(`Fund "${f.name}" masih dipakai ${pakai.n} transaksi. Tidak boleh dihapus.`);
  }
  return ok;
}

/* ------------------------------------------------------------------
   6. SALDO MINIMUM
   ------------------------------------------------------------------ */

/**
 * Peringatan kalau saldo turun di bawah `minimum_saldo` fund.
 * ⚠️ Ini PERINGATAN (boleh diteruskan), bukan larangan.
 */
export function periksaSaldoMinimum(
  saldoSesudah: number,
  minimumSaldo: number | null,
): HasilValidasi {
  if (minimumSaldo === null || minimumSaldo === undefined) return ok;
  if (saldoSesudah < minimumSaldo) {
    return gagal(
      `Saldo akan turun ke ${saldoSesudah.toLocaleString('id-ID')}, ` +
      `di bawah minimum ${minimumSaldo.toLocaleString('id-ID')}.`,
    );
  }
  return ok;
}

/* ------------------------------------------------------------------
   7. RUTIN — SIKLUS
   ------------------------------------------------------------------ */

/**
 * 🔴 Tanggal bayar tidak boleh jauh melampaui siklus.
 * Bug nyata 24 Sep: bayar rutin → transaksi tercatat 8 Des (4 bulan di depan).
 */
export function periksaTanggalBayar(
  tanggal: TanggalISO,
  jatuhTempo: TanggalISO,
  toleransiHari = 45,
): HasilValidasi {
  const lewat = Math.abs(selisihHari(jatuhTempo, tanggal));
  if (lewat > toleransiHari) {
    return gagal(
      `Tanggal ${tanggal} berjarak ${lewat} hari dari jatuh tempo ${jatuhTempo}. ` +
      `Terlalu jauh — periksa lagi (bug 24 Sep: transaksi tercatat 8 Des).`,
    );
  }
  return ok;
}

/* ------------------------------------------------------------------
   GABUNGAN
   ------------------------------------------------------------------ */

/** Jalankan beberapa pemeriksaan sekaligus — semua pesan dikumpulkan. */
export function gabung(...hasil: HasilValidasi[]): HasilValidasi {
  const pesan = hasil.flatMap((h) => h.pesan);
  return { boleh: pesan.length === 0, pesan };
}
