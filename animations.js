/* =====================================================================
   animations.js – Toàn bộ hoạt ảnh (animations) của Sổ chi tiêu bằng JavaScript
   =====================================================================
   Chuyển toàn bộ hoạt ảnh từ animations.css sang JavaScript để:
     1. Dễ dàng bật/tắt, tạm dừng/tiếp tục, chỉnh tốc độ (speed multiplier) qua JS.
     2. Gọi trực tiếp các hiệu ứng qua hàm: AppAnimations.flash(el), AppAnimations.nudge(el),...
     3. Tự động chạy và điều khiển các hoạt cảnh nền: đồng cỏ, bong bóng biển, sinh vật biển.
     4. Tương thích chuẩn Web Animations API (WAAPI), hiệu năng cao, mượt mà trên mọi thiết bị.
     5. Tự động nhận diện thiết bị bật "giảm chuyển động" (prefers-reduced-motion).
   ===================================================================== */

(function (window, document) {
  'use strict';

  // ========== 1. CẤU HÌNH & TRẠNG THÁI TOÀN CỤC ==========
  const CONFIG = {
    enabled: true,            // Bật/tắt toàn bộ hoạt ảnh
    speed: 1.0,               // Tốc độ: 1.0 = bình thường, 0.5 = chậm một nửa, 2.0 = nhanh gấp đôi
    reducedMotion: false,     // Tự động kiểm tra prefers-reduced-motion, có thể ghi đè bằng tay
    categories: {
      ambient: true,          // Lấp lánh (✦, ✧), sáng viền nút, vệt sáng thanh tiến độ
      ocean: true,            // Bong bóng nổi & ánh sáng mặt nước chuyển động
      meadow: true,           // Cây đu đưa, mây trôi, ngọn cỏ lay, lá rơi trong thẻ ngân sách
      sea: true,              // Cảnh đại dương hai bên trang (cá, rùa, cua, rong biển, sao biển, bụi nước)
      ui: true                // Nháy hàng vừa sửa, rung lắc khi tiêu lố, pháo hoa sao, chữ bay lên, thẻ hiện ra
    }
  };

  // Kiểm tra prefers-reduced-motion của hệ điều hành
  try {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    CONFIG.reducedMotion = !!mq.matches;
    if (mq.addEventListener) {
      mq.addEventListener('change', (e) => {
        CONFIG.reducedMotion = e.matches;
        if (CONFIG.reducedMotion) AppAnimations.pause();
        else if (CONFIG.enabled) AppAnimations.resume();
      });
    }
  } catch (e) {
    CONFIG.reducedMotion = false;
  }

  // Danh sách các animation đang chạy (để pause / resume / setSpeed)
  const activeAnimations = new Set();

  // Helper lấy số từ CSS custom property dạng "16s", "-2s", "120px"
  function parseCssSec(val, defSec) {
    if (!val) return defSec * 1000;
    val = String(val).trim();
    if (val.endsWith('ms')) return parseFloat(val);
    if (val.endsWith('s')) return parseFloat(val) * 1000;
    const n = parseFloat(val);
    return isNaN(n) ? defSec * 1000 : n * 1000;
  }

  // ========== 2. TẬP HỢP TẤT CẢ KEYFRAMES TRONG JAVASCRIPT ==========
  const KEYFRAMES = {
    // 2.1. Chi tiết trang trí nhẹ
    sparkleTurn: [
      { transform: 'rotate(0deg) scale(1)', opacity: 0.85, offset: 0 },
      { transform: 'rotate(0deg) scale(1)', opacity: 0.85, offset: 0.75 },
      { transform: 'rotate(22deg) scale(1.22)', opacity: 1, offset: 0.82 },
      { transform: 'rotate(-12deg) scale(1.08)', offset: 0.90 },
      { transform: 'rotate(0deg) scale(1)', opacity: 0.85, offset: 1 }
    ],
    sparklePulse: [
      { opacity: 0.72, transform: 'scale(1)', offset: 0 },
      { opacity: 1, transform: 'scale(1.18)', offset: 0.5 },
      { opacity: 0.72, transform: 'scale(1)', offset: 1 }
    ],
    floatDecor: [
      { transform: 'translate3d(0, 0, 0)', offset: 0 },
      { transform: 'translate3d(-9px, 8px, 0)', offset: 0.5 },
      { transform: 'translate3d(0, 0, 0)', offset: 1 }
    ],
    fadeLift: [
      { opacity: 0, transform: 'translateY(9px)', offset: 0 },
      { opacity: 1, transform: 'translateY(0)', offset: 1 }
    ],
    numberAppear: [
      { opacity: 0.35, transform: 'translateY(5px) scale(0.985)', offset: 0 },
      { opacity: 1, transform: 'translateY(0) scale(1)', offset: 1 }
    ],
    shineSweep: [
      { left: '-75%', offset: 0 },
      { left: '140%', offset: 1 }
    ],
    softGlow: [
      { backgroundPosition: '0% 50%', offset: 0 },
      { backgroundPosition: '100% 50%', offset: 0.5 },
      { backgroundPosition: '0% 50%', offset: 1 }
    ],
    checkPop: [
      { transform: 'scale(0.82)', offset: 0 },
      { transform: 'scale(1.12)', offset: 0.7 },
      { transform: 'scale(1)', offset: 1 }
    ],
    toastEnter: [
      { opacity: 0, filter: 'blur(2px)', offset: 0 },
      { opacity: 1, filter: 'blur(0)', offset: 1 }
    ],

    // 2.2. Hoạt ảnh hàng & thẻ
    todayGlow: [
      { boxShadow: '0 0 0 1px rgba(130,196,236,.12), 0 0 0 0 rgba(102,174,232,0)', offset: 0 },
      { boxShadow: '0 0 0 1px rgba(130,196,236,.22), 0 0 0 6px rgba(102,174,232,.13)', offset: 0.5 },
      { boxShadow: '0 0 0 1px rgba(130,196,236,.12), 0 0 0 0 rgba(102,174,232,0)', offset: 1 }
    ],
    rowFlash: [
      { transform: 'scale(1.015)', boxShadow: '0 0 0 0 rgba(102,174,232,.55)', offset: 0 },
      { transform: 'none', boxShadow: '0 0 0 16px rgba(102,174,232,0)', offset: 1 }
    ],
    barShine: [
      { transform: 'translateX(-100%)', offset: 0 },
      { transform: 'translateX(100%)', offset: 0.6 },
      { transform: 'translateX(100%)', offset: 1 }
    ],
    nudge: [
      { transform: 'none', offset: 0 },
      { transform: 'translateX(-5px)', offset: 0.25 },
      { transform: 'translateX(5px)', offset: 0.55 },
      { transform: 'translateX(-2px)', offset: 0.8 },
      { transform: 'none', offset: 1 }
    ],
    popIn: [
      { opacity: 0, transform: 'scale(0.85)', offset: 0 },
      { opacity: 1, transform: 'none', offset: 1 }
    ],
    slideDown: [
      { opacity: 0, transform: 'translateY(-10px)', offset: 0 },
      { opacity: 1, transform: 'none', offset: 1 }
    ],
    floatUp: [
      { opacity: 0, transform: 'translate(-50%,6px) scale(0.9)', offset: 0 },
      { opacity: 1, offset: 0.2 },
      { opacity: 0, transform: 'translate(-50%,-48px) scale(1.04)', offset: 1 }
    ],

    // 2.3. Nền & Đại dương (Ocean Bubbles & Ambient Light)
    oceanBubble: [
      { transform: 'translate3d(0, 0, 0) scale(0.85)', opacity: 0, offset: 0 },
      { opacity: 0.7, offset: 0.12 },
      { transform: 'translate3d(22px, -38vh, 0) scale(1)', opacity: 0.55, offset: 0.4 },
      { transform: 'translate3d(-18px, -76vh, 0) scale(1.08)', opacity: 0.4, offset: 0.7 },
      { transform: 'translate3d(12px, -115vh, 0) scale(1.15)', opacity: 0, offset: 1 }
    ],
    oceanLight: [
      { transform: 'translate3d(-12px, 0, 0) scale(1)', offset: 0 },
      { transform: 'translate3d(35px, 22px, 0) scale(1.12)', offset: 1 }
    ],

    // 2.4. Cảnh đồng cỏ trong thẻ ngân sách (Hero Meadow)
    treeSway: [
      { transform: 'rotate(-1deg)', offset: 0 },
      { transform: 'rotate(1.2deg)', offset: 0.5 },
      { transform: 'rotate(-1deg)', offset: 1 }
    ],
    crownSway: [
      { transform: 'rotate(-1.6deg) translateX(-1px)', offset: 0 },
      { transform: 'rotate(1.8deg) translateX(2px)', offset: 0.5 },
      { transform: 'rotate(-1.6deg) translateX(-1px)', offset: 1 }
    ],
    cloudDrift: [
      { transform: 'translateX(-10px)', offset: 0 },
      { transform: 'translateX(12px)', offset: 1 }
    ],
    tuftSway: [
      { transform: 'rotate(-5deg)', offset: 0 },
      { transform: 'rotate(6deg)', offset: 0.5 },
      { transform: 'rotate(-5deg)', offset: 1 }
    ],
    leafTurn: [
      { transform: 'rotate(-55deg)', offset: 0 },
      { transform: 'rotate(65deg)', offset: 1 }
    ],

    // 2.5. Nút thêm nhanh (#qGo)
    qgoRim: [
      { boxShadow: '0 5px 13px rgba(102,174,232,.25), 0 0 0 0 rgba(190,226,252,0), inset 0 0 0 1px rgba(255,255,255,.35), inset 0 0 10px rgba(255,255,255,.10)', offset: 0 },
      { boxShadow: '0 6px 18px rgba(102,174,232,.38), 0 0 0 3px rgba(190,226,252,.42), inset 0 0 0 1px rgba(255,255,255,.88), inset 0 0 16px rgba(255,255,255,.26)', offset: 0.5 },
      { boxShadow: '0 5px 13px rgba(102,174,232,.25), 0 0 0 0 rgba(190,226,252,0), inset 0 0 0 1px rgba(255,255,255,.35), inset 0 0 10px rgba(255,255,255,.10)', offset: 1 }
    ],
    mirrorSweep: [
      { transform: 'translateX(-130%) skewX(-22deg)', offset: 0 },
      { transform: 'translateX(340%) skewX(-22deg)', offset: 0.42 },
      { transform: 'translateX(340%) skewX(-22deg)', offset: 1 }
    ],
    qgoPop: [
      { transform: 'scale(1)', offset: 0 },
      { transform: 'scale(0.96)', offset: 0.28 },
      { transform: 'scale(1.035)', offset: 0.62 },
      { transform: 'scale(1)', offset: 1 }
    ],

    // 2.6. Biển cả hai bên trang (Under the Sea)
    dustUp: [
      { transform: 'translate(0, 0) scale(0.6)', opacity: 0, offset: 0 },
      { opacity: 0.65, offset: 0.15 },
      { transform: 'translate(12px, -45vh) scale(1)', offset: 0.5 },
      { opacity: 0.4, offset: 0.85 },
      { transform: 'translate(-8px, -100vh) scale(0.7)', opacity: 0, offset: 1 }
    ],
    kelpSway: [
      { transform: 'rotate(-5deg) skewX(-2deg)', offset: 0 },
      { transform: 'rotate(7deg) skewX(3deg)', offset: 1 }
    ],
    grassSway: [
      { transform: 'rotate(-7deg)', offset: 0 },
      { transform: 'rotate(8deg)', offset: 1 }
    ],
    starBreath: [
      { transform: 'scale(1)', offset: 0 },
      { transform: 'scale(1.08)', offset: 1 }
    ],
    fishBob: [
      { transform: 'translateY(-3px) rotate(-2deg)', offset: 0 },
      { transform: 'translateY(3px) rotate(2deg)', offset: 1 }
    ],
    tailWag: [
      { transform: 'rotate(-14deg)', offset: 0 },
      { transform: 'rotate(14deg)', offset: 1 }
    ],
    crabBob: [
      { transform: 'translateY(0)', offset: 0 },
      { transform: 'translateY(-2px)', offset: 1 }
    ],
    clawLift: [
      { transform: 'rotate(-8deg)', offset: 0 },
      { transform: 'rotate(8deg)', offset: 1 }
    ],
    jawSnap: [
      { transform: 'rotate(0)', offset: 0 },
      { transform: 'rotate(0)', offset: 0.65 },
      { transform: 'rotate(-15deg)', offset: 0.76 },
      { transform: 'rotate(2deg)', offset: 0.86 },
      { transform: 'rotate(0)', offset: 1 }
    ],
    legsScuttle: [
      { transform: 'scaleY(0.97)', offset: 0 },
      { transform: 'scaleY(1.03)', offset: 1 }
    ],
    turtleBob: [
      { transform: 'translateY(-7px) rotate(-2deg)', offset: 0 },
      { transform: 'translateY(7px) rotate(2deg)', offset: 1 }
    ],
    flipper: [
      { transform: 'rotate(-15deg)', offset: 0 },
      { transform: 'rotate(14deg)', offset: 1 }
    ]
  };

  // Helper tạo keyframes cho cá bơi ngang (dựa theo --sx và chiều rộng)
  function makeSwimKeyframes(distance) {
    const sx = Math.max(0, distance || 100);
    return [
      { transform: 'translateX(0) scaleX(1)', offset: 0 },
      { transform: `translateX(${sx}px) scaleX(1)`, offset: 0.46 },
      { transform: `translateX(${sx}px) scaleX(-1)`, offset: 0.50 },
      { transform: 'translateX(0) scaleX(-1)', offset: 0.96 },
      { transform: 'translateX(0) scaleX(1)', offset: 1 }
    ];
  }

  // Helper tạo keyframes cho cua bò ngang
  function makeCrabWalkKeyframes(distance) {
    const walk = Math.max(0, distance || 80);
    return [
      { transform: 'translateX(0)', offset: 0 },
      { transform: `translateX(${walk}px)`, offset: 1 }
    ];
  }

  // Helper tạo keyframes cho lá rơi
  function makeLeafFallKeyframes(x0, y0, dx, y1) {
    return [
      { transform: `translate(${x0}px, ${y0}px)`, opacity: 0, offset: 0 },
      { opacity: 0.85, offset: 0.08 },
      { transform: `translate(${x0 + dx * -0.35}px, ${y0 + (y1 - y0) * 0.3}px)`, offset: 0.30 },
      { transform: `translate(${x0 + dx * 0.55}px, ${y0 + (y1 - y0) * 0.62}px)`, offset: 0.62 },
      { opacity: 0.8, offset: 0.88 },
      { transform: `translate(${x0 + dx}px, ${y1}px)`, opacity: 0, offset: 1 }
    ];
  }

  // ========== 3. HÀM CHẠY ANIMATION AN TOÀN (WAAPI WRAPPER) ==========
  function runAnimation(el, keyframes, options, category) {
    if (!el || !CONFIG.enabled || CONFIG.reducedMotion) return null;
    if (category && CONFIG.categories[category] === false) return null;
    if (!el.animate) return null; // trình duyệt quá cũ

    const opt = Object.assign({}, options);
    // Điều chỉnh tốc độ
    if (opt.duration && typeof opt.duration === 'number' && CONFIG.speed > 0) {
      opt.duration = opt.duration / CONFIG.speed;
    }
    if (opt.delay && typeof opt.delay === 'number' && CONFIG.speed > 0) {
      opt.delay = opt.delay / CONFIG.speed;
    }

    try {
      const anim = el.animate(keyframes, opt);
      activeAnimations.add(anim);

      anim.onfinish = () => activeAnimations.delete(anim);
      anim.oncancel = () => activeAnimations.delete(anim);

      return anim;
    } catch (err) {
      // Bỏ qua lỗi trình duyệt nếu không hỗ trợ thuộc tính nào đó
      return null;
    }
  }

  // Quản lý style động cho các pseudo-elements (::before, ::after)
  let dynamicStyleEl = null;
  function updatePseudoStyles() {
    if (!dynamicStyleEl) {
      dynamicStyleEl = document.createElement('style');
      dynamicStyleEl.id = 'app-animations-dynamic';
      document.head.appendChild(dynamicStyleEl);
    }

    if (!CONFIG.enabled || CONFIG.reducedMotion) {
      dynamicStyleEl.textContent = `
        .top h1::after, .hero:before, .hero:after, .hero .lbl::before,
        .btn.primary, #qGo, #qGo::before, .bar > i::after, .bg::before, .bg::after {
          animation: none !important;
        }
      `;
      return;
    }

    const sp = CONFIG.speed || 1.0;
    dynamicStyleEl.textContent = `
      /* Hoạt ảnh pseudo-elements do JS điều khiển */
      .top h1::after { animation: jsSparkleTurn ${4.5 / sp}s ease-in-out infinite !important; }
      .hero:before { animation: jsFloatDecor ${8 / sp}s ease-in-out infinite !important; }
      .hero:after { animation: jsFloatDecor ${7 / sp}s ease-in-out infinite reverse !important; }
      .hero .lbl::before { animation: jsSparklePulse ${2.8 / sp}s ease-in-out infinite !important; }
      .btn.primary { animation: jsSoftGlow ${5 / sp}s ease-in-out infinite !important; }
      #qGo { animation: jsSoftGlow ${5 / sp}s ease-in-out infinite, jsQgoRim ${3.4 / sp}s ease-in-out infinite !important; }
      #qGo::before { animation: jsMirrorSweep ${4.4 / sp}s cubic-bezier(.45,0,.25,1) infinite !important; }
      #qGo:disabled { animation: none !important; }
      #qGo:disabled::before { display: none !important; }
      .bar > i::after { animation: jsBarShine ${2.8 / sp}s ease-in-out infinite !important; }
      .bg::before { animation: jsOceanLight ${18 / sp}s ease-in-out infinite alternate !important; }
      .bg::after { animation: jsOceanLight ${24 / sp}s ease-in-out infinite alternate-reverse !important; }

      @keyframes jsSparkleTurn {
        0%,75%,100% { transform:rotate(0) scale(1); opacity:.85; }
        82% { transform:rotate(22deg) scale(1.22); opacity:1; }
        90% { transform:rotate(-12deg) scale(1.08); }
      }
      @keyframes jsSparklePulse {
        0%,100% { opacity:.72; transform:scale(1); }
        50% { opacity:1; transform:scale(1.18); }
      }
      @keyframes jsFloatDecor {
        0%,100% { transform:translate3d(0,0,0); }
        50% { transform:translate3d(-9px,8px,0); }
      }
      @keyframes jsSoftGlow {
        0%,100% { background-position:0% 50%; }
        50% { background-position:100% 50%; }
      }
      @keyframes jsQgoRim {
        0%,100% { box-shadow:0 5px 13px rgba(102,174,232,.25), 0 0 0 0 rgba(190,226,252,0), inset 0 0 0 1px rgba(255,255,255,.35), inset 0 0 10px rgba(255,255,255,.10); }
        50%     { box-shadow:0 6px 18px rgba(102,174,232,.38), 0 0 0 3px rgba(190,226,252,.42), inset 0 0 0 1px rgba(255,255,255,.88), inset 0 0 16px rgba(255,255,255,.26); }
      }
      @keyframes jsMirrorSweep {
        0%   { transform:translateX(-130%) skewX(-22deg); }
        42%  { transform:translateX(340%) skewX(-22deg); }
        100% { transform:translateX(340%) skewX(-22deg); }
      }
      @keyframes jsBarShine {
        0% { transform:translateX(-100%); }
        60%,100% { transform:translateX(100%); }
      }
      @keyframes jsOceanLight {
        from { transform: translate3d(-12px, 0, 0) scale(1); }
        to { transform: translate3d(35px, 22px, 0) scale(1.12); }
      }
    `;
  }

  // ========== 4. CÁC HÀM HOẠT ẢNH TƯƠNG TÁC (ONE-SHOT UI API) ==========
  const UI = {
    // Nháy sáng hàng vừa sửa hoặc ngày vừa chọn
    flash(el) {
      if (!el) return null;
      return runAnimation(el, KEYFRAMES.rowFlash, {
        duration: 1100,
        easing: 'ease-out',
        fill: 'none'
      }, 'ui');
    },

    // Rung nhẹ thẻ ngân sách khi tiêu lố
    nudge(el) {
      const target = el || document.getElementById('hero');
      if (!target) return null;
      return runAnimation(target, KEYFRAMES.nudge, {
        duration: 550,
        easing: 'ease-in-out',
        fill: 'none'
      }, 'ui');
    },

    // Nút nảy nhẹ khi bấm (#qGo)
    qgoPop(el) {
      const target = el || document.getElementById('qGo');
      if (!target) return null;
      return runAnimation(target, KEYFRAMES.qgoPop, {
        duration: 420,
        easing: 'cubic-bezier(.2,.8,.2,1)',
        fill: 'none'
      }, 'ui');
    },

    // Xuất hiện số tiền mượt mà
    numberAppear(el) {
      if (!el) return null;
      return runAnimation(el, KEYFRAMES.numberAppear, {
        duration: 480,
        easing: 'cubic-bezier(.2,.8,.2,1)',
        fill: 'backwards'
      }, 'ui');
    },

    // Thẻ hiện dần và trồi lên (fadeLift)
    fadeLift(el, delay = 0, duration = 420) {
      if (!el) return null;
      return runAnimation(el, KEYFRAMES.fadeLift, {
        duration: duration,
        delay: delay,
        easing: 'cubic-bezier(.2,.8,.2,1)',
        fill: 'backwards'
      }, 'ui');
    },

    // Chip xuất hiện nảy nhẹ (popIn)
    popIn(el, delay = 0) {
      if (!el) return null;
      return runAnimation(el, KEYFRAMES.popIn, {
        duration: 340,
        delay: delay,
        easing: 'cubic-bezier(.2,.9,.3,1.2)',
        fill: 'backwards'
      }, 'ui');
    },

    // Checkbox bật nảy (checkPop)
    checkPop(el) {
      if (!el) return null;
      return runAnimation(el, KEYFRAMES.checkPop, {
        duration: 280,
        easing: 'cubic-bezier(.2,.8,.2,1)',
        fill: 'none'
      }, 'ui');
    },

    // Banner trượt xuống (slideDown)
    slideDown(el) {
      const target = el || document.getElementById('notice');
      if (!target) return null;
      return runAnimation(target, KEYFRAMES.slideDown, {
        duration: 500,
        easing: 'cubic-bezier(.2,.8,.2,1)',
        fill: 'backwards'
      }, 'ui');
    },

    // Toast mờ dần và rõ nét (toastEnter)
    toastEnter(el) {
      const target = el || document.getElementById('toast');
      if (!target) return null;
      return runAnimation(target, KEYFRAMES.toastEnter, {
        duration: 250,
        easing: 'cubic-bezier(.2,.8,.2,1)',
        fill: 'none'
      }, 'ui');
    },

    // Chữ số bay lên khi bấm thêm khoản chi (+45.000)
    floatText(anchor, text) {
      if (!anchor || !CONFIG.enabled || CONFIG.reducedMotion || !CONFIG.categories.ui) return;
      const r = anchor.getBoundingClientRect();
      const s = document.createElement('span');
      s.className = 'floaty';
      s.textContent = text;
      s.style.left = (r.left + r.width / 2) + 'px';
      s.style.top = (r.top + 4) + 'px';
      document.body.appendChild(s);

      const anim = runAnimation(s, KEYFRAMES.floatUp, {
        duration: 950,
        easing: 'cubic-bezier(.2,.8,.2,1)',
        fill: 'forwards'
      }, 'ui');

      if (anim) {
        anim.onfinish = () => { if (s.parentNode) s.parentNode.removeChild(s); };
      } else {
        setTimeout(() => { if (s.parentNode) s.parentNode.removeChild(s); }, 1000);
      }
    },

    // Pháo hoa sao trắng bung nở (starBurst)
    starBurst(anchor) {
      if (!anchor || !CONFIG.enabled || CONFIG.reducedMotion || !CONFIG.categories.ui) return;
      const STAR_PATH = 'M12 1.6l3.05 6.95 7.55.72-5.7 5.05 1.7 7.4L12 17.7 5.4 21.72l1.7-7.4-5.7-5.05 7.55-.72z';
      const starSvg = (size) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"><path d="${STAR_PATH}"/></svg>`;

      const BIG = 10, TRAIL = 3, SPARKLES = 10;
      const G = 760, STEPS = 18;
      const r = anchor.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2, rx = r.width / 2, ry = r.height / 2;
      const k = Math.min(1, Math.max(.55, window.innerWidth / 900));
      const rnd = (a, b) => a + Math.random() * (b - a);

      const layer = document.createElement('div');
      layer.className = 'fx-layer';
      layer.setAttribute('aria-hidden', 'true');
      document.body.appendChild(layer);
      let last = 0;

      function fly(size, big, ox, oy, vx, vy, T, delay, peak) {
        const el = document.createElement('span');
        el.className = 'fx-star' + (big ? ' big' : '');
        el.innerHTML = starSvg(size.toFixed(1));
        layer.appendChild(el);
        const spin = (big ? rnd(260, 620) : rnd(140, 420)) * (Math.random() < .5 ? -1 : 1);
        const frames = [];
        for (let i = 0; i <= STEPS; i++) {
          const p = i / STEPS, t = T * p;
          const x = ox + vx * t - size / 2, y = oy + vy * t + 0.5 * G * t * t - size / 2;
          const grow = p < .14 ? .15 + .85 * (p / .14) : 1 - .28 * ((p - .14) / .86);
          const op = p < .08 ? peak * (p / .08) : p < .5 ? peak : peak * (1 - (p - .5) / .5);
          frames.push({
            transform: `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) rotate(${(spin * p).toFixed(0)}deg) scale(${grow.toFixed(3)})`,
            opacity: Math.max(0, op).toFixed(3),
            offset: p
          });
        }
        runAnimation(el, frames, { duration: T * 1000, delay: delay, easing: 'linear', fill: 'both' }, 'ui');
        last = Math.max(last, T * 1000 + delay);
      }

      const a0 = Math.random() * Math.PI * 2;
      for (let i = 0; i < BIG; i++) {
        const ang = a0 + (i * 2 * Math.PI) / BIG + rnd(-.18, .18), ca = Math.cos(ang), sa = Math.sin(ang);
        const ox = cx + ca * rx * .92, oy = cy + sa * ry * .92;
        const sp = rnd(440, 760) * k, vx = ca * sp * .9, vy = sa * sp - 380 * k, T = rnd(1.5, 1.85);
        fly(rnd(28, 46) * Math.max(.8, k), true, ox, oy, vx, vy, T, 0, 1);
        for (let j = 1; j <= TRAIL; j++) {
          fly(rnd(7, 13), false, ox, oy, vx * rnd(.93, 1.07), vy * rnd(.93, 1.07), T * rnd(.9, 1.05), j * rnd(55, 85), 1);
        }
      }
      for (let i = 0; i < SPARKLES; i++) {
        const ang = rnd(0, Math.PI * 2), sp = rnd(160, 420) * k;
        fly(rnd(5, 9), false, cx + rnd(-rx, rx) * .9, cy + rnd(-ry, ry), Math.cos(ang) * sp, Math.sin(ang) * sp - 220 * k, rnd(1.1, 1.5), rnd(0, 260), .9);
      }

      // Vòng sáng lóe ra quanh nút
      [0, 140].forEach((dl, n) => {
        const ring = document.createElement('span');
        ring.className = 'fx-ring';
        ring.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`;
        layer.appendChild(ring);
        runAnimation(ring, [
          { transform: 'scale(1)', opacity: n ? 0.7 : 0.95 },
          { transform: n ? 'scale(1.16,1.9)' : 'scale(1.07,1.4)', opacity: 0 }
        ], { duration: 600, delay: dl, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'both' }, 'ui');
        last = Math.max(last, 600 + dl);
      });

      UI.qgoPop(anchor);
      setTimeout(() => { if (layer.parentNode) layer.parentNode.removeChild(layer); }, (last / (CONFIG.speed || 1)) + 250);
    },

    // Hiệu ứng các phần tử trong danh sách/bảng lần lượt xuất hiện (staggered enter)
    enterList(container, childSelector = '.row, .day') {
      if (!container) return;
      const items = container.querySelectorAll(childSelector);
      items.forEach((item, index) => {
        // tính delay theo index hoặc theo CSS var(--i)
        let delay = index * 25;
        const customI = item.style.getPropertyValue('--i');
        if (customI !== '') delay = parseFloat(customI) * 14;
        UI.fadeLift(item, delay, 420);
      });
    },

    // Hiệu ứng hộp thoại trồi lên lần lượt (sheet children stagger)
    sheetEnter(sheet) {
      if (!sheet) return;
      Array.from(sheet.children).forEach((child, index) => {
        UI.fadeLift(child, index * 35, 380);
      });
    }
  };

  // ========== 5. HOẠT CẢNH NỀN & BONG BÓNG (OCEAN & BUBBLES) ==========
  const Ocean = {
    anims: [],
    start() {
      this.stop();
      if (!CONFIG.enabled || CONFIG.reducedMotion || !CONFIG.categories.ocean) return;

      const bubbles = document.querySelectorAll('.bg .bub');
      bubbles.forEach((b) => {
        const d = parseCssSec(b.style.getPropertyValue('--d'), 20);
        const w = parseCssSec(b.style.getPropertyValue('--w'), 0);
        const anim = runAnimation(b, KEYFRAMES.oceanBubble, {
          duration: d,
          delay: w,
          iterations: Infinity,
          easing: 'linear'
        }, 'ocean');
        if (anim) this.anims.push(anim);
      });
    },
    stop() {
      this.anims.forEach((a) => a.cancel());
      this.anims = [];
    }
  };

  // ========== 6. CẢNH ĐỒNG CỎ THẺ NGÂN SÁCH (HERO MEADOW) ==========
  const Meadow = {
    anims: [],
    leafAnims: [],
    start() {
      this.stop();
      if (!CONFIG.enabled || CONFIG.reducedMotion || !CONFIG.categories.meadow) return;

      const hero = document.getElementById('hero');
      if (!hero) return;

      // Cây lớn đu đưa
      const tree = hero.querySelector('.tree');
      if (tree) {
        const a = runAnimation(tree, KEYFRAMES.treeSway, { duration: 7200, iterations: Infinity, easing: 'ease-in-out' }, 'meadow');
        if (a) this.anims.push(a);
      }

      // Tán cây đu đưa
      const crown = hero.querySelector('.crown');
      if (crown) {
        const a = runAnimation(crown, KEYFRAMES.crownSway, { duration: 5600, iterations: Infinity, easing: 'ease-in-out' }, 'meadow');
        if (a) this.anims.push(a);
      }

      // 3 đám mây trôi chậm
      const c1 = hero.querySelector('.cloud-one');
      if (c1) {
        const a = runAnimation(c1, KEYFRAMES.cloudDrift, { duration: 26000, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }, 'meadow');
        if (a) this.anims.push(a);
      }
      const c2 = hero.querySelector('.cloud-two');
      if (c2) {
        const a = runAnimation(c2, KEYFRAMES.cloudDrift, { duration: 32000, iterations: Infinity, direction: 'alternate-reverse', easing: 'ease-in-out' }, 'meadow');
        if (a) this.anims.push(a);
      }
      const c3 = hero.querySelector('.cloud-three');
      if (c3) {
        const a = runAnimation(c3, KEYFRAMES.cloudDrift, { duration: 29000, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }, 'meadow');
        if (a) this.anims.push(a);
      }

      // Ngọn cỏ lay nhẹ
      const tufts = hero.querySelectorAll('.tuft');
      tufts.forEach((tuft) => {
        let dur = 6400, dl = 0;
        if (tuft.classList.contains('t1')) { dur = 5200; dl = -1700; }
        else if (tuft.classList.contains('t2')) { dur = 7300; dl = -3400; }
        const a = runAnimation(tuft, KEYFRAMES.tuftSway, { duration: dur, delay: dl, iterations: Infinity, easing: 'ease-in-out' }, 'meadow');
        if (a) this.anims.push(a);
      });

      // Kiểm tra trạng thái tiêu lố để kích hoạt lá rơi
      this.checkOverState();
    },

    checkOverState() {
      const hero = document.getElementById('hero');
      if (!hero) return;
      const isOver = hero.classList.contains('over');
      this.setOver(isOver);
    },

    setOver(isOver) {
      this.leafAnims.forEach((a) => a.cancel());
      this.leafAnims = [];

      if (!isOver || !CONFIG.enabled || CONFIG.reducedMotion || !CONFIG.categories.meadow) return;

      const hero = document.getElementById('hero');
      if (!hero) return;

      const leaves = hero.querySelectorAll('.lf');
      leaves.forEach((lf) => {
        const x0 = parseFloat(lf.style.getPropertyValue('--x0')) || 340;
        const y0 = parseFloat(lf.style.getPropertyValue('--y0')) || 80;
        const dx = parseFloat(lf.style.getPropertyValue('--dx')) || -20;
        const y1 = parseFloat(lf.style.getPropertyValue('--y1')) || 195;
        const dur = parseCssSec(lf.style.animationDuration, 12);
        const dl = parseCssSec(lf.style.animationDelay, 0);

        const a1 = runAnimation(lf, makeLeafFallKeyframes(x0, y0, dx, y1), {
          duration: dur,
          delay: dl,
          iterations: Infinity,
          easing: 'linear'
        }, 'meadow');
        if (a1) this.leafAnims.push(a1);

        const lfi = lf.querySelector('.lfi');
        if (lfi) {
          const lfiDl = parseCssSec(lfi.style.animationDelay, dl / 1000);
          const a2 = runAnimation(lfi, KEYFRAMES.leafTurn, {
            duration: 4600,
            delay: lfiDl,
            iterations: Infinity,
            direction: 'alternate',
            easing: 'ease-in-out'
          }, 'meadow');
          if (a2) this.leafAnims.push(a2);
        }
      });
    },

    stop() {
      this.anims.forEach((a) => a.cancel());
      this.anims = [];
      this.leafAnims.forEach((a) => a.cancel());
      this.leafAnims = [];
    }
  };

  // ========== 7. BIỂN CẢ HAI BÊN TRANG (UNDER THE SEA CREATURES) ==========
  const Sea = {
    anims: [],
    start() {
      this.stop();
      if (!CONFIG.enabled || CONFIG.reducedMotion || !CONFIG.categories.sea) return;

      const seaContainers = document.querySelectorAll('.sea-l, .sea-r');
      if (!seaContainers.length) return;

      // 7.1. Bụi nước / bọt khí nhỏ
      document.querySelectorAll('.sea .dust').forEach((d) => {
        const t = parseCssSec(d.style.getPropertyValue('--t'), 16);
        const dl = parseCssSec(d.style.getPropertyValue('--dl'), 0);
        const a = runAnimation(d, KEYFRAMES.dustUp, { duration: t, delay: dl, iterations: Infinity, easing: 'linear' }, 'sea');
        if (a) this.anims.push(a);
      });

      // 7.2. Rong biển đung đưa (kelp)
      document.querySelectorAll('.sea .kelp').forEach((k) => {
        const t = parseCssSec(k.style.getPropertyValue('--t'), 9);
        const dl = parseCssSec(k.style.getPropertyValue('--dl'), 0);
        const a = runAnimation(k, KEYFRAMES.kelpSway, { duration: t, delay: dl, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }, 'sea');
        if (a) this.anims.push(a);
      });

      // 7.3. Cỏ biển lay nhẹ (grass)
      document.querySelectorAll('.sea .grass').forEach((g) => {
        const t = parseCssSec(g.style.getPropertyValue('--t'), 6);
        const dl = parseCssSec(g.style.getPropertyValue('--dl'), 0);
        const a = runAnimation(g, KEYFRAMES.grassSway, { duration: t, delay: dl, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }, 'sea');
        if (a) this.anims.push(a);
      });

      // 7.4. Sao biển thở (star)
      document.querySelectorAll('.sea .star').forEach((s) => {
        const dl = s.classList.contains('s2') ? -3000 : 0;
        const a = runAnimation(s, KEYFRAMES.starBreath, { duration: 7000, delay: dl, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }, 'sea');
        if (a) this.anims.push(a);
      });

      // 7.5. Cá bơi ngang, nhấp nhô & vẫy đuôi
      document.querySelectorAll('.sea .fish').forEach((f) => {
        const t = parseCssSec(f.style.getPropertyValue('--t'), 32);
        const dl = parseCssSec(f.style.getPropertyValue('--dl'), 0);

        // Tính khoảng cách bơi sx: container width - fish width - padding
        const parentW = f.closest('.sea') ? f.closest('.sea').clientWidth : 200;
        const fishW = f.clientWidth || 30;
        const sx = Math.max(0, parentW - fishW - 14);

        const a1 = runAnimation(f, makeSwimKeyframes(sx), { duration: t, delay: dl, iterations: Infinity, easing: 'linear' }, 'sea');
        if (a1) this.anims.push(a1);

        const svg = f.querySelector('svg');
        if (svg) {
          const a2 = runAnimation(svg, KEYFRAMES.fishBob, { duration: 4000, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }, 'sea');
          if (a2) this.anims.push(a2);
        }

        const tail = f.querySelector('.tail');
        if (tail) {
          const tailDur = f.classList.contains('small') ? 700 : 1000;
          const a3 = runAnimation(tail, KEYFRAMES.tailWag, { duration: tailDur, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }, 'sea');
          if (a3) this.anims.push(a3);
        }
      });

      // 7.6. Cua bò, giơ càng, chớp kẹp, ngoe nguẩy chân
      document.querySelectorAll('.sea .crab').forEach((c) => {
        const t = parseCssSec(c.style.getPropertyValue('--t'), 35);
        const dl = parseCssSec(c.style.getPropertyValue('--dl'), 0);
        const isSmall = c.classList.contains('small');

        const parentW = c.closest('.sea') ? c.closest('.sea').clientWidth : 200;
        const crabW = c.clientWidth || 60;
        const walk = Math.max(0, parentW - crabW - 35);

        const a1 = runAnimation(c, makeCrabWalkKeyframes(walk), {
          duration: t,
          delay: dl,
          iterations: Infinity,
          direction: isSmall ? 'alternate-reverse' : 'alternate',
          easing: 'ease-in-out'
        }, 'sea');
        if (a1) this.anims.push(a1);

        const svg = c.querySelector('svg');
        if (svg) {
          const a2 = runAnimation(svg, KEYFRAMES.crabBob, { duration: 1000, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }, 'sea');
          if (a2) this.anims.push(a2);
        }

        // Càng cua nhấc lên
        const clL = c.querySelector('.cl-l');
        if (clL) {
          const a3 = runAnimation(clL, KEYFRAMES.clawLift, { duration: 3000, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }, 'sea');
          if (a3) this.anims.push(a3);
        }
        const clR = c.querySelector('.cl-r');
        if (clR) {
          const a4 = runAnimation(clR, KEYFRAMES.clawLift, { duration: 3000, delay: -1500, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }, 'sea');
          if (a4) this.anims.push(a4);
        }

        // Kẹp chớp
        const jaw = c.querySelector('.jaw');
        if (jaw) {
          const a5 = runAnimation(jaw, KEYFRAMES.jawSnap, { duration: 2500, iterations: Infinity, easing: 'ease-in-out' }, 'sea');
          if (a5) this.anims.push(a5);
        }

        // Chân cua chạy
        const legs = c.querySelector('.legs');
        if (legs) {
          const a6 = runAnimation(legs, KEYFRAMES.legsScuttle, { duration: 600, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }, 'sea');
          if (a6) this.anims.push(a6);
        }
      });

      // 7.7. Rùa biển bơi & đập vây
      document.querySelectorAll('.sea .turtle').forEach((turtle) => {
        const parentW = turtle.closest('.sea') ? turtle.closest('.sea').clientWidth : 200;
        const turtleW = turtle.clientWidth || 100;
        const sx = Math.max(0, parentW - turtleW - 14);

        const a1 = runAnimation(turtle, makeSwimKeyframes(sx), { duration: 90000, delay: -22000, iterations: Infinity, easing: 'linear' }, 'sea');
        if (a1) this.anims.push(a1);

        const svg = turtle.querySelector('svg');
        if (svg) {
          const a2 = runAnimation(svg, KEYFRAMES.turtleBob, { duration: 7000, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }, 'sea');
          if (a2) this.anims.push(a2);
        }

        // Các vây bơi
        const flN = turtle.querySelector('.fl-n');
        if (flN) {
          const a3 = runAnimation(flN, KEYFRAMES.flipper, { duration: 3000, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }, 'sea');
          if (a3) this.anims.push(a3);
        }
        const flB = turtle.querySelector('.fl-b');
        if (flB) {
          const a4 = runAnimation(flB, KEYFRAMES.flipper, { duration: 3000, delay: -1500, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }, 'sea');
          if (a4) this.anims.push(a4);
        }
        const flR = turtle.querySelector('.fl-r');
        if (flR) {
          const a5 = runAnimation(flR, KEYFRAMES.flipper, { duration: 3000, delay: -750, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }, 'sea');
          if (a5) this.anims.push(a5);
        }
      });
    },

    stop() {
      this.anims.forEach((a) => a.cancel());
      this.anims = [];
    }
  };

  // ========== 8. TỰ ĐỘNG QUAN SÁT THAY ĐỔI DOM (MUTATION OBSERVER) ==========
  let observer = null;
  function setupObserver() {
    if (observer || typeof MutationObserver === 'undefined') return;

    observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.attributeName === 'class') {
          const target = m.target;
          if (target.classList.contains('flash')) {
            UI.flash(target);
          }
          if (target.classList.contains('nudge')) {
            UI.nudge(target);
          }
          if (target.classList.contains('enter')) {
            UI.enterList(target);
          }
          if (target.id === 'hero') {
            Meadow.checkOverState();
          }
        }
      }
    });

    observer.observe(document.body, {
      attributes: true,
      subtree: true,
      attributeFilter: ['class']
    });
  }

  // ========== 9. GIAO DIỆN ĐIỀU KHIỂN CHÍNH (PUBLIC API) ==========
  const AppAnimations = {
    config: CONFIG,
    keyframes: KEYFRAMES,

    // Các hàm kích hoạt hiệu ứng trực tiếp
    flash: UI.flash,
    nudge: UI.nudge,
    qgoPop: UI.qgoPop,
    numberAppear: UI.numberAppear,
    fadeLift: UI.fadeLift,
    popIn: UI.popIn,
    checkPop: UI.checkPop,
    slideDown: UI.slideDown,
    toastEnter: UI.toastEnter,
    floatText: UI.floatText,
    starBurst: UI.starBurst,
    enterList: UI.enterList,
    sheetEnter: UI.sheetEnter,

    // Phân hệ hoạt cảnh nền
    ocean: Ocean,
    meadow: Meadow,
    sea: Sea,

    // Khởi động toàn bộ hoạt ảnh
    init() {
      updatePseudoStyles();
      Ocean.start();
      Meadow.start();
      Sea.start();
      setupObserver();

      // Cập nhật lại sinh vật biển khi co giãn kích thước màn hình
      window.addEventListener('resize', () => {
        if (window.innerWidth >= 1140) Sea.start();
      });
    },

    // Làm mới lại các phần tử vừa render mới (danh sách ngày, thẻ chip...)
    refresh() {
      updatePseudoStyles();
      Ocean.start();
      Meadow.start();
      if (window.innerWidth >= 1140) Sea.start();
    },

    // Tạm dừng toàn bộ hoạt ảnh
    pause() {
      activeAnimations.forEach((a) => {
        try { a.pause(); } catch (e) {}
      });
      if (dynamicStyleEl) {
        dynamicStyleEl.textContent += `\n*, *::before, *::after { animation-play-state: paused !important; }`;
      }
    },

    // Tiếp tục chạy hoạt ảnh
    resume() {
      activeAnimations.forEach((a) => {
        try { a.play(); } catch (e) {}
      });
      updatePseudoStyles();
    },

    // Chỉnh tốc độ toàn cục (1.0 = chuẩn, 0.5 = chậm, 2.0 = nhanh)
    setSpeed(speedMultiplier) {
      if (typeof speedMultiplier !== 'number' || speedMultiplier <= 0) return;
      CONFIG.speed = speedMultiplier;
      activeAnimations.forEach((a) => {
        try { a.playbackRate = speedMultiplier; } catch (e) {}
      });
      updatePseudoStyles();
    },

    // Bật/tắt từng nhóm hoạt ảnh ('ambient', 'ocean', 'meadow', 'sea', 'ui')
    toggle(category, isEnabled) {
      if (category in CONFIG.categories) {
        CONFIG.categories[category] = !!isEnabled;
        if (category === 'ocean') isEnabled ? Ocean.start() : Ocean.stop();
        if (category === 'meadow') isEnabled ? Meadow.start() : Meadow.stop();
        if (category === 'sea') isEnabled ? Sea.start() : Sea.stop();
        updatePseudoStyles();
      }
    }
  };

  // Xuất ra toàn cục window.AppAnimations
  window.AppAnimations = AppAnimations;

  // Tự động khởi động khi tài liệu đã tải xong
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AppAnimations.init());
  } else {
    AppAnimations.init();
  }

})(window, document);
