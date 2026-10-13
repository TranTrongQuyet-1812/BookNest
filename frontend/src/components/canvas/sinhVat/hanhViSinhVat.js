import { chonDiemDau, layToaDoDiemDau } from './diemDau';
import { taoQuyDao, layDiemQuyDao, lamMuot } from './quyDaoBay';
import { chuyenHanhDong, chayDauLechPha, capNhatPhatSang } from './taoSinhVat';

// Hành vi của một con: CHO (chưa hiện, đợi bay vào) -> BAY -> DAU -> (tới giờ / bị chạm) -> BAY ...
// ctx do SinhVatTrangChuCanvas dựng mỗi khung hình: { W, H, scrollY, dsDiemDau, dsSinhVat, doiSangThree }.
// Toàn bộ bay lượn tính theo toạ độ TRANG, chỉ đổi sang toạ độ màn hình ở bước cuối,
// nên cuộn trang không làm con vật bị giật hay trôi.

const Z_DAU = 24;
// Phần thời gian chuyến bay dành để canh lại cho khớp điểm đậu thật (phòng bố cục xê dịch khi đang bay)
const BAT_DAU_CANH_DIEM = 0.45;

const ngauNhien = (a, b) => a + Math.random() * (b - a);
const gioiHan = (v, thap, cao) => Math.min(cao, Math.max(thap, v));
// Làm mượt độc lập với tốc độ khung hình: cùng một cảm giác ở 60Hz lẫn 144Hz
const lamMem = (hienTai, dich, doGat, delta) => hienTai + (dich - hienTai) * (1 - Math.exp(-doGat * delta));

// Điểm đứng của con đang gắn vào điểm đậu, theo toạ độ trang
function diemDauTheoTrang(sv, ctx) {
  const v = layToaDoDiemDau(sv.diemDau);
  return { x: v.x, y: v.y - sv.cauHinh.doCaoDau + ctx.scrollY, z: Z_DAU };
}

function chonHuongDau(sv) {
  sv.quayY = ngauNhien(0.25, 0.6) * (Math.random() < 0.5 ? -1 : 1);
}

function vaoTrangThaiDau(sv) {
  sv.trangThai = 'DAU';
  sv.demDau = 0;
  sv.demNgoai = 0;
  sv.thoiGianDauToiDa = ngauNhien(...sv.cauHinh.thoiGianDau);
  sv.mienKhoiBay = 1.3; // vừa đáp xuống thì chưa giật mình ngay
  sv.chiuNgoai = ngauNhien(1.5, 4);
  sv.demNghieng = ngauNhien(5, 12);
  sv.goc.rotation.set(sv.cauHinh.nghiengDau || 0, sv.quayY, 0);
  sv.goc.visible = true;
  if (sv.hanhDongHienTai !== sv.actions.dau) chayDauLechPha(sv);
}

function khoiDongChuyenBay(sv, ctx, dich, batDau, huongNe, heSoNang) {
  sv.diemDau = dich; // giữ chỗ ngay để con khác không chọn trùng
  chonHuongDau(sv);
  sv.quyDao = taoQuyDao(sv.loai, sv.cauHinh, batDau, diemDauTheoTrang(sv, ctx), huongNe, heSoNang);
  sv.tienTrinh = 0;
  sv.trangThai = 'BAY';
  sv.daVeTuThe = false;
  sv.goc.visible = true;
  chuyenHanhDong(sv, 'bay', 0.12);
}

/** Đặt thẳng lên một điểm đậu, không bay (dùng cho những con có mặt sẵn lúc mở trang). */
export function datNgayLenDiemDau(sv, ctx) {
  const dich = chonDiemDau(sv.cauHinh, ctx.dsDiemDau, ctx.dsSinhVat);
  if (!dich) return false;
  sv.diemDau = dich;
  chonHuongDau(sv);
  vaoTrangThaiDau(sv);
  return true;
}

// Hướng vọt đi (toạ độ trang): tránh xa con chuột nếu có, không thì bay chếch lên
function huongNeChuot(tu, chuot, scrollY) {
  const dx = chuot ? tu.x - chuot.x : ngauNhien(-1, 1);
  const dy = chuot ? tu.y - (chuot.y + scrollY) : -1;
  const dai = Math.hypot(dx, dy) || 1;
  return { x: dx / dai, y: dy / dai };
}

/** Cất cánh khỏi chỗ đang đậu sang chỗ khác. chuot = vị trí chuột (khung nhìn) nếu bị doạ, null nếu tự bay. */
export function batDauBay(sv, ctx, chuot = null) {
  const dich = chonDiemDau(sv.cauHinh, ctx.dsDiemDau, ctx.dsSinhVat, sv.diemDau?.el);
  if (!dich) {
    sv.mienKhoiBay = 1.5; // chưa có chỗ nào trống, lát nữa thử lại
    sv.demDau = Math.max(sv.demDau, sv.thoiGianDauToiDa - 2);
    return;
  }
  const tu = diemDauTheoTrang(sv, ctx);
  khoiDongChuyenBay(sv, ctx, dich, tu, huongNeChuot(tu, chuot, ctx.scrollY), 1);
}

// Điểm xuất phát ngoài rìa màn hình để con vật bay vào từ ngoài khung nhìn
function diemNgoaiManHinh(ctx) {
  const canh = Math.random();
  let x;
  let y;
  if (canh < 0.4) {
    x = ngauNhien(0.1, 0.9) * ctx.W;
    y = -140;
  } else {
    x = canh < 0.7 ? -140 : ctx.W + 140;
    y = ngauNhien(0.1, 0.6) * ctx.H;
  }
  return { x, y: y + ctx.scrollY, z: Z_DAU + 40 };
}

function batDauBayVao(sv, ctx) {
  const dich = chonDiemDau(sv.cauHinh, ctx.dsDiemDau, ctx.dsSinhVat);
  if (!dich) return false;
  khoiDongChuyenBay(sv, ctx, dich, diemNgoaiManHinh(ctx), { x: 0, y: 0 }, 0.15);
  return true;
}

function chuyenSangCho(sv, soGiay) {
  sv.trangThai = 'CHO';
  sv.diemDau = null; // nhả chỗ để con khác dùng
  sv.choDen = soGiay;
  sv.goc.visible = false;
}

function capNhatCho(sv, ctx, delta) {
  sv.choDen -= delta;
  if (sv.choDen > 0) return;
  if (!batDauBayVao(sv, ctx)) sv.choDen = 2;
}

// Chim thỉnh thoảng nghiêng đầu ngó quanh khi đậu yên
function capNhatNghiengDau(sv, delta) {
  if (!sv.actions.nghieng_dau) return;
  sv.demNghieng -= delta;
  if (sv.demNghieng > 0) return;
  const dangNghieng = sv.hanhDongHienTai === sv.actions.nghieng_dau;
  chuyenHanhDong(sv, dangNghieng ? 'dau' : 'nghieng_dau', 0.25);
  sv.demNghieng = dangNghieng ? ngauNhien(6, 14) : 2.8;
}

function capNhatDau(sv, ctx, delta) {
  if (!sv.diemDau.el.isConnected) {
    chuyenSangCho(sv, 0.3);
    return;
  }
  // Bám thẳng vào vị trí thật của phần tử mỗi khung hình, không làm trễ,
  // vì làm trễ chính là thứ khiến con vật lê theo sau khi cuộn
  const v = layToaDoDiemDau(sv.diemDau);
  const y = v.y - sv.cauHinh.doCaoDau;
  ctx.doiSangThree(v.x, y, Z_DAU, sv.goc.position);

  const ngoaiManHinh = y < -160 || y > ctx.H + 160;
  sv.goc.visible = !ngoaiManHinh;
  if (ngoaiManHinh) {
    // Người dùng đã cuộn đi chỗ khác: một lúc sau con vật bay vào chỗ họ đang nhìn
    sv.demNgoai += delta;
    if (sv.demNgoai > sv.chiuNgoai) chuyenSangCho(sv, ngauNhien(0.3, 3));
    return;
  }
  sv.demNgoai = 0;

  sv.mixer.update(delta);
  sv.mienKhoiBay -= delta;
  sv.demDau += delta;
  capNhatNghiengDau(sv, delta);
  if (sv.demDau > sv.thoiGianDauToiDa) batDauBay(sv, ctx, null);
}

// Kéo dần đường bay về điểm đậu thật, phòng khi bố cục xê dịch (ảnh bìa tải xong, GSAP đang trượt...)
function canhTheoDiemDauThat(diem, sv, ctx, t) {
  if (!sv.diemDau.el.isConnected) return;
  const that = diemDauTheoTrang(sv, ctx);
  const trongSo = lamMuot((t - BAT_DAU_CANH_DIEM) / (1 - BAT_DAU_CANH_DIEM));
  diem.x += (that.x - sv.quyDao.p3.x) * trongSo;
  diem.y += (that.y - sv.quyDao.p3.y) * trongSo;
}

// Vận tốc (px/giây, toạ độ trang) bằng sai phân hai phía quanh t
function layVanToc(qd, t) {
  const t0 = Math.max(0, t - 0.02);
  const t1 = Math.min(1, t + 0.02);
  const a = layDiemQuyDao(qd, t0);
  const b = layDiemQuyDao(qd, t1);
  const dt = (t1 - t0) * qd.thoiLuong;
  return { x: (b.x - a.x) / dt, y: (b.y - a.y) / dt };
}

// Quay đầu theo hướng bay, ngẩng/cúi theo độ dốc, nghiêng người khi rẽ; gần hạ cánh thì xoay về tư thế đậu
function capNhatTuThe(sv, t, delta) {
  const v = layVanToc(sv.quyDao, t);
  const toc = Math.hypot(v.x, v.y);
  const rot = sv.goc.rotation;
  let yawDich = rot.y;
  let pitchDich = 0;
  if (toc > 25) {
    yawDich = gioiHan(v.x / (toc * 0.6), -1, 1) * (Math.PI / 2);
    pitchDich = -Math.asin(gioiHan(-v.y / toc, -0.85, 0.85)) * 0.55;
  }
  const haCanh = lamMuot((t - 0.72) / 0.28);
  yawDich += (sv.quayY - yawDich) * haCanh;
  pitchDich = pitchDich * (1 - haCanh) + (sv.cauHinh.nghiengDau || 0) * haCanh;

  const nghieng = gioiHan((yawDich - rot.y) * 0.3, -0.35, 0.35) * (1 - haCanh);
  rot.y = lamMem(rot.y, yawDich, 9, delta);
  rot.x = lamMem(rot.x, pitchDich, 8, delta);
  rot.z = lamMem(rot.z, nghieng, 6, delta);
}

function capNhatBay(sv, ctx, delta) {
  sv.tienTrinh = Math.min(1, sv.tienTrinh + delta / sv.quyDao.thoiLuong);
  const t = sv.tienTrinh;

  const diem = layDiemQuyDao(sv.quyDao, t);
  canhTheoDiemDauThat(diem, sv, ctx, t);
  ctx.doiSangThree(diem.x, diem.y - ctx.scrollY, diem.z, sv.goc.position);
  capNhatTuThe(sv, t, delta);

  // Sắp chạm chỗ đậu thì chuyển sang clip đậu để cánh khép lại dần
  if (t >= 0.86 && !sv.daVeTuThe) {
    sv.daVeTuThe = true;
    chuyenHanhDong(sv, 'dau', 0.3);
  }
  // Mới cất cánh thì vỗ cánh gấp hơn một chút cho có lực
  sv.mixer.update(delta * (1 + 0.5 * (1 - lamMuot(t / 0.2))));

  if (t >= 1) vaoTrangThaiDau(sv);
}

export function capNhatSinhVat(sv, ctx, delta) {
  if (sv.trangThai === 'CHO') capNhatCho(sv, ctx, delta);
  else if (sv.trangThai === 'BAY') capNhatBay(sv, ctx, delta);
  else capNhatDau(sv, ctx, delta);
  capNhatPhatSang(sv, delta);
}

// Con nào đang hiện trên màn hình (để bỏ qua việc vẽ và dò chuột thừa cho con chưa vào hoặc đã ra ngoài)
export const dangHienTrenMan = (sv) => sv.trangThai !== 'CHO' && sv.goc.visible;
