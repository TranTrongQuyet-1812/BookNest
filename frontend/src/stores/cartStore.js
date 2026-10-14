import { create } from 'zustand';
import api from '../services/api';

const KEY_GUEST_CART = 'booknest_guest_cart';

// Đọc danh sách món của khách vãng lai từ localStorage (phòng vệ chống crash nếu JSON không phải mảng)
const docGuestCart = () => {
  try {
    const raw = localStorage.getItem(KEY_GUEST_CART);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// Lưu danh sách món của khách vãng lai vào localStorage
const luuGuestCart = (cacMon) => {
  try {
    localStorage.setItem(KEY_GUEST_CART, JSON.stringify(cacMon));
  } catch (err) {
    console.error('Lỗi lưu giỏ hàng khách vãng lai:', err);
  }
};

// Kiểm tra xem phiên hiện tại có phải là khách hàng hợp lệ (Customer) để gọi API Server không.
// Client chỉ lưu token (không lưu booknest_user nữa), nên đọc loại tài khoản từ claim "aud" trong chính token.
// Việc này chỉ để chọn nơi lưu giỏ (server hay máy khách); quyền thật vẫn do máy chủ kiểm tra ở từng request.
// Trước đây đọc booknest_user đã bị xóa nên luôn trả false: giỏ của khách đăng nhập bị lưu cục bộ trong khi đặt đơn
// lại đọc giỏ trên server (rỗng), gây lỗi 400 "Giỏ hàng đang trống".
const laKhachHangHopLe = () => {
  const token = localStorage.getItem('booknest_token');
  if (!token) return false;
  try {
    const phanDuLieu = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const giaiMa = JSON.parse(atob(phanDuLieu));
    if (giaiMa.exp && Date.now() >= giaiMa.exp * 1000) return false;
    return giaiMa.aud === 'khach_hang';
  } catch {
    return false;
  }
};

// Tính toán tổng số lượng và tổng tiền từ danh sách món của khách vãng lai
const tinhTongGuest = (cacMon) => {
  const tongSoLuong = cacMon.reduce((sum, mon) => sum + (mon.soLuong || 0), 0);
  const tongTien = cacMon.reduce((sum, mon) => sum + (mon.thanhTien || 0), 0);
  return {
    cacMon,
    tongSoLuong,
    tongTien,
    gioHang: {
      cacMon,
      tongSoLuong,
      tongTien
    }
  };
};

/**
 * useCartStore - Quản lý State giỏ hàng tập trung bằng Zustand
 * Hỗ trợ đồng thời 2 vai trò:
 * 1. Khách vãng lai (Guest - Chưa đăng nhập hoặc tài khoản quản trị): Lưu trữ trong Client localStorage (key: booknest_guest_cart).
 * 2. Khách hàng (Customer - Đã đăng nhập vai trò khach_hang): Lưu trữ trên CSDL Server qua REST API.
 * 3. Đồng bộ (Merge Cart): Khi khách đăng nhập, tự động gom toàn bộ sách từ Guest Cart đẩy lên Server.
 */
export const useCartStore = create((set, get) => ({
  gioHang: null,
  cacMon: [],
  tongSoLuong: 0,
  tongTien: 0,
  dangTai: false,
  daKhoiTao: false,
  dangCapNhat: false,
  loi: null,

  // 1. Tải giỏ hàng (Tự động nhận diện Guest hay Customer)
  layGioHang: async () => {
    // Chế độ Guest hoặc Nhân sự Back-office duyệt trang: Đọc trực tiếp từ localStorage
    if (!laKhachHangHopLe()) {
      const items = docGuestCart();
      const tong = tinhTongGuest(items);
      set({
        ...tong,
        dangTai: false,
        daKhoiTao: true,
        loi: null
      });
      return tong.gioHang;
    }

    // Chế độ Customer: Đọc từ API Server (Stale-While-Revalidate)
    if (!get().daKhoiTao) {
      set({ dangTai: true, loi: null });
    }
    try {
      const res = await api.get('/cart');
      const data = res.data.data;
      set({
        gioHang: data,
        cacMon: data.cacMon || [],
        tongSoLuong: data.tongSoLuong || 0,
        tongTien: data.tongTien || 0,
        dangTai: false,
        daKhoiTao: true
      });
      return data;
    } catch (err) {
      console.warn('Lỗi tải giỏ hàng server, chuyển sang giỏ hàng cục bộ:', err.message);
      // Fallback về giỏ hàng khách vãng lai thay vì để rỗng
      const items = docGuestCart();
      const tong = tinhTongGuest(items);
      set({
        ...tong,
        dangTai: false,
        daKhoiTao: true,
        loi: null
      });
      return tong.gioHang;
    }
  },

  // 2. Thêm sách vào giỏ
  themVaoGio: async (maSach, soLuong = 1, thongTinSach = null) => {
    const maSachSo = Number(maSach);
    if (!maSachSo) return { thanhCong: false, thongDiep: 'Mã sách không hợp lệ' };

    // --- Chế độ Guest (Lưu Client localStorage) ---
    if (!laKhachHangHopLe()) {
      try {
        let book = thongTinSach;
        // Nếu chưa có sẵn thông tin sách, gọi API lấy thông tin sách
        if (!book) {
          const res = await api.get(`/books/${maSachSo}`);
          book = res.data.data;
        }

        const items = docGuestCart();
        const viTri = items.findIndex(item => Number(item.maSach) === maSachSo);
        const donGia = Number(book.giaBan ?? book.GiaBan ?? 0);
        const tonKho = Number(book.soLuongTon ?? book.SoLuongTon ?? 99);

        if (viTri >= 0) {
          items[viTri].soLuong += soLuong;
          items[viTri].thanhTien = items[viTri].soLuong * donGia;
        } else {
          items.push({
            maSach: maSachSo,
            soLuong,
            donGia,
            thanhTien: donGia * soLuong,
            sach: {
              maSach: maSachSo,
              tenSach: book.tenSach || book.TenSach || 'Sách BookNest',
              anhBia: book.anhBia || book.AnhBia || null,
              tacGia: book.tacGia || book.TacGia || 'Đang cập nhật',
              giaBan: donGia,
              soLuongTon: tonKho
            }
          });
        }

        luuGuestCart(items);
        const tong = tinhTongGuest(items);
        set({ ...tong, daKhoiTao: true });
        return { thanhCong: true };
      } catch (err) {
        console.error('Lỗi thêm giỏ hàng khách vãng lai:', err);
        return { thanhCong: false, thongDiep: 'Không thể thêm sách vào giỏ hàng' };
      }
    }

    // --- Chế độ Customer (Gửi API Server) ---
    try {
      await api.post('/cart/items', { maSach: maSachSo, soLuong });
      await get().layGioHang();
      return { thanhCong: true };
    } catch (err) {
      // Nếu server từ chối vì token lỗi hoặc 403, fallback lưu vào localStorage
      if (err.response?.status === 401 || err.response?.status === 403) {
        console.warn('Lỗi xác thực giỏ hàng server, thêm dự phòng vào giỏ hàng khách vãng lai:', err.message);
        const items = docGuestCart();
        const viTri = items.findIndex(item => Number(item.maSach) === maSachSo);
        const donGia = Number(thongTinSach?.giaBan ?? thongTinSach?.GiaBan ?? 0);
        if (viTri >= 0) {
          items[viTri].soLuong += soLuong;
          items[viTri].thanhTien = items[viTri].soLuong * donGia;
        } else {
          items.push({
            maSach: maSachSo,
            soLuong,
            donGia,
            thanhTien: donGia * soLuong,
            sach: {
              maSach: maSachSo,
              tenSach: thongTinSach?.tenSach || thongTinSach?.TenSach || 'Sách BookNest',
              anhBia: thongTinSach?.anhBia || thongTinSach?.AnhBia || null,
              tacGia: thongTinSach?.tacGia || thongTinSach?.TacGia || 'Đang cập nhật',
              giaBan: donGia,
              soLuongTon: 99
            }
          });
        }
        luuGuestCart(items);
        const tong = tinhTongGuest(items);
        set({ ...tong, daKhoiTao: true });
        return { thanhCong: true };
      }
      const thongDiep = err.response?.data?.message || 'Lỗi khi thêm sách vào giỏ hàng';
      return { thanhCong: false, thongDiep };
    }
  },

  // 3. Cập nhật số lượng sách trong giỏ
  capNhatSoLuong: async (maSach, soLuong) => {
    if (soLuong < 1) return { thanhCong: false, thongDiep: 'Số lượng phải từ 1' };
    const maSachSo = Number(maSach);

    // --- Chế độ Guest ---
    if (!laKhachHangHopLe()) {
      const items = docGuestCart();
      const viTri = items.findIndex(item => Number(item.maSach) === maSachSo);
      if (viTri >= 0) {
        items[viTri].soLuong = soLuong;
        items[viTri].thanhTien = items[viTri].soLuong * items[viTri].donGia;
        luuGuestCart(items);
        const tong = tinhTongGuest(items);
        set(tong);
      }
      return { thanhCong: true };
    }

    // --- Chế độ Customer (Optimistic update) ---
    set({ dangCapNhat: true });
    const cacMonCu = get().cacMon;
    const gioHangCu = get().gioHang;
    const cacMonMoi = cacMonCu.map(mon => 
      Number(mon.maSach) === maSachSo ? { ...mon, soLuong, thanhTien: soLuong * (mon.donGia || 0) } : mon
    );
    const tongTienMoi = cacMonMoi.reduce((sum, mon) => sum + (mon.soLuong * (mon.donGia || 0)), 0);
    const tongSoLuongMoi = cacMonMoi.reduce((sum, mon) => sum + mon.soLuong, 0);

    const gioHangMoi = {
      ...(gioHangCu || {}),
      cacMon: cacMonMoi,
      tongTien: tongTienMoi,
      tongSoLuong: tongSoLuongMoi
    };

    set({
      gioHang: gioHangMoi,
      cacMon: cacMonMoi,
      tongTien: tongTienMoi,
      tongSoLuong: tongSoLuongMoi
    });

    try {
      const res = await api.put(`/cart/items/${maSachSo}`, { soLuong });
      const dataMoi = res.data?.data;
      if (dataMoi) {
        set({
          gioHang: dataMoi,
          cacMon: dataMoi.cacMon || cacMonMoi,
          tongTien: dataMoi.tongTien ?? tongTienMoi,
          tongSoLuong: dataMoi.tongSoLuong ?? tongSoLuongMoi,
          dangCapNhat: false
        });
      } else {
        set({ dangCapNhat: false });
      }
      return { thanhCong: true };
    } catch (err) {
      set({
        gioHang: gioHangCu,
        cacMon: cacMonCu,
        tongTien: cacMonCu.reduce((sum, mon) => sum + (mon.soLuong * (mon.donGia || 0)), 0),
        tongSoLuong: cacMonCu.reduce((sum, mon) => sum + mon.soLuong, 0),
        dangCapNhat: false
      });
      const thongDiep = (err.response?.status === 401 || err.response?.status === 403)
        ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để cập nhật giỏ hàng.'
        : (err.response?.data?.message || 'Lỗi khi cập nhật số lượng');
      return { thanhCong: false, thongDiep };
    }
  },

  // 4. Xóa một cuốn sách khỏi giỏ
  xoaMon: async (maSach) => {
    const maSachSo = Number(maSach);

    // --- Chế độ Guest ---
    if (!laKhachHangHopLe()) {
      const items = docGuestCart().filter(item => Number(item.maSach) !== maSachSo);
      luuGuestCart(items);
      const tong = tinhTongGuest(items);
      set(tong);
      return { thanhCong: true };
    }

    // --- Chế độ Customer ---
    try {
      await api.delete(`/cart/items/${maSachSo}`);
      await get().layGioHang();
      return { thanhCong: true };
    } catch (err) {
      const thongDiep = (err.response?.status === 401 || err.response?.status === 403)
        ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để xóa sản phẩm.'
        : (err.response?.data?.message || 'Lỗi khi xóa sản phẩm');
      return { thanhCong: false, thongDiep };
    }
  },

  // 5. Xóa sạch giỏ hàng
  xoaToanBoGio: async () => {
    // --- Chế độ Guest ---
    if (!laKhachHangHopLe()) {
      localStorage.removeItem(KEY_GUEST_CART);
      set({
        gioHang: null,
        cacMon: [],
        tongSoLuong: 0,
        tongTien: 0
      });
      return { thanhCong: true };
    }

    // --- Chế độ Customer ---
    try {
      await api.delete('/cart');
      set({
        gioHang: null,
        cacMon: [],
        tongSoLuong: 0,
        tongTien: 0
      });
      return { thanhCong: true };
    } catch (err) {
      const thongDiep = (err.response?.status === 401 || err.response?.status === 403)
        ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để dọn giỏ hàng.'
        : (err.response?.data?.message || 'Lỗi khi dọn giỏ hàng');
      return { thanhCong: false, thongDiep };
    }
  },

  // 6. Tự động đồng bộ giỏ hàng Guest lên Server khi đăng nhập (Merge Cart)
  dongBoGioHangGuestLenServer: async () => {
    const guestItems = docGuestCart();
    if (!guestItems || guestItems.length === 0) {
      await get().layGioHang();
      return;
    }

    try {
      // Đẩy từng món từ localStorage lên server
      for (const item of guestItems) {
        try {
          await api.post('/cart/items', {
            maSach: item.maSach,
            soLuong: item.soLuong
          });
        } catch (itemErr) {
          console.warn(`Lỗi đồng bộ món ${item.maSach} lên server:`, itemErr);
        }
      }
      // Dọn sạch guest cart sau khi đồng bộ
      localStorage.removeItem(KEY_GUEST_CART);
      // Nạp lại toàn bộ giỏ hàng mới nhất từ Server
      await get().layGioHang();
    } catch (err) {
      console.error('Lỗi quá trình đồng bộ giỏ hàng lên server:', err);
      await get().layGioHang();
    }
  },

  // 7. Xóa trắng state ở Client (khi đăng xuất hoặc sau khi đặt hàng thành công)
  xoaTrangState: () => {
    set({
      gioHang: null,
      cacMon: [],
      tongSoLuong: 0,
      tongTien: 0,
      loi: null,
      daKhoiTao: false
    });
  },

  // 8. Lắng nghe thay đổi giỏ hàng từ các Tab khác (Cross-Tab Synchronization)
  kichHoatLangNgheCrossTab: () => {
    if (typeof window === 'undefined') return;

    const xuLyThayDoiStorage = (e) => {
      // Chỉ xử lý khi thay đổi đúng key giỏ hàng khách vãng lai và không phải khách hàng đăng nhập
      if (e.key === KEY_GUEST_CART && !laKhachHangHopLe()) {
        const itemsMoi = docGuestCart();
        const tong = tinhTongGuest(itemsMoi);
        set({
          ...tong,
          daKhoiTao: true
        });
      }
    };

    window.addEventListener('storage', xuLyThayDoiStorage);
    return () => window.removeEventListener('storage', xuLyThayDoiStorage);
  }
}));

export default useCartStore;
