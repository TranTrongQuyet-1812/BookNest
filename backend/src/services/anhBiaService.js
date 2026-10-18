/**
 * anhBiaService.js - Dịch vụ xử lý nén ảnh bìa WebP và tải lên Cloudinary (AT04, AT05)
 * 
 * Tuân thủ quy tắc kiến trúc và bảo mật:
 * - Dùng sharp nén WebP 800x1200 chất lượng 80, giới hạn limitInputPixels chống bom ảnh.
 * - Gửi Cloudinary qua REST API chuẩn bằng fetch và FormData của Node.js, ký SHA1 an toàn.
 * - Không lộ khóa bí mật trong mã nguồn hoặc log.
 * - Xóa ảnh cũ chỉ khi thỏa mãn đủ 3 điều kiện: thuộc cloud của dự án, nằm trong thư mục booknest/sach/, và không còn sách nào khác sử dụng.
 */

const crypto = require('crypto');
const sharp = require('sharp');
const cauHinh = require('../config/cauHinh');
const LoiNghiepVu = require('../middlewares/loiNghiepVu');
const Sach = require('../models/Sach');

/**
 * Nén ảnh đầu vào sang chuẩn WebP kích thước tối đa 800x1200 và chất lượng 80
 * @param {Buffer} buffer Dữ liệu nhị phân của file ảnh
 * @returns {Promise<Buffer>} Buffer ảnh WebP đã được nén tối ưu
 */
const nenAnhSangWebP = async (buffer) => {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw LoiNghiepVu.yeuCauKhongHopLe('Vui lòng cung cấp file ảnh hợp lệ');
  }

  try {
    const anhWebp = await sharp(buffer, {
      limitInputPixels: 40e6, // Giới hạn 40 triệu pixel chống tấn công zip-bomb bộ nhớ
      failOn: 'error'
    })
      .rotate() // Tự động xoay theo metadata EXIF của thiết bị chụp
      .resize({
        width: 800,
        height: 1200,
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 80 })
      .toBuffer();

    return anhWebp;
  } catch (err) {
    // Sharp ném lỗi khi file rác hoặc cấu trúc ảnh bị hỏng
    throw LoiNghiepVu.yeuCauKhongHopLe('File không phải ảnh hợp lệ');
  }
};

/**
 * Tải ảnh bìa lên Cloudinary (AT04)
 * @param {Buffer} bufferRaw Dữ liệu ảnh thô từ client
 * @returns {Promise<{ url: string, publicId: string }>}
 */
const taiAnhBiaLen = async (bufferRaw) => {
  const { tenDamMay, khoa, matKhau, daCauHinh } = cauHinh.cloudinary;

  if (!daCauHinh) {
    throw new LoiNghiepVu('Chức năng tải ảnh chưa được cấu hình. Vui lòng liên hệ quản trị hệ thống.', 503);
  }

  // 1. Nén ảnh sang WebP
  const webpBuffer = await nenAnhSangWebP(bufferRaw);

  // 2. Chuẩn bị thông số và chữ ký SHA1
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = 'booknest/sach';
  const publicId = `bia-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

  const thamSoKy = {
    folder,
    public_id: publicId,
    timestamp
  };

  const cacKhoaSapXep = Object.keys(thamSoKy).sort();
  const chuoiCanKy = cacKhoaSapXep.map((k) => `${k}=${thamSoKy[k]}`).join('&') + matKhau;
  const chuKy = crypto.createHash('sha1').update(chuoiCanKy).digest('hex');

  // 3. Gửi FormData qua Cloudinary REST API
  const blob = new Blob([webpBuffer], { type: 'image/webp' });
  const formData = new FormData();
  formData.append('file', blob, `${publicId}.webp`);
  formData.append('api_key', khoa);
  formData.append('timestamp', String(timestamp));
  formData.append('folder', folder);
  formData.append('public_id', publicId);
  formData.append('signature', chuKy);

  const urlApi = `https://api.cloudinary.com/v1_1/${tenDamMay}/image/upload`;

  try {
    const res = await fetch(urlApi, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(30000)
    });

    if (!res.ok) {
      const noiDungLoi = await res.text().catch(() => '');
      console.error('[Lỗi Cloudinary]', `HTTP ${res.status}: ${noiDungLoi}`);
      throw new LoiNghiepVu('Không thể lưu ảnh lúc này. Vui lòng thử lại sau.', 502);
    }

    const duLieu = await res.json();
    return {
      url: duLieu.secure_url || duLieu.url,
      publicId: duLieu.public_id || publicId
    };
  } catch (err) {
    if (err instanceof LoiNghiepVu) throw err;
    console.error('[Lỗi Kết Nối Cloudinary]', err.message);
    throw new LoiNghiepVu('Không thể lưu ảnh lúc này. Vui lòng thử lại sau.', 502);
  }
};

/**
 * Trích xuất public_id từ đường dẫn Cloudinary của dự án
 * @param {string} url 
 * @returns {string|null}
 */
const trichXuatPublicId = (url) => {
  if (!url || typeof url !== 'string') return null;
  // Khớp định dạng: /upload/(v\d+/)?(booknest/sach/[^.]+)
  const khop = url.match(/\/upload\/(?:v\d+\/)?(booknest\/sach\/[^.]+)/);
  return khop ? khop[1] : null;
};

/**
 * Xóa ảnh trên Cloudinary khi thỏa mãn đủ 3 điều kiện an toàn (AT05)
 * @param {string} url Đường dẫn ảnh cần xóa
 * @returns {Promise<boolean>} Kết quả xóa ảnh (true: đã xóa, false: bỏ qua do không thỏa điều kiện)
 */
const xoaAnhTrenCloudinary = async (url) => {
  if (!url || typeof url !== 'string') return false;

  const { tenDamMay, khoa, matKhau, daCauHinh } = cauHinh.cloudinary;
  if (!daCauHinh) return false;

  // Phân tích cú pháp URL an toàn (BA7)
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return false;
  }

  // Điều kiện 1: Hostname phải là res.cloudinary.com và pathname bắt đầu bằng /<tenDamMay>/
  if (parsedUrl.hostname !== 'res.cloudinary.com' || !parsedUrl.pathname.startsWith(`/${tenDamMay}/`)) {
    return false;
  }

  // Điều kiện 2: URL nằm trong thư mục booknest/sach/
  if (!parsedUrl.pathname.includes('/booknest/sach/')) {
    return false;
  }

  // Điều kiện 3: Không còn cuốn sách nào trong CSDL sử dụng cùng URL này
  try {
    const soSachDung = await Sach.count({
      where: { AnhBia: url }
    });
    if (soSachDung > 0) {
      return false;
    }
  } catch (err) {
    console.error('[Lỗi Kiểm Tra Ảnh Bìa]', err.message);
    return false;
  }

  const publicId = trichXuatPublicId(url);
  if (!publicId) return false;

  // Ký yêu cầu xóa (destroy)
  const timestamp = Math.floor(Date.now() / 1000);
  const thamSoKy = {
    public_id: publicId,
    timestamp
  };

  const cacKhoaSapXep = Object.keys(thamSoKy).sort();
  const chuoiCanKy = cacKhoaSapXep.map((k) => `${k}=${thamSoKy[k]}`).join('&') + matKhau;
  const chuKy = crypto.createHash('sha1').update(chuoiCanKy).digest('hex');

  const formData = new FormData();
  formData.append('public_id', publicId);
  formData.append('timestamp', String(timestamp));
  formData.append('api_key', khoa);
  formData.append('signature', chuKy);

  const urlApi = `https://api.cloudinary.com/v1_1/${tenDamMay}/image/destroy`;

  try {
    const res = await fetch(urlApi, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(15000)
    });

    if (!res.ok) {
      const noiDungLoi = await res.text().catch(() => '');
      console.error('[Lỗi Xóa Cloudinary]', `HTTP ${res.status}: ${noiDungLoi}`);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Lỗi Xóa Cloudinary]', err.message);
    return false;
  }
};

/**
 * Xóa ảnh cũ sau khi cập nhật sách (AT05) - Không ném lỗi làm hỏng yêu cầu lưu sách
 * @param {string} urlAnhCu 
 */
const xoaAnhCu = async (urlAnhCu) => {
  try {
    await xoaAnhTrenCloudinary(urlAnhCu);
  } catch (err) {
    console.error('[Lỗi Xóa Ảnh Cũ]', err.message);
  }
};

/**
 * Xóa ảnh vừa tải lên khi việc lưu sách gặp lỗi để tránh ảnh mồ côi (AT05, AT07)
 * @param {string} url 
 */
const xoaAnhVuaTai = async (url) => {
  return await xoaAnhTrenCloudinary(url);
};

module.exports = {
  nenAnhSangWebP,
  taiAnhBiaLen,
  trichXuatPublicId,
  xoaAnhCu,
  xoaAnhVuaTai,
  xoaAnhTrenCloudinary
};
