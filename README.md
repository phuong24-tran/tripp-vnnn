# vn-trip-planner (GitHub Pages)

Website lịch trình VN (26/12 → 14/01) + checklist tick được (lưu bằng LocalStorage).

## Cách chạy thử trên máy
- Mở file `index.html` bằng trình duyệt (Chrome/Edge).
- Hoặc dùng VS Code → extension “Live Server”.

## Cách đưa lên GitHub Pages
1. Tạo repo mới trên GitHub (ví dụ: `vn-trip-planner`).
2. Upload 4 file này vào repo:
   - `index.html`
   - `style.css`
   - `script.js`
   - `data.js`
3. Vào **Settings → Pages**
   - Source: **Deploy from a branch**
   - Branch: `main` (root)
4. Lưu lại → GitHub sẽ cho bạn 1 link Pages.

## Chỉnh lịch / thêm món / thêm chỗ chơi
- Mở `data.js` và sửa phần `window.TRIP_DATA`.
- Mỗi ngày có dạng:
```js
{
  date: "2025-12-26",
  dow: "Thứ Sáu",
  title: "Tên ngày",
  areas: ["Khu vực 1", "Khu vực 2"],
  blocks: [
    { time: "Sáng", label: "Tiêu đề block", items: [
        { text: "Việc cần làm", cat: "food|play|self|shop|photo|event|life", place: "gợi ý địa điểm" }
    ]}
  ]
}
```

## Backup / chuyển máy
- Nhấn **Xuất tiến độ (JSON)** để tải file.
- Ở máy khác, bấm **Nhập tiến độ** để load lại.
