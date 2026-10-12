import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

const VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform vec2 uResolution;
  uniform vec2 uCenter;
  uniform float uProgress;
  uniform float uCurrentTheme;
  uniform float uTargetTheme;
  uniform float uTransitioning;

  // 2D Simplex Noise by Stefan Gustavson / Ian McEwan (Ashima Arts)
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(
      0.211324865405187,  // (3.0 - sqrt(3.0)) / 6.0
      0.366025403784439,  // 0.5 * (sqrt(3.0) - 1.0)
      -0.577350269189626, // -1.0 + 2.0 * C.x
      0.024390243902439   // 1.0 / 41.0
    );
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  // Fast 2D Cellular/Worley noise (Mô phỏng chân thực các hạt sần/dimples múp míp ép nỉ của giấy Cold-Press)
  vec2 hash22(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453123);
  }

  float cellularTooth(vec2 p) {
    vec2 n = floor(p);
    vec2 f = fract(p);
    float d1 = 1.0;
    float d2 = 1.0;
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 g = vec2(float(i), float(j));
        vec2 o = hash22(n + g);
        vec2 r = g + o - f;
        float d = dot(r, r);
        if (d < d1) {
          d2 = d1;
          d1 = d;
        } else if (d < d2) {
          d2 = d;
        }
      }
    }
    float cellPeak = 1.0 - clamp(sqrt(d1), 0.0, 1.0);
    float cellBorder = clamp(sqrt(d2) - sqrt(d1), 0.0, 1.0);
    return cellPeak * 0.65 + cellBorder * 0.35;
  }

  // 1. Structural Paper Topography (Độ sần hạt vi mô của giấy màu nước Cold-Press 300gsm cao cấp - Tối ưu 1 pass)
  float getPaperHeight(vec2 p) {
    // Macro Flocculation: Độ mây/ngưng tụ tự nhiên của bột bông cotton
    float flocc = snoise(p * 5.0) * 0.60 + snoise(p * 11.0) * 0.30;

    // Felt Blanket Granulation (Hạt sần múp míp dạng cellular do thảm nỉ ép len)
    vec2 warp = vec2(snoise(p * 18.0), snoise(p * 18.0 + vec2(4.3, 2.1))) * 0.14;
    vec2 wp = p + warp;
    float tooth = cellularTooth(wp * 26.0);

    // Micro Pulp Grit: Độ nhám sần vi mô mịn màng
    float micro = snoise(p * 105.0) * 0.5 + 0.5;

    return tooth * 0.65 + micro * 0.18 + (flocc * 0.5 + 0.5) * 0.17;
  }

  // 2. Natural Cellulose Fibrils (Xơ sợi cotton hữu cơ tự nhiên thưa thớt, mộc mạc)
  float sampleFiber(vec2 p, float angle, float freqLong, float freqCross) {
    float c = cos(angle), s = sin(angle);
    vec2 rP = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
    rP.y += sin(rP.x * 6.0) * 0.05;
    vec2 fCoord = vec2(rP.x * freqLong, rP.y * freqCross);
    float n = snoise(fCoord);
    return smoothstep(0.90, 0.995, abs(n));
  }

  vec2 getNaturalFibers(vec2 p) {
    float f1 = sampleFiber(p, 0.32, 6.0, 180.0);
    float f2 = sampleFiber(p, 1.25, 7.0, 200.0);
    float f3 = sampleFiber(p, 2.12, 5.5, 170.0);

    float darkFibers = max(f1, f3 * 0.85);
    float brightFibers = f2 * 0.70;
    return vec2(darkFibers, brightFibers);
  }

  // 3. Fine Art Watercolor Paper Palettes (Chuẩn nguyên bản Portfolio)
  // Chế độ Sáng: Giấy kem ấm tự nhiên (Arches Natural White 300gsm)
  const vec3 LIGHT_BASE         = vec3(0.976, 0.963, 0.941); // #FAF5F0 (Kem ấm ngà)
  const vec3 LIGHT_VALLEY_SHD   = vec3(0.910, 0.885, 0.848); // #E8E2D8 (Rãnh hạt sần đổ bóng ấm)
  const vec3 LIGHT_PEAK_HL      = vec3(0.998, 0.995, 0.988); // #FFFDF9 (Gờ hạt đón sáng dịu)
  const vec3 LIGHT_DARK_FIBER   = vec3(0.845, 0.812, 0.760); // #D8CFBF (Xơ cotton chìm)
  const vec3 LIGHT_BRIGHT_FIBER = vec3(1.000, 0.998, 0.995); // Xơ sáng mờ

  // Chế độ Tối: Giấy than chì nghệ nhân mờ lì (Artisanal Matte Charcoal)
  const vec3 DARK_BASE          = vec3(0.071, 0.071, 0.078); // #121214
  const vec3 DARK_VALLEY_SHD    = vec3(0.045, 0.045, 0.052); // #0B0B0D
  const vec3 DARK_PEAK_HL       = vec3(0.108, 0.108, 0.122); // #1C1C1F
  const vec3 DARK_DARK_FIBER    = vec3(0.028, 0.028, 0.035);
  const vec3 DARK_BRIGHT_FIBER  = vec3(0.138, 0.138, 0.155);

  void evaluatePaper(vec2 uv, vec2 res, out vec3 lightCol, out vec3 darkCol, out float outHeight, out vec2 outFibers) {
    vec2 p = uv * vec2(res.x / min(res.x, res.y), res.y / min(res.x, res.y));

    float h = getPaperHeight(p);
    vec2 fibers = getNaturalFibers(p);
    outHeight = h;
    outFibers = fibers;

    // Chiếu sáng xiên & Đổ bóng vi mô (Glancing Directional Relief Lighting)
    float dhx = dFdx(h);
    float dhy = dFdy(h);
    float bumpScale = 18.0;
    vec3 N = normalize(vec3(-dhx * bumpScale, -dhy * bumpScale, 1.0));

    // Nguồn sáng xiên tự nhiên từ góc trên bên trái
    vec3 L = normalize(vec3(-0.35, 0.50, 0.79));
    float diffuse = dot(N, L);

    float relief = (diffuse - 0.79) * 2.0;
    float hollowDepth = (1.0 - h) * 0.40;
    float toothFactor = clamp(relief - hollowDepth, -1.0, 1.0);

    // Phối màu Chế độ Sáng
    if (toothFactor >= 0.0) {
      lightCol = mix(LIGHT_BASE, LIGHT_PEAK_HL, toothFactor * 0.85);
    } else {
      lightCol = mix(LIGHT_BASE, LIGHT_VALLEY_SHD, -toothFactor * 0.90);
    }
    lightCol = mix(lightCol, LIGHT_DARK_FIBER, fibers.x * 0.30);
    lightCol = mix(lightCol, LIGHT_BRIGHT_FIBER, fibers.y * 0.20);

    // Phối màu Chế độ Tối
    if (toothFactor >= 0.0) {
      darkCol = mix(DARK_BASE, DARK_PEAK_HL, toothFactor * 0.80);
    } else {
      darkCol = mix(DARK_BASE, DARK_VALLEY_SHD, -toothFactor * 0.85);
    }
    darkCol = mix(darkCol, DARK_DARK_FIBER, fibers.x * 0.30);
    darkCol = mix(darkCol, DARK_BRIGHT_FIBER, fibers.y * 0.30);
  }

  void main() {
    float h;
    vec2 fib;
    vec3 lightPaper, darkPaper;
    evaluatePaper(vUv, uResolution, lightPaper, darkPaper, h, fib);

    if (uTransitioning < 0.5) {
      vec3 paper = mix(lightPaper, darkPaper, uCurrentTheme);
      gl_FragColor = vec4(paper, 1.0);
      return;
    }

    vec3 sourcePaper = mix(lightPaper, darkPaper, uCurrentTheme);
    vec3 targetPaper = mix(lightPaper, darkPaper, uTargetTheme);

    // 1. Tọa độ cực & lan tỏa giọt mực
    vec2 diff = vUv - uCenter;
    diff.x *= uResolution.x / uResolution.y;
    float dist = length(diff);
    float angle = atan(diff.y, diff.x);

    // Khoảng cách tối đa tới 4 góc màn hình
    float maxDistX = max(uCenter.x, 1.0 - uCenter.x) * (uResolution.x / uResolution.y);
    float maxDistY = max(uCenter.y, 1.0 - uCenter.y);
    float maxDist = length(vec2(maxDistX, maxDistY));

    // 2. Vệt loang bất đối xứng hữu cơ tự nhiên (Harmonic Ink Blot Lobes)
    float blotLobes = sin(angle * 3.0 + 0.8) * 0.09
                    + cos(angle * 5.0 - 1.2) * 0.06
                    + sin(angle * 7.0 + 2.1) * 0.04;

    // 3. Tạp âm mao dẫn giấy ăn sâu vào thớ sợi cotton
    float capillary = (1.0 - h) * 0.09
                    + (fib.x + fib.y) * 0.06
                    + sin(angle * 17.0 + dist * 35.0) * 0.025;

    float perturbation = blotLobes + capillary;

    // 4. Bán kính sóng mực lan tỏa (Wavefront)
    float targetR = uProgress * (maxDist * 1.18);
    float waveFront = targetR + perturbation * min(targetR * 0.35, 0.18);

    // 5. Viền tưa mềm mại thấm vào sợi giấy
    float feather = mix(0.025, 0.075, uProgress);
    float inkMask = smoothstep(waveFront, waveFront - feather, dist);

    // 6. Quầng nước ẩm loang đi trước sắc tố mực (Translucent Water Seepage Rim)
    float wetRim = smoothstep(waveFront - feather * 0.4, waveFront, dist)
                 * smoothstep(waveFront + feather * 0.75, waveFront, dist);

    vec3 wetPaper = (uTargetTheme > 0.5)
      ? sourcePaper * 0.92
      : sourcePaper + vec3(0.035);

    vec3 baseWithWet = mix(sourcePaper, wetPaper, wetRim * 0.65);
    vec3 finalColor = mix(baseWithWet, targetPaper, inkMask);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

// Đường cong SmootherStep (Ken Perlin)
const smootherStep = (t) => {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped * clamped * clamped * (clamped * (clamped * 6 - 15) + 10);
};

export default function PaperBackgroundCanvas() {
  const containerRef = useRef(null);
  const uniformsRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const isInitialDark = document.documentElement.classList.contains('dark');

    // 1. Khởi tạo Three.js Scene, Camera và High-Performance Renderer
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: false,
      alpha: false,
      stencil: false,
      depth: false,
    });
    rendererRef.current = renderer;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);

    // 2. Uniforms điều khiển Shader Material
    const uniforms = {
      uResolution: { value: new THREE.Vector2(width * dpr, height * dpr) },
      uCenter: { value: new THREE.Vector2(0.5, 0.5) },
      uProgress: { value: 0.0 },
      uCurrentTheme: { value: isInitialDark ? 1.0 : 0.0 },
      uTargetTheme: { value: isInitialDark ? 1.0 : 0.0 },
      uTransitioning: { value: 0.0 },
    };
    uniformsRef.current = uniforms;

    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms,
      depthTest: false,
      depthWrite: false,
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const quad = new THREE.Mesh(geometry, material);
    scene.add(quad);

    // Khung hình tĩnh đầu tiên (0% GPU khi không chuyển động)
    renderer.render(scene, camera);

    // 3. Chu trình Giọt Mực Thấm Loang (1350ms - Chuẩn mực nguyên bản Portfolio)
    let animFrameId = null;
    let animStartTime = 0;
    const DURATION = 1350;

    const onInkBleedTrigger = (e) => {
      const { cx, cy, targetDark } = e.detail;

      // Chuẩn hóa tọa độ WebGL (lật Y vì gốc tọa độ WebGL ở góc dưới-trái)
      const normX = cx / window.innerWidth;
      const normY = 1.0 - cy / window.innerHeight;

      uniforms.uCenter.value.set(normX, normY);
      uniforms.uTargetTheme.value = targetDark ? 1.0 : 0.0;
      uniforms.uProgress.value = 0.0;
      uniforms.uTransitioning.value = 1.0;

      if (animFrameId !== null) {
        cancelAnimationFrame(animFrameId);
      }

      animStartTime = performance.now();

      const animate = (now) => {
        const elapsed = now - animStartTime;
        const rawT = Math.min(1.0, elapsed / DURATION);
        const easedT = smootherStep(rawT);

        uniforms.uProgress.value = easedT;
        renderer.render(scene, camera);

        if (rawT < 1.0) {
          animFrameId = requestAnimationFrame(animate);
        } else {
          // Kết thúc chuyển đổi: chốt theme mới và ngắt render loop
          uniforms.uCurrentTheme.value = uniforms.uTargetTheme.value;
          uniforms.uTransitioning.value = 0.0;
          uniforms.uProgress.value = 0.0;
          renderer.render(scene, camera);
          animFrameId = null;
        }
      };

      animFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener('ink-bleed-trigger', onInkBleedTrigger);

    // Đồng bộ theme ngoài nếu có thay đổi từ hệ thống
    const onThemeChanged = (e) => {
      const isDark = e.detail?.isDark;
      if (typeof isDark !== 'boolean') return;
      if (uniforms.uTransitioning.value < 0.5) {
        uniforms.uCurrentTheme.value = isDark ? 1.0 : 0.0;
        uniforms.uTargetTheme.value = isDark ? 1.0 : 0.0;
        renderer.render(scene, camera);
      }
    };
    window.addEventListener('booknest-theme-change', onThemeChanged);

    // 4. Xử lý Resize cửa sổ
    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const curDpr = Math.min(window.devicePixelRatio || 1, 1.25);
      renderer.setPixelRatio(curDpr);
      renderer.setSize(w, h);
      uniforms.uResolution.value.set(w * curDpr, h * curDpr);
      renderer.render(scene, camera);
    };

    window.addEventListener('resize', onResize, { passive: true });

    return () => {
      window.removeEventListener('ink-bleed-trigger', onInkBleedTrigger);
      window.removeEventListener('booknest-theme-change', onThemeChanged);
      window.removeEventListener('resize', onResize);
      if (animFrameId !== null) {
        cancelAnimationFrame(animFrameId);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden'
      }}
    />
  );
}
