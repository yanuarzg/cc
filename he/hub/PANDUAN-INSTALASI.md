# HarianExpress Content Hub 1.1.1

## Tujuan pembaruan

Versi ini menggabungkan fungsi **HE Visitor Count REST Field** dan menyediakan endpoint cepat untuk `dashboard-redaksi.html`. Dashboard cukup melakukan satu request ke Hub dan tidak lagi mengambil puluhan halaman REST dari setiap domain.

## Pembaruan plugin

1. Cadangkan database dan plugin lama.
2. Unggah ZIP versi 1.1.1 melalui **Plugins → Add New → Upload Plugin**.
3. Pilih **Replace current with uploaded** bila WordPress meminta konfirmasi.
4. Buka **Settings → HE Content Hub**.
5. Pastikan mode, URL Hub, dan Network Secret tetap benar.
6. Pada setiap Source, klik **Masukkan semua artikel lama ke antrean** lalu proses antrean sampai nol.
7. Backfill ulang wajib dilakukan agar artikel lama memperoleh data author dan visitor.

## Pengaturan visitor

Pada setiap situs, isi **Visitor primary meta key**. Nilai umum adalah:

```text
post_views_count
```

Plugin juga mengenali beberapa key umum seperti `views`, `post_views`, `pageviews`, `jl_views`, dan `hits`. Pemindaian seluruh meta sebaiknya hanya diaktifkan untuk diagnosis karena lebih berat.

Setelah endpoint dashboard telah menampilkan angka trafik yang benar, plugin **HE Visitor Count REST Field** lama dapat dinonaktifkan. Versi baru tetap dapat membaca resolver lama selama masa transisi.

## Endpoint dashboard

Pada situs Hub:

```text
https://harianexpress.com/wp-json/he-hub/v1/dashboard?group=all&months=18&limit=30000
```

Parameter:

| Parameter | Fungsi |
|---|---|
| `group` | Kelompok domain, default `all` |
| `sources` | Daftar domain dipisahkan koma |
| `months` | Jumlah bulan riwayat |
| `limit` | Batas artikel pada respons |
| `author` | Filter nama author opsional |
| `refresh=1` | Lewati cache Hub |

Respons berisi `posts`, `sourceHealth`, `coverage`, dan `meta`.

## Memasang dashboard baru

1. Buka file `dashboard-redaksi-hub.html`.
2. Pastikan konstanta berikut mengarah ke Hub:

```javascript
const HUB_DASHBOARD_URL = "https://harianexpress.com/wp-json/he-hub/v1/dashboard";
```

3. Ganti seluruh isi halaman dashboard lama dengan isi file baru.
4. Bersihkan cache Blogger/CDN/browser.
5. Buka halaman dengan `?refresh=1` sekali untuk membuang cache data lama.

## Mekanisme visitor sync

Perubahan trafik pertama pada sebuah artikel dikirim segera ke antrean. Perubahan berikutnya dalam interval yang sama digabung, lalu nilai terbaru dikirim ulang setelah jeda sinkronisasi. Nilai default adalah 60 detik dan dapat diubah di **Pengaturan → HE Content Hub → Jeda sinkronisasi trafik**.

Filter opsional untuk mengubah jeda melalui kode:

```php
add_filter('hech_visitor_sync_delay', function () {
    return 60;
});
```

## Pembaruan otomatis GitHub

Plugin membaca manifest:

```text
https://raw.githubusercontent.com/yanuarzg/cc/main/he/hub/update.json
```

Unggah file berikut ke folder repository `he/hub/`:

```text
harianexpress-content-hub.zip
update.json
```

URL folder proyek:

```text
https://github.com/yanuarzg/cc/tree/main/he/hub
```

## Pemeriksaan setelah migrasi

1. Endpoint `/posts` tetap menampilkan artikel widget lama.
2. Endpoint `/dashboard` mengembalikan object JSON dan daftar `posts`.
3. Field `author` tidak lagi `Unknown` setelah backfill.
4. `trafficAvailable` bernilai `true` pada artikel yang memiliki meta visitor.
5. Antrean Source kembali nol.
6. Dashboard tidak lagi membuat request ke `/wp-json/wp/v2/posts` pada setiap subdomain.


## Perubahan v1.1.1 — sinkronisasi trafik

- Perubahan trafik pertama pada sebuah artikel dikirim segera.
- Perubahan lanjutan digabung selama jeda sinkronisasi (default 60 detik), lalu nilai terakhir dikirim kembali.
- Tombol **Perbarui Data** pada dashboard memakai `refresh=1` dan cache-buster.
- Setelah update, tidak diperlukan backfill ulang; cukup proses antrean jika masih tersisa.
