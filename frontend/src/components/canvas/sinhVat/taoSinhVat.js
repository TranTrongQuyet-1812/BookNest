import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as nhanBanCoXuong } from 'three/addons/utils/SkeletonUtils.js';

const boNapGlb = new GLTFLoader();

/** Tải mỗi file .glb một lần; các con cùng loài nhân bản từ bản gốc này. Trả Map file -> gltf. */
export async function napMoHinh(danhSachFile) {
  const duyNhat = [...new Set(danhSachFile)];
  const ketQua = await Promise.all(duyNhat.map((file) => boNapGlb.loadAsync(file)));
  return new Map(duyNhat.map((file, i) => [file, ketQua[i]]));
}

// Mỗi con có bộ vật liệu riêng (clone) để đổi màu không ảnh hưởng con khác,
// và để lúc dọn dẹp dispose gọn từng con.
function taoVatLieuRieng(model, bangMau) {
  const daClone = new Map();
  const doi = (vatLieu) => {
    if (!daClone.has(vatLieu)) {
      const moi = vatLieu.clone();
      if (bangMau[vatLieu.name]) moi.color.set(bangMau[vatLieu.name]);
      daClone.set(vatLieu, moi);
    }
    return daClone.get(vatLieu);
  };

  model.traverse((con) => {
    if (!con.isMesh) return;
    con.material = Array.isArray(con.material) ? con.material.map(doi) : doi(con.material);
  });
}

// Quả cầu tàng hình lớn hơn thân con vật một chút để rê chuột / chạm tay trúng cho dễ
function taoHitbox(cauHinhLoai, heSoMan) {
  const hitbox = new THREE.Mesh(
    new THREE.SphereGeometry(cauHinhLoai.hitboxR * heSoMan, 8, 8),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hitbox.position.y = cauHinhLoai.scale * heSoMan * 0.35;
  return hitbox;
}

/** Dựng một con: nhân bản mô hình (có xương), đổi màu, gắn hitbox và bộ phát animation. */
export function taoSinhVat(gltf, cauHinhLoai, loai, bangMau, heSoMan) {
  const model = nhanBanCoXuong(gltf.scene);
  model.scale.setScalar(cauHinhLoai.scale * heSoMan);
  taoVatLieuRieng(model, bangMau || {});

  // Thứ tự YXZ: quay quanh trục đứng trước (hướng đầu), rồi mới ngẩng/cúi theo hướng đầu đó.
  // Mặc định XYZ thì ngẩng/cúi bị tính theo trục màn hình nên con vật quay ngang sẽ nghiêng sai.
  const goc = new THREE.Group();
  goc.rotation.order = 'YXZ';
  goc.add(model);

  const hitbox = taoHitbox(cauHinhLoai, heSoMan);
  goc.add(hitbox);

  const mixer = new THREE.AnimationMixer(model);
  const actions = {};
  gltf.animations.forEach((clip) => { actions[clip.name] = mixer.clipAction(clip); });

  const sv = {
    loai,
    cauHinh: cauHinhLoai,
    goc,
    model,
    hitbox,
    mixer,
    actions,
    hanhDongHienTai: null,
    trangThai: 'CHO', // CHO (chưa hiện) | BAY | DAU
    diemDau: null,
    quyDao: null,
    tienTrinh: 0,
    quayY: 0,
    choDen: 0,
    demDau: 0,
    thoiGianDauToiDa: 0,
    mienKhoiBay: 0,
    demNgoai: 0,
    chiuNgoai: 0,
    demNghieng: 0,
    nghiengXong: 0,
    daVeTuThe: false
  };
  hitbox.userData.sinhVat = sv;
  goc.visible = false;
  return sv;
}

/** Chuyển sang clip khác có hoà trộn; gọi lại đúng clip đang chạy thì không làm gì. */
export function chuyenHanhDong(sv, ten, thoiGian = 0.2) {
  const moi = sv.actions[ten];
  if (!moi || moi === sv.hanhDongHienTai) return;
  moi.reset().fadeIn(thoiGian).play();
  if (sv.hanhDongHienTai) sv.hanhDongHienTai.fadeOut(thoiGian);
  sv.hanhDongHienTai = moi;
}

/** Cho clip đậu chạy từ một pha ngẫu nhiên để cả đàn không vỗ cánh đồng loạt. */
export function chayDauLechPha(sv) {
  chuyenHanhDong(sv, sv.actions.dau ? 'dau' : 'bay', 0.15);
  const clip = sv.hanhDongHienTai?.getClip();
  if (clip) sv.hanhDongHienTai.time = Math.random() * clip.duration;
}

/** Giải phóng vật liệu và hình khối của một con (hình khối dùng chung nhưng dispose nhiều lần vẫn an toàn). */
export function huySinhVat(sv) {
  sv.mixer.stopAllAction();
  sv.goc.traverse((con) => {
    if (!con.isMesh) return;
    con.geometry?.dispose();
    [].concat(con.material).forEach((vl) => vl?.dispose());
  });
}
