import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import {
  DANH_SACH_SINH_VAT,
  LOAI_SINH_VAT,
  SO_CON_DAU_NGAY,
  SO_CON_TOI_DA_MAN_HEP
} from './sinhVat/cauHinhSinhVat';
import { napMoHinh, taoSinhVat, huySinhVat } from './sinhVat/taoSinhVat';
import { quetDiemDau } from './sinhVat/diemDau';
import { batDauBay, capNhatSinhVat, datNgayLenDiemDau, dangHienTrenMan } from './sinhVat/hanhViSinhVat';

/**
 * Đàn sinh vật 3D ở Trang chủ: đậu trên chữ / card lớn / kệ sách, bị rê chuột hoặc chạm thì bay đi,
 * đậu lâu cũng tự bay, cuộn trang thì bám theo phần tử mình đang đậu.
 * Chi tiết từng phần nằm trong thư mục sinhVat/. File này chỉ dựng cảnh, nhận chuột và chạy vòng lặp.
 */

const FOV = 45;
const CHU_KY_QUET_DIEM_DAU = 0.7; // giây giữa hai lần quét lại các phần tử có thể đậu

function taoMayVe(container) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 10, 1000);
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  // Ánh sáng 3 tầng để con vật rực rỡ cả ở giao diện sáng lẫn tối
  scene.add(new THREE.HemisphereLight(0xFFF8EC, 0x6E5D67, 2.4));
  const anhSangXien = new THREE.DirectionalLight(0xFFEACC, 2.6);
  anhSangXien.position.set(300, 400, 800);
  scene.add(anhSangXien);
  const anhSangTrucDien = new THREE.DirectionalLight(0xFFFFFF, 1.5);
  anhSangTrucDien.position.set(0, 0, 1000);
  scene.add(anhSangTrucDien);

  return { scene, camera, renderer };
}

// Đặt camera sao cho 1 đơn vị three = 1px ở mặt phẳng z=0, để toạ độ DOM đổi sang cảnh 3D một cách thẳng
function canhKhungNhin(may, ctx) {
  ctx.W = window.innerWidth;
  ctx.H = window.innerHeight;
  ctx.D = (ctx.H / 2) / Math.tan((FOV * Math.PI) / 360);
  ctx.heSoMan = Math.min(1, Math.max(0.7, ctx.W / 1280));

  may.camera.aspect = ctx.W / ctx.H;
  may.camera.position.set(0, 0, ctx.D);
  may.camera.far = ctx.D * 4.5;
  may.camera.updateProjectionMatrix();
  may.renderer.setSize(ctx.W, ctx.H);
}

// Toạ độ khung nhìn (px, y hướng xuống) + độ nổi z -> toạ độ cảnh 3D.
// Vật ở gần camera (z lớn) bị phóng to và lệch ra ngoài do phối cảnh, nên co lại đúng tỉ lệ
// để nó hiện chính xác tại điểm (sx, sy) trên màn hình.
function doiSangThree(ctx, sx, sy, z, ra) {
  const heSo = (ctx.D - z) / ctx.D;
  ra.set((sx - ctx.W / 2) * heSo, (ctx.H / 2 - sy) * heSo, z);
}

async function napDanSinhVat(ctx, scene) {
  const soCon = ctx.W < 768 ? SO_CON_TOI_DA_MAN_HEP : DANH_SACH_SINH_VAT.length;
  const danhSach = DANH_SACH_SINH_VAT.slice(0, soCon);
  const gltfTheoFile = await napMoHinh(danhSach.map((d) => LOAI_SINH_VAT[d.loai].file));

  return danhSach.map((d) => {
    const cauHinh = LOAI_SINH_VAT[d.loai];
    const sv = taoSinhVat(gltfTheoFile.get(cauHinh.file), cauHinh, d.loai, d.mau, ctx.heSoMan);
    scene.add(sv.goc);
    return sv;
  });
}

// Vài con đậu sẵn lúc mở trang, số còn lại bay vào dần theo thời gian
function xepChoLucDau(ctx) {
  ctx.dsSinhVat.forEach((sv, i) => {
    if (i < SO_CON_DAU_NGAY && datNgayLenDiemDau(sv, ctx)) return;
    sv.choDen = 1 + i * 1.8 + Math.random() * 3;
  });
}

function theoDoiChuot() {
  const chuot = { x: 0, y: 0, hoatDong: false, nhan: false };
  const ghiViTri = (e) => { chuot.x = e.clientX; chuot.y = e.clientY; };
  const khiDiChuyen = (e) => { ghiViTri(e); chuot.hoatDong = e.pointerType === 'mouse'; };
  const khiNhan = (e) => { ghiViTri(e); chuot.nhan = true; };
  const khiRoiTrang = () => { chuot.hoatDong = false; };

  window.addEventListener('pointermove', khiDiChuyen, { passive: true });
  window.addEventListener('pointerdown', khiNhan, { passive: true });
  document.documentElement.addEventListener('mouseleave', khiRoiTrang);

  const huy = () => {
    window.removeEventListener('pointermove', khiDiChuyen);
    window.removeEventListener('pointerdown', khiNhan);
    document.documentElement.removeEventListener('mouseleave', khiRoiTrang);
  };
  return { chuot, huy };
}

// Dò xem chuột có chạm con nào không (mỗi khung hình, nên cuộn trang làm con vật trôi tới chuột cũng tính).
// Rê chuột trúng thì bay; chạm/nhấn thì bay ngay, không cần chờ hết thời gian miễn giật mình.
function xuLyChuot(chuot, ctx, may, tiaDo) {
  if (!chuot.hoatDong && !chuot.nhan) return;
  const laNhan = chuot.nhan;
  chuot.nhan = false;

  tiaDo.ndc.set((chuot.x / ctx.W) * 2 - 1, -(chuot.y / ctx.H) * 2 + 1);
  tiaDo.raycaster.setFromCamera(tiaDo.ndc, may.camera);
  const hitbox = ctx.dsSinhVat.filter(dangHienTrenMan).map((sv) => sv.hitbox);
  const trung = tiaDo.raycaster.intersectObjects(hitbox, false)[0];
  const sv = trung?.object.userData.sinhVat;

  if (sv && sv.trangThai === 'DAU' && (laNhan || sv.mienKhoiBay <= 0)) batDauBay(sv, ctx, chuot);
}

// Chỉ vẽ khi có con đang hiện (và vẽ thêm một lần cuối để xoá khung), đỡ tốn GPU lúc cả đàn ở ngoài màn hình
function veLai(may, ctx) {
  const coCon = ctx.dsSinhVat.some(dangHienTrenMan);
  if (!coCon && !ctx.daVe) return;
  may.renderer.render(may.scene, may.camera);
  ctx.daVe = coCon;
}

function khoiDongSinhVat(container) {
  const may = taoMayVe(container);
  const ctx = { W: 1, H: 1, D: 1, heSoMan: 1, scrollY: 0, dsDiemDau: [], dsSinhVat: [], daVe: false };
  ctx.doiSangThree = (sx, sy, z, ra) => doiSangThree(ctx, sx, sy, z, ra);
  canhKhungNhin(may, ctx);

  const { chuot, huy: huyChuot } = theoDoiChuot();
  const tiaDo = { raycaster: new THREE.Raycaster(), ndc: new THREE.Vector2() };
  let daHuy = false;
  let demQuet = 0;

  const tick = (_time, deltaMs) => {
    const delta = Math.min(deltaMs / 1000, 0.1);
    // Đọc vị trí cuộn trong cùng nhịp với Lenis (xem ghi chú ở dưới) để không lệch một khung hình
    ctx.scrollY = window.scrollY;
    demQuet -= delta;
    if (demQuet <= 0) {
      ctx.dsDiemDau = quetDiemDau();
      demQuet = CHU_KY_QUET_DIEM_DAU;
    }
    xuLyChuot(chuot, ctx, may, tiaDo);
    ctx.dsSinhVat.forEach((sv) => capNhatSinhVat(sv, ctx, delta));
    veLai(may, ctx);
  };

  const khiDoiKichThuoc = () => canhKhungNhin(may, ctx);
  window.addEventListener('resize', khiDoiKichThuoc, { passive: true });

  napDanSinhVat(ctx, may.scene)
    .then((dsSinhVat) => {
      if (daHuy) { dsSinhVat.forEach(huySinhVat); return; }
      ctx.dsSinhVat = dsSinhVat;
      ctx.dsDiemDau = quetDiemDau();
      xepChoLucDau(ctx);
    })
    .catch((loi) => console.error('Lỗi tải mô hình sinh vật 3D:', loi));

  // Lenis cập nhật vị trí cuộn trong gsap.ticker. Nếu mình chạy TRƯỚC Lenis trong cùng khung hình thì
  // đọc được vị trí cũ, con vật lệch một nhịp so với trang và nhìn như bị giật khi cuộn.
  // Hoãn việc đăng ký sang lượt sau để chắc chắn mình xếp sau Lenis (ticker gọi theo thứ tự đăng ký).
  const hen = setTimeout(() => gsap.ticker.add(tick), 0);

  return () => {
    daHuy = true;
    clearTimeout(hen);
    gsap.ticker.remove(tick);
    huyChuot();
    window.removeEventListener('resize', khiDoiKichThuoc);
    ctx.dsSinhVat.forEach(huySinhVat);
    may.renderer.dispose();
    if (may.renderer.domElement.parentNode === container) container.removeChild(may.renderer.domElement);
  };
}

export const SinhVatTrangChuCanvas = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    // Không chặn theo prefers-reduced-motion: nhiều máy Windows tắt "hiệu ứng động" nên trình duyệt luôn báo reduce,
    // chặn theo đó thì đàn sinh vật biến mất hoàn toàn dù chủ dự án muốn có
    if (!container) return undefined;
    return khoiDongSinhVat(container);
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 18,
        overflow: 'hidden'
      }}
    />
  );
};

export default SinhVatTrangChuCanvas;
