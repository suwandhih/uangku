/**
 * ============================================================
 * core/periode.ts — ATURAN TANGGAL & BULAN (satu-satunya tempat)
 * ============================================================
 *
 * 🔴 ATURAN (agents.md C3):
 *   • Query saldo WAJIB punya batas AWAL **dan** AKHIR bulan.
 *     Bug nyata 24 Sep: lupa batas akhir → saldo SeaBank beda Rp 54.400.
 *   • DILARANG menulis `date >= '2026-09-01'` di tempat lain.
 *   • `target_day = -1` = SENTINEL akhir bulan — JANGAN diperlakukan angka biasa.
 *     Bug nyata 30 Agu: aplikasi macet.
 */

/** Tanggal ISO: 'YYYY-MM-DD' */
export type TanggalISO = string;

export interface Bulan {
  tahun: number;
  bulan: number; // 1–12
}

/* ------------------------------------------------------------------
   BENTUK DASAR
   ------------------------------------------------------------------ */

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const NAMA_BULAN_SINGKAT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

/** 2 → '02' */
function dua(n: number): string {
  return String(n).padStart(2, '0');
}

/** Jumlah hari dalam satu bulan (memperhitungkan tahun kabisat). */
export function jumlahHari(tahun: number, bulan: number): number {
  return new Date(tahun, bulan, 0).getDate();
}

/* ------------------------------------------------------------------
   🔴 BATAS BULAN — INTI ATURAN
   ------------------------------------------------------------------ */

/** Hari pertama bulan: 2026-09 → '2026-09-01' */
export function awalBulan(tahun: number, bulan: number): TanggalISO {
  return `${tahun}-${dua(bulan)}-01`;
}

/** Hari terakhir bulan: 2026-09 → '2026-09-30' (Feb 2026 → '2026-02-28') */
export function akhirBulan(tahun: number, bulan: number): TanggalISO {
  return `${tahun}-${dua(bulan)}-${dua(jumlahHari(tahun, bulan))}`;
}

/**
 * 🔴 Rentang bulan — SATU-SATUNYA cara membuat batas tanggal.
 * Dipakai semua query saldo. Mengembalikan awal DAN akhir sekaligus,
 * supaya tidak mungkin lupa salah satu.
 */
export function rentangBulan(tahun: number, bulan: number): { dari: TanggalISO; sampai: TanggalISO } {
  return { dari: awalBulan(tahun, bulan), sampai: akhirBulan(tahun, bulan) };
}

/* ------------------------------------------------------------------
   PINDAH BULAN
   ------------------------------------------------------------------ */

export function bulanSebelumnya(tahun: number, bulan: number): Bulan {
  return bulan === 1 ? { tahun: tahun - 1, bulan: 12 } : { tahun, bulan: bulan - 1 };
}

export function bulanBerikutnya(tahun: number, bulan: number): Bulan {
  return bulan === 12 ? { tahun: tahun + 1, bulan: 1 } : { tahun, bulan: bulan + 1 };
}

/** Selisih bulan antara dua periode (bisa negatif). */
export function selisihBulan(a: Bulan, b: Bulan): number {
  return (a.tahun - b.tahun) * 12 + (a.bulan - b.bulan);
}

/* ------------------------------------------------------------------
   BACA & TULIS
   ------------------------------------------------------------------ */

/** '2026-09-25' → { tahun: 2026, bulan: 9, hari: 25 } */
export function bacaTanggal(t: TanggalISO): { tahun: number; bulan: number; hari: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(t));
  if (!m) return null;
  const tahun = Number(m[1]);
  const bulan = Number(m[2]);
  const hari = Number(m[3]);
  if (bulan < 1 || bulan > 12 || hari < 1 || hari > 31) return null;
  return { tahun, bulan, hari };
}

/** Ambil periode (tahun+bulan) dari sebuah tanggal. */
export function periodeDariTanggal(t: TanggalISO): Bulan | null {
  const p = bacaTanggal(t);
  return p ? { tahun: p.tahun, bulan: p.bulan } : null;
}

/** Tanggal lengkap: '25 September 2026' */
export function formatTanggalPanjang(t: TanggalISO): string {
  const p = bacaTanggal(t);
  if (!p) return String(t);
  return `${p.hari} ${NAMA_BULAN[p.bulan - 1]} ${p.tahun}`;
}

/** Tanggal pendek: '25 Sep 2026' */
export function formatTanggal(t: TanggalISO): string {
  const p = bacaTanggal(t);
  if (!p) return String(t);
  return `${p.hari} ${NAMA_BULAN_SINGKAT[p.bulan - 1]} ${p.tahun}`;
}

/** Label bulan: 'September 2026' */
export function formatBulan(tahun: number, bulan: number): string {
  return `${NAMA_BULAN[bulan - 1]} ${tahun}`;
}

/** Label bulan pendek: 'Sep 2026' */
export function formatBulanSingkat(tahun: number, bulan: number): string {
  return `${NAMA_BULAN_SINGKAT[bulan - 1]} ${tahun}`;
}

/** Kunci bulan untuk `monthly_snapshots`: 2026-09 → '2026-09' */
export function kunciBulan(tahun: number, bulan: number): string {
  return `${tahun}-${dua(bulan)}`;
}

/* ------------------------------------------------------------------
   🔴 SENTINEL AKHIR BULAN (target_day = -1)
   ------------------------------------------------------------------ */

/**
 * Ubah `target_day` rutin menjadi tanggal nyata di bulan tertentu.
 *   target_day = 15 → '2026-09-15'
 *   target_day = -1 → '2026-09-30'   ← SENTINEL: akhir bulan
 *   target_day = 31 (bulan 30 hari) → '2026-09-30'  ← dijepit ke hari terakhir
 *
 * 🔴 Bug nyata 30 Agu: -1 diperlakukan angka biasa → aplikasi macet.
 */
export function targetKeTanggal(tahun: number, bulan: number, targetDay: number | null): TanggalISO {
  const maks = jumlahHari(tahun, bulan);
  if (targetDay === null || targetDay === undefined) return akhirBulan(tahun, bulan);
  if (targetDay === -1) return akhirBulan(tahun, bulan);
  const hari = Math.min(Math.max(targetDay, 1), maks);
  return `${tahun}-${dua(bulan)}-${dua(hari)}`;
}

/** Apakah target_day adalah sentinel akhir bulan? */
export function targetAkhirBulan(targetDay: number | null): boolean {
  return targetDay === -1;
}

/* ------------------------------------------------------------------
   HITUNG HARI (untuk bunga)
   ------------------------------------------------------------------ */

/**
 * Jumlah hari dari tanggal A sampai B (B − A).
 * Bunga dihitung dari PEMBAYARAN TERAKHIR → TANGGAL BAYAR.
 * ⚠️ Bukan dari tanggal mulai deposito (agents.md 10.12).
 */
export function selisihHari(dari: TanggalISO, sampai: TanggalISO): number {
  const a = bacaTanggal(dari);
  const b = bacaTanggal(sampai);
  if (!a || !b) return 0;
  const t1 = Date.UTC(a.tahun, a.bulan - 1, a.hari);
  const t2 = Date.UTC(b.tahun, b.bulan - 1, b.hari);
  return Math.round((t2 - t1) / 86400000);
}

/** Tanggal hari ini (waktu lokal) sebagai 'YYYY-MM-DD'. */
export function hariIni(): TanggalISO {
  const d = new Date();
  return `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}`;
}
