/* ============================================================
   UANGKU — Cloudflare Worker (perantara aman ke Layerbase)
   ------------------------------------------------------------
   • Browser (HP / PC) memanggil Worker ini, bukan Layerbase langsung.
   • Kunci Layerbase & PIN disimpan sebagai SECRET di Cloudflare.
   • Setiap permintaan WAJIB membawa PIN yang benar.
   • Perintah tetap saja — TIDAK ada SQL dari luar.
   • Setiap tulis WAJIB tercatat di audit_log (aturan C6 rollback).

   BACA  : fund · tag · snapshot · transaksi · riwayat
   TULIS : catat · ubah · batalkan · pulihkan
   ============================================================ */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
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

/** Teks → kutip tunggal, kutip di dalam digandakan. */
function teks(v) {
  if (v === null || v === undefined) return "NULL";
  return "'" + String(v).replace(/'/g, "''") + "'";
}

/** Angka pecahan — wajib angka sah. */
function angka(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error("Angka tidak sah");
  return String(n);
}

/** Angka bulat — wajib bilangan bulat. */
function bulat(v) {
  const n = Number(v);
  if (!Number.isInteger(n)) throw new Error("Angka bulat tidak sah");
  return String(n);
}

/** Waktu lokal WIB (UTC+7) — sama seperti datetime('now','localtime') di SQLite. */
function waktuSekarang() {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 19).replace("T", " ");
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
  return { y, b, awal: `${m[1]}-${m[2]}-01`, akhir: `${m[1]}-${m[2]}-${String(akhir).padStart(2, "0")}` };
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

/** Ambil tag dari database — sekaligus jadi DAFTAR PUTIH (anti suntikan). */
async function ambilTag(env, skema, nama) {
  const r = await jalankanSQL(env,
    `SELECT id, name, journal_type, has_tax, is_system FROM ${skema}.tags ` +
    `WHERE name = ${teks(nama)} AND deleted_at IS NULL LIMIT 1`);
  return r[0] || null;
}

/** Cari journal_id untuk fund + arah tertentu. */
async function ambilJurnal(env, skema, fundId, arah) {
  const r = await jalankanSQL(env,
    `SELECT id FROM ${skema}.journals ` +
    `WHERE source_fund_id = ${bulat(fundId)} AND type = ${teks(arah)} AND deleted_at IS NULL ` +
    `ORDER BY is_system DESC, id LIMIT 1`);
  return r[0] ? Number(r[0].id) : null;
}

async function fundAda(env, skema, fundId) {
  const r = await jalankanSQL(env,
    `SELECT id FROM ${skema}.source_funds WHERE id = ${bulat(fundId)} AND deleted_at IS NULL LIMIT 1`);
  return r.length > 0;
}

/** Satu baris transaksi lengkap (untuk riwayat & pembatalan). */
async function ambilTransaksi(env, skema, id) {
  const r = await jalankanSQL(env,
    `SELECT t.id, t.date, t.description, t.amount, t.source_fund_id, t.journal_id, ` +
    `t.transfer_pair_id, t.tag, t.has_tax, t.deleted_at, t.created_at, t.updated_at, ` +
    `j.type AS arah, f.name AS fund ` +
    `FROM ${skema}.transactions t ` +
    `JOIN ${skema}.journals j ON j.id = t.journal_id ` +
    `JOIN ${skema}.source_funds f ON f.id = t.source_fund_id ` +
    `WHERE t.id = ${bulat(id)} LIMIT 1`);
  return r[0] || null;
}

/** Catat ke audit_log — WAJIB untuk setiap tulis (aturan C6). */
function catatRiwayat(skema, aksi, id, lama, baru) {
  return `INSERT INTO ${skema}.audit_log (username, action, table_name, record_id, old_data, new_data, timestamp) ` +
    `VALUES ('hp', ${teks(aksi)}, 'transactions', ${bulat(id)}, ` +
    `${lama === null ? "NULL" : teks(JSON.stringify(lama))}, ` +
    `${baru === null ? "NULL" : teks(JSON.stringify(baru))}, ${teks(waktuSekarang())})`;
}

/* ------------------------------------------------------------------
   AKSI TULIS
   ------------------------------------------------------------------ */

/** catat — buat 1 transaksi baru. */
async function aksiCatat(env, skema, isi) {
  const tanggal = tanggalValid(isi.tanggal);
  if (!tanggal) return balas({ ok: false, error: "Tanggal harus YYYY-MM-DD dan sah" }, 400);

  const jumlah = Number(isi.jumlah);
  if (!Number.isFinite(jumlah) || jumlah <= 0) {
    return balas({ ok: false, error: "Jumlah harus lebih dari 0" }, 400);
  }
  if (jumlah > 1000000000) {
    return balas({ ok: false, error: "Jumlah lebih dari 1 miliar — periksa lagi" }, 400);
  }

  const keterangan = String(isi.keterangan || "").trim();
  if (!keterangan) return balas({ ok: false, error: "Keterangan wajib diisi" }, 400);
  if (keterangan.length > 300) return balas({ ok: false, error: "Keterangan terlalu panjang" }, 400);

  const fundId = Number(isi.fundId);
  if (!Number.isInteger(fundId)) return balas({ ok: false, error: "Fund tidak sah" }, 400);
  if (!(await fundAda(env, skema, fundId))) {
    return balas({ ok: false, error: "Fund tidak ditemukan" }, 400);
  }

  const tag = await ambilTag(env, skema, isi.tag);
  if (!tag) return balas({ ok: false, error: "Tag tidak dikenal" }, 400);

  /* Arah: tag yang mengunci arah menang; tag dua arah (journal_type kosong) pakai pilihan pengguna */
  let arah = tag.journal_type;
  if (arah !== "D" && arah !== "K") {
    arah = isi.arah === "D" || isi.arah === "K" ? isi.arah : null;
    if (!arah) {
      return balas({ ok: false, error: `Tag "${tag.name}" dua arah — pilih Debit atau Kredit` }, 400);
    }
  }

  const journalId = await ambilJurnal(env, skema, fundId, arah);
  if (!journalId) {
    return balas({ ok: false, error: `Jurnal ${arah} untuk fund itu tidak ada` }, 400);
  }

  const sekarang = waktuSekarang();
  const kolom =
    "date, description, amount, source_fund_id, journal_id, qty, tag, has_tax, " +
    "is_historical, is_belanja, loan_lunas, created_at, created_by";
  const nilai =
    `${teks(tanggal)}, ${teks(keterangan)}, ${angka(jumlah)}, ${bulat(fundId)}, ${bulat(journalId)}, ` +
    `1, ${teks(tag.name)}, ${bulat(tag.has_tax)}, 0, 0, 0, ${teks(sekarang)}, 'hp'`;

  const baru = {
    date: tanggal, description: keterangan, amount: jumlah,
    source_fund_id: fundId, journal_id: journalId, tag: tag.name, arah
  };

  await jalankanSekaligus(env, [
    `INSERT INTO ${skema}.transactions (${kolom}) VALUES (${nilai})`,
    catatRiwayat(skema, "CREATE", 0, null, baru)
  ]);

  /* id asli diambil ulang — audit_log butuh record_id yang benar */
  const baris = await jalankanSQL(env,
    `SELECT id FROM ${skema}.transactions WHERE created_at = ${teks(sekarang)} AND created_by = 'hp' ` +
    `ORDER BY id DESC LIMIT 1`);
  const idBaru = baris[0] ? Number(baris[0].id) : null;

  if (idBaru !== null) {
    await jalankanSQL(env,
      `UPDATE ${skema}.audit_log SET record_id = ${bulat(idBaru)} ` +
      `WHERE record_id = 0 AND action = 'CREATE' AND timestamp = ${teks(sekarang)}`);
  }

  return balas({ ok: true, id: idBaru, arah, tag: tag.name, fundId, jumlah, tanggal });
}

/** ubah — perbaiki transaksi yang sudah ada (nilai lama disimpan). */
async function aksiUbah(env, skema, isi) {
  const id = Number(isi.id);
  if (!Number.isInteger(id)) return balas({ ok: false, error: "Id tidak sah" }, 400);

  const lama = await ambilTransaksi(env, skema, id);
  if (!lama) return balas({ ok: false, error: "Transaksi tidak ditemukan" }, 404);
  if (lama.deleted_at) return balas({ ok: false, error: "Transaksi sudah dibatalkan — pulihkan dulu" }, 400);

  const tanggal = tanggalValid(isi.tanggal);
  if (!tanggal) return balas({ ok: false, error: "Tanggal harus YYYY-MM-DD dan sah" }, 400);

  const jumlah = Number(isi.jumlah);
  if (!Number.isFinite(jumlah) || jumlah <= 0) {
    return balas({ ok: false, error: "Jumlah harus lebih dari 0" }, 400);
  }

  const keterangan = String(isi.keterangan || "").trim();
  if (!keterangan) return balas({ ok: false, error: "Keterangan wajib diisi" }, 400);

  const fundId = Number(isi.fundId);
  if (!Number.isInteger(fundId)) return balas({ ok: false, error: "Fund tidak sah" }, 400);
  if (!(await fundAda(env, skema, fundId))) {
    return balas({ ok: false, error: "Fund tidak ditemukan" }, 400);
  }

  const tag = await ambilTag(env, skema, isi.tag);
  if (!tag) return balas({ ok: false, error: "Tag tidak dikenal" }, 400);

  let arah = tag.journal_type;
  if (arah !== "D" && arah !== "K") {
    arah = isi.arah === "D" || isi.arah === "K" ? isi.arah : lama.arah;
  }

  const journalId = await ambilJurnal(env, skema, fundId, arah);
  if (!journalId) return balas({ ok: false, error: `Jurnal ${arah} untuk fund itu tidak ada` }, 400);

  const sekarang = waktuSekarang();
  const baru = {
    date: tanggal, description: keterangan, amount: jumlah,
    source_fund_id: fundId, journal_id: journalId, tag: tag.name, arah
  };

  await jalankanSekaligus(env, [
    `UPDATE ${skema}.transactions SET ` +
    `date = ${teks(tanggal)}, description = ${teks(keterangan)}, amount = ${angka(jumlah)}, ` +
    `source_fund_id = ${bulat(fundId)}, journal_id = ${bulat(journalId)}, tag = ${teks(tag.name)}, ` +
    `has_tax = ${bulat(tag.has_tax)}, updated_at = ${teks(sekarang)}, updated_by = 'hp' ` +
    `WHERE id = ${bulat(id)}`,
    catatRiwayat(skema, "UPDATE", id, lama, baru)
  ]);

  return balas({ ok: true, id, arah, tag: tag.name });
}

/** batalkan — soft delete (tidak pernah hapus keras, aturan E2/E4). */
async function aksiBatalkan(env, skema, isi) {
  const id = Number(isi.id);
  if (!Number.isInteger(id)) return balas({ ok: false, error: "Id tidak sah" }, 400);

  const lama = await ambilTransaksi(env, skema, id);
  if (!lama) return balas({ ok: false, error: "Transaksi tidak ditemukan" }, 404);
  if (lama.deleted_at) return balas({ ok: false, error: "Transaksi sudah dibatalkan" }, 400);

  const sekarang = waktuSekarang();
  await jalankanSekaligus(env, [
    `UPDATE ${skema}.transactions SET deleted_at = ${teks(sekarang)}, deleted_by = 'hp' ` +
    `WHERE id = ${bulat(id)} AND deleted_at IS NULL`,
    catatRiwayat(skema, "DELETE", id, lama, null)
  ]);

  return balas({ ok: true, id, dibatalkan: true });
}

/** pulihkan — kembalikan transaksi yang dibatalkan (inti rollback). */
async function aksiPulihkan(env, skema, isi) {
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
   AKSI BACA
   ------------------------------------------------------------------ */

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
    if (teksIsi.length > 4000) return balas({ ok: false, error: "Permintaan terlalu besar" }, 413);

    let isi;
    try { isi = JSON.parse(teksIsi); } catch (e) { return balas({ ok: false, error: "Bukan JSON" }, 400); }

    if (!env.PIN || isi.pin !== env.PIN) return balas({ ok: false, error: "PIN salah" }, 401);

    const skema = skemaValid(env);
    if (!skema) return balas({ ok: false, error: "Konfigurasi skema salah" }, 500);

    try {
      switch (isi.aksi) {
        /* ---------- BACA ---------- */
        case "fund":
          return balas({ ok: true, data: await jalankanSQL(env,
            `SELECT id, name, sort_order, is_blocked, is_titipan, minimum_saldo FROM ${skema}.source_funds ` +
            `WHERE deleted_at IS NULL ORDER BY sort_order, id`) });

        case "tag":
          return balas({ ok: true, data: await jalankanSQL(env,
            `SELECT id, name, icon, sort_order, journal_type, has_tax, is_system FROM ${skema}.tags ` +
            `WHERE deleted_at IS NULL ORDER BY sort_order, id`) });

        case "snapshot": {
          const b = bulanValid(isi.bulan);
          if (!b) return balas({ ok: false, error: "Format bulan harus YYYY-MM" }, 400);
          return balas({ ok: true, data: await jalankanSQL(env,
            `SELECT source_fund_id, year, month, saldo_awal, saldo_akhir FROM ${skema}.monthly_snapshots ` +
            `WHERE year = ${bulat(b.y)} AND month = ${bulat(b.b)}`) });
        }

        case "transaksi": {
          const b = bulanValid(isi.bulan);
          if (!b) return balas({ ok: false, error: "Format bulan harus YYYY-MM" }, 400);
          return balas({ ok: true, data: await jalankanSQL(env,
            `SELECT t.id, t.date, t.description, t.amount, t.tag, t.source_fund_id, t.transfer_pair_id, ` +
            `j.type AS arah, f.name AS fund ` +
            `FROM ${skema}.transactions t ` +
            `JOIN ${skema}.journals j ON j.id = t.journal_id ` +
            `JOIN ${skema}.source_funds f ON f.id = t.source_fund_id ` +
            `WHERE t.date >= ${teks(b.awal)} AND t.date <= ${teks(b.akhir)} ` +
            `AND t.deleted_at IS NULL AND COALESCE(t.is_historical, 0) = 0 ` +
            `ORDER BY t.date DESC, t.id DESC`) });
        }

        case "riwayat":
          return await aksiRiwayat(env, skema, isi);

        /* ---------- TULIS ---------- */
        case "catat":
          return await aksiCatat(env, skema, isi);

        case "ubah":
          return await aksiUbah(env, skema, isi);

        case "batalkan":
          return await aksiBatalkan(env, skema, isi);

        case "pulihkan":
          return await aksiPulihkan(env, skema, isi);

        default:
          return balas({ ok: false, error: "Perintah tidak dikenal" }, 400);
      }
    } catch (e) {
      return balas({ ok: false, error: "Gagal: " + e.message }, 502);
    }
  }
};
