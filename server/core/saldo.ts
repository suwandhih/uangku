/**
 * ============================================================
 * core/saldo.ts — RUMUS SALDO (satu-satunya tempat)
 * ============================================================
 *
 * 🔴 ATURAN (agents.md C2):
 *   Rumus saldo = Saldo Awal + Debit − Kredit
 *   HANYA di berkas ini. Plugin DILARANG menghitung sendiri.
 *
 * Kenapa: sistem lama punya 42 SALINAN rumus saldo → satu salinan
 * ketinggalan → Dashboard salah. Itu akar semua bug saldo.
 *
 * ⚠️ Arah Debit/Kredit ada di tabel `journals.type` (bukan di transactions).
 */

import type { Database } from 'better-sqlite3';
import { rentangBulan } from './periode.js';

export type ArahJurnal = 'D' | 'K';

export interface SaldoFund {
  fundId: number;
  nama: string;
  saldoAwal: number; // rupiah
  debit: number;     // rupiah
  kredit: number;    // rupiah
  saldo: number;     // rupiah — Saldo Awal + Debit − Kredit
  jumlahTransaksi: number;
}

/* ------------------------------------------------------------------
   SQL — SATU-SATUNYA RUMUS SALDO
   ------------------------------------------------------------------ */

/**
 * ⚠️ Perhatikan: `t.date >= ? AND t.date <= ?`
 *    WAJIB awal **dan** akhir bulan. Lupa batas akhir = bug Rp 54.400.
 *
 * ⚠️ `COALESCE(t.is_historical,0) = 0` → data lama (saldo awal) tidak dihitung dobel.
 * ⚠️ `t.deleted_at IS NULL` → soft delete tidak ikut dihitung.
 */
const SQL_SALDO_FUND = `
  SELECT
    f.id                              AS fundId,
    f.name                            AS nama,
    COALESCE(s.saldo_awal, 0)         AS saldoAwal,
    COALESCE(SUM(CASE WHEN j.type = 'D' THEN t.amount ELSE 0 END), 0) AS debit,
    COALESCE(SUM(CASE WHEN j.type = 'K' THEN t.amount ELSE 0 END), 0) AS kredit,
    COUNT(t.id)                       AS jumlahTransaksi
  FROM source_funds f
  LEFT JOIN monthly_snapshots s
         ON s.source_fund_id = f.id AND s.year = ? AND s.month = ?
  LEFT JOIN transactions t
         ON t.source_fund_id = f.id
        AND t.date >= ? AND t.date <= ?
        AND t.deleted_at IS NULL
        AND COALESCE(t.is_historical, 0) = 0
  LEFT JOIN journals j ON j.id = t.journal_id
  WHERE f.deleted_at IS NULL
  GROUP BY f.id
  ORDER BY f.sort_order, f.id
`;

/* ------------------------------------------------------------------
   FUNGSI PUBLIK
   ------------------------------------------------------------------ */

/** Saldo semua fund untuk satu bulan. */
export function saldoSemuaFund(db: Database, tahun: number, bulan: number): SaldoFund[] {
  const { dari, sampai } = rentangBulan(tahun, bulan);
  const rows = db.prepare(SQL_SALDO_FUND).all(tahun, bulan, dari, sampai) as Omit<SaldoFund, 'saldo'>[];
  return rows.map((r) => ({ ...r, saldo: hitungSaldo(r.saldoAwal, r.debit, r.kredit) }));
}

/** Saldo satu fund untuk satu bulan. */
export function saldoFund(db: Database, fundId: number, tahun: number, bulan: number): SaldoFund | null {
  const semua = saldoSemuaFund(db, tahun, bulan);
  return semua.find((f) => f.fundId === fundId) ?? null;
}

/** Saldo semua fund sampai akhir bulan (tanpa batas bulan — untuk total). */
export function saldoTotal(db: Database, tahun: number, bulan: number): number {
  return saldoSemuaFund(db, tahun, bulan).reduce((a, f) => a + f.saldo, 0);
}

/**
 * 🔴 RUMUS INTI — satu baris, satu tempat.
 * Saldo = Saldo Awal + Debit − Kredit
 */
export function hitungSaldo(saldoAwal: number, debit: number, kredit: number): number {
  return saldoAwal + debit - kredit;
}

/* ------------------------------------------------------------------
   RINGKASAN BULAN (untuk Dashboard)
   ------------------------------------------------------------------ */

/**
 * 🔴 5 tag DIKECUALIKAN dari ringkasan bulanan (agents.md Bagian 9):
 *    Transfer · Koreksi · Pinjam · Hutang · Reimburse
 *    Dikecualikan BUKAN berarti tidak penting — justru agar laporan benar.
 */
export const TAG_DIKECUALIKAN = ['Transfer', 'Koreksi', 'Pinjam', 'Hutang', 'Reimburse'] as const;

export interface RingkasanBulan {
  masuk: number;
  keluar: number;
  selisih: number;
}

/** Ringkasan pemasukan/pengeluaran bulan — tag pengecualian TIDAK dihitung. */
export function ringkasanBulan(db: Database, tahun: number, bulan: number): RingkasanBulan {
  const { dari, sampai } = rentangBulan(tahun, bulan);
  const tempat = TAG_DIKECUALIKAN.map(() => '?').join(',');

  const sql = `
    SELECT
      COALESCE(SUM(CASE WHEN j.type = 'D' THEN t.amount ELSE 0 END), 0) AS masuk,
      COALESCE(SUM(CASE WHEN j.type = 'K' THEN t.amount ELSE 0 END), 0) AS keluar
    FROM transactions t
    JOIN journals j ON j.id = t.journal_id
    WHERE t.date >= ? AND t.date <= ?
      AND t.deleted_at IS NULL
      AND COALESCE(t.is_historical, 0) = 0
      AND (t.tag IS NULL OR t.tag NOT IN (${tempat}))
  `;

  const r = db.prepare(sql).get(dari, sampai, ...TAG_DIKECUALIKAN) as { masuk: number; keluar: number };
  return { masuk: r.masuk, keluar: r.keluar, selisih: r.masuk - r.keluar };
}
