/**
 * Hàm trích xuất thông điệp lỗi an toàn từ phản hồi API (Axios Error)
 * Tuân thủ quy tắc bảo mật và UX của BookNest:
 * 1. Tuyệt đối không bao giờ để lộ err.message thô của Axios (như "Network Error", "Request failed with status code 500" hay đường dẫn API).
 * 2. Mã lỗi 4xx: Trả về thông điệp tiếng Việt thân thiện do backend trả về (err.response.data.message).
 * 3. Mã lỗi 5xx hoặc không có thông điệp cụ thể: Trả về câu thông báo cố định an toàn.
 * 4. Lỗi mất kết nối (không có err.response): Trả về thông báo kiểm tra đường truyền mạng.
 */

function loiTuApi(err, macDinh = 'Đã có lỗi xảy ra. Vui lòng thử lại sau.') {
  if (!err) return macDinh;

  // Trường hợp 1: Có phản hồi từ máy chủ (Server Response)
  if (err.response) {
    const { status, data } = err.response;

    // 401: Hết hạn phiên hoặc chưa đăng nhập
    if (status === 401) {
      return (
        data?.message ||
        data?.thongDiep ||
        'Phiên đăng nhập đã hết hạn hoặc chưa được xác thực. Vui lòng đăng nhập lại.'
      );
    }

    // 4xx: Lỗi nghiệp vụ từ máy chủ
    if (status >= 400 && status < 500) {
      if (typeof data?.message === 'string' && data.message.trim()) {
        return data.message.trim();
      }
      if (typeof data?.thongDiep === 'string' && data.thongDiep.trim()) {
        return data.thongDiep.trim();
      }
      if (Array.isArray(data?.errors) && data.errors.length > 0) {
        const loiDau = data.errors[0];
        if (typeof loiDau === 'string') return loiDau;
        if (typeof loiDau?.thongDiep === 'string') return loiDau.thongDiep;
        if (typeof loiDau?.message === 'string') return loiDau.message;
      }
      return macDinh;
    }

    // 5xx: Sự cố máy chủ nội bộ
    if (status >= 500) {
      return 'Hệ thống đang gặp sự cố, vui lòng thử lại sau ít phút.';
    }
  }

  // Trường hợp 2: Lỗi không nhận được phản hồi (Mất mạng, Timeout, CORS, Server chưa bật)
  if (err.request) {
    return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại đường truyền mạng.';
  }

  // Trường hợp 3: Chuỗi lỗi hoặc đối tượng Error thông thường
  if (typeof err === 'string' && err.trim()) {
    if (
      err.includes('Network Error') ||
      err.includes('Request failed') ||
      err.includes('timeout')
    ) {
      return 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.';
    }
    return err.trim();
  }

  return macDinh;
}

module.exports = {
  loiTuApi,
  default: loiTuApi,
};
