import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MathUtils } from 'three';
import Doi from './Doi';

const BO_DIEM_DAN = '.hero-brand, [data-diem-dau="tieu-de-ke"]';

/** Dơi lượn quanh tiêu đề gần vùng đang đọc để cảnh đêm tiếp tục đi xuống cùng các kệ sách. */
export default function DoiTheoNoiDung({ viTri = 0, pha = 0, tiLe = 1, ...conLai }) {
  const nhom = useRef(null);
  const daDatNeo = useRef(false);
  const cacDiemDan = useRef([]);
  const lanQuetCuoi = useRef(0);
  const { viewport } = useThree();

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    const dt = Math.min(delta, 0.05);
    if (t - lanQuetCuoi.current > 0.5) {
      cacDiemDan.current = Array.from(document.querySelectorAll(BO_DIEM_DAN));
      lanQuetCuoi.current = t;
    }

    const giuaMan = window.innerHeight / 2;
    const cacDiemGan = cacDiemDan.current
      .filter((el) => el.isConnected)
      .map((el) => ({ el, khung: el.getBoundingClientRect() }))
      .sort((a, b) => (
        Math.abs(a.khung.top + a.khung.height / 2 - giuaMan)
        - Math.abs(b.khung.top + b.khung.height / 2 - giuaMan)
      ));
    const diem = cacDiemGan[Math.min(viTri, cacDiemGan.length - 1)];
    if (!nhom.current) return;
    nhom.current.visible = Boolean(diem);
    if (!diem) return;

    const ben = viTri % 2 === 0 ? 0.9 : 0.1;
    const xMan = diem.khung.left + diem.khung.width * ben + Math.sin(t * 0.34 + pha) * 42;
    const yMan = diem.khung.top + diem.khung.height / 2 + Math.cos(t * 0.29 + pha) * 30;
    const x = (xMan - window.innerWidth / 2) * (viewport.width / window.innerWidth);
    const y = (window.innerHeight / 2 - yMan) * (viewport.height / window.innerHeight);
    if (!daDatNeo.current) {
      nhom.current.position.set(x, y, nhom.current.position.z);
      daDatNeo.current = true;
    }
    const xTruoc = nhom.current.position.x;
    nhom.current.position.x = MathUtils.damp(xTruoc, x, 2.8, dt);
    nhom.current.position.y = MathUtils.damp(nhom.current.position.y, y, 2.8, dt);
    nhom.current.rotation.y = MathUtils.damp(
      nhom.current.rotation.y,
      Math.sign(x - xTruoc || 1) * 0.24,
      2,
      dt
    );
  });

  return <Doi ref={nhom} trangThai="bay" pha={pha} tiLe={tiLe} {...conLai} />;
}
