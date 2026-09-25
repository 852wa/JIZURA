# JIZURA — Công cụ tạo video lời bài hát kèm hiệu ứng chuyển động

Biến lời bài hát thành video lyric động ngay trong trình duyệt. JIZURA kết hợp bố cục, hiệu ứng xuất hiện, giữ hình, biến mất, trang trí, cách xử lý chữ, hình nền, chuyển động camera, hiệu ứng màn hình và chuyển cảnh. Có thể đổi seed hoặc nhấn **Tạo biến thể** (Tạo biến thể) để khám phá một cách sắp xếp khác.

**[Tiếng Việt](https://852wa.github.io/JIZURA/vi/)** · [English](https://852wa.github.io/JIZURA/en/) · [Bahasa Indonesia](https://852wa.github.io/JIZURA/id/) · [日本語版](https://852wa.github.io/JIZURA/) · [繁體中文](https://852wa.github.io/JIZURA/zh-hant/) · [简体中文](https://852wa.github.io/JIZURA/zh-hans/) · [한국어](https://852wa.github.io/JIZURA/ko/) · [Korean guide](README.ko.md) · [Japanese guide](README.md)

Các bản dịch tiếng Nhật, tiếng Anh, tiếng Indonesia, tiếng Việt, tiếng Trung Phồn thể, tiếng Trung Giản thể và tiếng Hàn dùng chung định dạng dự án và dữ liệu lưu trên trình duyệt. Dùng các liên kết ngôn ngữ ở đầu trang chỉnh sửa để chuyển bản mà không làm thay đổi lời bài hát hay cài đặt. Panel After Effects bản tiếng Anh có sẵn dưới dạng tải về ScriptUI và CEP. Định dạng JSON của AE giống nhau giữa hai ngôn ngữ (Nhật và Anh).

<details>
<summary><h2>Bắt đầu nhanh</h2></summary>

1. Dán lời bài hát vào bảng bên trái, mỗi dòng một cụm từ. Bản cài đặt mới sẽ hiển thị sẵn lời mẫu tiếng Anh.
2. Có thể nhập audio nếu muốn. JIZURA sẽ phát hiện nhịp (beat) và có thể tự động căn điểm cắt theo nhịp. Dùng **Tap to sync** (Bắt nhịp) để đánh dấu điểm bắt đầu của mỗi dòng bằng cách nhấn phím Space trong khi phát nhạc.
3. Nhấn **Create a variation** (Tạo biến thể) hoặc phím `R` để ngẫu nhiên hóa phong cách, tâm trạng (mood), chuyển động, bảng màu và cách sắp xếp. **Previous** và **Next** dùng để chuyển giữa các biến thể; **Change one thing** (Đổi một phần) chỉ đổi ngẫu nhiên đúng một thành phần.
4. Đặt tỷ lệ khung hình, độ phân giải và tốc độ khung hình, sau đó xuất MP4. Chế độ **Advanced** (Nâng cao) bổ sung chuỗi ảnh PNG, PNG trong suốt, nền color key (chroma key) và các tùy chỉnh riêng cho từng kỹ thuật.

**Ngôn ngữ lời bài hát.** Các phong cách được thiết kế xoay quanh font chữ tiếng Nhật. Với lời bằng tiếng Trung (Phồn thể / Giản thể) hoặc tiếng Hàn, hãy đặt mục **Lyrics language** (Ngôn ngữ lời) bên dưới ô nhập lời (mặc định là **Auto-detect** – tự động nhận diện: chữ kana → tiếng Nhật, Hangul → tiếng Hàn, chỉ có chữ Hán → **Phồn** thể hoặc Giản thể dựa theo các ký tự như 們/们 và 說/说). Khi đó mỗi font sẽ được thay bằng một font cùng ngôn ngữ có cảm giác tương tự — ví dụ Noto Sans JP → Noto Sans TC / SC / KR, Noto Serif JP → Noto Serif TC / SC / KR, Dela Gothic One → WDXL Lubrifont TC / ZCOOL QingKe HuangYou / Black Han Sans — để một dòng không bao giờ bị trộn font. Lời viết gần như hoàn toàn bằng chữ Latin (tiếng Anh hoặc romaji) sẽ được nhận diện là **English** và cắt thành các cụm ngắn thay vì từng từ riêng lẻ. Panel AE có cùng tùy chọn này, file JSON của AE mang theo thông tin ngôn ngữ, và AE sẽ dùng font hệ điều hành (PingFang, Microsoft JhengHei / YaHei, Apple SD Gothic Neo, Malgun Gothic) làm phương án dự phòng khi các font trên chưa được cài.

Thanh trượt âm lượng cạnh nút phát dùng để chỉnh âm lượng khi xem trước (bấm **Vol** để tắt tiếng); video xuất ra vẫn giữ nguyên mức âm lượng gốc. **Transparent PNG layers** (Lớp PNG trong suốt) xuất ra hai ảnh PNG trong suốt cho mỗi khung hình, vào thư mục `back/` (hình nền và trang trí phía sau lời) và `front/` (lời bài hát, trang trí của lời, hiệu ứng ghost và HUD); hiệu ứng màn hình được áp dụng cho cả hai lớp, nên chồng `front` lên `back` sẽ cho ra hình ảnh giống bình thường. Khi xuất PNG trong suốt, phần nền vẫn được giữ trống ngay cả khi các hiệu ứng toàn màn hình (đảo màu, chớp sáng, nhấp nháy strobe, đổi tông màu, chia đôi màn hình, tắt hiệu ứng CRT, khung hình đen…) đang bật.

**Công cụ chỉnh sửa.** Sửa lời của một dòng ngay tại chỗ (biểu tượng ✎ hoặc double-click), đặt số lần cắt cho mỗi dòng (auto / 1–6), bắt nhịp lại từ bất kỳ dòng nào (◎; Backspace để hoàn tác một lần bắt nhịp), và kéo marker dòng trên timeline (zoom bằng `+` / `−` hoặc con lăn chuột; giữ Shift để bỏ qua căn theo nhịp). Ctrl+Z hoàn tác các thay đổi về lời và thời gian. **Export range** (Phạm vi xuất) chỉ xuất những dòng đã chọn (dùng ⇥ trong danh sách dòng). Bài hát đã tải lên được lưu trong trình duyệt này, nên tải lại trang không làm mất bài hát khỏi các lần xuất sau; khi trình duyệt không mã hóa được âm thanh AAC, một file WAV của phần nhạc nền sẽ được lưu kèm bên cạnh file MP4. Một hướng dẫn ngắn sẽ tự mở ở lần truy cập đầu tiên trong chế độ Simple (nhấn `?` để xem lại). Trên cửa sổ rộng, trang không còn cuộn toàn bộ như trước: phần xem trước và timeline luôn hiển thị cố định, trong khi lời bài hát / danh sách dòng và phần cài đặt cuộn riêng trong cột của chúng, và danh sách dòng sẽ tự cuộn theo tiến trình phát.

**Unified look** (tab Effects / chế độ Simple) dựng video theo quy ước thường thấy ở video lyric: mỗi phần giữ cùng một bộ bố cục và chuyển động, một dòng lặp lại sẽ hiển thị theo cùng một cách, hướng chuyển động đổi luân phiên, dòng kết thúc bằng dấu `!` sẽ trở thành một điểm nhấn lớn, các dòng có thể biến hình sang dòng tiếp theo và chữ lớn dần từ mảnh sang đậm. **Typesetting** (Dàn chữ) thu gọn khoảng cách chữ kana, làm trợ từ nhỏ lại và chữ đầu dòng lớn hơn, tăng kích thước chữ Latin kèm khoảng cách nhỏ, hiển thị lời trước giọng hát 0,2 giây, và tránh để hiệu ứng chồng chất lên nhau. Cả hai tùy chọn này đều không bắt buộc; nếu tắt, JIZURA vẫn hoạt động như trước.

Tính năng xuất MP4 giờ truyền file ngay trong lúc mã hóa (streaming) và sẽ tự thử lại bằng bộ mã hóa phần mềm nếu bộ mã hóa GPU gặp lỗi; trên Chrome / Edge, tùy chọn **For large videos** sẽ ghi trực tiếp vào file do bạn chọn.

**Keep the centre free** (trong Export settings) chia mỗi dòng lời thành hai nửa và đặt ở hai dải bên cạnh — trái / phải nếu khung hình ngang, trên / dưới nếu khung hình dọc ("flowers" | "bloomed") — với khung hình dọc bạn có thể chọn trên / dưới hoặc trái / phải — tất cả vẫn là một cảnh dùng chung bố cục, chuyển động và trang trí, chỉ để trống đúng vị trí ở giữa cho nhân vật; nền và hiệu ứng toàn màn hình vẫn phủ kín khung hình, phần xem trước sẽ vẽ viền khu vực để trống đó, và panel AE cũng dựng theo đúng bố cục này.

**Clear lyrics** (Xoá lời) xoá lời cùng thời gian từng dòng, cài đặt riêng của từng dòng và phạm vi xuất (Undo / Ctrl+Z sẽ khôi phục lại); **Reset** ở đầu trang sẽ xoá lời, bài hát (kể cả bản lưu trong trình duyệt), cài đặt và cả hai lịch sử hoàn tác, sau khi bạn xác nhận.

**Cú pháp lời:** `[interlude 8]` thêm một đoạn nhạc không lời dài 8 giây, chỉ có nền và trang trí (4 giây nếu không ghi số); `I remember/the dawn` tạo một điểm cắt thủ công; `*word*` để nhấn mạnh một từ; dấu `!` ở cuối dòng thêm hiệu ứng chớp sáng và rung; `lyric|note` thêm chữ chú thích nhỏ; `[01:23.45]lyric` để nhập mốc thời gian theo định dạng LRC; dòng bắt đầu bằng `#` là comment và sẽ bị bỏ qua.

Dùng **Save** và **Open** cho các dự án `.jizura.json`. **Export for AE** tạo dữ liệu bố cục để nhập vào panel After Effects. Video và hình ảnh được tạo ra thuộc về người tạo; bản quyền nhạc và lời bài hát vẫn thuộc về chủ sở hữu tương ứng. File dự án, lời bài hát và audio đều được xử lý ngay trong trình duyệt. Google Fonts được tải khi cần. Công cụ này phát hành theo giấy phép MIT; xem [LICENSE](LICENSE) và [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

</details>

<details>
<summary><h2>Build và xuất bản</h2></summary>

Chạy `python3 build.py` ở thư mục gốc của repo. Lệnh này tạo `index.html` cùng các bản `en/`, `zh-hant/`, `zh-hans/`, `ko/`, `id/` và `vi/` (bản dịch nằm trong `app/english.py` và các file `app/i18n_*.py`), tất cả đều là trang độc lập để đăng lên GitHub Pages. Chạy `python3 build_ae.py --lang en` để dựng lại `JIZURA_AE_en.jsx`, và `python3 build_cep.py --lang en --out dist` để dựng `dist/JIZURA_CEP_en.zip` (sao chép file ZIP này ra thư mục gốc của repo để có thể tải về từ Pages). Commit các trang đã build, các panel và mã nguồn bản dịch cùng nhau. Đăng từ thư mục gốc trên GitHub Pages; khi đó bản tiếng Anh được phục vụ tại `/JIZURA/en/` và bản tiếng Indonesia tại `/JIZURA/id/`. Có thể mở trực tiếp một trong các file HTML trên máy để dùng offline, khi đó font đã cài trên máy sẽ được dùng làm phương án dự phòng.

Cài `JIZURA_AE_en.jsx` vào thư mục `Scripts/ScriptUI Panels` của After Effects, khởi động lại AE, rồi mở panel từ menu Window. Gói CEP bản tiếng Anh có extension ID riêng, nên có thể cài song song với panel CEP bản tiếng Nhật. Giải nén file ZIP và dùng trình cài đặt Windows hoặc macOS đi kèm. Chế độ **Lightweight** bỏ bớt các bản sao đổi màu, hiệu ứng vân giấy, bloom, grain và hiệu ứng nhân bản hình ảnh (giảm khoảng 40% số layer) để phát mượt hơn trong AE. Cả hai panel đều dựng các bài hát dài theo từng bước nhỏ để After Effects không bị treo: panel hiển thị tiến trình, và nút **Stop** sẽ hoàn tất composition với các đoạn đã dựng được đến thời điểm đó. Khi đã chọn **Export range**, panel CEP (và cả **Export for AE**) chỉ dựng những dòng đó, với layer bài hát được dịch chuyển tương ứng. Các panel này cần có After Effects để kiểm tra chuyển động và kết quả xuất; các bước kiểm tra tự động dùng môi trường AE giả lập.

</details>

<details>
<summary><h2>Người đóng góp</h2></summary>

Giao diện và tên kỹ thuật tiếng Trung Phồn thể, tên kỹ thuật tiếng Trung Giản thể, sửa lỗi nhận diện font và ngôn ngữ: [Zaious](https://github.com/Zaious) (#5, #6, #7, #11). Giao diện và tên kỹ thuật tiếng Hàn: [andongmin94](https://github.com/andongmin94) (#8). Giao diện tiếng Indonesia: [auliaramadhann](https://github.com/auliaramadhann) và [enka25](https://github.com/enka25) (#12).

</details>
