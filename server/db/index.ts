/**
 * server/db/index.ts — KONEKSI DATABASE
 *
 * 🔴 ATURAN:
 *   • Aplikasi bekerja di uangku.db (SALINAN) — aturan B3
 *   • keuangan.db HANYA DIBACA, tidak pernah ditulis — aturan B2
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const AKAR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export const FILE_UANGKU = path.join(AKAR, 'data', 'uangku.db');
export const FILE_KEUANGAN = 'c:/data/keuangan/data/keuangan.db';

/** Buka uangku.db — boleh dibaca & ditulis. */
export function bukaUangku(bacaSaja = false): Database.Database {
  return new Database(FILE_UANGKU, { readonly: bacaSaja, fileMustExist: true });
}

/** 🔴 Buka keuangan.db — SELALU hanya baca. Tidak ada pilihan lain. */
export function bukaKeuangan(): Database.Database {
  return new Database(FILE_KEUANGAN, { readonly: true, fileMustExist: true });
}

/** Periksa tabel yang wajib ada — gagal cepat kalau skema tidak lengkap. */
export function periksaSkema(db: Database.Database): string[] {
  const wajib = [
    'source_funds', 'journals', 'tags', 'transactions',
    'monthly_snapshots', 'recurring', 'tax_config',
  ];
  const ada = new Set(
    (db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[])
      .map((r) => r.name),
  );
  return wajib.filter((t) => !ada.has(t));
}
