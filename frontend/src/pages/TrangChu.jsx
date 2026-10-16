import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams, Link, useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import api from '../services/api';
import useCartStore from '../stores/cartStore';
import KeSachCuonNgang from '../components/KeSachCuonNgang';
import PhanTrang from '../components/PhanTrang';
import HomeAtmosphere from '../components/HomeAtmosphere';
import { useGiamChuyenDong } from '../utils/chuyenDong';
import { getLenis } from '../utils/lenis';
import { khiRemMo } from '../utils/nhipMoTrang';
import { useThongBao, ThongBaoTaiCho, loiTuApi } from '@booknest/shared/thongbao';

gsap.registerPlugin(useGSAP);

const SinhVatTrangChuCanvas = lazy(() => import('../components/canvas/SinhVatTrangChuCanvas'));

// Tuyển tập danh ngôn văn học kinh điển về sách & tri thức
const DANH_NGON_SACH = [
  {
    cauNoi: 'Tôi luôn mường tượng rằng Thiên đường sẽ là một kiểu Thư viện.',
    tacGia: 'Jorge Luis Borges'
  },
  {
    cauNoi: 'Một cuốn sách hay trên giá sách là người bạn dù quay lưng lại vẫn là bạn tốt.',
    tacGia: 'Tục ngữ phương Tây'
  },
  {
    cauNoi: 'Đọc sách không chỉ để giết thời gian, mà là để sống thêm nhiều cuộc đời khác.',
    tacGia: 'George R.R. Martin'
  },
  {
    cauNoi: 'Sách là con tàu chở tư tưởng vượt qua sóng gió thời gian.',
    tacGia: 'Francis Bacon'
  },
  {
    cauNoi: 'Một căn phòng không có sách giống như một thân thể thiếu vắng linh hồn.',
    tacGia: 'Marcus Tullius Cicero'
  },
  {
    cauNoi: 'Đọc sách là trò chuyện với những bộ óc thông thái nhất của các thế kỷ đã qua.',
    tacGia: 'René Descartes'
  }
];

// Whitelist các kiểu sắp xếp hợp lệ được hỗ trợ bởi hệ thống
const CAC_KIEU_SAP_XEP_HOP_LE = ['newest', 'price_asc', 'price_desc', 'random'];

export const TrangChu = () => {
  const { themVaoGio } = useCartStore();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const heroRef = useRef(null);
  const [giamChuyenDong] = useGiamChuyenDong();

  // Đọc kiểu sắp xếp từ URL và kiểm tra tính hợp lệ (không fallback ngầm)
  const kieuSapXepRaw = searchParams.get('sort') || '';
  const kieuSapXepHopLe = !kieuSapXepRaw || CAC_KIEU_SAP_XEP_HOP_LE.includes(kieuSapXepRaw);
  const kieuSapXep = CAC_KIEU_SAP_XEP_HOP_LE.includes(kieuSapXepRaw) ? kieuSapXepRaw : '';

  // Đọc query param từ URL (tìm kiếm hoặc lọc danh mục hoặc sắp xếp từ liên kết xem thêm)
  const tuKhoaTimKiem = searchParams.get('search') || '';
  const danhMucId = searchParams.get('categoryId') || '';
  const hasPageParam = searchParams.has('page');
  const trangHienTai = parseInt(searchParams.get('page') || '1', 10);

  // Danh ngôn ngẫu nhiên mỗi lần tải trang
  const [danhNgonHienTai] = useState(() => {
    const idx = Math.floor(Math.random() * DANH_NGON_SACH.length);
    return DANH_NGON_SACH[idx];
  });

  // Cuốn sách tiêu điểm (Trang Sách Hôm Nay) được chọn ngẫu nhiên thật sự
  const [sachSpotlight, setSachSpotlight] = useState(null);

  // Trạng thái cho chế độ 6 Kệ Sách Động (Trang chủ mặc định)
  const [dangTaiKe, setDangTaiKe] = useState(true);
  const [loiKeSach, setLoiKeSach] = useState('');
  const [sachMoi, setSachMoi] = useState([]);
  const [sachManga, setSachManga] = useState([]);
  const [sachDeal, setSachDeal] = useState([]);
  const [sachTacGia, setSachTacGia] = useState([]);
  const [sachVanHoc, setSachVanHoc] = useState([]);
  const [sachRandom, setSachRandom] = useState([]);

  // Tiêu đề và liên kết động cho các kệ
  const [tieuDeManga, setTieuDeManga] = useState('Series Truyện & Manga Nổi Bật');
  const [linkManga, setLinkManga] = useState('/?categoryId=3');
  const [tieuDeVanHoc, setTieuDeVanHoc] = useState('Văn Học & Tiểu Thuyết Chọn Lọc');
  const [linkVanHoc, setLinkVanHoc] = useState('/?categoryId=1');
  const [tieuDeTacGia, setTieuDeTacGia] = useState('Tác Giả Tiêu Điểm: Tô Hoài');
  const [linkTacGia, setLinkTacGia] = useState('/?search=Tô Hoài');
  const [tongSoTrangSach, setTongSoTrangSach] = useState(1);
  const [lanTaiLaiKe, setLanTaiLaiKe] = useState(0);

  // Trạng thái cho chế độ Lọc / Tìm Kiếm có phân trang
  const [sachLocList, setSachLocList] = useState([]);
  const [phanTrangLoc, setPhanTrangLoc] = useState(null);
  const [dangTaiLoc, setDangTaiLoc] = useState(false);
  const [loiLoc, setLoiLoc] = useState('');
  const [lanTaiLaiLoc, setLanTaiLaiLoc] = useState(0);
  const [tenDanhMucHienTai, setTenDanhMucHienTai] = useState('');

  const { thongBao: tb } = useThongBao();

  // Kiểm tra xem có đang ở chế độ lọc/tìm kiếm/sắp xếp không
  const laCheDoLoc = Boolean(tuKhoaTimKiem || danhMucId || kieuSapXepRaw);

  // Hiệu ứng GSAP mở màn cho Hero Section
  useGSAP(() => {
    if (laCheDoLoc || !heroRef.current) return;

    // Tạm dừng để đợi rèm PageLoader trượt lên mới chạy, chữ không diễn xong khi còn bị rèm che
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, paused: true });

    tl.from('.home-eyebrow', {
      opacity: 0,
      y: 12,
      duration: 0.65
    })
    .from('.hero-brand', {
      opacity: 0,
      y: 35,
      duration: 1
    })
    .from('.hero-slogan', {
      opacity: 0,
      y: 20,
      duration: 0.85
    }, '-=0.6')
    .from('.hero-text', {
      opacity: 0,
      y: 18,
      duration: 0.85
    }, '-=0.6')
    .from('.hero-buttons', {
      opacity: 0,
      y: 15,
      duration: 0.8
    }, '-=0.5')
    .from('.hero-spotlight', {
      opacity: 0,
      scale: 0.94,
      y: 25,
      rotation: -1.2,
      duration: 1
    }, '-=0.9');
    if (giamChuyenDong) {
      tl.progress(1);
      return undefined;
    }
    return khiRemMo(() => tl.play());
  }, { scope: heroRef, dependencies: [laCheDoLoc, giamChuyenDong] });

  // Cuộn mượt xuống kệ sách bằng Lenis
  const handleCuonKeSach = () => {
    const lenis = getLenis();
    if (lenis) {
      lenis.scrollTo('#ke-sach-danh-muc', {
        offset: -20,
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
      });
    } else {
      document.getElementById('ke-sach-danh-muc')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Thêm nhanh vào giỏ hàng qua Zustand Store (Truyền đủ thông tin sách chống lỗi fallback 0đ)
  const handleThemVaoGio = async (maSach, tieuDe, thongTinSach = null) => {
    const ketQua = await themVaoGio(maSach, 1, thongTinSach);
    if (ketQua.thanhCong) {
      tb.thanhCong(`Đã thêm "${tieuDe}" vào giỏ hàng`);
    } else {
      tb.canhBao(ketQua.thongDiep || 'Không thể thêm vào giỏ hàng');
    }
  };

  // 1. Tải dữ liệu cho 6 Kệ Sách Động (Trang chủ mặc định)
  useEffect(() => {
    if (laCheDoLoc) return;
    let daHuy = false;

    const napKe = async () => {
      setDangTaiKe(true);
      setLoiKeSach('');
      try {
        // Tải danh mục và sách mới nhất trước để xác định cấu trúc dữ liệu thực tế
        const [resMoi, resCats] = await Promise.all([
          api.get('/books', { params: { limit: 12, sort: 'newest' } }),
          api.get('/categories')
        ]);

        if (daHuy) return;
        const listMoi = resMoi.data.data?.danhSach || [];
        const maxPages = resMoi.data.data?.phanTrang?.tongSoTrang || 1;
        setTongSoTrangSach(maxPages);

        const listCats = resCats.data?.data || [];
        // Xác định động danh mục Manga / Truyện tranh hoặc danh mục đầu tiên
        const catManga = listCats.find(c => /manga|truyện/i.test(c.TenDanhMuc)) || listCats[0];
        // Xác định động danh mục Văn học hoặc danh mục thứ 2
        const catVanHoc = listCats.find(c => c.MaDanhMuc !== catManga?.MaDanhMuc && /văn học|tiểu thuyết|kỹ năng/i.test(c.TenDanhMuc)) || listCats[1] || catManga;

        if (catManga) {
          setTieuDeManga(catManga.TenDanhMuc);
          setLinkManga(`/?categoryId=${catManga.MaDanhMuc}`);
        }
        if (catVanHoc) {
          setTieuDeVanHoc(catVanHoc.TenDanhMuc);
          setLinkVanHoc(`/?categoryId=${catVanHoc.MaDanhMuc}`);
        }

        // Tìm tác giả nổi bật từ danh sách sách mới
        const tacGiaTieuDiem = listMoi.find(s => s.TacGia && !/nhiều tác giả/i.test(s.TacGia))?.TacGia || 'Tô Hoài';
        setTieuDeTacGia(`Tác Giả Tiêu Điểm: ${tacGiaTieuDiem}`);
        setLinkTacGia(`/?search=${encodeURIComponent(tacGiaTieuDiem)}`);

        // Bốc ngẫu nhiên trang thực tế trong khoảng [1, maxPages]
        const randomPage = Math.floor(Math.random() * maxPages) + 1;

        const [resManga, resDeal, resTacGia, resVanHoc, resRandom] = await Promise.all([
          catManga ? api.get('/books', { params: { limit: 12, categoryId: catManga.MaDanhMuc } }) : Promise.resolve({ data: { data: { danhSach: [] } } }),
          api.get('/books', { params: { limit: 12, sort: 'price_asc' } }),
          api.get('/books', { params: { limit: 12, search: tacGiaTieuDiem } }),
          catVanHoc ? api.get('/books', { params: { limit: 12, categoryId: catVanHoc.MaDanhMuc } }) : Promise.resolve({ data: { data: { danhSach: [] } } }),
          api.get('/books', { params: { limit: 12, page: randomPage } })
        ]);

        if (daHuy) return;
        const listManga = resManga.data.data?.danhSach || [];
        const listDeal = resDeal.data.data?.danhSach || [];
        const listTacGia = resTacGia.data.data?.danhSach || [];
        const listVanHoc = resVanHoc.data.data?.danhSach || [];
        const listRandom = resRandom.data.data?.danhSach || [];

        setSachMoi(listMoi);
        setSachManga(listManga);
        setSachDeal(listDeal);
        setSachTacGia(listTacGia);
        setSachVanHoc(listVanHoc);
        setSachRandom(listRandom);

        // Bốc ngẫu nhiên 1 cuốn sách tiêu điểm (Spotlight Book) từ kho sách phong phú
        const tapHopSach = [...listRandom, ...listVanHoc, ...listMoi];
        if (tapHopSach.length > 0) {
          const indexNgauNhien = Math.floor(Math.random() * tapHopSach.length);
          setSachSpotlight(tapHopSach[indexNgauNhien]);
        }
      } catch (err) {
        console.error('Lỗi tải các kệ sách:', err);
        if (!daHuy) setLoiKeSach('Không thể tải các kệ sách lúc này. Vui lòng kiểm tra kết nối mạng và thử lại.');
      } finally {
        if (!daHuy) setDangTaiKe(false);
      }
    };

    napKe();
    return () => { daHuy = true; };
  }, [laCheDoLoc, lanTaiLaiKe]);

  // Tráo danh sách ngẫu nhiên cho Kệ 6 dựa trên tổng số trang thực tế
  const handleTraoRandom = async () => {
    try {
      const maxPages = tongSoTrangSach || 1;
      const randomPage = Math.floor(Math.random() * maxPages) + 1;
      const res = await api.get('/books', { params: { limit: 12, page: randomPage } });
      setSachRandom(res.data.data?.danhSach || []);
    } catch (err) {
      console.error('Lỗi tráo gợi ý:', err);
    }
  };

  // 2. Tải dữ liệu khi có Tìm Kiếm hoặc Lọc Danh Mục / Sắp Xếp
  useEffect(() => {
    if (!laCheDoLoc) return;

    window.scrollTo({ top: 0, behavior: 'smooth' });
    let daHuy = false;
    const taiDuLieuLoc = async () => {
      setDangTaiLoc(true);
      setLoiLoc('');
      let dangChuyenTrangRandom = false;

      // Nếu có kiểu sắp xếp trên URL nhưng không thuộc whitelist hợp lệ -> báo lỗi minh bạch, không fallback ngầm
      if (kieuSapXepRaw && !kieuSapXepHopLe) {
        setDangTaiLoc(false);
        setLoiLoc(`Kiểu sắp xếp "${kieuSapXepRaw}" không hợp lệ. Vui lòng chọn một trong các kiểu: Mới nhất, Giá tăng dần, Giá giảm dần hoặc Gợi ý ngẫu nhiên.`);
        return;
      }

      try {
        // Xử lý riêng cho trường hợp ?sort=random
        if (kieuSapXep === 'random') {
          // Nếu URL chưa có page (người dùng vừa vào /?sort=random lần đầu)
          if (!hasPageParam) {
            // Lấy metadata tổng số trang thực tế từ server
            const resTong = await api.get('/books', { params: { limit: 16, page: 1 } });
            if (daHuy) return;
            const tongTrang = resTong.data.data?.phanTrang?.tongSoTrang || 1;
            setTongSoTrangSach(tongTrang);
            const randomPage = tongTrang > 1 ? Math.floor(Math.random() * tongTrang) + 1 : 1;
            if (randomPage !== 1) {
              dangChuyenTrangRandom = true;
              // Cập nhật page lên URL để đồng bộ với thanh phân trang và kích hoạt tải trang đó
              // Giữ dangTaiLoc = true để tránh nhá khung "Không tìm thấy cuốn sách nào" trước khi dữ liệu trang ngẫu nhiên kịp tải
              const paramsMoi = new URLSearchParams(searchParams);
              paramsMoi.set('page', String(randomPage));
              setSearchParams(paramsMoi, { replace: true });
              return;
            }
            // Nếu chỉ có 1 trang thì hiển thị luôn
            setSachLocList(resTong.data.data?.danhSach || []);
            setPhanTrangLoc(resTong.data.data?.phanTrang || null);
            return;
          }
        }

        const params = {
          page: trangHienTai,
          limit: 16
        };
        if (tuKhoaTimKiem) params.search = tuKhoaTimKiem;
        if (danhMucId) params.categoryId = Number(danhMucId);
        if (kieuSapXep && kieuSapXep !== 'random') params.sort = kieuSapXep;

        const [resBooks, resCats] = await Promise.all([
          api.get('/books', { params }),
          danhMucId ? api.get('/categories') : Promise.resolve(null)
        ]);

        if (daHuy) return;

        setSachLocList(resBooks.data.data?.danhSach || []);
        setPhanTrangLoc(resBooks.data.data?.phanTrang || null);

        if (resCats) {
          const listCats = resCats.data.data || [];
          const curCat = listCats.find(c => c.MaDanhMuc === Number(danhMucId));
          setTenDanhMucHienTai(curCat ? curCat.TenDanhMuc : 'Danh mục sách');
        }
      } catch (err) {
        console.error('Lỗi tải dữ liệu lọc:', err);
        if (!daHuy) {
          setLoiLoc(loiTuApi(err, 'Không thể tải danh sách sách. Vui lòng thử lại sau.'));
        }
      } finally {
        if (!daHuy && !dangChuyenTrangRandom) setDangTaiLoc(false);
      }
    };

    taiDuLieuLoc();
    return () => { daHuy = true; };
  }, [laCheDoLoc, tuKhoaTimKiem, danhMucId, kieuSapXep, kieuSapXepRaw, kieuSapXepHopLe, trangHienTai, hasPageParam, lanTaiLaiLoc]);

  return (
    <div className="home-page" style={{ minHeight: '80vh', paddingBottom: '3.5rem' }}>
      {/* Đàn sinh vật 3D: ban ngày chim bướm chuồn chuồn ong, ban đêm đom đóm và dơi (cùng một engine, tự đổi theo giao diện) */}
      {!laCheDoLoc && (
        <Suspense fallback={null}><SinhVatTrangChuCanvas /></Suspense>
      )}

      {/* ============================================================== */}
      {/* HERO SECTION TOÀN MÀN HÌNH (BỐ CỤC 2 CỘT TỐI GIẢN) */}
      {/* ============================================================== */}
      {!laCheDoLoc && (
        <section ref={heroRef} className="home-hero">
          <HomeAtmosphere heroRef={heroRef} />
          {/* Khối nội dung 2 cột: Bên Trái (Thương hiệu & Đoạn thơ) - Bên Phải (Tác phẩm & Danh ngôn) */}
          <div className="home-hero-content">
            {/* CỘT TRÁI: Chữ BookNest lớn & Slogan thơ thi vị */}
            <div className="home-hero-copy">
              <div className="home-eyebrow"><span /> MỞ MỘT TRANG, CHẠM MỘT THẾ GIỚI</div>
              <h1 className="font-fleur hero-brand" style={{
                fontSize: 'clamp(4.5rem, 8.5vw, 6.5rem)',
                lineHeight: 1.05,
                color: 'var(--text-main)',
                marginBottom: '1rem',
                letterSpacing: '0.01em'
              }}>
                Book<span style={{ color: 'var(--primary)' }}>Nest</span>
              </h1>

              <p className="hero-slogan" style={{
                fontSize: '1.35rem',
                fontWeight: 600,
                color: 'var(--text-main)',
                lineHeight: 1.45,
                marginBottom: '1rem',
                fontStyle: 'italic'
              }}>
                "Tổ ấm của những trang sách, chốn bình yên của tâm hồn."
              </p>

              <p className="hero-text" style={{
                fontSize: '1rem',
                color: 'var(--text-muted)',
                lineHeight: 1.85,
                marginBottom: '2rem',
                maxWidth: '560px'
              }}>
                Có những ngày ngoài kia thế gian quá đỗi ồn ào và vội vã, ta chỉ ước được ngồi lại bên tách cà phê ấm, lắng nghe tiếng xào xạc của từng trang giấy mở ra một chân trời mới. Ở BookNest, mỗi cuốn sách không chỉ là những con chữ in trên giấy, mà là một cuộc hạnh ngộ dịu dàng, một chiếc tổ nhỏ chở che những rung cảm tinh khôi giữa dòng đời náo nhiệt.
              </p>

              {/* Nút điều hướng */}
              <div className="hero-buttons">
                <button
                  onClick={handleCuonKeSach}
                  className="home-explore-button"
                >
                  <span>Khám phá các kệ sách</span>
                  <span>&darr;</span>
                </button>
              </div>
            </div>

            {/* CỘT PHẢI: Góc Trưng Bày Cuốn Sách Của Ngày & Danh Ngôn Trang Sách */}
            <div className="home-spotlight-wrap">
              <div className="hero-spotlight home-spotlight">
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1.25rem',
                  paddingBottom: '0.6rem',
                  borderBottom: '1px solid var(--border)'
                }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    Trang Sách Hôm Nay
                  </span>
                  <span style={{
                    fontSize: '0.78rem',
                    color: 'var(--primary-text)',
                    fontWeight: 600,
                    backgroundColor: 'var(--primary)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    Chọn lọc
                  </span>
                </div>

                {/* Bìa sách nổi bật ngẫu nhiên */}
                {sachSpotlight || sachVanHoc[0] || sachMoi[0] ? (
                  (() => {
                    const sachVip = sachSpotlight || sachVanHoc[0] || sachMoi[0];
                    return (
                      <Link 
                        to={`/books/${sachVip.MaSach}`} 
                        state={{ from: location.pathname + location.search }}
                        style={{ display: 'block' }}
                      >
                        <div style={{
                          width: '180px',
                          aspectRatio: '3 / 4',
                          margin: '0 auto 1.25rem',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          boxShadow: '0 10px 25px rgba(76, 69, 65, 0.22)',
                          transition: 'transform 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          <img
                            src={sachVip.AnhBia}
                            alt={sachVip.TenSach}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                        <h3 style={{
                          fontSize: '1rem',
                          fontWeight: 700,
                          color: 'var(--text-main)',
                          textAlign: 'center',
                          marginBottom: '0.25rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }} title={sachVip.TenSach}>
                          {sachVip.TenSach}
                        </h3>
                        <p style={{
                          fontSize: '0.82rem',
                          color: 'var(--text-muted)',
                          textAlign: 'center',
                          marginBottom: '1.25rem'
                        }}>
                          {lamSachChuoi(sachVip.TacGia)}
                        </p>
                      </Link>
                    );
                  })()
                ) : (
                  <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    Đang nạp tác phẩm...
                  </div>
                )}

                {/* Danh ngôn văn học thi vị (Ngẫu nhiên mỗi lần ghé thăm) */}
                <div style={{
                  backgroundColor: 'var(--bg-surface)',
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  borderLeft: '3px solid var(--primary)',
                  fontSize: '0.85rem',
                  color: 'var(--text-main)',
                  fontStyle: 'italic',
                  lineHeight: 1.55
                }}>
                  "{danhNgonHienTai.cauNoi}"
                  <div style={{ textAlign: 'right', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem', fontStyle: 'normal', fontWeight: 600 }}>
                    — {danhNgonHienTai.tacGia}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* 6 KỆ SÁCH ĐỘNG (CUỘN NGANG VỚI NÚT TRÁI - PHẢI NỔI BẬT) */}
      {/* ============================================================== */}
      {!laCheDoLoc ? (
        <div id="ke-sach-danh-muc" className="container" style={{ padding: '2.5rem 1rem 0' }}>
          {loiKeSach ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 1rem', maxWidth: '480px', margin: '0 auto' }}>
              <div className="mb-4">
                <ThongBaoTaiCho loai="loi">
                  {loiKeSach}
                </ThongBaoTaiCho>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => setLanTaiLaiKe(prev => prev + 1)}
                  className="btn btn-primary"
                  style={{ borderRadius: '6px' }}
                >
                  Thử lại
                </button>
              </div>
            </div>
          ) : dangTaiKe ? (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
              Đang chuẩn bị các kệ sách...
            </div>
          ) : (
            <>
              {/* Kệ 1: Sách Mới Cập Bến */}
              <KeSachCuonNgang
                tieuDe="Sách Mới Cập Bến"
                linkXemThem="/?sort=newest"
                danhSachSach={sachMoi}
                onThemVaoGio={handleThemVaoGio}
              />

              {/* Kệ 2: Series Truyện & Manga Nổi Bật (hoặc Danh mục nổi bật 1) */}
              <KeSachCuonNgang
                tieuDe={tieuDeManga}
                linkXemThem={linkManga}
                danhSachSach={sachManga}
                onThemVaoGio={handleThemVaoGio}
              />

              {/* Kệ 3: Góc Săn Deal - Giá Tốt Mỗi Ngày */}
              <KeSachCuonNgang
                tieuDe="Góc Săn Deal - Giá Tốt Mỗi Ngày"
                linkXemThem="/?sort=price_asc"
                danhSachSach={sachDeal}
                onThemVaoGio={handleThemVaoGio}
              />

              {/* Kệ 4: Tác Giả Tiêu Điểm */}
              <KeSachCuonNgang
                tieuDe={tieuDeTacGia}
                linkXemThem={linkTacGia}
                danhSachSach={sachTacGia}
                onThemVaoGio={handleThemVaoGio}
              />

              {/* Kệ 5: Văn Học & Tiểu Thuyết Chọn Lọc (hoặc Danh mục nổi bật 2) */}
              <KeSachCuonNgang
                tieuDe={tieuDeVanHoc}
                linkXemThem={linkVanHoc}
                danhSachSach={sachVanHoc}
                onThemVaoGio={handleThemVaoGio}
              />

              {/* Kệ 6: Hôm Nay Đọc Gì? (Khám Phá Ngẫu Nhiên) */}
              <KeSachCuonNgang
                tieuDe="Hôm Nay Đọc Gì?"
                linkXemThem="/?sort=random"
                danhSachSach={sachRandom}
                onThemVaoGio={handleThemVaoGio}
                extraAction={
                  <button
                    onClick={handleTraoRandom}
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      backgroundColor: 'transparent',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.2rem 0.6rem',
                      color: 'var(--text-muted)',
                      cursor: 'pointer'
                    }}
                  >
                    Đổi gợi ý khác
                  </button>
                }
              />
            </>
          )}
        </div>
      ) : (
        /* ============================================================== */
        /* TRƯỜNG HỢP B: CHẾ ĐỘ KHO SÁCH / KẾT QUẢ TÌM KIẾM / LỌC DANH MỤC */
        /* ============================================================== */
        <div className="container" style={{ padding: '1.5rem 1rem' }}>
          {/* Thanh tiêu đề lọc - Căn giữa, to, font Bonheur Royale */}
          <div style={{
            position: 'relative',
            textAlign: 'center',
            marginBottom: '2rem',
            paddingBottom: '1rem',
            borderBottom: '1px solid var(--border)'
          }}>
            <h2 className="font-bonheur" style={{
              fontSize: '3rem',
              color: 'var(--text-main)',
              lineHeight: 1.15,
              margin: 0
            }}>
              {tuKhoaTimKiem ? `Tìm kiếm: "${tuKhoaTimKiem}"` : (
                danhMucId ? (tenDanhMucHienTai || 'Danh Mục Sách') : (
                  kieuSapXep === 'newest' ? 'Sách Mới Phát Hành' :
                  kieuSapXep === 'price_asc' ? 'Ưu Đãi Giá Tốt Nhất' :
                  kieuSapXep === 'price_desc' ? 'Tác Phẩm Đặc Tuyển' :
                  kieuSapXep === 'random' ? 'Gợi Ý Đọc Sách Hôm Nay' :
                  'Kho Sách Chọn Lọc'
                )
              )}
            </h2>
            {phanTrangLoc && (
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.35rem', margin: 0 }}>
                Tìm thấy {phanTrangLoc.tongSoBanGhi} cuốn sách phù hợp
              </p>
            )}

            {kieuSapXep === 'random' && (
              <div style={{ marginTop: '0.65rem' }}>
                <button
                  onClick={() => {
                    const maxP = phanTrangLoc?.tongSoTrang || tongSoTrangSach || 1;
                    const randomPage = Math.floor(Math.random() * maxP) + 1;
                    const paramsMoi = new URLSearchParams(searchParams);
                    paramsMoi.set('page', String(randomPage));
                    setSearchParams(paramsMoi);
                  }}
                  style={{
                    padding: '0.35rem 0.85rem',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    backgroundColor: 'var(--primary)',
                    color: 'var(--primary-text)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  🎲 Đổi gợi ý ngẫu nhiên khác
                </button>
              </div>
            )}

            <Link
              to="/"
              style={{
                position: 'absolute',
                left: 0,
                bottom: '1rem',
                fontSize: '0.88rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                padding: '0.4rem 0.85rem',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-card)'
              }}
            >
              &larr; Về trang chủ
            </Link>
          </div>

          {dangTaiLoc ? (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
              Đang tải danh sách sách...
            </div>
          ) : loiLoc ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem 1.5rem',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              maxWidth: '520px',
              margin: '2rem auto'
            }}>
              <p style={{ color: 'var(--danger)', fontWeight: 600, marginBottom: '1rem', fontSize: '0.95rem' }}>
                {loiLoc}
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button
                  onClick={() => setLanTaiLaiLoc(prev => prev + 1)}
                  style={{
                    padding: '0.5rem 1.2rem',
                    backgroundColor: 'var(--primary)',
                    color: 'var(--primary-text)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Thử tải lại
                </button>
                <Link
                  to="/"
                  style={{
                    padding: '0.5rem 1.2rem',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 600,
                    textDecoration: 'none'
                  }}
                >
                  Về trang chủ
                </Link>
              </div>
            </div>
          ) : sachLocList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
              Không tìm thấy cuốn sách nào phù hợp.
            </div>
          ) : (
            <>
              {/* Lưới sách chuẩn 4-5 cột */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
                gap: '1.25rem',
                marginBottom: '2rem'
              }}>
                {sachLocList.map((sach) => {
                  const giaBan = Number(sach.GiaBan || 0);
                  const coTap = sach.Tap !== null && sach.Tap !== undefined;

                  return (
                    <div
                      key={sach.MaSach}
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.75rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <Link 
                        to={`/books/${sach.MaSach}`} 
                        state={{ from: location.pathname + location.search }}
                        style={{ display: 'block', position: 'relative' }}
                      >
                        <div style={{
                          width: '100%',
                          aspectRatio: '3 / 4',
                          backgroundColor: 'var(--bg-surface)',
                          borderRadius: '4px',
                          overflow: 'hidden',
                          position: 'relative'
                        }}>
                          <img
                            src={sach.AnhBia}
                            alt={sach.TenSach}
                            loading="lazy"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          {coTap && (
                            <span style={{
                              position: 'absolute',
                              top: '6px',
                              right: '6px',
                              backgroundColor: 'rgba(76, 69, 65, 0.85)',
                              color: '#FFF',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              padding: '2px 6px',
                              borderRadius: '4px'
                            }}>
                              Tập {sach.Tap}
                            </span>
                          )}
                        </div>

                        <h3 style={{
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          color: 'var(--text-main)',
                          marginTop: '0.6rem',
                          marginBottom: '0.2rem',
                          lineHeight: '1.3',
                          height: '2.6em',
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }} title={sach.TenSach}>
                          {sach.TenSach}
                        </h3>
                        <p style={{
                          fontSize: '0.78rem',
                          color: 'var(--text-muted)',
                          marginBottom: '0.5rem',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {lamSachChuoi(sach.TacGia)}
                        </p>
                      </Link>

                      <div>
                        <div style={{
                          fontSize: '0.95rem',
                          fontWeight: 700,
                          color: 'var(--danger)',
                          marginBottom: '0.5rem'
                        }}>
                          {giaBan.toLocaleString('vi-VN')} đ
                        </div>
                        <button
                          onClick={() => handleThemVaoGio(sach.MaSach, sach.TenSach, sach)}
                          style={{
                            width: '100%',
                            padding: '0.45rem 0',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            backgroundColor: 'var(--primary)',
                            color: 'var(--primary-text)',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer'
                          }}
                        >
                          Thêm vào giỏ
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Phân trang chuẩn chỉ */}
              {phanTrangLoc && phanTrangLoc.tongSoTrang > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem' }}>
                  <PhanTrang
                    phanTrang={phanTrangLoc}
                    donVi="cuốn sách"
                    onChuyenTrang={(trangMoi) => {
                      const params = new URLSearchParams(searchParams);
                      params.set('page', trangMoi);
                      setSearchParams(params);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default TrangChu;
