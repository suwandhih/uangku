/* ============================================================
   UANGKU — Cloudflare Worker (perantara aman ke Layerbase)
   ------------------------------------------------------------
   • Browser (HP / PC) memanggil Worker ini, bukan Layerbase langsung.
   • Kunci Layerbase & PIN disimpan sebagai SECRET di Cloudflare.
   • Setiap permintaan WAJIB membawa PIN yang benar.
   • Perintah tetap saja — TIDAK ada SQL dari luar.
   • Setiap tulis WAJIB tercatat di audit_log (aturan C6 rollback).

   BACA  : bulan · dashboard · fund · tag · snapshot · transaksi · saldo
           · ringkasan · riwayat · hutang (belum lunas untuk Reimburse)
   TULIS : catat (1 atau banyak jurnal) · ubah · batalkan · pulihkan
           · bukaBulan (siapkan saldo awal bulan baru)
   ============================================================ */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

/* 5 tag yang DIKECUALIKAN dari ringkasan bulanan (agents.md Bagian 9).
   Pajak & Bunga TIDAK dikecualikan. */
const TAG_KECUALI = ["Transfer", "Koreksi", "Pinjam", "Hutang", "Reimburse"];

/* 🔴 4 tag DUA ARAH — arahnya BEBAS dipilih Bapak (boleh Debit, boleh Kredit).
   Semua tag lain DIKUNCI ke arahnya: keluar = Kredit, masuk = Debit.
   Bukti data nyata `keuangan.db` (1.926 tx) — lihat catatan di siapkanBaris(). */
const TAG_BEBAS = ["Transfer", "Pinjam", "Koreksi", "Reimburse"];

const NAMA_BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli",
  "Agustus", "September", "Oktober", "November", "Desember"];

/* Ikon fund & tag — sama seperti tools/siapkan-data.cjs (bukan data keuangan) */
const IKON_FUND = {
  Superbank: "🏦", SeaBank: "🌊", Celengan: "🐷", "Dana Sopir": "🧑‍✈️",
  "Dana swn": "👥", Tunai: "💵", "Sopir pinjam uang": "🤝", "BCA tabungan": "🏧",
  "BCA Saham": "📈", Deposito: "🔒", "Tabungan A": "🅰️", "Tabungan B": "🅱️",
  ShopeePay: "🛒", OVO: "🟣", GoPay: "🟢", "Tabungan C": "🇨", "Tabungan D": "🇩",
  "Tabungan E": "🇪"
};

function balas(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS }
  });
}

/* ------------------------------------------------------------------
   PENGAMAN NILAI — API Layerbase tidak mendukung parameter ($1),
   jadi SEMUA nilai WAJIB lewat sini. Jangan pernah menyisipkan
   nilai mentah dari pengguna ke dalam SQL.
   ------------------------------------------------------------------ */

function teks(v) {
  if (v === null || v === undefined) return "NULL";
  return "'" + String(v).replace(/'/g, "''") + "'";
}

function angka(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error("Angka tidak sah");
  return String(n);
}

function bulat(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error("Angka bulat tidak sah");
  return String(Math.trunc(n));
}

/** Waktu lokal WIB (UTC+7) — sama seperti datetime('now','localtime') di SQLite. */
function waktuSekarang() {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 19).replace("T", " ");
}

/** Bulatkan 2 desimal — menghapus debu pembulatan SQLite vs PostgreSQL. */
function r2(n) { return Math.round((Number(n) || 0) * 100) / 100; }

/** Status satu induk hutang. Pembayaran dibatalkan tidak ikut dihitung. */
function statusHutang(jumlah, dibayar, lunasManual) {
  if (Number(lunasManual) === 1) return "lunas";
  const total = r2(dibayar);
  if (total <= 0) return "belum_diganti";
  return total + 0.000001 >= Number(jumlah) ? "lunas" : "dicicil";
}

/** Satu sumber status, sisa, dan total pembayaran untuk seluruh induk Hutang. */
function hitungHutang(transactions) {
  const induk = new Map();
  for (const t of transactions) {
    if (t.tag === "Hutang" && t.arah === "K") induk.set(Number(t.id), t);
  }
  const dibayar = new Map();
  for (const t of transactions) {
    const id = Number(t.loan_id);
    if (t.tag !== "Reimburse" || t.arah !== "D" || !induk.has(id)) continue;
    dibayar.set(id, r2((dibayar.get(id) || 0) + Number(t.amount)));
  }
  const hasil = new Map();
  for (const [id, t] of induk) {
    const total = dibayar.get(id) || 0;
    const status = statusHutang(t.amount, total, t.loan_lunas);
    hasil.set(id, {
      id, tanggal: t.date, ket: t.description, jumlah: r2(t.amount),
      dibayar: r2(total), sisa: status === "lunas" ? 0 : r2(Math.max(0, Number(t.amount) - total)),
      status
    });
  }
  return hasil;
}

/* ------------------------------------------------------------------
   JALUR KE LAYERBASE
   ------------------------------------------------------------------ */

async function jalankanSQL(env, sql) {
  const url = env.LB_API_HOST + "/v1/databases/" + env.LB_DB_ID + "/query";
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + env.LB_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query: sql })
  });
  const isi = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(isi.error || ("Layerbase " + r.status));
  return isi.rows || [];
}

/** Jalankan beberapa perintah sebagai SATU kesatuan (atomik). */
async function jalankanSekaligus(env, daftar) {
  const sql = "BEGIN;\n" + daftar.join(";\n") + ";\nCOMMIT;";
  return jalankanSQL(env, sql);
}

/* ------------------------------------------------------------------
   VALIDASI
   ------------------------------------------------------------------ */

function bulanValid(v) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(v || ""));
  if (!m) return null;
  const y = Number(m[1]), b = Number(m[2]);
  if (b < 1 || b > 12) return null;
  const akhir = new Date(Date.UTC(y, b, 0)).getUTCDate();
  return { y, b, akhirHari: akhir, kunci: m[0], awal: `${m[1]}-${m[2]}-01`, akhir: `${m[1]}-${m[2]}-${String(akhir).padStart(2, "0")}` };
}

function tanggalValid(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v || ""));
  if (!m) return null;
  const y = Number(m[1]), b = Number(m[2]), h = Number(m[3]);
  if (b < 1 || b > 12 || h < 1) return null;
  if (h > new Date(Date.UTC(y, b, 0)).getUTCDate()) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function skemaValid(env) {
  return /^[a-z0-9_]+$/.test(env.SKEMA || "") ? env.SKEMA : null;
}

/* ------------------------------------------------------------------
   BANTUAN DATA
   ------------------------------------------------------------------ */

async function ambilTag(env, skema, nama) {
  const r = await jalankanSQL(env,
    `SELECT id, name, journal_type, has_tax, is_system FROM ${skema}.tags ` +
    `WHERE name = ${teks(nama)} AND deleted_at IS NULL LIMIT 1`);
  return r[0] || null;
}

async function ambilJurnal(env, skema, fundId, arah) {
  const r = await jalankanSQL(env,
    `SELECT id FROM ${skema}.journals ` +
    `WHERE source_fund_id = ${bulat(fundId)} AND type = ${teks(arah)} AND deleted_at IS NULL ` +
    `ORDER BY is_system DESC, id LIMIT 1`);
  return r[0] ? Number(r[0].id) : null;
}

async function fundAda(env, skema, fundId) {
  const r = await jalankanSQL(env,
    `SELECT 1 AS ada FROM ${skema}.source_funds WHERE id = ${bulat(fundId)} AND deleted_at IS NULL LIMIT 1`);
  return r.length > 0;
}

async function ambilTransaksi(env, skema, id) {
  const r = await jalankanSQL(env,
    `SELECT t.id, t.date, t.description, t.amount, t.source_fund_id, t.journal_id, ` +
    `t.transfer_pair_id, t.tag, t.has_tax, t.deleted_at, t.created_at, t.updated_at, t.notes, ` +
    `t.loan_id, t.loan_lunas, j.type AS arah, f.name AS fund ` +
    `FROM ${skema}.transactions t ` +
    `JOIN ${skema}.journals j ON j.id = t.journal_id ` +
    `JOIN ${skema}.source_funds f ON f.id = t.source_fund_id ` +
    `WHERE t.id = ${bulat(id)} LIMIT 1`);
  return r[0] || null;
}

function catatRiwayat(skema, aksi, id, lama, baru) {
  return `INSERT INTO ${skema}.audit_log (username, action, table_name, record_id, old_data, new_data, timestamp) ` +
    `VALUES ('hp', ${teks(aksi)}, 'transactions', ${bulat(id)}, ` +
    `${lama === null ? "NULL" : teks(JSON.stringify(lama))}, ` +
    `${baru === null ? "NULL" : teks(JSON.stringify(baru))}, ${teks(waktuSekarang())})`;
}

/** Terjemahkan satu baris jurnal dari pengguna → siap tulis. */
async function siapkanBaris(env, skema, b) {
  const jumlah = Number(b.jumlah);
  if (!Number.isFinite(jumlah) || jumlah <= 0) throw new Error("Jumlah harus lebih dari 0");
  if (jumlah > 1000000000) throw new Error("Jumlah lebih dari 1 miliar — periksa lagi");

  const fundId = Number(b.fundId);
  if (!Number.isInteger(fundId)) throw new Error("Fund tidak sah");
  if (!(await fundAda(env, skema, fundId))) throw new Error("Fund tidak ditemukan");

  const tag = await ambilTag(env, skema, b.tag);
  if (!tag) throw new Error(`Tag "${b.tag}" tidak dikenal`);

  /* 🔴 ARAH — DIPELAJARI DARI SISTEM LAMA `c:\data\keuangan` (19 Okt 2026).
     Aturan Bapak: *"keluar > kredit dan masuk > debit .. sudah pasti"*.
     Bukti data nyata `keuangan.db` (1.926 tx) — arah yang BENAR-BENAR dipakai:
       Rumah/Pribadi/Pet/Mobil  D=0   K=280/296/83/2  → SATU arah (keluar)
       Bunga/Bonus/Pendapatan   D=210/140/39  K=0     → SATU arah (masuk)
       Pajak/Hilang/biaya/Hutang D=0  K=46/2/10/3     → SATU arah (keluar)
       ─────────────────────────────────────────────────────────────
       Transfer  D=369 K=324 · Pinjam D=4 K=5
       Koreksi   D=6   K=2   · Reimburse D=3 K=1      → DUA arah (bebas)
     → HANYA 4 tag itu yang BEBAS. Semua tag lain DIKUNCI ke arahnya. */
  /* BEBAS kalau: ① termasuk 4 tag bawaan bebas, ATAU ② tag itu sendiri tidak
     punya arah tetap (`journal_type` kosong) — mis. tag BARU yang dibuat
     dengan pilihan "— Bebas —". Tanpa ②, tag baru langsung terkunci Kredit. */
  const bebas = TAG_BEBAS.indexOf(tag.name) !== -1 ||
    (tag.journal_type !== "D" && tag.journal_type !== "K");
  let arah;
  if (bebas) {
    arah = b.arah === "D" || b.arah === "K" ? b.arah : null;
    if (!arah) arah = tag.journal_type === "D" || tag.journal_type === "K" ? tag.journal_type : "K";
  } else {
    arah = tag.journal_type === "D" ? "D" : "K";
  }

  const journalId = await ambilJurnal(env, skema, fundId, arah);
  if (!journalId) throw new Error(`Jurnal ${arah} untuk fund itu tidak ada`);

  return { fundId, journalId, jumlah, arah, tag };
}

/* ------------------------------------------------------------------
   HUTANG & REIMBURSE — satu sumber aturan untuk baca dan tulis
   ------------------------------------------------------------------ */

/** Daftar hutang aktif; dipakai baik untuk pilihan maupun validasi pembayaran. */
async function daftarHutang(env, skema) {
  const tx = await jalankanSQL(env,
    `SELECT t.id, t.date, t.description, t.amount, t.tag, t.loan_id, t.loan_lunas, ` +
    `t.source_fund_id, j.type AS arah, f.name AS fund ` +
    `FROM ${skema}.transactions t JOIN ${skema}.journals j ON j.id = t.journal_id ` +
    `JOIN ${skema}.source_funds f ON f.id = t.source_fund_id ` +
    `WHERE t.deleted_at IS NULL AND COALESCE(t.is_historical, 0) = 0 ` +
    `AND ((t.tag = 'Hutang' AND j.type = 'K') OR (t.tag = 'Reimburse' AND j.type = 'D')) ` +
    `ORDER BY t.date DESC, t.id DESC`);
  const status = hitungHutang(tx);
  return tx.filter((t) => status.has(Number(t.id))).map((t) => {
    const h = status.get(Number(t.id));
    return { ...h, fund: t.fund, fundId: Number(t.source_fund_id) };
  }).sort((a, b) => b.tanggal.localeCompare(a.tanggal) || b.id - a.id);
}

/** Reimburse Debit harus menunjuk hutang nyata dan tidak melebihi sisanya. */
async function validasiReimburse(env, skema, b, arah, jumlah, idSendiri) {
  if (b.tag !== "Reimburse") return 0;
  if (arah !== "D") {
    if (b.loanId) throw new Error("Reimburse Kredit tidak dapat dihubungkan ke pembayaran hutang");
    return 0;
  }
  const loanId = Number(b.loanId);
  if (!Number.isInteger(loanId) || loanId <= 0) {
    throw new Error("Pilih hutang yang akan dibayar dengan Reimburse");
  }
  const daftar = await daftarHutang(env, skema);
  const hutang = daftar.filter((h) => h.id === loanId)[0];
  if (!hutang) throw new Error("Hutang tidak ditemukan — muat ulang daftar hutang");
  /* Saat mengedit pelunasan, pengecualian baris sendiri terjadi di bawah.
     Jangan tolak sebelum menghitung sisa tanpa transaksi yang sedang diedit. */
  if (Number(hutang.loan_lunas) === 1 || (hutang.status === "lunas" && !idSendiri)) {
    throw new Error("Hutang itu sudah lunas — pilih hutang lain");
  }
  const sudah = await jalankanSQL(env,
    `SELECT COALESCE(SUM(t.amount), 0) AS total FROM ${skema}.transactions t ` +
    `JOIN ${skema}.journals j ON j.id = t.journal_id ` +
    `WHERE t.loan_id = ${bulat(loanId)} AND t.tag = 'Reimburse' AND j.type = 'D' ` +
    `AND t.deleted_at IS NULL AND COALESCE(t.is_historical, 0) = 0 ` +
    (idSendiri ? `AND t.id <> ${bulat(idSendiri)}` : ""));
  const sisa = r2(Number(hutang.jumlah) - Number(sudah[0].total));
  if (jumlah > sisa + 0.000001) {
    throw new Error(`Pembayaran ${r2(jumlah)} melebihi sisa hutang ${sisa}`);
  }
  return loanId;
}

/** Periksa satu per satu sebelum ada transaksi baru yang ditulis. */
async function validasiDaftarReimburse(env, skema, daftar, terpakai) {
  const kelompok = new Map();
  for (let i = 0; i < daftar.length; i++) {
    const loanId = await validasiReimburse(env, skema, daftar[i], terpakai[i].arah, terpakai[i].jumlah, 0);
    if (!loanId) continue;
    kelompok.set(loanId, r2((kelompok.get(loanId) || 0) + terpakai[i].jumlah));
  }
  for (const [loanId, jumlah] of kelompok) {
    const hutang = (await daftarHutang(env, skema)).filter((h) => h.id === loanId)[0];
    if (!hutang || jumlah > hutang.sisa + 0.000001) {
      throw new Error(`Total pembayaran melebihi sisa hutang #${loanId}`);
    }
  }
}

/** Ubah tautan pembayaran satu per satu agar batas sisa tetap benar. */
async function validasiUbahReimburse(env, skema, b, t, id) {
  const loanId = await validasiReimburse(env, skema, b, t.arah, t.jumlah, id);
  const lama = await ambilTransaksi(env, skema, id);
  if (!lama) return loanId;

  /* Memindahkan/menghapus pembayaran lama tidak boleh membuat hutang lama
     tampak lunas; itu menyembunyikannya dari daftar hutang yang harus dibayar. */
  if (Number(lama.loan_id) > 0 && Number(lama.loan_id) !== loanId && lama.tag === "Reimburse" && lama.arah === "D") {
    const induk = (await daftarHutang(env, skema)).filter((h) => h.id === Number(lama.loan_id))[0];
    if (induk) {
      const bayarLain = await jalankanSQL(env,
        `SELECT COALESCE(SUM(t.amount), 0) AS total FROM ${skema}.transactions t ` +
        `JOIN ${skema}.journals j ON j.id = t.journal_id ` +
        `WHERE t.loan_id = ${bulat(induk.id)} AND t.tag = 'Reimburse' AND j.type = 'D' ` +
        `AND t.deleted_at IS NULL AND t.id <> ${bulat(id)} AND COALESCE(t.is_historical, 0) = 0`);
      if (Number(bayarLain[0].total) + 0.000001 >= induk.jumlah) {
        throw new Error("Perubahan membuat hutang lama menjadi lunas — batalkan lalu catat pembayaran baru");
      }
    }
  }

  /* Induk yang sudah dibayar tidak boleh diperkecil melewati pembayarannya
     atau dipindah menjadi transaksi lain. Perbesar nilai tetap boleh. */
  if (lama.tag === "Hutang" && lama.arah === "K") {
    const bayar = await jalankanSQL(env,
      `SELECT COALESCE(SUM(t.amount), 0) AS total FROM ${skema}.transactions t ` +
      `JOIN ${skema}.journals j ON j.id = t.journal_id ` +
      `WHERE t.loan_id = ${bulat(id)} AND t.tag = 'Reimburse' AND j.type = 'D' ` +
      `AND t.deleted_at IS NULL AND COALESCE(t.is_historical, 0) = 0`);
    const total = Number(bayar[0].total);
    if (total > 0 && (t.tag.name !== "Hutang" || t.arah !== "K")) {
      throw new Error("Hutang yang sudah punya pembayaran tidak dapat diubah jenisnya");
    }
    if (t.jumlah + 0.000001 < total) {
      throw new Error(`Jumlah hutang tidak boleh kurang dari pembayaran ${r2(total)}`);
    }
  }
  return loanId;
}

/* ------------------------------------------------------------------
   TULIS
   ------------------------------------------------------------------ */

/**
 * catat — buat 1 ATAU BANYAK jurnal sekaligus.
 * Satu tindakan Bapak bisa berisi beberapa catatan bank (multi-jurnal).
 * Semua baris dalam satu tindakan diberi tanda grup di kolom `notes`
 * supaya bisa dibatalkan bersama-sama.
 */
async function aksiCatat(env, skema, isi) {
  const tanggal = tanggalValid(isi.tanggal);
  if (!tanggal) return balas({ ok: false, error: "Tanggal harus YYYY-MM-DD dan sah" }, 400);

  const keterangan = String(isi.keterangan || "").trim();
  if (!keterangan) return balas({ ok: false, error: "Keterangan wajib diisi" }, 400);
  if (keterangan.length > 300) return balas({ ok: false, error: "Keterangan terlalu panjang" }, 400);

  /* Dukung dua bentuk: {fundId, tag, jumlah} atau {baris:[...]} */
  const daftar = Array.isArray(isi.baris) && isi.baris.length
    ? isi.baris
    : [{ fundId: isi.fundId, tag: isi.tag, arah: isi.arah, jumlah: isi.jumlah, loanId: isi.loanId }];

  if (daftar.length > 12) return balas({ ok: false, error: "Terlalu banyak jurnal (maks 12)" }, 400);

  const terpakai = await Promise.all(daftar.map((b) => siapkanBaris(env, skema, b)));
  await validasiDaftarReimburse(env, skema, daftar, terpakai);

  const sekarang = waktuSekarang();
  const grup = isi.grup ? String(isi.grup).slice(0, 60) : `grup:${Date.now()}`;
  const kolom =
    "date, description, amount, source_fund_id, journal_id, qty, tag, has_tax, " +
    "is_historical, is_belanja, loan_id, loan_lunas, notes, created_at, created_by";

  const perintah = terpakai.map((t, i) => {
    const loanId = t.arah === "D" && t.tag.name === "Reimburse" ? Number(daftar[i].loanId) : 0;
    return `INSERT INTO ${skema}.transactions (${kolom}) VALUES (` +
    `${teks(tanggal)}, ${teks(keterangan)}, ${angka(t.jumlah)}, ${bulat(t.fundId)}, ` +
    `${bulat(t.journalId)}, 1, ${teks(t.tag.name)}, ${bulat(t.tag.has_tax)}, 0, 0, ` +
    `${loanId ? bulat(loanId) : "NULL"}, 0, ${teks(grup)}, ${teks(sekarang)}, 'hp')`;
  });

  perintah.push(catatRiwayat(skema, "CREATE", 0,
    null, { grup, tanggal, keterangan, baris: terpakai.map((t, i) => ({ fund: t.fundId, tag: t.tag.name, arah: t.arah, jumlah: t.jumlah, loanId: t.arah === "D" && t.tag.name === "Reimburse" ? Number(daftar[i].loanId) : 0 })) }));

  await jalankanSekaligus(env, perintah);

  const barisBaru = await jalankanSQL(env,
    `SELECT id FROM ${skema}.transactions WHERE notes = ${teks(grup)} ORDER BY id`);
  const idBaru = barisBaru.map((x) => Number(x.id));

  if (idBaru.length) {
    await jalankanSQL(env,
      `UPDATE ${skema}.audit_log SET record_id = ${bulat(idBaru[0])} ` +
      `WHERE record_id = 0 AND action = 'CREATE' AND timestamp = ${teks(sekarang)}`);
  }

  return balas({
    ok: true, grup, id: idBaru, jumlahBaris: idBaru.length,
    baris: terpakai.map((t, i) => ({ id: idBaru[i] || null, fund: t.fundId, tag: t.tag.name, arah: t.arah, jumlah: t.jumlah, loanId: t.arah === "D" && t.tag.name === "Reimburse" ? Number(daftar[i].loanId) : 0 }))
  });
}

async function aksiUbah(env, skema, isi) {
  const id = Number(isi.id);
  if (!Number.isInteger(id)) return balas({ ok: false, error: "Id tidak sah" }, 400);

  const lama = await ambilTransaksi(env, skema, id);
  if (!lama) return balas({ ok: false, error: "Transaksi tidak ditemukan" }, 404);
  if (lama.deleted_at) return balas({ ok: false, error: "Transaksi sudah dibatalkan — pulihkan dulu" }, 400);

  const tanggal = tanggalValid(isi.tanggal);
  if (!tanggal) return balas({ ok: false, error: "Tanggal harus YYYY-MM-DD dan sah" }, 400);

  const keterangan = String(isi.keterangan || "").trim();
  if (!keterangan) return balas({ ok: false, error: "Keterangan wajib diisi" }, 400);

  const t = await siapkanBaris(env, skema, isi);
  const loanId = await validasiUbahReimburse(env, skema, isi, t, id);
  const sekarang = waktuSekarang();

  await jalankanSekaligus(env, [
    `UPDATE ${skema}.transactions SET ` +
    `date = ${teks(tanggal)}, description = ${teks(keterangan)}, amount = ${angka(t.jumlah)}, ` +
    `source_fund_id = ${bulat(t.fundId)}, journal_id = ${bulat(t.journalId)}, tag = ${teks(t.tag.name)}, ` +
    `has_tax = ${bulat(t.tag.has_tax)}, loan_id = ${loanId ? bulat(loanId) : "NULL"}, ` +
    `updated_at = ${teks(sekarang)}, updated_by = 'hp' ` +
    `WHERE id = ${bulat(id)}`,
    catatRiwayat(skema, "UPDATE", id, lama,
      { date: tanggal, description: keterangan, amount: t.jumlah, source_fund_id: t.fundId, tag: t.tag.name, arah: t.arah, loanId })
  ]);

  return balas({ ok: true, id, arah: t.arah, tag: t.tag.name, loanId });
}

/** batalkan — soft delete per id ATAU per grup (multi-jurnal sekaligus). */
async function aksiBatalkan(env, skema, isi) {
  const grup = isi.grup ? String(isi.grup) : null;
  const sekarang = waktuSekarang();

  if (grup) {
    const baris = await jalankanSQL(env,
      `SELECT id FROM ${skema}.transactions WHERE notes = ${teks(grup)} AND deleted_at IS NULL ORDER BY id`);
    if (!baris.length) return balas({ ok: false, error: "Tidak ada transaksi aktif di grup itu" }, 400);

    const perintah = baris.map((b) =>
      `UPDATE ${skema}.transactions SET deleted_at = ${teks(sekarang)}, deleted_by = 'hp' ` +
      `WHERE id = ${bulat(b.id)} AND deleted_at IS NULL`);
    perintah.push(catatRiwayat(skema, "DELETE", Number(baris[0].id),
      { grup, id: baris.map((b) => Number(b.id)) }, null));

    await jalankanSekaligus(env, perintah);
    return balas({ ok: true, grup, dibatalkan: baris.length, id: baris.map((b) => Number(b.id)) });
  }

  const id = Number(isi.id);
  if (!Number.isInteger(id)) return balas({ ok: false, error: "Id tidak sah" }, 400);

  const lama = await ambilTransaksi(env, skema, id);
  if (!lama) return balas({ ok: false, error: "Transaksi tidak ditemukan" }, 404);
  if (lama.deleted_at) return balas({ ok: false, error: "Transaksi sudah dibatalkan" }, 400);

  await jalankanSekaligus(env, [
    `UPDATE ${skema}.transactions SET deleted_at = ${teks(sekarang)}, deleted_by = 'hp' ` +
    `WHERE id = ${bulat(id)} AND deleted_at IS NULL`,
    catatRiwayat(skema, "DELETE", id, lama, null)
  ]);

  return balas({ ok: true, id, dibatalkan: true });
}

/** pulihkan — kembalikan transaksi yang dibatalkan (inti rollback). */
async function aksiPulihkan(env, skema, isi) {
  const grup = isi.grup ? String(isi.grup) : null;
  const sekarang = waktuSekarang();

  if (grup) {
    const baris = await jalankanSQL(env,
      `SELECT id FROM ${skema}.transactions WHERE notes = ${teks(grup)} AND deleted_at IS NOT NULL ORDER BY id`);
    if (!baris.length) return balas({ ok: false, error: "Tidak ada transaksi terbatalkan di grup itu" }, 400);

    const perintah = baris.map((b) =>
      `UPDATE ${skema}.transactions SET deleted_at = NULL, deleted_by = NULL WHERE id = ${bulat(b.id)}`);
    perintah.push(catatRiwayat(skema, "RESTORE", Number(baris[0].id),
      null, { grup, id: baris.map((b) => Number(b.id)) }));

    await jalankanSekaligus(env, perintah);
    return balas({ ok: true, grup, dipulihkan: baris.length, id: baris.map((b) => Number(b.id)) });
  }

  const id = Number(isi.id);
  if (!Number.isInteger(id)) return balas({ ok: false, error: "Id tidak sah" }, 400);

  const lama = await ambilTransaksi(env, skema, id);
  if (!lama) return balas({ ok: false, error: "Transaksi tidak ditemukan" }, 404);
  if (!lama.deleted_at) return balas({ ok: false, error: "Transaksi tidak dalam keadaan dibatalkan" }, 400);

  await jalankanSekaligus(env, [
    `UPDATE ${skema}.transactions SET deleted_at = NULL, deleted_by = NULL ` +
    `WHERE id = ${bulat(id)} AND deleted_at IS NOT NULL`,
    catatRiwayat(skema, "RESTORE", id, lama, null)
  ]);

  return balas({ ok: true, id, dipulihkan: true });
}

/* ------------------------------------------------------------------
   BACA
   ------------------------------------------------------------------ */

/**
 * bulan — daftar bulan yang punya SNAPSHOT, terbaru dulu.
 *
 * 🔴 WAJIB dari monthly_snapshots saja — persis tools/siapkan-data.cjs.
 *    Bulan tanpa snapshot tidak punya saldo awal, jadi angkanya tidak berarti.
 *    Kalau memakai tanggal transaksi, bulan bertanggal salah ikut terbawa
 *    (data Bapak punya 1 tx di 2027-09 dan 1 di 2026-12 → bug lama, lihat
 *    agents.md Bagian 8) dan halaman membuka bulan yang salah.
 */
async function aksiBulan(env, skema, isi) {
  const batas = Math.min(Math.max(Number(isi.batas) || 6, 1), 36);
  const r = await jalankanSQL(env, `
    SELECT year::text || '-' || lpad(month::text, 2, '0') AS kunci
    FROM ${skema}.monthly_snapshots
    GROUP BY year, month
    ORDER BY year DESC, month DESC
    LIMIT ${bulat(batas)}`);
  return balas({ ok: true, data: r.map((x) => x.kunci) });
}

/**
 * bukaBulan — siapkan bulan baru supaya bisa dicatat.
 *
 * 🔴 KENAPA PERLU: saldo awal tiap bulan disimpan di `monthly_snapshots`.
 *    Kalau bulan baru belum punya snapshot, halaman tidak bisa membukanya
 *    (daftar bulan diambil dari snapshot) → Bapak TIDAK BISA mencatat.
 *
 * Cara kerja (sama seperti "Proses Akhir Bulan" di sistem lama):
 *   1. ambil bulan terakhir yang punya snapshot
 *   2. hitung saldo akhir bulan itu per fund (rumus core/saldo.ts)
 *   3. tulis sebagai saldo_awal bulan baru
 *   4. kunci bulan lama (is_locked = 1)
 *
 * Aman dipanggil berulang: kalau bulan tujuan sudah ada, tidak diapa-apakan.
 */
async function aksiBukaBulan(env, skema, isi) {
  const tujuan = bulanValid(isi.bulan);
  if (!tujuan) return balas({ ok: false, error: "Format bulan harus YYYY-MM" }, 400);

  /* bulan terakhir yang sudah punya snapshot */
  const terakhir = await jalankanSQL(env, `
    SELECT year, month FROM ${skema}.monthly_snapshots
    GROUP BY year, month ORDER BY year DESC, month DESC LIMIT 1`);
  if (!terakhir.length) return balas({ ok: false, error: "Belum ada snapshot sama sekali" }, 400);

  const dari = { tahun: Number(terakhir[0].year), bulan: Number(terakhir[0].month) };
  const kunciDari = `${dari.tahun}-${String(dari.bulan).padStart(2, "0")}`;

  if (kunciDari === tujuan.kunci) {
    return balas({ ok: true, sudahAda: true, bulan: tujuan.kunci, pesan: "Bulan itu sudah siap" });
  }
  if (kunciDari > tujuan.kunci) {
    return balas({ ok: false, error: `Bulan ${tujuan.kunci} lebih lama dari ${kunciDari} — tidak bisa dibuka` }, 400);
  }

  /* bulan tujuan sudah ada? → tidak perlu apa-apa */
  const sudah = await jalankanSQL(env, `
    SELECT COUNT(*)::int AS n FROM ${skema}.monthly_snapshots
    WHERE year = ${bulat(tujuan.y)} AND month = ${bulat(tujuan.b)}`);
  if (Number(sudah[0].n) > 0) {
    return balas({ ok: true, sudahAda: true, bulan: tujuan.kunci, pesan: "Bulan itu sudah siap" });
  }

  /* saldo akhir bulan terakhir = saldo awal bulan baru */
  const akhir = new Date(Date.UTC(dari.tahun, dari.bulan, 0)).getUTCDate();
  const tanggalDari = `${kunciDari}-01`;
  const tanggalSampai = `${kunciDari}-${String(akhir).padStart(2, "0")}`;

  const saldo = await jalankanSQL(env, `
    SELECT f.id,
      COALESCE(s.saldo_awal, 0)
      + COALESCE(SUM(CASE WHEN j.type = 'D' THEN t.amount ELSE 0 END), 0)
      - COALESCE(SUM(CASE WHEN j.type = 'K' THEN t.amount ELSE 0 END), 0) AS saldo
    FROM ${skema}.source_funds f
    LEFT JOIN ${skema}.monthly_snapshots s
      ON s.source_fund_id = f.id AND s.year = ${bulat(dari.tahun)} AND s.month = ${bulat(dari.bulan)}
    LEFT JOIN ${skema}.transactions t
      ON t.source_fund_id = f.id
      AND t.date >= ${teks(tanggalDari)} AND t.date <= ${teks(tanggalSampai)}
      AND t.deleted_at IS NULL AND COALESCE(t.is_historical, 0) = 0
    LEFT JOIN ${skema}.journals j ON j.id = t.journal_id
    WHERE f.deleted_at IS NULL
    GROUP BY f.id, s.saldo_awal
    ORDER BY f.id`);

  if (!saldo.length) return balas({ ok: false, error: "Tidak ada fund aktif" }, 400);

  const sekarang = waktuSekarang();
  const perintah = saldo.map((s) =>
    `INSERT INTO ${skema}.monthly_snapshots ` +
    `(source_fund_id, year, month, saldo_awal, saldo_akhir, is_locked) VALUES (` +
    `${bulat(s.id)}, ${bulat(tujuan.y)}, ${bulat(tujuan.b)}, ` +
    `${angka(r2(s.saldo))}, 0, 0)`);

  /* kunci bulan lama — supaya tidak bisa diubah lagi (aturan: bulan terkunci) */
  perintah.push(
    `UPDATE ${skema}.monthly_snapshots SET is_locked = 1, locked_at = ${teks(sekarang)}, locked_by = 'hp' ` +
    `WHERE year = ${bulat(dari.tahun)} AND month = ${bulat(dari.bulan)}`);

  perintah.push(catatRiwayat(skema, "CREATE", 0, null,
    { aksi: "bukaBulan", dari: kunciDari, ke: tujuan.kunci, fund: saldo.length }));

  await jalankanSekaligus(env, perintah);

  return balas({
    ok: true, sudahAda: false, bulan: tujuan.kunci, dari: kunciDari,
    fund: saldo.length,
    total: r2(saldo.reduce((s, x) => s + Number(x.saldo), 0)),
  });
}

/**
 * dashboard — SELURUH data satu bulan (atau beberapa bulan sekaligus).
 * Bentuk hasilnya SAMA dengan yang dipakai halaman UangKu
 * (lihat tools/siapkan-data.cjs) supaya tampilan tidak perlu diubah.
 */
async function aksiDashboard(env, skema, isi) {
  const daftarKunci = Array.isArray(isi.bulan) ? isi.bulan : [isi.bulan];
  const bulan = [];
  for (const k of daftarKunci) {
    const b = bulanValid(k);
    if (!b) return balas({ ok: false, error: `Format bulan harus YYYY-MM (dapat: ${k})` }, 400);
    bulan.push(b);
  }
  if (bulan.length > 12) return balas({ ok: false, error: "Terlalu banyak bulan" }, 400);

  bulan.sort((a, b) => b.kunci.localeCompare(a.kunci));

  /* --- 1. fund & tag (sekali saja) --- */
  const fund = await jalankanSQL(env,
    `SELECT id, name, sort_order, is_blocked, is_titipan, minimum_saldo FROM ${skema}.source_funds ` +
    `WHERE deleted_at IS NULL ORDER BY sort_order, id`);
  const tag = await jalankanSQL(env,
    `SELECT id, name, icon, sort_order, journal_type, has_tax, is_system, show_in_shopping ` +
    `FROM ${skema}.tags WHERE deleted_at IS NULL ORDER BY sort_order, id`);
  const snap = await jalankanSQL(env,
    `SELECT source_fund_id, year, month, saldo_awal, is_locked FROM ${skema}.monthly_snapshots`);

  /* --- 1b. rate pajak bunga (tax_config) ---
     Dipakai halaman untuk MENGHITUNG PAJAK OTOMATIS saat Bapak memilih tag
     "Bunga" di layar Catat (permintaan Bapak 15 Okt 2026).
     Rumusnya tetap satu tempat: core/bunga.ts — halaman hanya memakai rate ini. */
  const pajakCfg = await jalankanSQL(env,
    `SELECT name, rate, minimum_amount FROM ${skema}.tax_config ORDER BY id LIMIT 1`);
  const ratePajak = pajakCfg.length ? Number(pajakCfg[0].rate) : 20;
  const minPajak = pajakCfg.length ? Number(pajakCfg[0].minimum_amount || 0) : 0;

  /* --- 2. transaksi seluruh rentang (dipakai untuk semua bulan) --- */
  const palingAwal = bulan[bulan.length - 1].awal;
  const palingAkhir = bulan[0].akhir;
  const tx = await jalankanSQL(env,
    `SELECT t.id, t.date, t.description, t.amount, t.tag, t.has_tax, t.transfer_pair_id, ` +
    `t.notes, t.source_fund_id, t.loan_id, t.loan_lunas, j.type AS arah ` +
    `FROM ${skema}.transactions t JOIN ${skema}.journals j ON j.id = t.journal_id ` +
    `WHERE t.date >= ${teks(palingAwal)} AND t.date <= ${teks(palingAkhir)} ` +
    `AND t.deleted_at IS NULL AND COALESCE(t.is_historical, 0) = 0 ` +
    `ORDER BY t.date DESC, t.id DESC`);

  /* --- 2b. status hutang berasal dari seluruh riwayat, bukan hanya 6 bulan tampilan --- */
  const txHutang = await jalankanSQL(env,
    `SELECT t.id, t.date, t.description, t.amount, t.tag, t.loan_id, t.loan_lunas, j.type AS arah ` +
    `FROM ${skema}.transactions t JOIN ${skema}.journals j ON j.id = t.journal_id ` +
    `WHERE t.deleted_at IS NULL AND COALESCE(t.is_historical, 0) = 0 ` +
    `AND ((t.tag = 'Hutang' AND j.type = 'K') OR (t.tag = 'Reimburse' AND j.type = 'D'))`);
  const status = hitungHutang(txHutang);

  /* --- 3. susun per bulan (perhitungan di JS — tidak ada query per fund) --- */
  const petaSnap = new Map(snap.map((s) => [`${s.source_fund_id}|${s.year}-${String(s.month).padStart(2, "0")}`, s]));
  const petaFund = new Map(fund.map((f) => [Number(f.id), f.name]));

  const hasil = bulan.map((b) => {
    const txBulan = tx.filter((t) => t.date >= b.awal && t.date <= b.akhir);

    /* aliran per fund */
    const alir = new Map();
    const perTag = new Map();
    let masukRing = 0, keluarRing = 0, bunga = 0, nBunga = 0, pajak = 0, nPajak = 0;

    for (const t of txBulan) {
      const jumlah = Number(t.amount) || 0;
      const fid = Number(t.source_fund_id);
      const a = alir.get(fid) || { d: 0, k: 0, n: 0 };
      a.n += 1;
      if (t.arah === "D") a.d += jumlah; else a.k += jumlah;
      alir.set(fid, a);

      const pt = perTag.get(t.tag) || { masuk: 0, keluar: 0, n: 0 };
      pt.n += 1;
      if (t.arah === "D") pt.masuk += jumlah; else pt.keluar += jumlah;
      perTag.set(t.tag, pt);

      /* ringkasan: 5 tag dikecualikan — tag kosong TETAP dihitung (sama core/saldo.ts) */
      if (t.tag === null || TAG_KECUALI.indexOf(t.tag) === -1) {
        if (t.arah === "D") masukRing += jumlah; else keluarRing += jumlah;
      }
      if (t.tag === "Bunga" && t.arah === "D") { bunga += jumlah; nBunga++; }
      if (t.tag === "Pajak" && t.arah === "K") { pajak += jumlah; nPajak++; }
    }

    const daftarFund = fund.map((f) => {
      const s = petaSnap.get(`${f.id}|${b.kunci}`);
      const a = alir.get(Number(f.id)) || { d: 0, k: 0, n: 0 };
      const saldoAwal = s ? Number(s.saldo_awal) : 0;
      return {
        id: Number(f.id), nama: f.name, ikon: IKON_FUND[f.name] || "💰",
        urut: Number(f.sort_order),
        diblokir: Number(f.is_blocked) === 1, titipan: Number(f.is_titipan) === 1,
        minSaldo: f.minimum_saldo === null ? null : Number(f.minimum_saldo),
        saldoAwal: r2(saldoAwal), masuk: r2(a.d), keluar: r2(a.k),
        saldo: r2(saldoAwal + a.d - a.k), n: a.n, adaSnap: !!s
      };
    });

    const totSaldo = daftarFund.reduce((s, f) => s + f.saldo, 0);
    const totAwal = daftarFund.reduce((s, f) => s + f.saldoAwal, 0);

    return {
      kunci: b.kunci,
      label: `${NAMA_BULAN[b.b - 1]} ${b.y}`,
      labelSingkat: `${NAMA_BULAN[b.b - 1].slice(0, 3)} ${b.y}`,
      awal: b.awal, akhir: b.akhir,
      terkunci: daftarFund.every((f) => {
        const s = petaSnap.get(`${f.id}|${b.kunci}`);
        return !!s && Number(s.is_locked) === 1;
      }),
      fund: daftarFund,
      tag: tag.map((g) => {
        const pt = perTag.get(g.name);
        return {
          id: Number(g.id), nama: g.name, ikon: g.icon || "🏷️", urut: Number(g.sort_order),
          arah: g.journal_type || "bebas",
          pajak: Number(g.has_tax) === 1, sistem: Number(g.is_system) === 1,
          belanja: Number(g.show_in_shopping) === 1,
          dikecualikan: TAG_KECUALI.indexOf(g.name) !== -1,
          masuk: pt ? r2(pt.masuk) : 0, keluar: pt ? r2(pt.keluar) : 0, n: pt ? pt.n : 0
        };
      }),
      tx: txBulan.map((t) => ({
        id: Number(t.id), tanggal: t.date, ket: t.description,
        jumlah: r2(t.amount), arah: t.arah,
        tag: t.tag || "(kosong)", fund: petaFund.get(Number(t.source_fund_id)) || "?",
        fid: Number(t.source_fund_id),
        pasangan: t.transfer_pair_id ? Number(t.transfer_pair_id) : 0,
        pajak: Number(t.has_tax) === 1,
        catatan: t.notes || "",
        loanId: t.loan_id ? Number(t.loan_id) : 0,
        hutang: t.tag === "Hutang" && t.arah === "K" ? status.get(Number(t.id)) || null : null
      })),
      ringkas: {
        total: r2(totSaldo), totalAwal: r2(totAwal),
        tersedia: r2(daftarFund.filter((f) => !f.diblokir && !f.titipan).reduce((s, f) => s + f.saldo, 0)),
        diblokir: r2(daftarFund.filter((f) => f.diblokir && !f.titipan).reduce((s, f) => s + f.saldo, 0)),
        titipan: r2(daftarFund.filter((f) => f.titipan).reduce((s, f) => s + f.saldo, 0)),
        masuk: r2(masukRing), keluar: r2(keluarRing), selisih: r2(masukRing - keluarRing),
        bunga: r2(bunga), nBunga, pajak: r2(pajak), nPajak, bungaNeto: r2(bunga - pajak)
      },
      /* rate pajak bunga — dipakai layar Catat untuk hitung pajak otomatis */
      pajak: { rate: ratePajak, minimum: minPajak }
    };
  });

  return balas({ ok: true, data: hasil });
}

/** fund & tag — daftar ringkas (dipakai halaman pengaturan / pilihan). */
async function aksiFund(env, skema) {
  return balas({ ok: true, data: await jalankanSQL(env,
    `SELECT id, name, sort_order, is_blocked, is_titipan, minimum_saldo FROM ${skema}.source_funds ` +
    `WHERE deleted_at IS NULL ORDER BY sort_order, id`) });
}

async function aksiTag(env, skema) {
  return balas({ ok: true, data: await jalankanSQL(env,
    `SELECT id, name, icon, sort_order, journal_type, has_tax, is_system, show_in_shopping ` +
    `FROM ${skema}.tags WHERE deleted_at IS NULL ORDER BY sort_order, id`) });
}

/* ------------------------------------------------------------------
   TAG — TULIS (tambah · ubah · hapus)
   Aturan Bapak 19 Okt 2026: *"di pengaturan > tag harus ada penambahan
   tag baru .. ada yg default dari sistem"*.
   🔴 Setiap tulis WAJIB masuk audit_log (aturan C6 rollback).
   🔴 Hapus tag DICEGAH kalau masih dipakai transaksi (aturan 9.7).
   ------------------------------------------------------------------ */

/** Nama tag: 1–30 huruf, boleh spasi. Tidak boleh sama dengan tag lain. */
function namaTagValid(v) {
  const n = String(v || "").trim().replace(/\s+/g, " ");
  if (n.length < 1 || n.length > 30) return null;
  return n;
}

/** Arah jurnal dari isian: 'D' / 'K' / null (bebas). */
function arahTagValid(v) {
  if (v === "D" || v === "K") return v;
  return null;
}

async function tagAda(env, skema, nama, kecualiId) {
  const r = await jalankanSQL(env,
    `SELECT id FROM ${skema}.tags WHERE LOWER(name) = LOWER(${teks(nama)}) ` +
    `AND deleted_at IS NULL` + (kecualiId ? ` AND id <> ${bulat(kecualiId)}` : "") + ` LIMIT 1`);
  return r.length > 0;
}

async function aksiTambahTag(env, skema, isi) {
  const nama = namaTagValid(isi.nama);
  if (!nama) return balas({ ok: false, error: "Nama tag harus 1–30 huruf" }, 400);
  if (await tagAda(env, skema, nama, 0)) return balas({ ok: false, error: `Tag "${nama}" sudah ada` }, 400);

  const ikon = String(isi.ikon || "🏷️").slice(0, 8);
  const arah = arahTagValid(isi.arah);
  const pajak = isi.pajak ? 1 : 0;
  const belanja = isi.belanja ? 1 : 0;

  const urut = await jalankanSQL(env,
    `SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM ${skema}.tags`);
  const sortOrder = Number(urut[0] ? urut[0].n : 1) || 1;
  const sekarang = waktuSekarang();

  const baru = { name: nama, icon: ikon, journal_type: arah, has_tax: pajak, show_in_shopping: belanja, sort_order: sortOrder };
  await jalankanSekaligus(env, [
    `INSERT INTO ${skema}.tags (name, icon, sort_order, created_at, journal_type, has_tax, is_system, show_in_shopping) ` +
    `VALUES (${teks(nama)}, ${teks(ikon)}, ${bulat(sortOrder)}, ${teks(sekarang)}, ` +
    `${arah === null ? "NULL" : teks(arah)}, ${bulat(pajak)}, 0, ${bulat(belanja)})`,
    `INSERT INTO ${skema}.audit_log (username, action, table_name, record_id, old_data, new_data, timestamp) ` +
    `VALUES ('hp', 'INSERT', 'tags', 0, NULL, ${teks(JSON.stringify(baru))}, ${teks(sekarang)})`
  ]);

  return balas({ ok: true, nama, arah, pajak: !!pajak, belanja: !!belanja });
}

async function aksiUbahTag(env, skema, isi) {
  const id = Number(isi.id);
  if (!Number.isInteger(id)) return balas({ ok: false, error: "Id tidak sah" }, 400);

  const lamaR = await jalankanSQL(env,
    `SELECT id, name, icon, journal_type, has_tax, is_system, show_in_shopping, sort_order ` +
    `FROM ${skema}.tags WHERE id = ${bulat(id)} AND deleted_at IS NULL LIMIT 1`);
  if (!lamaR.length) return balas({ ok: false, error: "Tag tidak ditemukan" }, 404);
  const lama = lamaR[0];

  const nama = namaTagValid(isi.nama);
  if (!nama) return balas({ ok: false, error: "Nama tag harus 1–30 huruf" }, 400);
  if (await tagAda(env, skema, nama, id)) return balas({ ok: false, error: `Tag "${nama}" sudah ada` }, 400);

  const ikon = String(isi.ikon || lama.icon || "🏷️").slice(0, 8);
  const arah = arahTagValid(isi.arah);
  const pajak = isi.pajak ? 1 : 0;
  const belanja = isi.belanja ? 1 : 0;
  const sekarang = waktuSekarang();
  const namaLama = String(lama.name);

  const perintah = [
    `UPDATE ${skema}.tags SET name = ${teks(nama)}, icon = ${teks(ikon)}, ` +
    `journal_type = ${arah === null ? "NULL" : teks(arah)}, has_tax = ${bulat(pajak)}, ` +
    `show_in_shopping = ${bulat(belanja)} WHERE id = ${bulat(id)}`
  ];

  /* 🔴 Ganti nama tag → SELURUH catatan yang memakai nama lama ikut diganti.
     Kalau tidak, transaksi lama kehilangan tag (bug nyata sistem lama, 9 Jul). */
  if (nama !== namaLama) {
    for (const tb of ["transactions", "wishlist", "shopping_list", "recurring"]) {
      perintah.push(`UPDATE ${skema}.${tb} SET tag = ${teks(nama)} WHERE tag = ${teks(namaLama)}`);
    }
  }

  perintah.push(
    `INSERT INTO ${skema}.audit_log (username, action, table_name, record_id, old_data, new_data, timestamp) ` +
    `VALUES ('hp', 'UPDATE', 'tags', ${bulat(id)}, ${teks(JSON.stringify(lama))}, ` +
    `${teks(JSON.stringify({ name: nama, icon: ikon, journal_type: arah, has_tax: pajak, show_in_shopping: belanja }))}, ` +
    `${teks(sekarang)})`
  );

  await jalankanSekaligus(env, perintah);
  return balas({ ok: true, id, nama, arah, gantiNama: nama !== namaLama });
}

async function aksiHapusTag(env, skema, isi) {
  const id = Number(isi.id);
  if (!Number.isInteger(id)) return balas({ ok: false, error: "Id tidak sah" }, 400);

  const lamaR = await jalankanSQL(env,
    `SELECT id, name, icon, journal_type, has_tax, is_system, show_in_shopping, sort_order ` +
    `FROM ${skema}.tags WHERE id = ${bulat(id)} AND deleted_at IS NULL LIMIT 1`);
  if (!lamaR.length) return balas({ ok: false, error: "Tag tidak ditemukan" }, 404);
  const lama = lamaR[0];

  if (Number(lama.is_system) === 1) {
    return balas({ ok: false, error: `Tag "${lama.name}" adalah tag SISTEM — tidak boleh dihapus` }, 400);
  }

  /* 🔴 Aturan 9.7: hapus tag DICEGAH kalau masih dipakai transaksi. */
  const pakai = await jalankanSQL(env,
    `SELECT COUNT(*) AS n FROM ${skema}.transactions ` +
    `WHERE tag = ${teks(lama.name)} AND deleted_at IS NULL`);
  const n = Number(pakai[0] ? pakai[0].n : 0);
  if (n > 0) {
    return balas({ ok: false, error: `Tag "${lama.name}" masih dipakai ${n} transaksi — tidak bisa dihapus` }, 400);
  }

  const sekarang = waktuSekarang();
  await jalankanSekaligus(env, [
    `UPDATE ${skema}.tags SET deleted_at = ${teks(sekarang)} WHERE id = ${bulat(id)} AND deleted_at IS NULL`,
    `INSERT INTO ${skema}.audit_log (username, action, table_name, record_id, old_data, new_data, timestamp) ` +
    `VALUES ('hp', 'DELETE', 'tags', ${bulat(id)}, ${teks(JSON.stringify(lama))}, NULL, ${teks(sekarang)})`
  ]);

  return balas({ ok: true, id, dihapus: true });
}

async function aksiSnapshot(env, skema, isi) {
  const b = bulanValid(isi.bulan);
  if (!b) return balas({ ok: false, error: "Format bulan harus YYYY-MM" }, 400);
  return balas({ ok: true, data: await jalankanSQL(env,
    `SELECT source_fund_id, year, month, saldo_awal, saldo_akhir, is_locked FROM ${skema}.monthly_snapshots ` +
    `WHERE year = ${bulat(b.y)} AND month = ${bulat(b.b)}`) });
}

async function aksiTransaksi(env, skema, isi) {
  const b = bulanValid(isi.bulan);
  if (!b) return balas({ ok: false, error: "Format bulan harus YYYY-MM" }, 400);
  return balas({ ok: true, data: await jalankanSQL(env,
    `SELECT t.id, t.date, t.description, t.amount, t.tag, t.source_fund_id, t.transfer_pair_id, ` +
    `t.notes, j.type AS arah, f.name AS fund ` +
    `FROM ${skema}.transactions t ` +
    `JOIN ${skema}.journals j ON j.id = t.journal_id ` +
    `JOIN ${skema}.source_funds f ON f.id = t.source_fund_id ` +
    `WHERE t.date >= ${teks(b.awal)} AND t.date <= ${teks(b.akhir)} ` +
    `AND t.deleted_at IS NULL AND COALESCE(t.is_historical, 0) = 0 ` +
    `ORDER BY t.date DESC, t.id DESC`) });
}

async function aksiSaldo(env, skema, isi) {
  const b = bulanValid(isi.bulan);
  if (!b) return balas({ ok: false, error: "Format bulan harus YYYY-MM" }, 400);

  const r = await jalankanSQL(env, `
    SELECT f.id AS "fundId", f.name AS nama, f.sort_order AS "sortOrder",
           f.is_blocked AS "isBlocked", f.is_titipan AS "isTitipan",
           f.minimum_saldo AS "minimumSaldo",
           COALESCE(s.saldo_awal, 0) AS "saldoAwal",
           COALESCE(SUM(CASE WHEN j.type = 'D' THEN t.amount ELSE 0 END), 0) AS debit,
           COALESCE(SUM(CASE WHEN j.type = 'K' THEN t.amount ELSE 0 END), 0) AS kredit,
           COUNT(t.id) AS "jumlahTransaksi"
    FROM ${skema}.source_funds f
    LEFT JOIN ${skema}.monthly_snapshots s
           ON s.source_fund_id = f.id AND s.year = ${bulat(b.y)} AND s.month = ${bulat(b.b)}
    LEFT JOIN ${skema}.transactions t
           ON t.source_fund_id = f.id
          AND t.date >= ${teks(b.awal)} AND t.date <= ${teks(b.akhir)}
          AND t.deleted_at IS NULL AND COALESCE(t.is_historical, 0) = 0
    LEFT JOIN ${skema}.journals j ON j.id = t.journal_id
    WHERE f.deleted_at IS NULL
    GROUP BY f.id, f.name, f.sort_order, f.is_blocked, f.is_titipan, f.minimum_saldo, s.saldo_awal
    ORDER BY f.sort_order, f.id`);

  const data = r.map((x) => {
    const saldoAwal = Number(x.saldoAwal), debit = Number(x.debit), kredit = Number(x.kredit);
    return {
      fundId: Number(x.fundId), nama: x.nama, sortOrder: Number(x.sortOrder),
      isBlocked: Number(x.isBlocked) === 1, isTitipan: Number(x.isTitipan) === 1,
      minimumSaldo: x.minimumSaldo === null ? null : Number(x.minimumSaldo),
      saldoAwal: r2(saldoAwal), debit: r2(debit), kredit: r2(kredit),
      saldo: r2(saldoAwal + debit - kredit),   /* rumus sama core/saldo.ts */
      jumlahTransaksi: Number(x.jumlahTransaksi)
    };
  });

  return balas({ ok: true, bulan: isi.bulan, data });
}

async function aksiRingkasan(env, skema, isi) {
  const b = bulanValid(isi.bulan);
  if (!b) return balas({ ok: false, error: "Format bulan harus YYYY-MM" }, 400);

  const daftar = TAG_KECUALI.map((n) => teks(n)).join(",");
  const r = await jalankanSQL(env, `
    SELECT
      COALESCE(SUM(CASE WHEN j.type = 'D' THEN t.amount ELSE 0 END), 0) AS masuk,
      COALESCE(SUM(CASE WHEN j.type = 'K' THEN t.amount ELSE 0 END), 0) AS keluar,
      COUNT(t.id) AS jumlah
    FROM ${skema}.transactions t
    JOIN ${skema}.journals j ON j.id = t.journal_id
    WHERE t.date >= ${teks(b.awal)} AND t.date <= ${teks(b.akhir)}
      AND t.deleted_at IS NULL AND COALESCE(t.is_historical, 0) = 0
      AND (t.tag IS NULL OR t.tag NOT IN (${daftar}))`);

  const x = r[0] || { masuk: 0, keluar: 0, jumlah: 0 };
  const masuk = r2(x.masuk), keluar = r2(x.keluar);
  return balas({ ok: true, bulan: isi.bulan, data: { masuk, keluar, selisih: r2(masuk - keluar), jumlah: Number(x.jumlah) } });
}

async function aksiRiwayat(env, skema, isi) {
  const batas = Math.min(Math.max(Number(isi.batas) || 30, 1), 200);
  const r = await jalankanSQL(env,
    `SELECT id, action, record_id, old_data, new_data, timestamp FROM ${skema}.audit_log ` +
    `WHERE table_name = 'transactions' ORDER BY id DESC LIMIT ${bulat(batas)}`);
  return balas({ ok: true, data: r });
}

/* ------------------------------------------------------------------ */

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (request.method !== "POST") return balas({ ok: false, error: "Gunakan POST" }, 405);

    const teksIsi = await request.text();
    if (teksIsi.length > 20000) return balas({ ok: false, error: "Permintaan terlalu besar" }, 413);

    let isi;
    try { isi = JSON.parse(teksIsi); } catch (e) { return balas({ ok: false, error: "Bukan JSON" }, 400); }

    if (!env.PIN || isi.pin !== env.PIN) return balas({ ok: false, error: "PIN salah" }, 401);

    const skema = skemaValid(env);
    if (!skema) return balas({ ok: false, error: "Konfigurasi skema salah" }, 500);

    try {
      switch (isi.aksi) {
        case "bulan":      return await aksiBulan(env, skema, isi);
        case "bukaBulan":  return await aksiBukaBulan(env, skema, isi);
        case "dashboard":  return await aksiDashboard(env, skema, isi);
        case "fund":       return await aksiFund(env, skema);
        case "tag":        return await aksiTag(env, skema);
    case "tambahTag":  return await aksiTambahTag(env, skema, isi);
    case "ubahTag":    return await aksiUbahTag(env, skema, isi);
    case "hapusTag":   return await aksiHapusTag(env, skema, isi);
        case "snapshot":   return await aksiSnapshot(env, skema, isi);
        case "transaksi":  return await aksiTransaksi(env, skema, isi);
        case "saldo":      return await aksiSaldo(env, skema, isi);
        case "ringkasan":  return await aksiRingkasan(env, skema, isi);
        case "riwayat":    return await aksiRiwayat(env, skema, isi);
        case "hutang":     return balas({ ok: true, data: (await daftarHutang(env, skema)).filter((h) => h.status !== "lunas") });

        case "catat":      return await aksiCatat(env, skema, isi);
        case "ubah":       return await aksiUbah(env, skema, isi);
        case "batalkan":   return await aksiBatalkan(env, skema, isi);
        case "pulihkan":   return await aksiPulihkan(env, skema, isi);

        default:
          return balas({ ok: false, error: "Perintah tidak dikenal" }, 400);
      }
    } catch (e) {
      return balas({ ok: false, error: "Gagal: " + e.message }, 502);
    }
  }
};
