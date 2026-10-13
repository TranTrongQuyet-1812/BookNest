// Nhịp "rèm mở": PageLoader báo lúc rèm bắt đầu trượt lên, các cảnh bên dưới (hero, đàn sinh vật) bắt lấy để vào cảnh
// đúng lúc trang lộ ra, thay vì chạy khi vẫn đang bị rèm che.
const SU_KIEN_REM_MO = 'booknest-rem-mo';
// Phòng hờ rèm không bao giờ báo (lỗi, hoặc trang dựng không qua PageLoader): chờ tối đa chừng này rồi tự chạy
const CHO_TOI_DA_MS = 6000;

let remDangMo = false;

/** PageLoader gọi lúc rèm bắt đầu trượt lên. */
export function baoRemMo() {
  remDangMo = true;
  window.dispatchEvent(new Event(SU_KIEN_REM_MO));
}

/** PageLoader gọi khi rèm bắt đầu kéo xuống che trang (chuẩn bị đổi trang), để cảnh mới biết phải chờ. */
export function baoRemDong() {
  remDangMo = false;
}

/**
 * Chạy callback đúng lúc rèm bắt đầu trượt lên (chạy ngay nếu rèm đang mở sẵn).
 * Trả về hàm hủy, dùng trong cleanup của effect để không chạy callback sau khi thành phần đã bị gỡ.
 */
export function khiRemMo(callback) {
  if (remDangMo) {
    callback();
    return () => {};
  }

  let daChay = false;
  const dungCho = () => {
    clearTimeout(henDuPhong);
    window.removeEventListener(SU_KIEN_REM_MO, chay);
  };
  const chay = () => {
    if (daChay) return;
    daChay = true;
    dungCho();
    callback();
  };
  const henDuPhong = setTimeout(chay, CHO_TOI_DA_MS);
  window.addEventListener(SU_KIEN_REM_MO, chay);
  return () => {
    daChay = true;
    dungCho();
  };
}
