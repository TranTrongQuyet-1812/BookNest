import { create } from 'zustand';
import api from '../services/api';

const KEY_GUEST_CART = 'booknest_guest_cart';

// Đọc danh sách món của khách vãng lai từ localStorage
const docGuestCart = () => {
  try {
    const raw = localStorage.getItem(KEY_GUEST_CART);
    return raw ? JSON.parse(raw) : [];
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
 * 1. Khách vãng lai (Guest - Chưa đăng nhập): Lưu trữ trong Client localStorage (key: booknest_guest_cart).
 * 2. Khách hàng (Customer - Đã đăng nhập): Lưu trữ trên CSDL Server qua REST API.
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
    const token = localStorage.getItem('booknest_token');

    // Chế độ Guest: Đọc trực tiếp từ localStorage
    if (!token) {
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
      const msg = err.response?.data?.message || 'Không thể tải giỏ hàng';
      set({ loi: msg, dangTai: false, daKhoiTao: true });
      return null;
    }
  },

  // 2. Thêm sách vào giỏ
  themVaoGio: async (maSach, soLuong = 1, thongTinSach = null) => {
    const token = localStorage.getItem('booknest_token');

    // --- Chế độ Guest (Lưu Client localStorage) ---
    if (!token) {
      try {
        let book = thongTinSach;
        // Nếu chưa có sẵn thông tin sách, gọi API lấy thông tin sách
        if (!book) {
          const res = await api.get(`/books/${maSach}`);
          book = res.data.data;
        }

        const items = docGuestCart();
        const viTri = items.findIndex(item => item.maSach === maSach);
        const donGia = book.giaBan ?? book.GiaBan ?? 0;
        const tonKho = book.soLuongTon ?? book.SoLuongTon ?? 99;

        if (viTri >= 0) {
          items[viTri].soLuong += soLuong;
          items[viTri].thanhTien = items[viTri].soLuong * donGia;
        } else {
          items.push({
            maSach,
            soLuong,
            donGia,
            thanhTien: donGia * soLuong,
            sach: {
              maSach,
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
      await api.post('/cart/items', { maSach, soLuong });
      await get().layGioHang();
      return { thanhCong: true };
    } catch (err) {
      const thongDiep = err.response?.data?.message || 'Lỗi khi thêm sách vào giỏ hàng';
      return { thanhCong: false, thongDiep };
    }
  },

  // 3. Cập nhật số lượng sách trong giỏ
  capNhatSoLuong: async (maSach, soLuong) => {
    if (soLuong < 1) return { thanhCong: false, thongDiep: 'Số lượng phải từ 1' };
    const token = localStorage.getItem('booknest_token');

    // --- Chế độ Guest ---
    if (!token) {
      const items = docGuestCart();
      const viTri = items.findIndex(item => item.maSach === maSach);
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
    const cacMonMoi = cacMonCu.map(mon => 
      mon.maSach === maSach ? { ...mon, soLuong, thanhTien: soLuong * (mon.donGia || 0) } : mon
    );
    const tongTienMoi = cacMonMoi.reduce((sum, mon) => sum + (mon.soLuong * (mon.donGia || 0)), 0);
    const tongSoLuongMoi = cacMonMoi.reduce((sum, mon) => sum + mon.soLuong, 0);

    set({
      cacMon: cacMonMoi,
      tongTien: tongTienMoi,
      tongSoLuong: tongSoLuongMoi
    });

    try {
      await api.put(`/cart/items/${maSach}`, { soLuong });
      set({ dangCapNhat: false });
      return { thanhCong: true };
    } catch (err) {
      set({ cacMon: cacMonCu, dangCapNhat: false });
      const thongDiep = err.response?.data?.message || 'Lỗi khi cập nhật số lượng';
      return { thanhCong: false, thongDiep };
    }
  },

  // 4. Xóa một cuốn sách khỏi giỏ
  xoaMon: async (maSach) => {
    const token = localStorage.getItem('booknest_token');

    // --- Chế độ Guest ---
    if (!token) {
      const items = docGuestCart().filter(item => item.maSach !== maSach);
      luuGuestCart(items);
      const tong = tinhTongGuest(items);
      set(tong);
      return { thanhCong: true };
    }

    // --- Chế độ Customer ---
    try {
      await api.delete(`/cart/items/${maSach}`);
      await get().layGioHang();
      return { thanhCong: true };
    } catch (err) {
      const thongDiep = err.response?.data?.message || 'Lỗi khi xóa sản phẩm';
      return { thanhCong: false, thongDiep };
    }
  },

  // 5. Xóa sạch giỏ hàng
  xoaToanBoGio: async () => {
    const token = localStorage.getItem('booknest_token');

    // --- Chế độ Guest ---
    if (!token) {
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
      const thongDiep = err.response?.data?.message || 'Lỗi khi dọn giỏ hàng';
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
  }
}));

export default useCartStore;
