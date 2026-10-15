/**
 * Tầng Service điều phối AI Chatbot tư vấn cho BookNest (theo docs/KE_HOACH_AI_CHATBOT.md).
 * Tích hợp Function Calling với CSDL BookNest (tìm sách, kiểm kho, soạn đơn, tra cứu đơn).
 * Tối ưu hóa token và an toàn chỉ đọc dữ liệu.
 */
const { Op } = require('sequelize');
const { sequelize, Sach, DanhMuc, DonHang, ChiTietDonHang, LichSuTrangThaiDonHang, ThanhToan, NhatKyChatbot } = require('../models');
const { chuaTuKhoa, chuaTuKhoaLinhHoat, locTuKhoaThucSu, tinhDiemTrungKhop, boDauTiengViet } = require('../utils/timKiem');
const { goiNhaCungCapAI } = require('./trinhCungCapAI');
const { layNguCanhChinhSachChoAI } = require('./chinhSachService');
const cauHinhHeThongService = require('./cauHinhHeThongService');

// Trích xuất cuốn sách gần nhất mà AI đã hỏi hoặc gợi ý trong lịch sử chat
function trichXuatSachGanNhatTuLichSu(lichSuChat) {
  if (!Array.isArray(lichSuChat) || lichSuChat.length === 0) return null;
  for (let i = lichSuChat.length - 1; i >= 0; i--) {
    const msg = lichSuChat[i];
    if (msg && msg.role === 'assistant' && typeof msg.content === 'string') {
      const match = msg.content.match(/["“'‘]([^"”'’]+)["”'’]/);
      if (match && match[1] && match[1].length > 2) {
        return match[1].trim();
      }
    }
  }
  return null;
}

// Kiểm tra xem tin nhắn của khách có phải là câu xác nhận cho gợi ý trước không
function laCauXacNhan(noiDung) {
  if (!noiDung || typeof noiDung !== 'string') return false;
  const khongDau = boDauTiengViet(noiDung).toLowerCase().trim();
  const mauXacNhan = [
    /\b(dung|chinh la no|chinh no|chuang?|dung roi|dung vay|chinh xac|lay cuon|mua cuon|mua no|lay no|cho toi|cho minh|lay 1|cho 1|lay giup|cho e|cho anh|cho em|muon no)\b/i,
    /^(ok|oke|okay|vang|da|u|uh|uk|dung|chuan|chinh no|lay no)$/i,
    /^\s*\d+\s*(cuon|quyen|tap|ban)?\s*$/i,
    /\b(mua|lay|them)\s+\d+\s*(cuon|quyen)?\b/i
  ];
  return mauXacNhan.some(re => re.test(khongDau));
}

// Tạo Lời nhắc hệ thống (System Prompt) động theo vai trò khách hàng và ngữ cảnh sách đang trao đổi
function taoLoiNhacHeThong({ daDangNhap = false, tenKhachHang = '', maKhachHang = null, sachHienTai = null } = {}) {
  const thongTinKhach = daDangNhap
    ? `TRẠNG THÁI KHÁCH HÀNG: ĐÃ ĐĂNG NHẬP (Tài khoản: "${tenKhachHang || 'Quý khách'}"${maKhachHang ? `, ID #${maKhachHang}` : ''}).`
    : `TRẠNG THÁI KHÁCH HÀNG: Khách vãng lai (GUEST, CHƯA ĐĂNG NHẬP).`;

  const thongTinNguCanh = sachHienTai
    ? `\n*** QUY TẮC BẮT BUỘC VỀ NGỮ CẢNH ĐANG TRAO ĐỔI:
Cuốn sách đang được bạn và khách hàng trao đổi / hỏi xác nhận gần nhất trong cuộc trò chuyện là: "${sachHienTai}".
KHI KHÁCH HÀNG NÓI CÂU XÁC NHẬN HOẶC DÙNG ĐẠI TỪ THAY THẾ (ví dụ: "đúng rồi", "chính là nó", "tôi muốn mua nó", "chuẩn rồi", "lấy cuốn này", "lấy nó", "cho tôi 1 cuốn", "mua cuốn này"...):
- BẠN PHẢI HIỂU RÕ khách hàng đang đồng ý mua cuốn sách "${sachHienTai}"!
- CẤM TUYỆT ĐỐI gọi công cụ "tim_sach" với từ khóa "nó" hay "chính là nó"!
${daDangNhap
  ? `- VÌ ĐÂY LÀ KHÁCH ĐÃ ĐĂNG NHẬP (USER): Bạn hãy gọi NGAY công cụ "them_vao_gio_hang" cho cuốn "${sachHienTai}" (số lượng mặc định là 1 nếu khách không nói số khác, ví dụ khách nói "tôi muốn mua nó" -> số lượng: 1) để hệ thống tự động thêm sách vào giỏ và chuyển khách sang giỏ hàng!`
  : `- VÌ ĐÂY LÀ KHÁCH VÃNG LAI (GUEST, CHƯA ĐĂNG NHẬP): Khách vãng lai hoàn toàn có thể mua hàng trực tiếp mà không cần đăng nhập! Bạn TUYỆT ĐỐI KHÔNG được từ chối vì chưa đăng nhập, mà PHẢI in NGAY mẫu thông tin nhận hàng dưới đây để khách điền theo:
"Dạ tuyệt vời ạ! Để BookNest hỗ trợ lên đơn giao cuốn sách '${sachHienTai}' tận nơi cho bạn, bạn vui lòng gửi giúp tôi các thông tin nhận hàng sau nhé:
- Số lượng cuốn muốn mua: (ví dụ: 1 cuốn)
- Họ và tên người nhận: 
- Số điện thoại nhận hàng: 
- Địa chỉ giao hàng: (Số nhà, tên đường, Phường/Xã, Quận/Huyện, Tỉnh/Thành phố)
- Email (để nhận hóa đơn & mã đơn hàng):"`
}***\n`
    : '';

  return `Bạn là BookNest AI - trợ lý tư vấn nhà sách trực tuyến BookNest (đồ án sinh viên trường Đại Học Lạc Hồng do Trần Trọng Quyết phát triển).
Nhiệm vụ của bạn là hỗ trợ khách hàng tìm kiếm sách, kiểm tra tồn kho, giải đáp chính sách và hỗ trợ mua sách.

${thongTinKhach}
${thongTinNguCanh}
Quy tắc ứng xử cốt lõi:
1. Luôn giao tiếp bằng tiếng Việt tự nhiên, thân thiện, lễ phép và lịch sự.
2. Khi khách hàng chỉ chào hỏi xã giao (ví dụ: "chào bạn", "hello", "hi", "bạn là ai", "chào shop"...), hãy chào lại niềm nở và hỏi khách cần tìm sách hay kiểm tra đơn hàng gì, TUYỆT ĐỐI KHÔNG gọi bất kỳ công cụ tìm kiếm nào.
3. Bạn CHỈ tư vấn về sách, đơn hàng, hướng dẫn mua sắm và chính sách của nhà sách BookNest. Với các chủ đề ngoài luồng (lập trình, giải toán, chính trị, tâm sự đời sống...), hãy từ chối lịch sự và hướng khách hàng về việc đọc sách.
4. QUY TẮC BẮT BUỘC KHI TÌM KIẾM & MUA SÁCH (KỂ CẢ KHI NGHI NGỜ / SAI CHÍNH TẢ / KHÔNG DẤU / GÕ MỘT NỬA TÊN):
   - BẮT BUỘC GỌI CÔNG CỤ: Khi khách hàng nhắc đến tên sách, tác giả, hoặc muốn mua bất kỳ cuốn sách nào, BẠN BẮT BUỘC PHẢI GỌI CÔNG CỤ "tim_sach" TRƯỚC TIÊN. TUYỆT ĐỐI KHÔNG tự ý trả lời trực tiếp hoặc tự bịa ra thông tin sách khi chưa gọi công cụ tim_sach.
   - KHI CÔNG CỤ tim_sach TRẢ VỀ KẾT QUẢ GỢI Ý (khi canXacNhan = true, hoặc tên sách không khớp 100% từng chữ với câu của khách):
     + BẠN PHẢI DÙNG CHÍNH XÁC TÊN SÁCH, TÁC GIẢ VÀ GIÁ BÁN TỪ KẾT QUẢ CÔNG CỤ ĐỂ HỎI XÁC NHẬN VỚI KHÁCH:
       "Dạ, có phải bạn đang muốn tìm cuốn sách '[Tên sách từ công cụ]' của tác giả [Tác giả từ công cụ], giá [Giá bán từ công cụ]đ không ạ?"
       (Ví dụ cụ thể: "Dạ, có phải bạn đang muốn tìm cuốn sách 'Vòng quanh thế giới - Israel' của tác giả Nguyễn Hào Tuấn Huỳnh, giá 12.000đ không ạ?")
     + TUYỆT ĐỐI KHÔNG in dấu ba chấm (...), không in "Tác giả: ...", "Giá: ...đ" hay "Đang cập nhật" nếu công cụ đã trả về thông tin thật!
     + TUYỆT ĐỐI KHÔNG tự tiện thêm sách vào giỏ hàng ngay lúc này khi khách chưa xác nhận!
     + TUYỆT ĐỐI KHÔNG bảo là "không tìm thấy" khi kho đã tìm ra cuốn sách gợi ý phù hợp nhất!
   - CHỈ KHI khách hàng đã xác nhận đúng cuốn sách (ví dụ: "đúng rồi", "chuẩn rồi", "lấy tôi cuốn đó", hoặc khách trả lời số lượng sau câu hỏi xác nhận), bạn mới gọi công cụ them_vao_gio_hang (nếu là User) hoặc in mẫu thông tin nhận hàng (nếu là Guest).
5. QUY TẮC MUA SÁCH (CHỐT ĐƠN / THÊM GIỎ HÀNG) - PHÂN BIỆT THEO ĐỐI TƯỢNG KHÁCH:
   a) ĐỐI VỚI KHÁCH VÃNG LAI (GUEST - CHƯA ĐĂNG NHẬP):
      - Khi khách muốn mua sách mà chưa cung cấp thông tin nhận hàng, bạn PHẢI in ra ngay mẫu thông tin nhận hàng chi tiết và rõ ràng để khách nhìn theo đó mà điền:
        "Dạ, để BookNest hỗ trợ lên đơn giao sách tận nơi cho bạn, bạn vui lòng gửi giúp tôi các thông tin nhận hàng sau nhé:
        - Số lượng cuốn muốn mua: (ví dụ: 1 cuốn)
        - Họ và tên người nhận: 
        - Số điện thoại nhận hàng: 
        - Địa chỉ giao hàng: (Số nhà, tên đường, Phường/Xã, Quận/Huyện, Tỉnh/Thành phố)
        - Email (để nhận hóa đơn & mã đơn hàng): "
      - Khi khách đã cung cấp các thông tin trên, hãy gọi công cụ "soan_thong_tin_thanh_toan" để hệ thống tạo bản nháp chuyển sang trang thanh toán.
   b) ĐỐI VỚI KHÁCH HÀNG ĐÃ ĐĂNG NHẬP (USER):
      - Khách đã có tài khoản trong hệ thống nên TUYỆT ĐỐI KHÔNG hỏi họ tên, số điện thoại hay địa chỉ nhận hàng của khách!
      - Bạn CHỈ cần hỏi số lượng sách khách muốn mua (nếu khách chưa nói rõ số lượng): "Dạ, bạn muốn mua bao nhiêu cuốn sách này để tôi thêm vào giỏ hàng cho bạn ạ?".
      - Ngay khi khách đã nói rõ số lượng và đã xác nhận đúng sách (hoặc nếu khách đã nói tên sách chính xác 100% kèm số lượng ngay từ đầu, ví dụ: "cho tôi 2 cuốn sách X"), bạn hãy gọi NGAY công cụ "them_vao_gio_hang" để hệ thống tự động thêm sách vào giỏ và đưa khách vào trang giỏ hàng.
6. Khi khách hỏi về đơn hàng, hãy nhắc khách cung cấp mã tra cứu dạng "BN-XXXXXX" (ví dụ: BN-7K3F9Q) rồi gọi công cụ "tra_cuu_don_hang".
7. ${layNguCanhChinhSachChoAI()}
8. ĐỊNH DẠNG TRẢ LỜI: Luôn trả lời trực tiếp bằng văn bản thuần túy (plain text tiếng Việt). Tuyệt đối KHÔNG xuất câu trả lời dưới dạng JSON {"type": "text", "text": "..."} hay bất kỳ cú pháp bao bọc nào.`;
}

// Giữ lại hằng số LOI_NHAC_HE_THONG để đảm bảo tương thích 100% với các module khác
const LOI_NHAC_HE_THONG = taoLoiNhacHeThong({});

// Danh sách công cụ (Tools) định nghĩa theo chuẩn OpenAPI
const DANH_SACH_CONG_CU = [
  {
    type: 'function',
    function: {
      name: 'tim_sach',
      description: 'BẮT BUỘC GỌI CÔNG CỤ NÀY khi khách hàng nhắc đến tên sách, tác giả, thể loại, hoặc muốn tìm kiếm hay mua bất kỳ cuốn sách nào (kể cả khi gõ không dấu, viết tắt, gõ sai chính tả hay chỉ gõ một nửa tên sách). Công cụ sẽ trả về tên sách chuẩn, tác giả, giá bán và mã sách trong kho. KHÔNG gọi khi khách chỉ chào hỏi xã giao.',
      parameters: {
        type: 'object',
        properties: {
          tu_khoa: {
            type: 'string',
            description: 'Tên cuốn sách hoặc tên tác giả cần tìm'
          },
          the_loai: {
            type: 'string',
            description: 'Tên thể loại hoặc danh mục sách (ví dụ: Văn học, Kinh tế, Kỹ năng sống, Công nghệ thông tin...)'
          },
          gia_toi_da: {
            type: 'number',
            description: 'Mức giá tối đa mà khách hàng mong muốn (VNĐ)'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'kiem_tra_ton_kho',
      description: 'Kiểm tra số lượng tồn kho thực tế và giá bán chính xác của một cuốn sách bằng mã sách hoặc tên sách.',
      parameters: {
        type: 'object',
        properties: {
          ma_sach: {
            type: 'number',
            description: 'Mã số ID của cuốn sách (nếu biết)'
          },
          ten_sach: {
            type: 'string',
            description: 'Tên cuốn sách cần kiểm tra'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'soan_thong_tin_thanh_toan',
      description: 'Chuẩn bị thông tin bản nháp thanh toán khi khách đồng ý mua sách để khách mở trang thanh toán /checkout.',
      parameters: {
        type: 'object',
        properties: {
          danh_sach_sach: {
            type: 'array',
            description: 'Danh sách các sách khách muốn mua',
            items: {
              type: 'object',
              properties: {
                ma_sach: { type: 'number', description: 'Mã sách ID' },
                so_luong: { type: 'number', description: 'Số lượng cuốn muốn mua (mặc định 1)' }
              },
              required: ['ma_sach']
            }
          },
          ten_nguoi_nhan: { type: 'string', description: 'Họ tên người nhận hàng' },
          so_dien_thoai: { type: 'string', description: 'Số điện thoại nhận hàng' },
          dia_chi_giao_hang: { type: 'string', description: 'Địa chỉ nhận hàng chi tiết' },
          email: { type: 'string', description: 'Email nhận thông báo đơn hàng' }
        },
        required: ['danh_sach_sach']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'them_vao_gio_hang',
      description: 'CHỈ gọi khi khách hàng ĐÃ ĐĂNG NHẬP (USER) muốn mua sách và đã biết số lượng: Thêm sách trực tiếp vào giỏ hàng và chuyển hướng sang trang giỏ hàng /cart.',
      parameters: {
        type: 'object',
        properties: {
          ma_sach: {
            type: 'number',
            description: 'Mã số ID của cuốn sách cần thêm vào giỏ'
          },
          ten_sach: {
            type: 'string',
            description: 'Tên cuốn sách'
          },
          so_luong: {
            type: 'number',
            description: 'Số lượng cuốn muốn thêm vào giỏ (mặc định 1)'
          }
        },
        required: ['ma_sach']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'tra_cuu_don_hang',
      description: 'Tra cứu tình trạng vận chuyển của đơn hàng bằng mã định danh công khai BN-XXXXXX (hoặc đơn gần đây của khách đã đăng nhập).',
      parameters: {
        type: 'object',
        properties: {
          ma_tra_cuu: {
            type: 'string',
            description: 'Mã tra cứu công khai của đơn hàng (định dạng BN-XXXXXX, ví dụ BN-7K3F9Q)'
          }
        }
      }
    }
  }
];

/**
 * Tìm sách theo điểm khớp token (Fuzzy Token Score Matching)
 * Cứu cánh khi khách gõ sai chính tả (ví dụ "quang" thay vì "quanh", hoặc AI trích xuất méo dấu)
 */
async function timSachMoDiem(chuoiTimKiem, { limit = 5, whereThem = {}, includeDanhMuc = true } = {}) {
  const tokens = locTuKhoaThucSu(chuoiTimKiem);
  if (tokens.length === 0) return [];

  const includeOptions = includeDanhMuc ? [{
    model: DanhMuc,
    as: 'danhMuc',
    attributes: ['MaDanhMuc', 'TenDanhMuc']
  }] : [];

  const danhSachUngVien = await Sach.findAll({
    where: {
      DaAn: false,
      ...whereThem,
      [Op.or]: tokens.map(t => chuaTuKhoa('[Sach].[TenSach]', t))
    },
    include: includeOptions,
    attributes: ['MaSach', 'TenSach', 'TacGia', 'GiaBan', 'SoLuongTon', 'AnhBia', 'MoTa']
  });

  const danhSachCoDiem = danhSachUngVien.map(s => {
    const diem = tinhDiemTrungKhop(s.TenSach, tokens) * 2 + tinhDiemTrungKhop(s.TacGia, tokens);
    return { sach: s, diem };
  });

  danhSachCoDiem.sort((a, b) => b.diem - a.diem);
  const diemCaoNhat = danhSachCoDiem[0]?.diem || 0;
  const mucDiemToiThieu = tokens.length === 1 ? 1 : Math.max(2, diemCaoNhat - 2);
  return danhSachCoDiem
    .filter(item => item.diem >= mucDiemToiThieu)
    .slice(0, limit)
    .map(item => item.sach);
}

/**
 * Thực thi công cụ tìm sách trong CSDL
 */
async function thucThiTimSach({ tu_khoa, the_loai, gia_toi_da }, tinNhanGoc = '', sachHienTai = null) {
  try {
    const dieuKien = { DaAn: false };
    const chuoiTim = (tu_khoa && tu_khoa.trim()) ? tu_khoa.trim() : (tinNhanGoc || '').trim();

    // Nếu chuỗi tìm kiếm chỉ toàn từ dừng / đại từ ("nó", "đúng rồi chính là nó", "mua nó")
    const tokensTuKhoa = locTuKhoaThucSu(chuoiTim);
    if (tokensTuKhoa.length === 0) {
      if (sachHienTai) {
        const sach = await Sach.findOne({
          where: [
            { DaAn: false },
            chuaTuKhoaLinhHoat('[Sach].[TenSach]', sachHienTai)
          ],
          include: [{ model: DanhMuc, as: 'danhMuc', attributes: ['MaDanhMuc', 'TenDanhMuc'] }]
        });
        if (sach) {
          return {
            timThay: true,
            soLuong: 1,
            khopChinhXac: true,
            canXacNhan: false,
            cuonGoiY: sach.TenSach,
            thongDiep: `Khách hàng đang xác nhận cuốn sách "${sach.TenSach}".`,
            danhSach: [{
              maSach: sach.MaSach,
              tenSach: sach.TenSach,
              tacGia: sach.TacGia,
              giaBan: sach.GiaBan,
              conHang: sach.SoLuongTon > 0,
              soLuongTon: sach.SoLuongTon,
              theLoai: sach.danhMuc?.TenDanhMuc || 'Khác',
              hinhAnh: sach.AnhBia,
              moTaNgan: sach.MoTa ? sach.MoTa.substring(0, 100) + '...' : ''
            }]
          };
        }
      }
      return { timThay: false, thongDiep: 'Vui lòng cung cấp tên cuốn sách hoặc tác giả bạn muốn tìm nhé.' };
    }

    const boLocGia = (gia_toi_da && Number(gia_toi_da) > 0) ? { GiaBan: { [Op.lte]: Number(gia_toi_da) } } : {};

    const includeOptions = [{
      model: DanhMuc,
      as: 'danhMuc',
      attributes: ['MaDanhMuc', 'TenDanhMuc']
    }];

    if (the_loai && the_loai.trim()) {
      includeOptions[0].where = chuaTuKhoa('[danhMuc].[TenDanhMuc]', the_loai.trim());
    }

    let danhSach = [];

    // 1. Tìm chính xác qua Tokenized AND với tu_khoa (nếu AI truyền đúng)
    if (tu_khoa && tu_khoa.trim()) {
      danhSach = await Sach.findAll({
        where: {
          ...dieuKien,
          ...boLocGia,
          [Op.or]: [
            chuaTuKhoaLinhHoat('[Sach].[TenSach]', tu_khoa.trim()),
            chuaTuKhoaLinhHoat('[Sach].[TacGia]', tu_khoa.trim())
          ]
        },
        include: includeOptions,
        limit: 5,
        order: [['NgayTao', 'DESC']],
        attributes: ['MaSach', 'TenSach', 'TacGia', 'GiaBan', 'SoLuongTon', 'AnhBia', 'MoTa']
      });
    }

    // 2. Nếu tu_khoa không khớp chính xác, ƯU TIÊN tìm mờ theo tinNhanGoc của người dùng
    // (Bảo vệ chống hiện tượng LLM trích xuất méo ký tự tiếng Việt)
    if (danhSach.length === 0 && tinNhanGoc && tinNhanGoc.trim()) {
      danhSach = await timSachMoDiem(tinNhanGoc.trim(), { limit: 5, whereThem: boLocGia });
    }

    // 3. Nếu tinNhanGoc vẫn chưa ra, mới tìm mờ theo tu_khoa của AI
    if (danhSach.length === 0 && tu_khoa && tu_khoa.trim()) {
      danhSach = await timSachMoDiem(tu_khoa.trim(), { limit: 5, whereThem: boLocGia });
    }

    if (danhSach.length === 0) {
      return { timThay: false, thongDiep: 'Không tìm thấy cuốn sách nào phù hợp với yêu cầu trong kho.' };
    }

    // Kiểm tra xem câu của khách có chứa trọn vẹn tên sách không (để phân biệt khớp chính xác vs khớp nghi ngờ)
    const tenSachDauKhongDau = boDauTiengViet(danhSach[0].TenSach).toLowerCase().replace(/[^a-z0-9]/g, '');
    const cauKhachKhongDau = boDauTiengViet(tinNhanGoc || tu_khoa || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const khopChinhXac = cauKhachKhongDau.includes(tenSachDauKhongDau);
    const canXacNhan = !khopChinhXac;

    const giaFmt = new Intl.NumberFormat('vi-VN').format(danhSach[0].GiaBan);
    const tacGiaFmt = danhSach[0].TacGia || 'Đang cập nhật';
    const thongDiep = canXacNhan
      ? `GỢI Ý TÌM KIẾM GẦN ĐÚNG: Tìm thấy cuốn sách phù hợp nhất là "${danhSach[0].TenSach}" (Tác giả: ${tacGiaFmt}, Giá: ${giaFmt}đ). Vì khách hàng gõ sai chính tả, không dấu hoặc chỉ gõ một phần tên, BẠN PHẢI HỎI XÁC NHẬN VỚI KHÁCH BẰNG CÂU: "Dạ, có phải bạn đang muốn tìm cuốn sách '${danhSach[0].TenSach}' (Tác giả: ${tacGiaFmt}, Giá: ${giaFmt}đ) không ạ?" trước khi thêm vào giỏ hoặc lên đơn.`
      : `Đã tìm thấy chính xác cuốn sách: "${danhSach[0].TenSach}" (Tác giả: ${tacGiaFmt}, Giá: ${giaFmt}đ).`;

    return {
      timThay: true,
      soLuong: danhSach.length,
      khopChinhXac,
      canXacNhan,
      cuonGoiY: danhSach[0].TenSach,
      thongDiep,
      danhSach: danhSach.map(s => ({
        maSach: s.MaSach,
        tenSach: s.TenSach,
        tacGia: s.TacGia,
        giaBan: s.GiaBan,
        conHang: s.SoLuongTon > 0,
        soLuongTon: s.SoLuongTon,
        theLoai: s.danhMuc?.TenDanhMuc || 'Khác',
        hinhAnh: s.AnhBia,
        moTaNgan: s.MoTa ? s.MoTa.substring(0, 100) + '...' : ''
      }))
    };
  } catch (err) {
    return { timThay: false, loi: 'Lỗi tra cứu dữ liệu sách: ' + err.message };
  }
}

/**
 * Thực thi công cụ kiểm tra tồn kho
 */
async function thucThiKiemTraTonKho({ ma_sach, ten_sach }, tinNhanGoc = '') {
  try {
    let sach = null;
    if (ma_sach && Number(ma_sach) > 0) {
      sach = await Sach.findOne({
        where: { MaSach: Number(ma_sach), DaAn: false },
        include: [{ model: DanhMuc, as: 'danhMuc', attributes: ['TenDanhMuc'] }]
      });
    } else if (ten_sach && ten_sach.trim()) {
      sach = await Sach.findOne({
        where: [
          { DaAn: false },
          chuaTuKhoaLinhHoat('[Sach].[TenSach]', ten_sach.trim())
        ],
        include: [{ model: DanhMuc, as: 'danhMuc', attributes: ['TenDanhMuc'] }]
      });
    }

    // Fallback tìm kiếm mờ theo điểm token nếu chưa thấy
    if (!sach && tinNhanGoc && tinNhanGoc.trim()) {
      const ketQuaMoTinGoc = await timSachMoDiem(tinNhanGoc.trim(), { limit: 1 });
      if (ketQuaMoTinGoc.length > 0) sach = ketQuaMoTinGoc[0];
    }
    if (!sach && ten_sach && ten_sach.trim()) {
      const ketQuaMo = await timSachMoDiem(ten_sach.trim(), { limit: 1 });
      if (ketQuaMo.length > 0) sach = ketQuaMo[0];
    }

    if (!sach) {
      return { tonTai: false, thongDiep: 'Không tìm thấy thông tin cuốn sách này trong kho.' };
    }

    return {
      tonTai: true,
      maSach: sach.MaSach,
      tenSach: sach.TenSach,
      giaBan: sach.GiaBan,
      soLuongTon: sach.SoLuongTon,
      conHang: sach.SoLuongTon > 0,
      trangThaiKho: sach.SoLuongTon > 10 ? 'Còn nhiều hàng' : (sach.SoLuongTon > 0 ? `Chỉ còn ${sach.SoLuongTon} cuốn` : 'Tạm hết hàng')
    };
  } catch (err) {
    return { tonTai: false, loi: 'Lỗi kiểm tra kho: ' + err.message };
  }
}

/**
 * Thực thi soạn thông tin thanh toán (bản nháp)
 */
async function thucThiSoanThanhToan({ danh_sach_sach, ten_nguoi_nhan, so_dien_thoai, dia_chi_giao_hang, email }, tinNhanGoc = '', sachHienTai = null) {
  try {
    let danhSach = danh_sach_sach;
    if (typeof danhSach === 'string') {
      try {
        danhSach = JSON.parse(danhSach);
      } catch (e) {
        danhSach = [];
      }
    }
    if ((!Array.isArray(danhSach) || danhSach.length === 0) && sachHienTai) {
      danhSach = [{ ten_sach: sachHienTai, so_luong: 1 }];
    }
    if (!Array.isArray(danhSach) || danhSach.length === 0) {
      return { hopLe: false, thongDiep: 'Danh sách sách đặt mua không được để trống.' };
    }

    const itemsThanhToan = [];
    let tamTinh = 0;

    for (const item of danhSach) {
      const maSach = Number(item.ma_sach);
      const soLuong = Math.max(1, Number(item.so_luong) || 1);
      let sach = null;
      let laKhopChinhXac = false;

      let tenSachItem = (item.ten_sach && String(item.ten_sach).trim()) ? String(item.ten_sach).trim() : '';
      if ((!tenSachItem || ['no', 'chinh la no', 'chinh no', 'cuon nay', 'cuon do'].includes(boDauTiengViet(tenSachItem).toLowerCase())) && sachHienTai) {
        tenSachItem = sachHienTai;
        laKhopChinhXac = true;
      }

      if (maSach > 0) {
        sach = await Sach.findOne({ where: { MaSach: maSach, DaAn: false } });
        if (sach) laKhopChinhXac = true;
      }
      // Fallback nếu mã sách không tồn tại nhưng có sachHienTai
      if (!sach && sachHienTai) {
        sach = await Sach.findOne({
          where: [
            { DaAn: false },
            chuaTuKhoaLinhHoat('[Sach].[TenSach]', sachHienTai)
          ]
        });
        if (sach) laKhopChinhXac = true;
      }
      if (!sach && tenSachItem) {
        sach = await Sach.findOne({
          where: [
            { DaAn: false },
            chuaTuKhoaLinhHoat('[Sach].[TenSach]', tenSachItem)
          ]
        });
        if (sach) {
          if (sachHienTai && sach.TenSach.toLowerCase() === sachHienTai.toLowerCase()) {
            laKhopChinhXac = true;
          } else {
            const tenSachKhongDau = boDauTiengViet(sach.TenSach).toLowerCase().replace(/[^a-z0-9]/g, '');
            const cauKhachKhongDau = boDauTiengViet(tinNhanGoc || tenSachItem || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            laKhopChinhXac = cauKhachKhongDau.includes(tenSachKhongDau);
          }
        }
      }

      // Fallback mờ theo điểm token
      if (!sach && tinNhanGoc && tinNhanGoc.trim()) {
        const ketQuaMo = await timSachMoDiem(tinNhanGoc.trim(), { limit: 1, includeDanhMuc: false });
        if (ketQuaMo.length > 0) {
          sach = ketQuaMo[0];
          laKhopChinhXac = false;
        }
      }
      if (!sach && tenSachItem) {
        const ketQuaMo = await timSachMoDiem(tenSachItem, { limit: 1, includeDanhMuc: false });
        if (ketQuaMo.length > 0) {
          sach = ketQuaMo[0];
          laKhopChinhXac = false;
        }
      }

      if (!sach) {
        return { hopLe: false, thongDiep: `Không tìm thấy sách ${item.ten_sach ? `"${item.ten_sach}"` : `#${maSach}`} trong hệ thống.` };
      }

      // Nếu tên sách chỉ là gợi ý hoặc nghi ngờ: BẮT BUỘC hỏi xác nhận lại với khách trước khi soạn đơn
      if (!laKhopChinhXac) {
        return {
          hopLe: false,
          canXacNhan: true,
          cuonGoiY: sach.TenSach,
          maSach: sach.MaSach,
          thongDiep: `Chưa thể soạn đơn vì tựa sách bạn yêu cầu chỉ khớp gần đúng với cuốn "${sach.TenSach}". Bạn PHẢI in ra để hỏi xác nhận lại với khách hàng: "Dạ, có phải bạn đang muốn tìm cuốn sách '${sach.TenSach}' không ạ?" trước khi lên đơn.`
        };
      }

      if (sach.SoLuongTon < soLuong) {
        return {
          hopLe: false,
          thongDiep: `Sách "${sach.TenSach}" hiện chỉ còn ${sach.SoLuongTon} cuốn trong kho, không đủ số lượng ${soLuong} cuốn bạn yêu cầu.`
        };
      }

      const thanhTien = sach.GiaBan * soLuong;
      tamTinh += thanhTien;

      itemsThanhToan.push({
        maSach: sach.MaSach,
        tenSach: sach.TenSach,
        hinhAnh: sach.AnhBia,
        giaBan: sach.GiaBan,
        soLuong,
        thanhTien
      });
    }

    // Nếu khách vãng lai (Guest) chưa cung cấp thông tin người nhận: In ngay form mẫu nhận hàng
    const coThongTinNhan = Boolean(
      (ten_nguoi_nhan && String(ten_nguoi_nhan).trim()) ||
      (so_dien_thoai && String(so_dien_thoai).trim()) ||
      (dia_chi_giao_hang && String(dia_chi_giao_hang).trim())
    );

    if (!coThongTinNhan) {
      const sachDau = itemsThanhToan[0];
      const tenSachHienThi = sachDau ? sachDau.tenSach : (sachHienTai || 'sách');
      const giaBanHienThi = sachDau ? sachDau.giaBan.toLocaleString('vi-VN') + 'đ' : '';
      return {
        hopLe: false,
        canDienThongTin: true,
        maSach: sachDau ? sachDau.maSach : 0,
        tenSach: tenSachHienThi,
        giaBan: sachDau ? sachDau.giaBan : 0,
        hinhAnh: sachDau ? sachDau.hinhAnh : null,
        thongDiep: `Dạ tuyệt vời ạ! Để BookNest hỗ trợ lên đơn giao cuốn sách "${tenSachHienThi}"${giaBanHienThi ? ` (Giá: ${giaBanHienThi})` : ''} tận nơi cho bạn, bạn vui lòng gửi giúp tôi các thông tin nhận hàng sau nhé:\n- Số lượng cuốn muốn mua: (ví dụ: 1 cuốn)\n- Họ và tên người nhận: \n- Số điện thoại nhận hàng: \n- Địa chỉ giao hàng: (Số nhà, tên đường, Phường/Xã, Quận/Huyện, Tỉnh/Thành phố)\n- Email (để nhận hóa đơn & mã đơn hàng): `
      };
    }

    // Chính sách BookNest: Miễn phí vận chuyển cho 100% mọi đơn hàng (0đ)
    const phiVanChuyen = 0;
    const tongTien = tamTinh;

    return {
      hopLe: true,
      banNhapThanhToan: {
        danhSachMon: itemsThanhToan,
        tamTinh,
        phiVanChuyen,
        tongTien,
        mienPhiShip: true,
        thongTinNhanHang: {
          tenNguoiNhan: ten_nguoi_nhan || '',
          soDienThoai: so_dien_thoai || '',
          diaChiGiaoHang: dia_chi_giao_hang || '',
          email: email || ''
        }
      }
    };
  } catch (err) {
    return { hopLe: false, loi: 'Lỗi soạn thông tin thanh toán: ' + err.message };
  }
}

/**
 * Thực thi công cụ thêm vào giỏ hàng (dành cho User đã đăng nhập)
 */
async function thucThiThemVaoGioHang({ ma_sach, ten_sach, so_luong = 1 }, tinNhanGoc = '', sachHienTai = null) {
  try {
    let sach = null;
    let laKhopChinhXac = false;

    let tenSachTim = (ten_sach && ten_sach.trim()) ? ten_sach.trim() : '';
    if ((!tenSachTim || ['no', 'chinh la no', 'chinh no', 'cuon nay', 'cuon do'].includes(boDauTiengViet(tenSachTim).toLowerCase())) && sachHienTai) {
      tenSachTim = sachHienTai;
    }

    if (ma_sach && Number(ma_sach) > 0) {
      sach = await Sach.findOne({ where: { MaSach: Number(ma_sach), DaAn: false } });
    }
    // Fallback nếu mã sách không tồn tại trong CSDL nhưng có sachHienTai
    if (!sach && sachHienTai) {
      sach = await Sach.findOne({
        where: [
          { DaAn: false },
          chuaTuKhoaLinhHoat('[Sach].[TenSach]', sachHienTai)
        ]
      });
    }
    if (!sach && tenSachTim) {
      sach = await Sach.findOne({
        where: [
          { DaAn: false },
          chuaTuKhoaLinhHoat('[Sach].[TenSach]', tenSachTim)
        ]
      });
    }

    // Fallback tìm kiếm mờ theo điểm token nếu chưa thấy
    if (!sach && tinNhanGoc && tinNhanGoc.trim()) {
      const ketQuaMoTinGoc = await timSachMoDiem(tinNhanGoc.trim(), { limit: 1, includeDanhMuc: false });
      if (ketQuaMoTinGoc.length > 0) {
        sach = ketQuaMoTinGoc[0];
      }
    }
    if (!sach && tenSachTim) {
      const ketQuaMo = await timSachMoDiem(tenSachTim, { limit: 1, includeDanhMuc: false });
      if (ketQuaMo.length > 0) {
        sach = ketQuaMo[0];
      }
    }

    if (!sach) {
      return { thanhCong: false, thongDiep: 'Không tìm thấy cuốn sách này trong kho để thêm vào giỏ hàng.' };
    }

    // SERVER CONFIRMATION GUARD (Chốt chặn xác minh ở tầng server):
    // Chỉ đánh dấu laKhopChinhXac nếu:
    // 1. Tin nhắn của khách bao hàm trọn vẹn tên sách chuẩn (ví dụ: "cho tôi mua 2 cuốn Vòng quanh thế giới - Israel"),
    // 2. HOẶC sách này chính là cuốn sách đang trao đổi (sachHienTai) VÀ tin nhắn của khách là câu xác nhận ("đúng rồi", "lấy cuốn đó", "2 cuốn").
    // Tuyệt đối không cho phép AI tự ý gọi thêm giỏ khi khách chưa hề xác nhận!
    const tenSachKhongDau = boDauTiengViet(sach.TenSach).toLowerCase().replace(/[^a-z0-9]/g, '');
    const cauKhachKhongDau = boDauTiengViet(tinNhanGoc || tenSachTim || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const daKhopTenTronVen = cauKhachKhongDau.includes(tenSachKhongDau);
    const laXacNhanSachHienTai = sachHienTai &&
      (sach.TenSach.toLowerCase() === sachHienTai.toLowerCase() ||
       boDauTiengViet(sach.TenSach).toLowerCase().includes(boDauTiengViet(sachHienTai).toLowerCase())) &&
      laCauXacNhan(tinNhanGoc);

    laKhopChinhXac = daKhopTenTronVen || Boolean(laXacNhanSachHienTai);

    // Nếu tên sách chỉ là gợi ý hoặc nghi ngờ (khách gõ sai chính tả, không dấu hoặc chỉ gõ một nửa tên)
    // TUYỆT ĐỐI KHÔNG tự tiện thêm vào giỏ hàng ngay mà phải ép AI hỏi xác nhận lại với khách!
    if (!laKhopChinhXac) {
      return {
        thanhCong: false,
        canXacNhan: true,
        cuonGoiY: sach.TenSach,
        maSach: sach.MaSach,
        giaBan: sach.GiaBan,
        thongDiep: `Chưa thể thêm vào giỏ hàng vì tựa sách bạn yêu cầu chỉ khớp gần đúng với cuốn "${sach.TenSach}" (Giá: ${sach.GiaBan}đ). Bạn PHẢI in ra câu hỏi xác nhận lại với khách hàng: "Dạ, có phải bạn đang muốn tìm cuốn sách '${sach.TenSach}' không ạ?" trước khi thêm vào giỏ.`
      };
    }

    const soLuongMua = Math.max(1, Number(so_luong) || 1);
    if (sach.SoLuongTon < soLuongMua) {
      return {
        thanhCong: false,
        thongDiep: `Sách "${sach.TenSach}" hiện chỉ còn ${sach.SoLuongTon} cuốn trong kho, không đủ số lượng ${soLuongMua} cuốn.`
      };
    }

    return {
      thanhCong: true,
      thongDiep: `Đã thêm thành công ${soLuongMua} cuốn "${sach.TenSach}" vào giỏ hàng của bạn. Đang chuyển hướng sang giỏ hàng...`,
      sach: {
        maSach: sach.MaSach,
        tenSach: sach.TenSach,
        giaBan: sach.GiaBan,
        hinhAnh: sach.AnhBia,
        soLuong: soLuongMua
      },
      chuyenTrangGioHang: true
    };
  } catch (err) {
    return { thanhCong: false, loi: 'Lỗi thêm vào giỏ hàng: ' + err.message };
  }
}

/**
 * Ánh xạ trạng thái đơn hàng sang tiếng Việt thân thiện
 */
function dichTrangThaiDonHang(trangThai) {
  const bangDich = {
    CHO_DUYET: 'Đang chờ cửa hàng duyệt',
    DA_XAC_NHAN: 'Đã xác nhận - Đang đóng gói',
    DANG_GIAO: 'Đang trên đường giao đến bạn',
    DA_GIAO: 'Đã giao hàng thành công',
    DA_HUY: 'Đã hủy'
  };
  return bangDich[trangThai] || trangThai;
}

// Bộ đếm chống brute-force mã tra cứu đơn hàng qua AI Chatbot (Task T42 & T48)
const SO_LAN_TRA_CUU_SAI_TOI_DA = 5;
const KHOANG_THOI_GIAN_KHOA_TRA_CUU_MS = 15 * 60 * 1000; // 15 phút
const boDemTraCuuSai = new Map();

function kiemTraVaGhiNhanTraCuuSai(dinhDanh, laThatBai = false) {
  const bayGio = Date.now();
  const banGhi = boDemTraCuuSai.get(dinhDanh);
  if (banGhi && (bayGio - banGhi.thoiDiem) > KHOANG_THOI_GIAN_KHOA_TRA_CUU_MS) {
    boDemTraCuuSai.delete(dinhDanh);
  }
  const hienTai = boDemTraCuuSai.get(dinhDanh) || { soLan: 0, thoiDiem: bayGio };
  if (hienTai.soLan >= SO_LAN_TRA_CUU_SAI_TOI_DA) {
    return false; // bị khóa
  }
  if (laThatBai) {
    hienTai.soLan += 1;
    hienTai.thoiDiem = bayGio;
    boDemTraCuuSai.set(dinhDanh, hienTai);
  }
  return true;
}

/**
 * Thực thi tra cứu đơn hàng bằng mã tra cứu công khai hoặc mã khách hàng đăng nhập
 */
async function thucThiTraCuuDonHang({ ma_tra_cuu }, maKhachHangContext, dinhDanh = 'chung') {
  try {
    // 1. Nếu có mã tra cứu công khai dạng BN-XXXXXX
    if (ma_tra_cuu && ma_tra_cuu.trim()) {
      const maChuan = ma_tra_cuu.trim().toUpperCase();

      // Kiểm tra xem định danh hiện tại có bị khóa do thử sai quá nhiều lần không (Brute-force Guard)
      if (!kiemTraVaGhiNhanTraCuuSai(dinhDanh, false)) {
        return {
          timThay: false,
          thongDiep: 'Bạn đã thử sai mã đơn quá 5 lần liên tiếp. Để bảo vệ an toàn thông tin đơn hàng, tính năng tra cứu tạm khóa trong 15 phút. Vui lòng thử lại sau.'
        };
      }

      const donHang = await DonHang.findOne({
        where: { MaTraCuu: maChuan },
        include: [
          {
            model: ChiTietDonHang,
            as: 'chiTietDonHang',
            include: [{ model: Sach, as: 'sach', attributes: ['TenSach', 'AnhBia'] }]
          },
          {
            model: LichSuTrangThaiDonHang,
            as: 'lichSuTrangThai',
            attributes: ['TrangThaiMoi', 'NgayThayDoi', 'GhiChu']
          },
          {
            model: ThanhToan,
            as: 'thanhToan',
            attributes: ['PhuongThuc', 'TrangThai']
          }
        ]
      });

      if (!donHang) {
        kiemTraVaGhiNhanTraCuuSai(dinhDanh, true);
        return { timThay: false, thongDiep: `Không tìm thấy đơn hàng nào với mã tra cứu "${maChuan}". Vui lòng kiểm tra lại mã trên hóa đơn hoặc tin nhắn.` };
      }

      // Tra cứu thành công -> xóa bỏ bộ đếm lỗi
      boDemTraCuuSai.delete(dinhDanh);

      const phuongThuc = donHang.thanhToan?.PhuongThuc || 'COD';
      const trangThaiTT = donHang.thanhToan?.TrangThai || 'CHO_THANH_TOAN';

      return {
        timThay: true,
        donHang: {
          maTraCuu: donHang.MaTraCuu,
          trangThai: dichTrangThaiDonHang(donHang.TrangThai),
          ngayDat: donHang.NgayDat,
          tongTien: donHang.TongTien,
          phuongThucThanhToan: phuongThuc === 'CHUYEN_KHOAN_QR' ? 'Chuyển khoản VietQR' : 'Thanh toán tiền mặt khi nhận (COD)',
          trangThaiThanhToan: trangThaiTT === 'DA_THANH_TOAN' ? 'Đã thanh toán' : 'Chưa thanh toán',
          danhSachSach: donHang.chiTietDonHang.map(ct => ({
            tenSach: ct.sach?.TenSach || `Sách #${ct.MaSach}`,
            soLuong: ct.SoLuong,
            donGia: ct.DonGia
          })),
          lichSuXuLy: (donHang.lichSuTrangThai || []).map(ls => ({
            trangThai: dichTrangThaiDonHang(ls.TrangThaiMoi),
            thoiGian: ls.NgayThayDoi
          }))
        }
      };
    }

    // 2. Nếu không có mã tra cứu nhưng khách đã đăng nhập -> tìm 3 đơn gần nhất
    if (maKhachHangContext) {
      const cacDon = await DonHang.findAll({
        where: { MaKhachHang: maKhachHangContext },
        limit: 3,
        order: [['NgayDat', 'DESC']],
        attributes: ['MaTraCuu', 'TrangThai', 'TongTien', 'NgayDat']
      });

      if (cacDon.length === 0) {
        return { timThay: false, thongDiep: 'Bạn chưa có đơn hàng nào tại BookNest.' };
      }

      return {
        timThay: true,
        laDanhSachCuaKhach: true,
        danhSachDon: cacDon.map(d => ({
          maTraCuu: d.MaTraCuu,
          trangThai: dichTrangThaiDonHang(d.TrangThai),
          tongTien: d.TongTien,
          ngayDat: d.NgayDat
        }))
      };
    }

    return { timThay: false, thongDiep: 'Vui lòng cung cấp mã tra cứu đơn hàng dạng BN-XXXXXX để tôi tra cứu giúp bạn nhé.' };
  } catch (err) {
    return { timThay: false, loi: 'Lỗi tra cứu đơn hàng: ' + err.message };
  }
}

/**
 * Chuẩn hóa nội dung phản hồi từ AI (bóc tách nếu mô hình trả về JSON object hoặc chuỗi bọc {"type": "text", "text": "..."})
 * @param {any} noiDung
 * @returns {string}
 */
function chuanHoaNoiDungAI(noiDung) {
  if (!noiDung) return '';
  if (typeof noiDung !== 'string') {
    if (Array.isArray(noiDung)) {
      return noiDung
        .map(item => item?.text || (typeof item === 'string' ? item : ''))
        .filter(Boolean)
        .join('\n')
        .trim();
    }
    if (typeof noiDung === 'object') {
      if (noiDung.text) return String(noiDung.text).trim();
      if (noiDung.content) return chuanHoaNoiDungAI(noiDung.content);
      if (noiDung.message) return chuanHoaNoiDungAI(noiDung.message);
      if (noiDung.name || noiDung.parameters) return '';
    }
    return String(noiDung);
  }

  const trimmed = noiDung.trim();
  // Nếu nội dung là chuỗi JSON dạng {"type": "text", "text": "..."} hoặc [{"type": "text", "text": "..."}] hoặc {"name": "..."}
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const textParts = parsed
          .map(item => item?.text || (typeof item === 'string' ? item : ''))
          .filter(Boolean);
        if (textParts.length > 0) return textParts.join('\n').trim();
      } else if (parsed && typeof parsed === 'object') {
        if (parsed.text) return String(parsed.text).trim();
        if (parsed.content) return chuanHoaNoiDungAI(parsed.content);
        if (parsed.message) return chuanHoaNoiDungAI(parsed.message);
        // Loại bỏ ảo giác khi LLM sinh chuỗi JSON giả lập Function Calling
        if (parsed.name || parsed.parameters) return '';
      }
    } catch (e) {
      // Giữ nguyên chuỗi nếu không parse được JSON
    }
  }

  return trimmed;
}

/**
 * Bóc tách Tool Call nếu LLM xuất chuỗi JSON vào message.content thay vì trường tool_calls
 * @param {string} noiDung
 * @returns {Array|null}
 */
function trichXuatToolCallTuNoiDung(noiDung) {
  if (!noiDung || typeof noiDung !== 'string') return null;
  const trimmed = noiDung.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;

  try {
    const parsed = JSON.parse(trimmed);
    // Dạng 1: { name: "...", parameters: {...} } hoặc { name: "...", arguments: {...} }
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.name) {
      let argsObj = parsed.parameters ?? parsed.arguments ?? {};
      if (typeof argsObj === 'string') {
        try { argsObj = JSON.parse(argsObj); } catch (e) {}
      }
      return [{
        id: 'call_' + Date.now(),
        type: 'function',
        function: {
          name: parsed.name,
          arguments: typeof argsObj === 'string' ? argsObj : JSON.stringify(argsObj)
        }
      }];
    }
    // Dạng 2: [{ name: "...", ... }]
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.name) {
      return parsed.map((item, idx) => {
        let argsObj = item.parameters ?? item.arguments ?? {};
        if (typeof argsObj === 'string') {
          try { argsObj = JSON.parse(argsObj); } catch (e) {}
        }
        return {
          id: 'call_' + Date.now() + '_' + idx,
          type: 'function',
          function: {
            name: item.name,
            arguments: typeof argsObj === 'string' ? argsObj : JSON.stringify(argsObj)
          }
        };
      });
    }
  } catch (e) {
    // Không phải JSON hợp lệ
  }
  return null;
}

/**
 * Tự động bù đắp dữ liệu sách và làm sạch placeholder ba chấm (...) trong phản hồi của AI
 * Đảm bảo 100% người dùng luôn nhận được Tác giả và Giá thật cùng Thẻ sách bên dưới khung chat
 */
async function tuDongBuDapDuLieuSach({ traLoi, noiDungTinNhan, sachHienTai, duLieuKemTheo }) {
  let traLoiMoi = String(traLoi || '');

  // Nếu chưa có sách kèm theo và chưa có hành động thêm giỏ / đơn hàng
  if ((!duLieuKemTheo.danhSachSach || duLieuKemTheo.danhSachSach.length === 0) && !duLieuKemTheo.themVaoGioHang && !duLieuKemTheo.thongTinDonHang) {
    const coDauHieuSach = /sách|cuốn|mua|bán|tìm|giá/i.test(noiDungTinNhan) ||
                          /cuốn sách/i.test(traLoiMoi) ||
                          traLoiMoi.includes('...') ||
                          traLoiMoi.includes('(Tác giả:');

    if (coDauHieuSach) {
      // Ưu tiên trích xuất tên sách từ câu trả lời của AI nếu có ngoặc kép/đơn, hoặc lấy từ câu hỏi của khách
      let tuKhoa = noiDungTinNhan;
      const matchNgoac = traLoiMoi.match(/cuốn sách\s+['"“]([^'"”]+)['"”]/i) || traLoiMoi.match(/['"“]([^'"”]+)['"”]/);
      if (matchNgoac && matchNgoac[1]) {
        tuKhoa = matchNgoac[1];
      }

      const ketQuaTim = await thucThiTimSach({ tu_khoa: tuKhoa }, noiDungTinNhan, sachHienTai);
      if (ketQuaTim?.timThay && ketQuaTim.danhSach?.length > 0) {
        duLieuKemTheo.danhSachSach = ketQuaTim.danhSach;
        const s0 = ketQuaTim.danhSach[0];
        const giaFmt = new Intl.NumberFormat('vi-VN').format(s0.giaBan);
        const tacGiaFmt = s0.tacGia || 'Đang cập nhật';

        // Tự động thay thế nếu câu trả lời bị dính placeholder ba chấm rác hoặc thiếu tác giả/giá
        if (traLoiMoi.includes('...') || traLoiMoi.includes('(Tác giả:') || !traLoiMoi.includes(tacGiaFmt)) {
          if (traLoiMoi.includes('(Tác giả:')) {
            traLoiMoi = traLoiMoi.replace(/\(Tác giả:[^)]*?\)/gi, `(Tác giả: ${tacGiaFmt}, Giá: ${giaFmt}đ)`);
          }
          if (traLoiMoi.includes('...') || !traLoiMoi.includes(tacGiaFmt)) {
            traLoiMoi = `Dạ, có phải bạn đang muốn tìm cuốn sách "${s0.tenSach}" (Tác giả: ${tacGiaFmt}, Giá: ${giaFmt}đ) không ạ?`;
          }
        }
      }
    }
  } else if (duLieuKemTheo.danhSachSach && duLieuKemTheo.danhSachSach.length > 0) {
    // Nếu đã có danhSachSach từ tool tim_sach nhưng câu trả lời của AI vẫn bị dính placeholder (...)
    const s0 = duLieuKemTheo.danhSachSach[0];
    const giaFmt = new Intl.NumberFormat('vi-VN').format(s0.giaBan);
    const tacGiaFmt = s0.tacGia || 'Đang cập nhật';

    if (traLoiMoi.includes('(Tác giả:')) {
      traLoiMoi = traLoiMoi.replace(/\(Tác giả:[^)]*?\)/gi, `(Tác giả: ${tacGiaFmt}, Giá: ${giaFmt}đ)`);
    }
    if (traLoiMoi.includes('...') && traLoiMoi.includes('cuốn sách')) {
      traLoiMoi = `Dạ, có phải bạn đang muốn tìm cuốn sách "${s0.tenSach}" (Tác giả: ${tacGiaFmt}, Giá: ${giaFmt}đ) không ạ?`;
    }
  }

  return traLoiMoi;
}

/**
 * Tính tổng lượng token AI Chatbot đã tiêu thụ trong ngày hôm nay
 */
async function tinhTongTokenHomNay() {
  try {
    const [ketQua] = await sequelize.query(`
      SELECT ISNULL(SUM(SoToken), 0) AS tongToken, COUNT(MaNhatKy) AS soLuot
      FROM dbo.NhatKyChatbot
      WHERE CAST(NgayGhi AS DATE) = CAST(SYSDATETIME() AS DATE)
    `, { type: sequelize.QueryTypes.SELECT });
    return {
      tongToken: ketQua ? parseInt(ketQua.tongToken, 10) : 0,
      soLuot: ketQua ? parseInt(ketQua.soLuot, 10) : 0
    };
  } catch (err) {
    // Nếu bảng chưa tạo hoặc lỗi, trả về 0 để không làm nghẽn luồng
    return { tongToken: 0, soLuot: 0 };
  }
}

/**
 * Ghi nhận một dòng nhật ký kỹ thuật vào bảng NhatKyChatbot
 * TUYỆT ĐỐI KHÔNG lưu nội dung hội thoại chat nhạy cảm
 */
async function ghiNhatKyChatbot({ maKhachHang = null, khoaPhien = null, soToken = 0, tenCongCu = null, ketQua = 'THANH_CONG', ghiChu = null }) {
  try {
    if (!NhatKyChatbot) return;
    await NhatKyChatbot.create({
      MaKhachHang: maKhachHang,
      KhoaPhien: khoaPhien ? String(khoaPhien).substring(0, 64) : null,
      SoToken: Math.max(0, parseInt(soToken, 10) || 0),
      TenCongCu: tenCongCu ? String(tenCongCu).substring(0, 50) : null,
      KetQua: ketQua,
      GhiChu: ghiChu ? String(ghiChu).substring(0, 255) : null
    });
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('[NhatKyChatbot] Không thể ghi nhật ký AI:', err.message);
    }
  }
}

/**
 * Lấy số liệu thống kê tiêu thụ token AI trong ngày cho Quản trị viên
 */
async function layThongKeChatbotHomNay() {
  const tranNgay = await cauHinhHeThongService.docGiaTriSo(cauHinhHeThongService.KHOA_AI_TRAN_NGAY, 50000);
  const { tongToken, soLuot } = await tinhTongTokenHomNay();
  const conLai = Math.max(0, tranNgay - tongToken);
  const phanTramTieuThu = tranNgay > 0 ? Math.min(100, Math.round((tongToken / tranNgay) * 100)) : 0;
  return {
    tongTokenHomNay: tongToken,
    tranNgay,
    conLai,
    phanTramTieuThu,
    soLuotHoiThoaiHomNay: soLuot,
    daVuotTran: tranNgay > 0 && tongToken >= tranNgay
  };
}

/**
 * Xử lý cuộc hội thoại với AI Chatbot (hỗ trợ vòng lặp Function Calling)
 * @param {Object} options
 * @param {Array} options.lichSuChat - Mảng các tin nhắn [{ role: 'user'|'assistant', content: string }]
 * @param {string} options.tinNhanMoi - Tin nhắn mới nhất của người dùng
 * @param {number|null} [options.maKhachHang=null] - ID khách hàng nếu đã đăng nhập
 * @param {string|null} [options.khoaPhien=null] - Khóa phiên hoặc IP người dùng
 * @returns {Promise<{ traLoi: string, duLieuKemTheo: Object }>}
 */
async function xuLyHoiThoaiAI({ lichSuChat = [], tinNhanMoi, tinNhan, maKhachHang = null, daDangNhap = false, tenKhachHang = '', khoaPhien = null }) {
  const noiDungTinNhan = String(tinNhanMoi || tinNhan || '').trim();

  // Kiểm tra trần ngân sách token mỗi ngày (AI_CHATBOT_TRAN_NGAY)
  const tranNgay = await cauHinhHeThongService.docGiaTriSo(cauHinhHeThongService.KHOA_AI_TRAN_NGAY, 50000);
  const { tongToken: tongTokenHomNay } = await tinhTongTokenHomNay();
  if (tranNgay > 0 && tongTokenHomNay >= tranNgay) {
    const traLoi = 'Trợ lý AI đã đạt hạn mức phục vụ trong ngày nhằm bảo vệ ngân sách hệ thống. Quý khách vui lòng quay lại vào ngày mai hoặc liên hệ trực tiếp nhân viên BookNest nhé!';
    await ghiNhatKyChatbot({
      maKhachHang,
      khoaPhien,
      soToken: 0,
      ketQua: 'QUA_GIOI_HAN',
      ghiChu: `Vượt trần ngân sách ngày: ${tongTokenHomNay}/${tranNgay} tokens`
    });
    return {
      traLoi,
      duLieuKemTheo: {
        danhSachSach: [],
        thongTinThanhToan: null,
        thongTinDonHang: null,
        themVaoGioHang: null
      }
    };
  }

  // Chuẩn bị danh sách messages, giới hạn 8 tin nhắn gần nhất để tiết kiệm token
  const tinNhanHopLe = (Array.isArray(lichSuChat) ? lichSuChat : [])
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-8);

  // Trích xuất cuốn sách gần nhất đang trao đổi trong lịch sử chat
  const sachHienTai = trichXuatSachGanNhatTuLichSu(tinNhanHopLe);

  const loiNhac = taoLoiNhacHeThong({ daDangNhap, tenKhachHang, maKhachHang, sachHienTai });
  const messages = [
    { role: 'system', content: loiNhac },
    ...tinNhanHopLe
  ];

  // Tránh gửi lặp tin nhắn nếu tin nhắn mới đã nằm ở cuối lịch sử
  const tinCuoi = tinNhanHopLe[tinNhanHopLe.length - 1];
  const daCoTinCuoi = tinCuoi && tinCuoi.role === 'user' && tinCuoi.content.trim() === noiDungTinNhan;

  if (!daCoTinCuoi && noiDungTinNhan) {
    messages.push({ role: 'user', content: noiDungTinNhan });
  }

  // Đối tượng lưu dữ liệu tương tác để trả về frontend render UI widgets
  const duLieuKemTheo = {
    danhSachSach: [],
    thongTinThanhToan: null,
    thongTinDonHang: null,
    themVaoGioHang: null
  };

  const TOI_DA_VONG_LAP = 2; // Tối đa 2 vòng gọi công cụ để đảm bảo tốc độ và tiết kiệm token
  let soVongLap = 0;
  let tongTokensTieuThu = 0;
  const danhSachToolDaGoi = [];

  // Lọc công cụ khả dụng theo vai trò: Guest chưa đăng nhập thì không nạp tool them_vao_gio_hang để tránh AI từ chối
  const cacCongCuKhaDung = daDangNhap
    ? DANH_SACH_CONG_CU
    : DANH_SACH_CONG_CU.filter(t => t.function?.name !== 'them_vao_gio_hang');

  while (soVongLap < TOI_DA_VONG_LAP) {
    soVongLap++;

    const ketQuaAI = await goiNhaCungCapAI({
      messages,
      tools: cacCongCuKhaDung,
      maxTokens: 600,
      temperature: 0.3
    });

    if (ketQuaAI?.usage?.total_tokens) {
      tongTokensTieuThu += ketQuaAI.usage.total_tokens;
    }

    const aiMessage = ketQuaAI.message;

    // Bóc tách Tool Call nếu LLM xuất JSON vào message.content thay vì tool_calls
    if ((!aiMessage.tool_calls || aiMessage.tool_calls.length === 0) && aiMessage.content) {
      const toolCallsTuContent = trichXuatToolCallTuNoiDung(aiMessage.content);
      if (toolCallsTuContent && toolCallsTuContent.length > 0) {
        aiMessage.tool_calls = toolCallsTuContent;
        aiMessage.content = '';
      }
    }

    // Nếu AI không yêu cầu gọi tool -> Đã có câu trả lời cuối cùng cho người dùng
    if (!aiMessage.tool_calls || aiMessage.tool_calls.length === 0) {
      let traLoi = chuanHoaNoiDungAI(aiMessage.content);
      // Tự động bù đắp dữ liệu sách và làm sạch placeholder (...)
      traLoi = await tuDongBuDapDuLieuSach({ traLoi, noiDungTinNhan, sachHienTai, duLieuKemTheo });

      if (!traLoi) {
        if (duLieuKemTheo.themVaoGioHang) {
          traLoi = `Dạ, tôi đã thêm ${duLieuKemTheo.themVaoGioHang.soLuong} cuốn "${duLieuKemTheo.themVaoGioHang.tenSach}" vào giỏ hàng cho bạn rồi nhé. Đang chuyển sang trang giỏ hàng cho bạn ạ!`;
        } else if (duLieuKemTheo.thongTinThanhToan) {
          traLoi = 'Dạ, tôi đã chuẩn bị xong thông tin thanh toán cho bạn rồi ạ. Bạn có thể nhấn vào nút "Mở trang thanh toán" bên dưới để hoàn tất đơn hàng nhé!';
        } else if (duLieuKemTheo.danhSachSach && duLieuKemTheo.danhSachSach.length > 0) {
          traLoi = `Dạ, có phải bạn đang muốn tìm cuốn sách "${duLieuKemTheo.danhSachSach[0].tenSach}" không ạ?`;
        } else {
          traLoi = 'Dạ, tôi có thể giúp gì thêm cho bạn về sách và đơn hàng không ạ?';
        }
      }

      await ghiNhatKyChatbot({
        maKhachHang,
        khoaPhien,
        soToken: tongTokensTieuThu,
        tenCongCu: danhSachToolDaGoi.join(',') || null,
        ketQua: 'THANH_CONG'
      });

      return {
        traLoi,
        duLieuKemTheo
      };
    }

    // Nếu AI yêu cầu gọi tool -> Chuẩn hóa và push tin nhắn assistant vào messages
    messages.push({
      role: 'assistant',
      content: aiMessage.content || null,
      tool_calls: aiMessage.tool_calls
    });

    for (const toolCall of aiMessage.tool_calls) {
      const tenHam = toolCall.function?.name;
      if (tenHam && !danhSachToolDaGoi.includes(tenHam)) {
        danhSachToolDaGoi.push(tenHam);
      }
      let thamSo = {};
      try {
        thamSo = JSON.parse(toolCall.function?.arguments || '{}');
      } catch (e) {
        thamSo = {};
      }

      let ketQuaTool = null;

      if (tenHam === 'tim_sach') {
        ketQuaTool = await thucThiTimSach(thamSo, noiDungTinNhan, sachHienTai);
        if (ketQuaTool?.danhSach) {
          duLieuKemTheo.danhSachSach = ketQuaTool.danhSach;
        }
      } else if (tenHam === 'kiem_tra_ton_kho') {
        ketQuaTool = await thucThiKiemTraTonKho(thamSo, noiDungTinNhan);
      } else if (tenHam === 'soan_thong_tin_thanh_toan') {
        ketQuaTool = await thucThiSoanThanhToan(thamSo, noiDungTinNhan, sachHienTai);
        // Nếu Guest chưa cung cấp thông tin người nhận: Trả về ngay mẫu form nhận hàng
        if (ketQuaTool?.canDienThongTin) {
          if (ketQuaTool.tenSach && duLieuKemTheo.danhSachSach.length === 0) {
            duLieuKemTheo.danhSachSach = [{
              maSach: ketQuaTool.maSach || 0,
              tenSach: ketQuaTool.tenSach,
              giaBan: ketQuaTool.giaBan || 0,
              hinhAnh: ketQuaTool.hinhAnh || null,
              conHang: true
            }];
          }

          await ghiNhatKyChatbot({
            maKhachHang,
            khoaPhien,
            soToken: tongTokensTieuThu,
            tenCongCu: danhSachToolDaGoi.join(',') || 'soan_thong_tin_thanh_toan',
            ketQua: 'THANH_CONG'
          });

          return {
            traLoi: ketQuaTool.thongDiep,
            duLieuKemTheo
          };
        }
        if (ketQuaTool?.banNhapThanhToan) {
          duLieuKemTheo.thongTinThanhToan = ketQuaTool.banNhapThanhToan;
        }
        if (ketQuaTool?.canXacNhan && ketQuaTool.cuonGoiY && duLieuKemTheo.danhSachSach.length === 0) {
          duLieuKemTheo.danhSachSach = [{
            maSach: ketQuaTool.maSach || 0,
            tenSach: ketQuaTool.cuonGoiY,
            giaBan: ketQuaTool.giaBan || 0,
            conHang: true
          }];
        }
      } else if (tenHam === 'them_vao_gio_hang') {
        ketQuaTool = await thucThiThemVaoGioHang(thamSo, noiDungTinNhan, sachHienTai);
        if (ketQuaTool?.thanhCong && ketQuaTool.sach) {
          duLieuKemTheo.themVaoGioHang = {
            ...ketQuaTool.sach,
            chuyenTrangGioHang: true
          };
          // Đã thêm giỏ hàng thành công -> Trả về ngay lập tức, tiết kiệm 50% token và loại bỏ 100% ảo giác
          await ghiNhatKyChatbot({
            maKhachHang,
            khoaPhien,
            soToken: tongTokensTieuThu,
            tenCongCu: danhSachToolDaGoi.join(',') || 'them_vao_gio_hang',
            ketQua: 'THANH_CONG'
          });

          return {
            traLoi: ketQuaTool.thongDiep || `Dạ, tôi đã thêm ${ketQuaTool.sach.soLuong || 1} cuốn "${ketQuaTool.sach.tenSach}" vào giỏ hàng cho bạn rồi nhé. Đang chuyển hướng sang giỏ hàng cho bạn ạ!`,
            duLieuKemTheo
          };
        }
        if (ketQuaTool?.canXacNhan && ketQuaTool.cuonGoiY && duLieuKemTheo.danhSachSach.length === 0) {
          duLieuKemTheo.danhSachSach = [{
            maSach: ketQuaTool.maSach || 0,
            tenSach: ketQuaTool.cuonGoiY,
            giaBan: ketQuaTool.giaBan || 0,
            conHang: true
          }];
        }
      } else if (tenHam === 'tra_cuu_don_hang') {
        const dinhDanh = maKhachHang ? `user_${maKhachHang}` : 'guest';
        ketQuaTool = await thucThiTraCuuDonHang(thamSo, maKhachHang, dinhDanh);
        if (ketQuaTool?.donHang || ketQuaTool?.danhSachDon) {
          duLieuKemTheo.thongTinDonHang = ketQuaTool.donHang || ketQuaTool.danhSachDon;
        }
      } else {
        ketQuaTool = { loi: `Không hỗ trợ công cụ ${tenHam}` };
      }

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(ketQuaTool)
      });
    }
  }

  // Nếu hết số vòng lặp mà AI chưa chốt -> Gọi 1 lần cuối không kèm tools để ép AI trả lời
  const ketQuaCuoi = await goiNhaCungCapAI({
    messages,
    maxTokens: 500,
    temperature: 0.3
  });

  if (ketQuaCuoi?.usage?.total_tokens) {
    tongTokensTieuThu += ketQuaCuoi.usage.total_tokens;
  }
  if (tongTokensTieuThu > 0) {
    console.log(`[AI Chatbot] Lượt hội thoại hoàn tất. Tổng token tiêu thụ: ${tongTokensTieuThu}`);
  }

  let traLoiCuoi = chuanHoaNoiDungAI(ketQuaCuoi.message?.content);
  // Tự động bù đắp dữ liệu sách và làm sạch placeholder (...)
  traLoiCuoi = await tuDongBuDapDuLieuSach({ traLoi: traLoiCuoi, noiDungTinNhan, sachHienTai, duLieuKemTheo });

  if (!traLoiCuoi) {
    if (duLieuKemTheo.themVaoGioHang) {
      traLoiCuoi = `Dạ, tôi đã thêm ${duLieuKemTheo.themVaoGioHang.soLuong} cuốn "${duLieuKemTheo.themVaoGioHang.tenSach}" vào giỏ hàng cho bạn rồi nhé. Đang chuyển sang trang giỏ hàng cho bạn ạ!`;
    } else if (duLieuKemTheo.thongTinThanhToan) {
      traLoiCuoi = 'Dạ, tôi đã chuẩn bị xong thông tin thanh toán cho bạn rồi ạ. Bạn có thể nhấn vào nút "Mở trang thanh toán" bên dưới để hoàn tất đơn hàng nhé!';
    } else if (duLieuKemTheo.danhSachSach && duLieuKemTheo.danhSachSach.length > 0) {
      traLoiCuoi = `Dạ, có phải bạn đang muốn tìm cuốn sách "${duLieuKemTheo.danhSachSach[0].tenSach}" không ạ?`;
    } else {
      traLoiCuoi = 'Dạ, bạn có cần BookNest tư vấn thêm thông tin nào nữa không ạ?';
    }
  }

  await ghiNhatKyChatbot({
    maKhachHang,
    khoaPhien,
    soToken: tongTokensTieuThu,
    tenCongCu: danhSachToolDaGoi.join(',') || null,
    ketQua: 'THANH_CONG'
  });

  return {
    traLoi: traLoiCuoi,
    duLieuKemTheo
  };
}

module.exports = {
  LOI_NHAC_HE_THONG,
  taoLoiNhacHeThong,
  DANH_SACH_CONG_CU,
  chuanHoaNoiDungAI,
  thucThiTimSach,
  thucThiKiemTraTonKho,
  thucThiSoanThanhToan,
  thucThiThemVaoGioHang,
  thucThiTraCuuDonHang,
  trichXuatToolCallTuNoiDung,
  trichXuatSachGanNhatTuLichSu,
  laCauXacNhan,
  tuDongBuDapDuLieuSach,
  tinhTongTokenHomNay,
  ghiNhatKyChatbot,
  layThongKeChatbotHomNay,
  xuLyHoiThoaiAI
};
