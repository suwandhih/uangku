# UangKu

Aplikasi keuangan pribadi. **Inti = Transaksi**, sisanya plugin (opsional).

> 📖 Dokumen lengkap ada di dalam repo:
> [agents.md](./agents.md) (aturan kerja) · [rencanakerja.md](./rencanakerja.md) (papan order + konsep) ·
> [prompt.md](./prompt.md) (cetak biru) · [CHANGELOG.md](./CHANGELOG.md) · [panduan.md](./panduan.md)

## Prinsip

| # | Prinsip |
|---|---|
| 1 | **Transaksi = inti** — wajib jalan tanpa plugin apa pun |
| 2 | **Plugin = opsional** — pemudah kerja, bukan penopang |
| 3 | **Satu logika = satu berkas** — rumus saldo hanya di `server/core/saldo.ts` |
| 4 | **Tag = penentu makna** — logika memakai `code`, bukan nama |
| 5 | **Semua input·edit·hapus harus bisa dikembalikan** (rollback) |
| 6 | **Tampilan hitam-putih**, dirancang untuk layar 50% (±960 px) |

## Struktur

```
server/core/     aturan inti (saldo · periode · uang · bunga · aturan)
server/db/       akses database
server/uji/      uji otomatis
cloudflare/      Worker perantara (baca saja) ke database cloud
tools/           salinan data · pengisi data · cadangan cloud
design/          rancangan tampilan
```

## Perintah

```bash
npm install
npm run uji     # jalankan semua uji
npm run cek     # periksa TypeScript
```

## 🔴 Rahasia & data

Repo ini **public**. Berkas berikut **tidak** ikut terunggah (lihat [.gitignore](./.gitignore)):

- `.env` · `uangku-credentials.env` — kunci database
- `data/` — database salinan kerja & cadangan
- `uangku.html` · `lab-uang2.html` — memuat data keuangan asli

Untuk menyiapkan berkas rahasia: salin [.env.example](./.env.example) menjadi `.env` lalu isi nilainya.
