import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MathUtils } from 'three';
import DomDom from './DomDom';

/** Số ngẫu nhiên có hạt giống: cùng một đàn mỗi lần tải trang, không nhảy vị trí khi render lại. */
function ngauNhien(hat) {
  let a = hat >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function taoThongSo(soCon, hat) {
  const ngau = ngauNhien(hat);
  return Array.from({ length: soCon }, () => ({
    tamX: (ngau() - 0.5) * 1.7,           // tâm lượn, tính theo nửa bề rộng khung nhìn (-1..1)
    tamY: (ngau() - 0.5) * 1.5,
    bienX: 0.08 + ngau() * 0.14,
    bienY: 0.06 + ngau() * 0.12,
    tanX: 0.12 + ngau() * 0.22,           // tần số lượn (rad/giây), chậm cho nhẹ nhàng
    tanY: 0.1 + ngau() * 0.2,
    phaX: ngau() * Math.PI * 2,
    phaY: ngau() * Math.PI * 2,
    z: -0.5 + ngau() * 1.5,
    pha: ngau(),
    tiLe: 0.55 + ngau() * 0.35,
  }));
}

/**
 * Đàn đom đóm lượn lờ khắp khung nhìn; khi chuột lại gần thì tản ra, chuột đi xa thì tụ lại.
 * Chuyển động của cả đàn chạy trong MỘT useFrame (không mỗi con một vòng lặp) cho nhẹ.
 * Tọa độ tính theo đơn vị của cảnh R3F (viewport tại z=0).
 */
export default function DanDomDom({ soCon = 12, hat = 7, banKinhNeChuot = 0.22, doSang = 1 }) {
  const thongSo = useMemo(() => taoThongSo(soCon, hat), [soCon, hat]);
  const nhom = useRef([]);
  const lech = useRef(thongSo.map(() => ({ x: 0, y: 0 })));
  const viTriTruoc = useRef(thongSo.map(() => ({ x: 0, y: 0 })));
  const { viewport } = useThree();

  useFrame(({ clock, pointer }, dt) => {
    const t = clock.elapsedTime;
    const nuaRong = viewport.width / 2;
    const nuaCao = viewport.height / 2;
    const chuot = { x: pointer.x * nuaRong, y: pointer.y * nuaCao };
    const banKinh = banKinhNeChuot * nuaCao;
    const dtAnToan = Math.min(dt, 0.05);

    thongSo.forEach((ts, i) => {
      const con = nhom.current[i];
      if (!con) return;
      const mucTieuX = (ts.tamX + ts.bienX * Math.sin(t * ts.tanX + ts.phaX)) * nuaRong;
      const mucTieuY = (ts.tamY + ts.bienY * Math.sin(t * ts.tanY + ts.phaY)) * nuaCao;

      // Đẩy ra khỏi con trỏ: càng gần đẩy càng mạnh; độ lệch tự êm về 0 khi chuột xa
      const dx = mucTieuX - chuot.x;
      const dy = mucTieuY - chuot.y;
      const xa = Math.hypot(dx, dy) || 1;
      const luc = Math.max(0, banKinh - xa) / banKinh;
      const l = lech.current[i];
      l.x = MathUtils.damp(l.x, (dx / xa) * luc * banKinh * 1.6, 3, dtAnToan);
      l.y = MathUtils.damp(l.y, (dy / xa) * luc * banKinh * 1.6, 3, dtAnToan);

      const x = mucTieuX + l.x;
      const y = mucTieuY + l.y;
      const vx = (x - viTriTruoc.current[i].x) / Math.max(dtAnToan, 1e-4);
      viTriTruoc.current[i] = { x, y };
      con.position.set(x, y, ts.z);

      // Quay mặt theo hướng bay ngang, hơi ngả về trước để thấy lưng và cánh
      con.rotation.y = MathUtils.damp(con.rotation.y, Math.sign(vx || 1) * Math.min(1, Math.abs(vx) * 0.5) * 1.1, 4, dtAnToan);
      con.rotation.x = -0.45;
    });
  });

  return (
    <>
      {thongSo.map((ts, i) => (
        <DomDom
          key={i}
          ref={(g) => { nhom.current[i] = g; }}
          pha={ts.pha}
          tiLe={ts.tiLe}
          doSang={doSang}
          nhipChop={1.6 + ts.pha * 1.4}
          rotation-order="YXZ"
        />
      ))}
    </>
  );
}
