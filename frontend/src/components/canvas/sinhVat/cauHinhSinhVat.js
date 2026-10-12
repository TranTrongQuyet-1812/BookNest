// Cấu hình tĩnh cho sinh vật 3D ở Trang chủ: từng loài, biến thể màu và các chỗ được phép đậu.

// Hai con cùng đậu một phần tử phải cách nhau ít nhất chừng này (px), để không chồng lên nhau
export const KHOANG_CACH_DAU = 110;

// Số con đậu sẵn khi mở trang, những con còn lại bay vào dần cho đỡ chật
export const SO_CON_DAU_NGAY = 5;

// Màn hẹp (điện thoại) chỉ thả bấy nhiêu con để máy không phải gánh
export const SO_CON_TOI_DA_MAN_HEP = 7;

/**
 * Thông số từng loài.
 * - scale, doCaoDau, hitboxR: giữ đúng số đã chỉnh tay trước đó
 * - tocDoBay: px mỗi giây, quyết định thời gian bay theo quãng đường
 * - bienDoZ: bay vồng lên gần camera tối đa bao nhiêu (cho có chiều sâu)
 * - thoiGianDau: khoảng giây đậu yên trước khi tự bay đi chỗ khác
 * - nghiengDau: góc ngả người (rad) về phía camera khi đậu, để thấy mặt trên có cánh;
 *   chuồn chuồn và ong có cánh nằm ngang nên nhìn thẳng từ phía trước chỉ thấy một đường mảnh
 * - uaThich: loài này thích đậu kiểu chỗ nào (trọng số, càng cao càng hay chọn)
 */
export const LOAI_SINH_VAT = {
  chim: {
    file: '/models/chim.glb',
    scale: 92,
    doCaoDau: 2,
    hitboxR: 44,
    tocDoBay: 520,
    bienDoZ: 110,
    thoiGianDau: [16, 28],
    uaThich: { chu: 3, card: 2, nut: 0.6 }
  },
  buom: {
    file: '/models/buom.glb',
    scale: 75,
    doCaoDau: 10,
    hitboxR: 40,
    tocDoBay: 230,
    bienDoZ: 90,
    thoiGianDau: [9, 18],
    uaThich: { card: 3, chu: 1.6, nut: 1 }
  },
  chuon_chuon: {
    file: '/models/chuon_chuon.glb',
    scale: 85,
    doCaoDau: 2,
    hitboxR: 44,
    tocDoBay: 640,
    bienDoZ: 70,
    thoiGianDau: [10, 20],
    nghiengDau: 0.7,
    uaThich: { chu: 2, card: 1.5, nut: 1 }
  },
  ong: {
    file: '/models/ong.glb',
    scale: 56,
    doCaoDau: 2,
    hitboxR: 35,
    tocDoBay: 430,
    bienDoZ: 60,
    thoiGianDau: [8, 16],
    nghiengDau: 0.35,
    uaThich: { nut: 2, chu: 2, card: 1 }
  }
};

// Biến thể màu: khóa là tên vật liệu trong file .glb (xem Blender), giá trị là màu mới.
// Chỉ đổi phần thân/cánh, giữ nguyên mắt, chân, viền để con vật vẫn trông "thật".
const MAU_CHIM_XANH = {
  LungChim: '#3C6EB4', CanhNau: '#2D4F8A', Duoi: '#2D4F8A',
  NgucCam: '#C9722E', VachCanh: '#CFE1F3', MutDuoi: '#CFE1F3'
};
const MAU_CHIM_VANG = {
  LungChim: '#7A8F2E', CanhNau: '#4F5A1D', Duoi: '#4F5A1D',
  NgucCam: '#F3C623', BungKem: '#FFF3C4', VachCanh: '#F7E7A0'
};

const MAU_BUOM_LAM = { CanhTruoc: '#4C8DD6', CanhSau: '#8CC4EE' };
const MAU_BUOM_TIM = { CanhTruoc: '#8F63C9', CanhSau: '#C3A4EA' };
const MAU_BUOM_HONG = { CanhTruoc: '#E4678F', CanhSau: '#F7B2C8' };
const MAU_BUOM_VANG = { CanhTruoc: '#E9C93C', CanhSau: '#F6E58A' };

const MAU_CHUON_DO = {
  ThanXanh: '#B3261E', BungSang: '#D8453A', BungToi: '#4A0E0B',
  GanCanh: '#9C2A22', MatXanhLa: '#8A3B1B'
};
const MAU_CHUON_TIM = {
  ThanXanh: '#5B3FA8', BungSang: '#7E5FD0', BungToi: '#1F1440',
  GanCanh: '#5A47A0', MatXanhLa: '#2FA38A'
};

const MAU_ONG_CAM = { SocVang: '#E8691C', NgucMat: '#7A2A0A' };
const MAU_ONG_LUC = { SocVang: '#28A98A', NgucMat: '#0F5E4D', SocDen: '#0A2B25' };

// Thứ tự quan trọng: SO_CON_DAU_NGAY con đầu tiên là những con đậu sẵn, nên cho đủ 4 loài ở đó.
export const DANH_SACH_SINH_VAT = [
  { loai: 'chim', mau: null },
  { loai: 'buom', mau: null },
  { loai: 'chuon_chuon', mau: null },
  { loai: 'ong', mau: null },
  { loai: 'buom', mau: MAU_BUOM_LAM },
  { loai: 'chim', mau: MAU_CHIM_XANH },
  { loai: 'buom', mau: MAU_BUOM_TIM },
  { loai: 'ong', mau: MAU_ONG_CAM },
  { loai: 'chuon_chuon', mau: MAU_CHUON_DO },
  { loai: 'buom', mau: MAU_BUOM_HONG },
  { loai: 'chim', mau: MAU_CHIM_VANG },
  { loai: 'ong', mau: MAU_ONG_LUC },
  { loai: 'chuon_chuon', mau: MAU_CHUON_TIM },
  { loai: 'buom', mau: MAU_BUOM_VANG }
];

/**
 * Những chỗ được phép đậu (chỉ thành phần lớn, theo yêu cầu).
 * - kieu: 'chu' đậu theo bề rộng thật của dòng chữ; 'card' / 'nut' theo khung phần tử
 * - lech: hạ thấp con vật xuống bao nhiêu px so với mép trên (chữ có khoảng trống phía trên nét chữ)
 * Các selector data-diem-dau nằm ở KeSachCuonNgang.jsx.
 */
export const LOAI_DIEM_DAU = [
  { selector: '.hero-brand', kieu: 'chu', lech: 18 },
  { selector: '.hero-slogan', kieu: 'chu', lech: 6 },
  { selector: '.hero-text', kieu: 'chu', lech: 4 },
  { selector: '.hero-spotlight', kieu: 'card', lech: 2 },
  { selector: '.hero-buttons button', kieu: 'nut', lech: 6 },
  { selector: '[data-diem-dau="tieu-de-ke"]', kieu: 'chu', lech: 14 },
  { selector: '[data-diem-dau="ke-sach"]', kieu: 'card', lech: 3 }
];
