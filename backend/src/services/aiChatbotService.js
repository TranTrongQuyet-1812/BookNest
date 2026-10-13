/**
 * Tầng Service điều phối AI Chatbot tư vấn cho BookNest (theo docs/KE_HOACH_AI_CHATBOT.md).
 * Tích hợp Function Calling với CSDL BookNest (tìm sách, kiểm kho, soạn đơn, tra cứu đơn).
 * Tối ưu hóa token và an toàn chỉ đọc dữ liệu.
 */
const { Op } = require('sequelize');
const { sequelize, Sach, DanhMuc, DonHang, ChiTietDonHang, LichSuTrangThaiDonHang, ThanhToan } = require('../models');
const { chuaTuKhoa } = require('../utils/timKiem');
const { goiNhaCungCapAI } = require('./trinhCungCapAI');

// Lời nhắc hệ thống (System Prompt) chuẩn mực cho BookNest AI
const LOI_NHAC_HE_THONG = `Bạn là BookNest AI - trợ lý tư vấn nhà sách trực tuyến BookNest (đồ án sinh viên trường Đại Học Lạc Hồng do Trần Trọng Quyết phát triển).
Nhiệm vụ của bạn là hỗ trợ khách hàng tìm kiếm sách, kiểm tra tồn kho, giải đáp chính sách và hỗ trợ chốt đơn nháp.

Quy tắc ứng xử cốt lõi:
1. Luôn giao tiếp bằng tiếng Việt tự nhiên, thân thiện, lễ phép và lịch sự.
2. Khi khách hàng chỉ chào hỏi xã giao (ví dụ: "chào bạn", "hello", "hi", "bạn là ai", "chào shop"...), hãy chào lại niềm nở và hỏi khách cần tìm sách hay kiểm tra đơn hàng gì, TUYỆT ĐỐI KHÔNG gọi bất kỳ công cụ tìm kiếm nào.
3. Bạn CHỈ tư vấn về sách, đơn hàng, hướng dẫn mua sắm và chính sách của nhà sách BookNest. Với các chủ đề ngoài luồng (lập trình, giải toán, chính trị, tâm sự đời sống...), hãy từ chối lịch sự và hướng khách hàng về việc đọc sách.
4. Tuyệt đối KHÔNG bịa đặt thông tin sách, giá cả hoặc trạng thái đơn hàng. Luôn dùng các công cụ (tools) được cung cấp để tra cứu dữ liệu thật từ kho sách BookNest.
5. Khi khách muốn mua sách, hãy hỏi số lượng và thông tin nhận hàng cơ bản rồi gọi công cụ "soan_thong_tin_thanh_toan" để tạo bản nháp chuyển sang trang thanh toán.
6. Khi khách hỏi về đơn hàng, hãy nhắc khách cung cấp mã tra cứu dạng "BN-XXXXXX" (ví dụ: BN-7K3F9Q) rồi gọi công cụ "tra_cuu_don_hang".
7. Chính sách nhà sách BookNest:
   - Miễn phí vận chuyển (Freeship) cho đơn hàng từ 250.000đ trở lên; đơn dưới 250k phí ship cố định 25.000đ toàn quốc.
   - Được đồng kiểm hàng khi nhận sách trước khi thanh toán.
   - Đổi trả miễn phí trong 7 ngày đối với sách lỗi do nhà xuất bản hoặc hư hỏng do vận chuyển.
   - Hỗ trợ thanh toán tiền mặt (COD) hoặc Chuyển khoản VietQR qua PayOS (hoàn tiền tự động trong 24h nếu đơn thử nghiệm bị hủy).
8. ĐỊNH DẠNG TRẢ LỜI: Luôn trả lời trực tiếp bằng văn bản thuần túy (plain text tiếng Việt). Tuyệt đối KHÔNG xuất câu trả lời dưới dạng JSON {"type": "text", "text": "..."} hay bất kỳ cú pháp bao bọc nào.`;

// Danh sách công cụ (Tools) định nghĩa theo chuẩn OpenAPI
const DANH_SACH_CONG_CU = [
  {
    type: 'function',
    function: {
      name: 'tim_sach',
      description: 'CHỈ gọi khi khách hàng yêu cầu tìm kiếm sách, hỏi về tựa sách, tác giả, hoặc thể loại cụ thể. KHÔNG gọi khi khách chỉ chào hỏi xã giao.',
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
 * Thực thi công cụ tìm sách trong CSDL
 */
async function thucThiTimSach({ tu_khoa, the_loai, gia_toi_da }) {
  try {
    const dieuKien = { DaAn: false };

    if (tu_khoa && tu_khoa.trim()) {
      const tuKhoaSach = tu_khoa.trim();
      dieuKien[Op.or] = [
        chuaTuKhoa('[Sach].[TenSach]', tuKhoaSach),
        chuaTuKhoa('[Sach].[TacGia]', tuKhoaSach)
      ];
    }

    if (gia_toi_da && Number(gia_toi_da) > 0) {
      dieuKien.GiaBan = { [Op.lte]: Number(gia_toi_da) };
    }

    const includeOptions = [{
      model: DanhMuc,
      as: 'danhMuc',
      attributes: ['MaDanhMuc', 'TenDanhMuc']
    }];

    if (the_loai && the_loai.trim()) {
      includeOptions[0].where = chuaTuKhoa('[danhMuc].[TenDanhMuc]', the_loai.trim());
    }

    const danhSach = await Sach.findAll({
      where: dieuKien,
      include: includeOptions,
      limit: 5, // Giới hạn 5 cuốn để tiết kiệm token
      order: [['NgayTao', 'DESC']],
      attributes: ['MaSach', 'TenSach', 'TacGia', 'GiaBan', 'SoLuongTon', 'AnhBia', 'MoTa']
    });

    if (danhSach.length === 0) {
      return { timThay: false, thongDiep: 'Không tìm thấy cuốn sách nào phù hợp với yêu cầu trong kho.' };
    }

    return {
      timThay: true,
      soLuong: danhSach.length,
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
async function thucThiKiemTraTonKho({ ma_sach, ten_sach }) {
  try {
    let sach = null;
    if (ma_sach && Number(ma_sach) > 0) {
      sach = await Sach.findOne({
        where: { MaSach: Number(ma_sach), DaAn: false },
        include: [{ model: DanhMuc, as: 'danhMuc', attributes: ['TenDanhMuc'] }]
      });
    } else if (ten_sach && ten_sach.trim()) {
      sach = await Sach.findOne({
        where: {
          DaAn: false,
          ...chuaTuKhoa('[Sach].[TenSach]', ten_sach.trim())
        },
        include: [{ model: DanhMuc, as: 'danhMuc', attributes: ['TenDanhMuc'] }]
      });
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
async function thucThiSoanThanhToan({ danh_sach_sach, ten_nguoi_nhan, so_dien_thoai, dia_chi_giao_hang, email }) {
  try {
    if (!Array.isArray(danh_sach_sach) || danh_sach_sach.length === 0) {
      return { hopLe: false, thongDiep: 'Danh sách sách đặt mua không được để trống.' };
    }

    const itemsThanhToan = [];
    let tamTinh = 0;

    for (const item of danh_sach_sach) {
      const maSach = Number(item.ma_sach);
      const soLuong = Math.max(1, Number(item.so_luong) || 1);
      const sach = await Sach.findOne({ where: { MaSach: maSach, DaAn: false } });

      if (!sach) {
        return { hopLe: false, thongDiep: `Không tìm thấy sách có mã #${maSach} trong hệ thống.` };
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
        hinhAnh: sach.HinhAnh,
        giaBan: sach.GiaBan,
        soLuong,
        thanhTien
      });
    }

    // Miễn phí vận chuyển nếu đơn từ 250k trở lên
    const phiVanChuyen = tamTinh >= 250000 ? 0 : 25000;
    const tongTien = tamTinh + phiVanChuyen;

    return {
      hopLe: true,
      banNhapThanhToan: {
        danhSachMon: itemsThanhToan,
        tamTinh,
        phiVanChuyen,
        tongTien,
        mienPhiShip: phiVanChuyen === 0,
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

/**
 * Thực thi tra cứu đơn hàng bằng mã tra cứu công khai hoặc mã khách hàng đăng nhập
 */
async function thucThiTraCuuDonHang({ ma_tra_cuu }, maKhachHangContext) {
  try {
    // 1. Nếu có mã tra cứu công khai dạng BN-XXXXXX
    if (ma_tra_cuu && ma_tra_cuu.trim()) {
      const maChuan = ma_tra_cuu.trim().toUpperCase();
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
        return { timThay: false, thongDiep: `Không tìm thấy đơn hàng nào với mã tra cứu "${maChuan}". Vui lòng kiểm tra lại mã trên hóa đơn hoặc tin nhắn.` };
      }

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
    if (typeof noiDung === 'object' && noiDung.text) {
      return String(noiDung.text).trim();
    }
    return String(noiDung);
  }

  const trimmed = noiDung.trim();
  // Nếu nội dung là chuỗi JSON dạng {"type": "text", "text": "..."} hoặc [{"type": "text", "text": "..."}]
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
      }
    } catch (e) {
      // Giữ nguyên chuỗi nếu không parse được JSON
    }
  }

  return trimmed;
}

/**
 * Xử lý cuộc hội thoại với AI Chatbot (hỗ trợ vòng lặp Function Calling)
 * @param {Object} options
 * @param {Array} options.lichSuChat - Mảng các tin nhắn [{ role: 'user'|'assistant', content: string }]
 * @param {string} options.tinNhanMoi - Tin nhắn mới nhất của người dùng
 * @param {number|null} [options.maKhachHang=null] - ID khách hàng nếu đã đăng nhập
 * @returns {Promise<{ traLoi: string, duLieuKemTheo: Object }>}
 */
async function xuLyHoiThoaiAI({ lichSuChat = [], tinNhanMoi, maKhachHang = null }) {
  // Chuẩn bị danh sách messages, giới hạn 8 tin nhắn gần nhất để tiết kiệm token
  const tinNhanHopLe = (Array.isArray(lichSuChat) ? lichSuChat : [])
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-8);

  const messages = [
    { role: 'system', content: LOI_NHAC_HE_THONG },
    ...tinNhanHopLe
  ];

  // Tránh gửi lặp tin nhắn nếu tin nhắn mới đã nằm ở cuối lịch sử
  const tinCuoi = tinNhanHopLe[tinNhanHopLe.length - 1];
  const daCoTinCuoi = tinCuoi && tinCuoi.role === 'user' && tinCuoi.content.trim() === String(tinNhanMoi || '').trim();

  if (!daCoTinCuoi && tinNhanMoi && String(tinNhanMoi).trim()) {
    messages.push({ role: 'user', content: String(tinNhanMoi).trim() });
  }

  // Đối tượng lưu dữ liệu tương tác để trả về frontend render UI widgets
  const duLieuKemTheo = {
    danhSachSach: [],
    thongTinThanhToan: null,
    thongTinDonHang: null
  };

  const TOI_DA_VONG_LAP = 2; // Tối đa 2 vòng gọi công cụ để đảm bảo tốc độ và tiết kiệm token
  let soVongLap = 0;

  while (soVongLap < TOI_DA_VONG_LAP) {
    soVongLap++;

    const ketQuaAI = await goiNhaCungCapAI({
      messages,
      tools: DANH_SACH_CONG_CU,
      maxTokens: 600,
      temperature: 0.3
    });

    const aiMessage = ketQuaAI.message;

    // Nếu AI không yêu cầu gọi tool -> Đã có câu trả lời cuối cùng cho người dùng
    if (!aiMessage.tool_calls || aiMessage.tool_calls.length === 0) {
      return {
        traLoi: chuanHoaNoiDungAI(aiMessage.content) || 'Dạ, tôi có thể giúp gì thêm cho bạn về sách và đơn hàng không ạ?',
        duLieuKemTheo
      };
    }

    // Nếu AI yêu cầu gọi tool -> Thực thi các tool
    messages.push(aiMessage);

    for (const toolCall of aiMessage.tool_calls) {
      const tenHam = toolCall.function?.name;
      let thamSo = {};
      try {
        thamSo = JSON.parse(toolCall.function?.arguments || '{}');
      } catch (e) {
        thamSo = {};
      }

      let ketQuaTool = null;

      if (tenHam === 'tim_sach') {
        ketQuaTool = await thucThiTimSach(thamSo);
        if (ketQuaTool?.danhSach) {
          duLieuKemTheo.danhSachSach = ketQuaTool.danhSach;
        }
      } else if (tenHam === 'kiem_tra_ton_kho') {
        ketQuaTool = await thucThiKiemTraTonKho(thamSo);
      } else if (tenHam === 'soan_thong_tin_thanh_toan') {
        ketQuaTool = await thucThiSoanThanhToan(thamSo);
        if (ketQuaTool?.banNhapThanhToan) {
          duLieuKemTheo.thongTinThanhToan = ketQuaTool.banNhapThanhToan;
        }
      } else if (tenHam === 'tra_cuu_don_hang') {
        ketQuaTool = await thucThiTraCuuDonHang(thamSo, maKhachHang);
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

  // Nếu hết số vòng lặp mà AI vẫn chưa chốt -> Gọi 1 lần cuối không kèm tools để ép AI trả lời
  const ketQuaCuoi = await goiNhaCungCapAI({
    messages,
    maxTokens: 500,
    temperature: 0.3
  });

  return {
    traLoi: chuanHoaNoiDungAI(ketQuaCuoi.message?.content) || 'Dạ, bạn có cần BookNest tư vấn thêm thông tin nào nữa không ạ?',
    duLieuKemTheo
  };
}

module.exports = {
  LOI_NHAC_HE_THONG,
  DANH_SACH_CONG_CU,
  chuanHoaNoiDungAI,
  thucThiTimSach,
  thucThiKiemTraTonKho,
  thucThiSoanThanhToan,
  thucThiTraCuuDonHang,
  xuLyHoiThoaiAI
};
