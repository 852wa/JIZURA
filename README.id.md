# JIZURA — Pembuat Video Lirik Bergerak

Buat video lirik bergerak langsung di browser. JIZURA menggabungkan layout, animasi masuk, gerakan saat teks bertahan, animasi keluar, dekorasi, efek teks, latar, gerakan kamera, efek, dan transisi. Ganti seed atau tekan **Buat variasi** untuk mencoba susunan lain.

**[Buka aplikasi Bahasa Indonesia](https://852wa.github.io/JIZURA/id/)** · [日本語](README.md) · [English](README.en.md) · [繁體中文](https://852wa.github.io/JIZURA/zh-hant/) · [简体中文](https://852wa.github.io/JIZURA/zh-hans/) · [한국어](https://852wa.github.io/JIZURA/ko/)

Edisi Indonesia dan Jepang memakai format proyek serta data browser yang sama. Gunakan menu bahasa di bagian atas editor untuk berpindah edisi tanpa mengubah lirik atau pengaturan.

<details>
<summary><h2>Mulai cepat</h2></summary>

1. Tempelkan lirik di panel kiri, satu frasa per baris. Contoh lirik bawaan muncul saat aplikasi pertama kali dibuka.
2. Impor audio jika perlu. JIZURA mendeteksi ketukan dan dapat menyesuaikan batas cut ke ketukan tersebut. Gunakan **Sinkronkan ke ketukan** untuk menandai awal setiap baris dengan menekan Spasi saat lagu diputar.
3. Tekan **Buat variasi** atau `R` untuk mengacak gaya, suasana, gerakan, palet, dan susunan. **Sebelumnya** dan **Berikutnya** digunakan untuk berpindah antarvariasi; **Ubah satu hal** hanya mengacak satu bagian.
4. Atur rasio aspek, resolusi, dan frame rate, lalu ekspor MP4. Mode Lanjutan menambahkan PNG berurutan, PNG transparan, latar untuk chroma key, serta kontrol teknik satu per satu.

**Bahasa lirik.** Gaya bawaan dirancang berdasarkan font Jepang. Untuk lirik Mandarin atau Korea, atur **Bahasa lirik** di bawah kotak lirik. **Deteksi otomatis** aktif secara default: kana → Jepang, Hangul → Korea, dan tulisan Han saja → Mandarin Tradisional atau Sederhana berdasarkan karakter seperti 們/们 dan 說/说. Setiap font akan diganti dengan font dalam bahasa tersebut yang nuansanya mirip, sehingga satu baris tidak mencampur font. Lirik yang hampir seluruhnya memakai huruf Latin, seperti bahasa Inggris atau romaji, akan terdeteksi sebagai **English** dan dipotong menjadi frasa pendek, bukan satu kata per cut.

Penggeser volume di sebelah tombol putar hanya mengatur volume pratinjau; video hasil ekspor tetap memakai level audio asli. Ekspor **PNG transparan berlapis** membuat dua PNG transparan per frame: `back/` untuk grafik latar dan dekorasi di belakang lirik, serta `front/` untuk lirik, dekorasi, efek ghost, dan HUD. Efek layar diterapkan ke keduanya, jadi menumpuk `front` di atas `back` menghasilkan tampilan normal.

**Alat pengeditan.** Edit lirik langsung di tempat (✎ atau klik dua kali), atur jumlah cut per baris (otomatis / 1–6), ulangi sinkronisasi dari baris mana pun (◎; Backspace membatalkan ketukan), dan geser marker baris di timeline (zoom dengan `+` / `−` atau roda mouse; tahan Shift untuk mengabaikan ketukan). Ctrl+Z membatalkan perubahan lirik dan timing. **Rentang ekspor** hanya mengekspor baris yang dipilih (⇥ di daftar baris). Lagu yang dimuat disimpan di browser ini, jadi reload tidak menghilangkannya dari ekspor; jika browser tidak bisa mengodekan audio AAC, file WAV juga disimpan di samping MP4. Tur singkat muncul saat pertama kali membuka aplikasi dalam mode Sederhana; tekan `?` untuk membukanya lagi.

**Sintaks lirik:** `[interlude 8]` menambahkan bagian instrumental 8 detik dengan latar dan dekorasi saja (4 detik jika angka dihilangkan); `I remember/the dawn` membuat cut manual; `*kata*` memberi penekanan; `!` di akhir menambahkan flash dan goyangan; `lirik|catatan` menambahkan teks anotasi kecil; `[01:23.45]lirik` memakai timestamp LRC; baris yang diawali `#` diabaikan sebagai komentar.

Gunakan **Simpan** dan **Buka** untuk proyek `.jizura.json`. **Ekspor untuk AE** membuat data susunan yang bisa diimpor ke panel After Effects. Video dan gambar yang dibuat menjadi milik pembuatnya; hak atas musik dan lirik tetap berada pada pemegang hak masing-masing. File proyek, lirik, dan audio diproses di browser. Google Fonts dimuat sesuai kebutuhan. Aplikasi ini dirilis di bawah lisensi MIT; lihat [LICENSE](LICENSE) dan [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

</details>

<details>
<summary><h2>Build dan publikasi</h2></summary>

Jalankan `python3 build.py` dari root repository. Perintah ini membuat edisi `index.html`, `en/`, `zh-hant/`, `zh-hans/`, `ko/`, dan `id/` (terjemahan browser berada di `app/english.py` dan `app/i18n_*.py`), semuanya berupa halaman mandiri untuk GitHub Pages. Jalankan `python3 build_ae.py --lang en` untuk membangun panel After Effects Inggris, atau `python3 build_cep.py --lang en --out dist` untuk paket CEP Inggris. Commit halaman hasil build, panel, dan sumber terjemahan bersama-sama. Publikasikan dari root repository di GitHub Pages; edisi Indonesia tersedia di `/JIZURA/id/`. File HTML juga bisa dibuka langsung secara lokal untuk penggunaan offline, dengan font terpasang sebagai fallback.

Panel After Effects memerlukan After Effects untuk memverifikasi gerakan dan hasil ekspor; pengujian otomatis memakai mock AE.

</details>
