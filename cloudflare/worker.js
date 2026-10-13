/* ============================================================
   UANGKU — Cloudflare Worker (perantara aman, BACA SAJA)
   ------------------------------------------------------------
   • Browser (HP / PC) memanggil Worker ini, bukan Layerbase langsung.
   • Kunci Layerbase & PIN disimpan sebagai SECRET di Cloudflare.
   • Setiap permintaan WAJIB membawa PIN yang benar.
   • Hanya perintah tetap (SELECT). Tidak ada SQL dari luar.
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

/* Satu-satunya jalan ke Layerbase. Dipanggil hanya dengan SQL tetap dari kode ini. */
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
  if (!r.ok) throw new Error("Layerbase " + r.status);
  const hasil = await r.json();
  return hasil.rows || [];
}

/* Nilai dari pengguna hanya boleh tahun/bulan (angka) — selain itu ditolak. */
function bulanValid(v) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(v || ""));
  if (!m) return null;
  const y = Number(m[1]), b = Number(m[2]);
  if (b < 1 || b > 12) return null;
  const akhir = new Date(Date.UTC(y, b, 0)).getUTCDate();
  return { y, b, awal: `${m[1]}-${m[2]}-01`, akhir: `${m[1]}-${m[2]}-${String(akhir).padStart(2, "0")}` };
}

function skemaValid(env) {
  return /^[a-z0-9_]+$/.test(env.SKEMA || "") ? env.SKEMA : null;
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (request.method !== "POST") return balas({ ok: false, error: "Gunakan POST" }, 405);

    const teksIsi = await request.text();
    if (teksIsi.length > 2000) return balas({ ok: false, error: "Permintaan terlalu besar" }, 413);

    let isi;
    try { isi = JSON.parse(teksIsi); } catch (e) { return balas({ ok: false, error: "Bukan JSON" }, 400); }

    if (!env.PIN || isi.pin !== env.PIN) return balas({ ok: false, error: "PIN salah" }, 401);

    const skema = skemaValid(env);
    if (!skema) return balas({ ok: false, error: "Konfigurasi skema salah" }, 500);

    try {
      switch (isi.aksi) {
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
            `WHERE year = ${b.y} AND month = ${b.b}`) });
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
            `WHERE t.date >= '${b.awal}' AND t.date <= '${b.akhir}' ` +
            `AND t.deleted_at IS NULL AND COALESCE(t.is_historical, 0) = 0 ` +
            `ORDER BY t.date DESC, t.id DESC`) });
        }

        default:
          return balas({ ok: false, error: "Perintah tidak dikenal" }, 400);
      }
    } catch (e) {
      return balas({ ok: false, error: "Gagal ambil data dari Layerbase" }, 502);
    }
  }
};
