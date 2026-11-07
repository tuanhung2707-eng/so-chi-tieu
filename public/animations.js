/* =====================================================================
   animations.js – Toàn bộ hoạt ảnh (animations) của Sổ chi tiêu bằng JavaScript
   =====================================================================
   Chuyển toàn bộ hoạt ảnh từ animations.css sang JavaScript để:
     1. Dễ dàng bật/tắt, tạm dừng/tiếp tục, chỉnh tốc độ (speed multiplier) qua JS.
     2. Gọi trực tiếp các hiệu ứng qua hàm: AppAnimations.flash(el), AppAnimations.nudge(el),...
     3. Tự động chạy và điều khiển các hoạt cảnh nền: đồng cỏ, bong bóng biển, sinh vật biển 2 bên.
     4. Tự động nạp CSS bố cục khung 2 bên (.sea-l, .sea-r) và đồng cỏ (.hero-scene) để không bao giờ bị vỡ khung.
     5. Tương thích chuẩn Web Animations API (WAAPI), mượt mà và tôn trọng prefers-reduced-motion.
   ===================================================================== */

(function (window, document) {
  'use strict';

  // ========== 0. CSS BỐ CỤC CƠ SỞ (ĐẢM BẢO KHUNG 2 BÊN & SVG LUÔN ĐÚNG KÍCH THƯỚC) ==========
  const BASE_LAYOUT_CSS = `/* =====================================================================
   animations.css – Giao diện & bố cục trang trí cho Sổ chi tiêu
   (Toàn bộ @keyframes và thuộc tính animation đã được chuyển sang animations.js)
   ===================================================================== */

/* ---------- 1. Giảm chuyển động ---------- */
@media (prefers-reduced-motion: reduce) {
  *,*::before,*::after {  transition:none !important; scroll-behavior:auto !important; }
}

/* ---------- Chi tiết trang trí & hoạt ảnh nhẹ ---------- */
.top h1 {
  display:inline-flex;
  align-items:center;
  gap:7px;
}
.top h1::after {
  content:"✦";
  display:inline-block;
  color:#79bce9;
  font-size:.78em;
  transform-origin:center;
    text-shadow:0 2px 8px rgba(102,174,232,.28);
}
.hero {
  background-image:
    radial-gradient(circle at 12% 22%, rgba(255,255,255,.18) 0 2px, transparent 3px),
    radial-gradient(circle at 27% 76%, rgba(255,255,255,.15) 0 1.5px, transparent 2.5px),
    radial-gradient(circle at 76% 33%, rgba(255,255,255,.2) 0 2px, transparent 3px),
    linear-gradient(135deg,#77b9ed 0%,#8dcdf1 55%,#b3e1f9 100%);
}
.hero:before {
    box-shadow:0 0 0 16px rgba(255,255,255,.035), 0 0 0 34px rgba(255,255,255,.025);
}
.hero:after {
    box-shadow:0 0 0 12px rgba(255,255,255,.035);
}
.hero .lbl::before {
  content:"✧";
  display:inline-block;
  margin-right:7px;
  font-size:1.15em;
  }

.card h2 {
  text-decoration:underline;
  text-decoration-color:#e2f1fc;
  text-decoration-thickness:3px;
  text-underline-offset:5px;
}
.btn, .chip, .ibtn, .seg button {
  position:relative;
  overflow:hidden;
}
.btn::after, .chip::after, .ibtn::after {
  content:"";
  position:absolute;
  top:-60%;
  left:-75%;
  width:42%;
  height:220%;
  transform:rotate(22deg);
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.58),transparent);
  opacity:0;
  pointer-events:none;
}
.btn:hover::after, .chip:hover::after, .ibtn:hover::after {
  opacity:1;
  }
.btn.primary {
  background-size:180% 180%;
  }

.pill .dot {
  box-shadow:0 0 0 3px rgba(54,155,131,.10);
}

.sheet {
  background-image:radial-gradient(circle at 100% 0%,rgba(196,229,251,.2),transparent 34%);
}
@media (max-width:600px) {
  .hero:before { width:155px; height:155px; }
  .hero:after { width:105px; height:105px; }
}

.bar > i { position:relative; overflow:hidden; }
.bar > i::after { content:""; position:absolute; inset:0; transform:translateX(-100%);
  background:linear-gradient(90deg,transparent,rgba(102,174,232,.38),transparent);  }

#btnSettings:hover { transform:rotate(60deg); }
.floaty { position:fixed; z-index:30; pointer-events:none; font-weight:800; font-size:14px; color:var(--accent-deep);
  background:#fff; padding:4px 11px; border-radius:99px; box-shadow:0 6px 16px rgba(71,128,171,.18);
   }

/* ---------- Hoạt ảnh nền ---------- */
/* Quầng màu pastel nền (.blob) & bong bóng xanh dương pastel (.bub) */
.bg .blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(48px);
  pointer-events: none;
  opacity: .45;
}
.bg .b1 { width: 460px; height: 460px; top: -120px; left: -100px; background: radial-gradient(circle, #a8dcfa 0%, rgba(168,220,250,0) 70%); }
.bg .b2 { width: 420px; height: 420px; bottom: -110px; right: -90px; background: radial-gradient(circle, #9ad4f8 0%, rgba(154,212,248,0) 70%); }
.bg .b3 { width: 360px; height: 360px; top: 38%; left: 50%; transform: translateX(-50%); background: radial-gradient(circle, #bce4fc 0%, rgba(188,228,252,0) 70%); }

.bg { position:fixed; inset:0; z-index:0; overflow:hidden; pointer-events:none; }
.wrap { position:relative; z-index:1; }

.bub { position:absolute; bottom:-40px; left:var(--x); width: calc(var(--s) * 1.5); height: calc(var(--s) * 1.5); border-radius:50%; opacity:0;
       background:radial-gradient(circle at 30% 28%,rgba(255,255,255,.95),rgba(255,255,255,.2) 58%),rgba(139,201,243,.28);
       border:1px solid rgba(255,255,255,.75); box-shadow:0 2px 8px rgba(102,174,232,.12);
        will-change:transform,opacity; }
@media (max-width:600px) {
  .b1 { width:340px; height:340px; } .b2 { width:300px; height:300px; } .b3 { width:300px; height:300px; }
  .bub:nth-child(n+9) { display:none; }
}

/* ================= Cảnh đồng cỏ trong thẻ "Hôm nay còn được tiêu" (đơn sắc, chạy tự động) ================= */
.hero { --scene-ink:rgba(30,98,140,.74); }
.hero.over { --scene-ink:rgba(128,48,66,.78); }
.hero-scene { position:absolute; inset:0; z-index:0; overflow:hidden; pointer-events:none; color:var(--scene-ink); transition:color .8s ease; }
.hero > :not(.hero-scene) { position:relative; z-index:1; }
.landscape { position:absolute; right:-4px; bottom:0; width:min(78%,480px); height:100%; overflow:visible; }

/* cây lớn đung đưa chậm, liên tục */
.tree { transform-origin:355px 196px;  }
.crown { transform-origin:352px 118px;  }
/* vài đám mây nhỏ trôi rất chậm */
.cloud-one {  opacity:.34; }
.cloud-two {  opacity:.28; }
.cloud-three {  opacity:.22; }
/* ngọn cỏ lay nhẹ */
.tuft { transform-box:fill-box; transform-origin:50% 100%;  }

/* trạng thái bình thường: tán lá đầy đặn; đồng thời ẩn lá rụng */
.canopy-full, .canopy-sparse, .ground-leaves { transition:opacity .9s ease; }
.canopy-sparse { opacity:0; }
.ground-leaves { opacity:0; }
.lf { opacity:0; }
.lfi { transform-box:fill-box; transform-origin:50% 50%; }

/* trạng thái đã tiêu lố: cây thưa lá, lá rơi chậm, mây mờ hơn */
.hero.over .canopy-full { opacity:0; }
.hero.over .canopy-sparse { opacity:.82; }
.hero.over .ground-leaves { opacity:.72; }
.hero.over .cloud-one { opacity:.2; } .hero.over .cloud-two { opacity:.16; } .hero.over .cloud-three { opacity:.13; }

@media (min-width:760px) { .hero { min-height:206px; } }
@media (max-width:600px) { .landscape { width:84%; opacity:.9; } .hero { padding-right:18px; min-height:190px; } }

/* ================= Nút "Thêm vào hôm nay": viền sáng nhẹ + ánh sáng lướt như chiếu vào gương ================= */
#qGo { border-color:rgba(255,255,255,.78);  }
#qGo::before {
  content:""; position:absolute; top:-35%; bottom:-35%; left:0; width:34%; pointer-events:none; z-index:0;
  background:linear-gradient(100deg,
    transparent 0%, transparent 14%, rgba(255,255,255,.38) 22%, transparent 30%,
    transparent 40%, rgba(255,255,255,.82) 54%, transparent 70%, transparent 100%);
  transform:translateX(-130%) skewX(-22deg);
  }
#qGo:disabled::before { display:none; }

/* ================= Họa tiết cho lịch các ngày trong kỳ (đơn sắc) ================= */
#calWrap {
  position:relative; padding:14px 12px 12px; border-radius:26px; border:1px solid rgba(206,227,244,.85);
  background:
    radial-gradient(circle, rgba(102,174,232,.24) 1.1px, transparent 1.7px) 0 0 / 16px 16px,
    linear-gradient(180deg, rgba(232,244,254,.62), rgba(246,251,255,.38));
}
.dow { position:relative; padding-bottom:14px; }
.dow::after {
  content:""; position:absolute; left:8px; right:8px; bottom:3px; height:6px; opacity:.6;
  background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='6' viewBox='0 0 24 6'%3E%3Cpath d='M0 3 Q6 0 12 3 T24 3' fill='none' stroke='%2366aee8' stroke-width='1.3' stroke-linecap='round'/%3E%3C/svg%3E") repeat-x center;
}
.wk { position:relative; }
.wk::before {
  content:""; position:absolute; inset:0; border-radius:inherit; pointer-events:none;
  background:repeating-radial-gradient(circle at 100% 0, rgba(102,174,232,.20) 0 1.2px, transparent 1.2px 11px);
  -webkit-mask-image:radial-gradient(circle at 100% 0, #000 0, transparent 160px);
  mask-image:radial-gradient(circle at 100% 0, #000 0, transparent 160px);
}
.wk:nth-child(even)::before {
  background:repeating-radial-gradient(circle at 0 100%, rgba(102,174,232,.20) 0 1.2px, transparent 1.2px 11px);
  -webkit-mask-image:radial-gradient(circle at 0 100%, #000 0, transparent 160px);
  mask-image:radial-gradient(circle at 0 100%, #000 0, transparent 160px);
}
.wk > * { position:relative; }
@media (max-width:680px) {
  #calWrap { padding:10px 6px 8px; border-radius:20px; background-size:14px 14px, auto; }
  .wk::before, .wk:nth-child(even)::before { -webkit-mask-size:120px 120px; }
}

/* ---------- 9. Pháo hoa sao trắng khi bấm "Thêm vào hôm nay" ---------- */
/* Sao được tạo bằng JavaScript (starBurst). Ở đây chỉ định kiểu: màu trắng + quầng sáng để nổi trên nền sáng. */
.fx-layer { position:fixed; inset:0; z-index:60; pointer-events:none; overflow:hidden; }
.fx-star {
  position:absolute; left:0; top:0; opacity:0; will-change:transform,opacity;
  filter:drop-shadow(0 0 2px rgba(48,122,190,.65)) drop-shadow(0 0 7px rgba(255,255,255,.95));
}
.fx-star svg { display:block; }
.fx-star path { fill:#fff; stroke:rgba(60,140,210,.55); stroke-width:.8; paint-order:stroke; stroke-linejoin:round; }
.fx-star.big {
  filter:drop-shadow(0 0 4px rgba(40,115,190,.8)) drop-shadow(0 0 14px rgba(255,255,255,1)) drop-shadow(0 0 28px rgba(140,200,250,.95));
}
/* vòng sáng lóe ra quanh nút lúc bấm */
.fx-ring {
  position:absolute; border-radius:14px; border:2px solid #fff; opacity:0; transform-origin:center;
  box-shadow:0 0 0 1px rgba(110,180,230,.45), 0 0 20px rgba(255,255,255,.95), inset 0 0 14px rgba(255,255,255,.7);
}
@media (prefers-reduced-motion:reduce) { .fx-layer { display:none; } }

/* Nền ô ngày: chỉ dùng ombre xanh da trời và tím pastel */
.wk .day:not(.void) {
  background: linear-gradient(145deg, #f4faff 0%, #e8f3ff 52%, #f1edff 100%);
  border-color: #dce8fb;
}
.wk .day:not(.void):nth-child(4n + 2),
.wk .day:not(.void):nth-child(4n + 3) {
  background: linear-gradient(145deg, #faf8ff 0%, #f0edff 48%, #e7f2ff 100%);
  border-color: #e5defa;
}
.wk .day.past:not(.void) {
  background: linear-gradient(145deg, #f4f8fd 0%, #eaf0fa 55%, #f0edfb 100%);
}
.wk .day.today:not(.void) {
  background: linear-gradient(145deg, #dff1ff 0%, #e9e7ff 100%);
  border-color: #a8c9f5;
}
.wk .day.void { background: transparent; }

/* trang trí nền */
/* ==========================================
   CONCEPT: PASTEL OCEAN — ĐẠI DƯƠNG ÊM DỊU
   ========================================== */

/* Nền đại dương xanh pastel */
body {
  background:
    radial-gradient(ellipse at 12% 15%, rgba(119, 207, 246, .18), transparent 38%),
    radial-gradient(ellipse at 88% 72%, rgba(99, 180, 238, .14), transparent 42%),
    linear-gradient(180deg, #f2f9ff 0%, #eaf6ff 55%, #e4f3ff 100%);
  background-attachment: fixed;
}

/* Lớp trang trí nằm sau nội dung */
.bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.wrap {
  position: relative;
  z-index: 1;
}

/* Bong bóng nước: to, trong suốt, có ánh sáng */
.bub {
  position: absolute;
  bottom: -60px;
  left: var(--x);
  width: calc(var(--s) * 1.5);
  height: calc(var(--s) * 1.5);
  border-radius: 50%;
  opacity: 0;

  background:
    radial-gradient(
      circle at 30% 25%,
      rgba(255, 255, 255, .95) 0%,
      rgba(255, 255, 255, .32) 18%,
      rgba(119, 207, 246, .12) 58%,
      rgba(83, 169, 225, .08) 100%
    );

  border: 1px solid rgba(255, 255, 255, .8);

  box-shadow:
    inset -5px -7px 16px rgba(95, 183, 232, .08),
    0 4px 18px rgba(90, 177, 230, .08);

    will-change: transform, opacity;
}

/* Ánh sáng mặt nước chuyển động rất chậm */
.bg::before {
  content: "";
  position: absolute;
  width: 70vw;
  height: 70vw;
  min-width: 420px;
  min-height: 420px;
  top: -35vw;
  left: -15vw;
  border-radius: 50%;

  background: radial-gradient(
    circle,
    rgba(116, 205, 245, .15) 0%,
    rgba(164, 224, 249, .07) 42%,
    transparent 70%
  );

  }

.bg::after {
  content: "";
  position: absolute;
  width: 60vw;
  height: 60vw;
  min-width: 360px;
  min-height: 360px;
  right: -25vw;
  bottom: -35vw;
  border-radius: 50%;

  background: radial-gradient(
    circle,
    rgba(92, 184, 232, .12) 0%,
    rgba(155, 220, 248, .06) 45%,
    transparent 72%
  );

  }

/* Giữ chuyển động nhẹ nhàng trên điện thoại */
@media (max-width: 600px) {
  .bub:nth-child(n+9) {
    display: none;
  }
}

/* ---------- 10. Biển cả hai bên trang (rong biển, cá, cua, rùa, mỏm đá, sao biển) ---------- */
/* Chỉ hiện khi hai bên trang còn đủ chỗ trống (màn hình rộng từ ~1140px). Điện thoại/máy tính bảng thì ẩn.
   Cả cảnh dùng MỘT màu (--sea-ink) với độ đậm nhạt khác nhau; mọi kích thước tính theo bề rộng chỗ trống (--gw). */

/* =========================================================
   10. UNDER THE SEA — ĐẠI DƯƠNG HAI BÊN TRANG
   Phong cách: Minimal Ocean / Monochrome Blue
   ========================================================= */

:root, html, body, .sea, .sea-defs {
  --sea-ink: #66b3e8;
  --sea-ink-light: #93cff8;
  --sea-ink-soft: #7cc0f0;
  --sea-ink-deep: #529ed6;
  --sea-light: rgba(102, 179, 232, .10);
  --sea-mid: rgba(102, 179, 232, .24);
  --sea-deep: rgba(102, 179, 232, .45);
}

/* SVG definitions */
.sea-defs {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
}

.sea {
  display: none;
}

@media (min-width: 1140px) {

  /* ---------- KHUNG CẢNH ---------- */

  .sea {
    --gw: calc((100vw - 980px) / 2);

    position: fixed;
    top: 0;
    bottom: 0;
    width: var(--gw);
    display: block;
    overflow: hidden;
    pointer-events: none;
    z-index: 0;
    isolation: isolate;
    color: var(--sea-ink);

    background:
      radial-gradient(
        ellipse at 50% 15%,
        rgba(255,255,255,.7),
        transparent 65%
      ),
      linear-gradient(
        180deg,
        rgba(116,192,242,.04) 0%,
        rgba(116,192,242,.08) 55%,
        rgba(102,179,232,.15) 100%
      );
  }

  .sea-l { left: 0; }

  .sea-r { right: 0; }

  .sea svg {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
  }

  .sea .it {
    position: absolute;
    will-change: transform;
  }

  /* Lớp mờ sát mép nội dung */
  .sea-l {
    -webkit-mask-image: linear-gradient(
      90deg,
      #000 0%,
      #000 68%,
      transparent 100%
    );
    mask-image: linear-gradient(
      90deg,
      #000 0%,
      #000 68%,
      transparent 100%
    );
  }

  .sea-r {
    -webkit-mask-image: linear-gradient(
      270deg,
      #000 0%,
      #000 68%,
      transparent 100%
    );
    mask-image: linear-gradient(
      270deg,
      #000 0%,
      #000 68%,
      transparent 100%
    );
  }

  /* Ánh sáng mặt nước chuyển động rất chậm */
.bg::before {
  content: "";
  position: absolute;
  width: 70vw;
  height: 70vw;
  min-width: 420px;
  min-height: 420px;
  top: -35vw;
  left: -15vw;
  border-radius: 50%;

  background: radial-gradient(
    circle,
    rgba(116, 205, 245, .15) 0%,
    rgba(164, 224, 249, .07) 42%,
    transparent 70%
  );

  }

.bg::after {
  content: "";
  position: absolute;
  width: 60vw;
  height: 60vw;
  min-width: 360px;
  min-height: 360px;
  right: -25vw;
  bottom: -35vw;
  border-radius: 50%;

  background: radial-gradient(
    circle,
    rgba(92, 184, 232, .12) 0%,
    rgba(155, 220, 248, .06) 45%,
    transparent 72%
  );

  }

/* ---------- BỤI NƯỚC / BỌT KHÍ ---------- */

  .sea .dust {
    position: absolute;
    bottom: -15px;
    width: var(--s, 4px);
    height: var(--s, 4px);
    border-radius: 50%;

    background: rgba(255,255,255,.9);
    border: 1px solid rgba(102,179,232,.28);
    box-shadow: 0 0 8px rgba(255,255,255,.8);

    opacity: 0;
      }

  /* ---------- ĐÁY BIỂN ---------- */

  .sea::after {
    content: "";
    position: absolute;
    z-index: -1;
    left: -15%;
    right: -15%;
    bottom: -20px;
    height: 115px;

    border-radius: 50% 50% 0 0 / 25% 25% 0 0;

    background:
      repeating-linear-gradient(
        170deg,
        rgba(255,255,255,.16) 0 2px,
        transparent 2px 13px
      ),
      linear-gradient(
        180deg,
        rgba(118,194,244,.18),
        rgba(102,179,232,.34)
      );
  }

 /* ---------- MỎM ĐÁ MỞ RỘNG ---------- */

.rock-b {
  left: -12%;
  bottom: -5px;
  width: clamp(85px, calc(var(--gw) * .72), 165px);
  opacity: .62;
}

.rock-a {
  left: 12%;
  bottom: -5px;
  width: clamp(100px, calc(var(--gw) * .88), 195px);
  opacity: .72;
}

/* Đảo chiều bên phải */
.sea-r .rock-b {
  left: auto;
  right: -12%;
  transform: scaleX(-1);
}

.sea-r .rock-a {
  left: auto;
  right: 12%;
  transform: scaleX(-1);
}

/* Sỏi đá */
.pebbles {
  bottom: 3px;
  width: clamp(60px, calc(var(--gw) * .42), 95px);
  opacity: .72;
}

  /* ---------- RONG BIỂN ---------- */

  .kelp {
    bottom: -5px;
    width: clamp(18px, calc(var(--gw) * .13), 34px);

    transform-origin: 50% 100%;
      }

  .kelp svg {
    transform: scaleY(var(--h, 1));
    transform-origin: 50% 100%;
  }

  .kelp.far {
    width: clamp(20px, calc(var(--gw) * .15), 38px);
    opacity: .28;
  }

  .kelp.mid {
    opacity: .55;
  }

  .grass {
    bottom: -3px;
    width: clamp(14px, calc(var(--gw) * .09), 24px);
    opacity: .65;
    transform-origin: 50% 100%;
      }

  /* ---------- SAO BIỂN ---------- */

  .star {
    bottom: 7px;
    transform-origin: center;
      }

  .star.s1 {
    width: clamp(18px, calc(var(--gw) * .11), 28px);
    opacity: .7;
    transform: rotate(-15deg);
  }

  .star.s2 {
    width: clamp(13px, calc(var(--gw) * .075), 21px);
    bottom: 12px;
    opacity: .5;
      }

  /* ---------- CÁ BƠI ---------- */

  .fish {
    left: 7px;

    --wd: clamp(17px, calc(var(--gw) * var(--f, .15)), 43px);
    --sx: max(0px, calc(var(--gw) - var(--wd) - 14px));

    width: var(--wd);
    opacity: .7;

      }

  .fish.small {
    opacity: .48;
  }

  .fish .tail {
    transform-origin: 24px 25px;
      }

  .fish.slim .tail {
    transform-origin: 28px 18px;
  }

  .fish.small .tail {
    transform-origin: 14px 12px;
      }

  /* ---------- CUA BÒ ---------- */

  .crab {
    left: 6%;
    bottom: 7px;

    --cw: clamp(45px, calc(var(--gw) * .34), 82px);
    --walk: max(0px, calc(var(--gw) - var(--cw) - 35px));

    width: var(--cw);
    opacity: .7;

      }

  .crab.small {
    --cw: clamp(34px, calc(var(--gw) * .21), 58px);
    left: auto;
    right: 12%;
    opacity: .48;
      }

  .crab .claw {
    transform-box: view-box;
  }

  .crab .cl-l,
  .crab .cl-r {
    transform-origin: 12px 30px;
      }

  .crab .jaw {
    transform-box: view-box;
    transform-origin: 12px 24px;
      }

  .crab .legs {
    transform-box: view-box;
    transform-origin: 64px 60px;
      }

  /* ---------- RÙA BIỂN ---------- */

  .turtle {
    left: 7px;

    --wd: clamp(75px, calc(var(--gw) * .57), 135px);
    --sx: max(0px, calc(var(--gw) - var(--wd) - 14px));

    width: var(--wd);
    opacity: .7;

      }

  .turtle .fl {
    transform-box: view-box;
      }

  .turtle .fl-n {
    transform-origin: 88px 58px;
  }

  .turtle .fl-b {
    transform-origin: 98px 52px;
      }

  .turtle .fl-r {
    transform-origin: 36px 52px;
      }

  }

/* ---------- TÔN TRỌNG GIẢM CHUYỂN ĐỘNG ---------- */

@media (prefers-reduced-motion: reduce) {
  .sea *,
  .sea *::before,
  .sea *::after {
            transition-duration: .01ms !important;
  }
}

/* =====================================================================
   CHẾ ĐỘ TỐI (DARK MODE — ĐẠI DƯƠNG ĐÊM PASTEL)
   Kích hoạt khi <html data-theme="dark">
   ===================================================================== */
html[data-theme="dark"] {
  color-scheme: dark;
  --bg: #0b1522;
  --card: #132235;
  --text: #e6f1fc;
  --muted: #8ca8c6;
  --line: #213752;
  --accent: #68b5f0;
  --accent2: #89ccf9;
  --accent-deep: #93cefa;
  --ok: #46c3a4;
  --bad: #f08297;
  --past: #0f1c2d;
  --today: #182e47;
  --chip: #182b42;
  --shadow: 0 4px 12px rgba(0, 0, 0, .30), 0 12px 30px rgba(0, 0, 0, .35);
  --shadow-hover: 0 8px 22px rgba(0, 0, 0, .42), 0 18px 38px rgba(0, 0, 0, .46);
  --focus: 0 0 0 3px rgba(104, 181, 240, .28);
  --sea-ink: #7ec6f9;
  --sea-ink-light: #a6dcff;
  --sea-ink-soft: #88ccf9;
  --sea-ink-deep: #5ca8e2;
  --sea-light: rgba(126, 198, 249, .12);
  --sea-mid: rgba(126, 198, 249, .26);
  --sea-deep: rgba(126, 198, 249, .48);
}

html[data-theme="dark"] body {
  background:
    radial-gradient(ellipse at 12% 15%, rgba(102, 181, 238, .15), transparent 40%),
    radial-gradient(ellipse at 88% 72%, rgba(84, 158, 220, .12), transparent 44%),
    linear-gradient(180deg, #091320 0%, #0d1b2d 55%, #102136 100%);
  background-attachment: fixed;
  color: var(--text);
}

/* Thanh tiêu đề & nút công cụ */
html[data-theme="dark"] .top {
  background: rgba(11, 21, 34, .84);
  border-bottom-color: rgba(35, 59, 88, .85);
}
html[data-theme="dark"] .pill,
html[data-theme="dark"] .ibtn {
  background: #15263b;
  border-color: var(--line);
  color: var(--text);
  box-shadow: 0 2px 8px rgba(0, 0, 0, .25);
}
html[data-theme="dark"] .ibtn:hover {
  background: #1d334f;
  border-color: #2f4f75;
}

/* Thẻ ngân sách chính & đồng cỏ */
html[data-theme="dark"] .hero {
  --scene-ink: rgba(182, 226, 255, .68);
  background-image:
    radial-gradient(circle at 12% 22%, rgba(255,255,255,.16) 0 2px, transparent 3px),
    radial-gradient(circle at 27% 76%, rgba(255,255,255,.14) 0 1.5px, transparent 2.5px),
    radial-gradient(circle at 76% 33%, rgba(255,255,255,.18) 0 2px, transparent 3px),
    linear-gradient(135deg, #1d5585 0%, #266ca3 55%, #3583be 100%);
  box-shadow: 0 12px 30px rgba(0, 0, 0, .38);
}
html[data-theme="dark"] .hero.over {
  --scene-ink: rgba(255, 192, 206, .72);
  background: linear-gradient(135deg, #7c3346 0%, #984157 58%, #b05269 100%);
  box-shadow: 0 12px 30px rgba(0, 0, 0, .38);
}

/* Các thẻ, ô nhập liệu, nút bấm, chip */
html[data-theme="dark"] .stat,
html[data-theme="dark"] .card,
html[data-theme="dark"] .row,
html[data-theme="dark"] .sheet,
html[data-theme="dark"] .wm-card {
  background: var(--card);
  border-color: var(--line);
}
html[data-theme="dark"] .card h2 {
  text-decoration-color: rgba(104, 181, 240, .25);
}
html[data-theme="dark"] .seg {
  background: #0e1a29;
  border-color: #1d314a;
}
html[data-theme="dark"] .seg button.on {
  background: #1c324d;
  color: #9cd3fc;
  box-shadow: 0 2px 8px rgba(0, 0, 0, .3);
}
html[data-theme="dark"] input,
html[data-theme="dark"] textarea,
html[data-theme="dark"] select,
html[data-theme="dark"] .wm-search input {
  background: #0e1a29;
  color: var(--text);
  border-color: var(--line);
}
html[data-theme="dark"] input::placeholder,
html[data-theme="dark"] textarea::placeholder {
  color: #5c7896;
}
html[data-theme="dark"] input:hover,
html[data-theme="dark"] textarea:hover,
html[data-theme="dark"] select:hover {
  border-color: #315278;
}
html[data-theme="dark"] input:focus,
html[data-theme="dark"] textarea:focus,
html[data-theme="dark"] select:focus {
  background: #122133;
  border-color: var(--accent);
}
html[data-theme="dark"] select.psel option {
  background: #132235;
  color: var(--text);
}
html[data-theme="dark"] .chip {
  background: #172a40;
  border-color: #243e5c;
  color: #9acbf2;
}
html[data-theme="dark"] .chip:hover {
  background: #1f3754;
  border-color: #32557d;
  color: #bce0ff;
}
html[data-theme="dark"] .btn {
  background: #172a40;
  border-color: var(--line);
  color: var(--text);
}
html[data-theme="dark"] .btn:hover {
  background: #1f3754;
  border-color: #32557d;
}
html[data-theme="dark"] .btn.primary {
  background: linear-gradient(135deg, #3c86c4, #58a3df);
  border-color: transparent;
  color: #fff;
}
html[data-theme="dark"] .btn.danger {
  background: #2c1822;
  border-color: #4d2635;
  color: #f48ea2;
}
html[data-theme="dark"] .btn.danger:hover {
  background: #3b1e2b;
  border-color: #633043;
}

/* Bảng tuần & ô ngày trong kỳ */
html[data-theme="dark"] #calWrap {
  border-color: var(--line);
  background:
    radial-gradient(circle, rgba(104, 181, 240, .18) 1.1px, transparent 1.7px) 0 0 / 16px 16px,
    linear-gradient(180deg, rgba(19, 34, 53, .75), rgba(14, 26, 42, .55));
}
html[data-theme="dark"] .wk {
  background: rgba(19, 34, 53, .82);
  border-color: var(--line);
}
html[data-theme="dark"] .wk.now {
  border-color: #386593;
  box-shadow: 0 0 0 1px rgba(104, 181, 240, .2), var(--shadow);
}
html[data-theme="dark"] .wk .day:not(.void) {
  background: linear-gradient(145deg, #15263b 0%, #172940 52%, #1b2842 100%);
  border-color: #233b57;
}
html[data-theme="dark"] .wk .day:not(.void):nth-child(4n + 2),
html[data-theme="dark"] .wk .day:not(.void):nth-child(4n + 3) {
  background: linear-gradient(145deg, #17263d 0%, #1a2742 48%, #162940 100%);
  border-color: #273c59;
}
html[data-theme="dark"] .wk .day.past:not(.void),
html[data-theme="dark"] .row.past {
  background: linear-gradient(145deg, #101d2e 0%, #122033 55%, #142036 100%);
  border-color: #1c2f47;
}
html[data-theme="dark"] .wk .day.today:not(.void),
html[data-theme="dark"] .row.today {
  background: linear-gradient(145deg, #1b3654 0%, #213759 100%);
  border-color: #467eb5;
}
html[data-theme="dark"] .day.void {
  background: transparent;
  border-color: #1c2f47;
}
html[data-theme="dark"] .day:hover,
html[data-theme="dark"] .row:hover {
  border-color: #3c6794;
}
html[data-theme="dark"] .chk span {
  background: #0e1a29;
  border-color: #2b4766;
}
html[data-theme="dark"] .badge {
  background: #1d3958;
  color: #93cefa;
}
html[data-theme="dark"] .banner {
  background: linear-gradient(100deg, #162b44, #132338);
  border-color: #315880;
}
html[data-theme="dark"] .switch i {
  background: #253d59;
}
html[data-theme="dark"] .xi {
  background: #172a40;
}
html[data-theme="dark"] .xi:hover {
  background: #1e3550;
}
html[data-theme="dark"] .xi.on {
  background: #1f3a58;
  border-color: var(--accent);
}
html[data-theme="dark"] .xdel:hover {
  background: #331c26;
}
html[data-theme="dark"] .floaty {
  background: #182d46;
  color: #9ad2fc;
  box-shadow: 0 6px 16px rgba(0, 0, 0, .4);
}
html[data-theme="dark"] .sk {
  background: linear-gradient(90deg, #132235 25%, #1c314b 37%, #132235 63%);
  background-size: 400% 100%;
}

/* Mục Công việc (work.css) trong Dark Mode */
html[data-theme="dark"] .wm-empty {
  background: rgba(19, 34, 53, .6);
  border-color: #284463;
}
html[data-theme="dark"] .wm-ib {
  background: #182b42;
  color: #93c6ed;
}
html[data-theme="dark"] .wm-ib:hover {
  background: #213a57;
}
html[data-theme="dark"] .wm-ib.bad {
  background: #2e1923;
  color: var(--bad);
}
html[data-theme="dark"] .wm-ib.bad:hover {
  background: #3d202e;
}
html[data-theme="dark"] .wm-grp {
  background: #1b3450;
  color: #9ad2fc;
}
html[data-theme="dark"] .wm-code {
  color: #8ab8de;
}
html[data-theme="dark"] .wm-cover,
html[data-theme="dark"] .wm-gal button,
html[data-theme="dark"] .wm-ph {
  background: linear-gradient(135deg, #16283d, #112030);
}
html[data-theme="dark"] .wm-count {
  background: rgba(19, 34, 53, .92);
  color: #9ad2fc;
}
html[data-theme="dark"] .wm-addph {
  background: #142438;
  border-color: #2b496b;
  color: #9ad2fc;
}
html[data-theme="dark"] .wm-addph:hover {
  background: #1a2f48;
}
html[data-theme="dark"] .wm-pwc {
  background: #16283d;
  border-color: #264363;
  color: #a8d8ff;
}
html[data-theme="dark"] .wm-pwc:hover {
  background: #1d344f;
  border-color: #365d87;
}
html[data-theme="dark"] .wm-pastebox,
html[data-theme="dark"] .wm-quick,
html[data-theme="dark"] .wm-ck {
  background: #15263a;
  border-color: #243e5c;
}
html[data-theme="dark"] .wm-ck.ok {
  background: #122b29;
}
html[data-theme="dark"] .wm-ck.bad,
html[data-theme="dark"] .wm-err:not(:empty),
html[data-theme="dark"] .wm-banner {
  background: #2c1822;
  border-color: #522738;
  color: #f799ab;
}
html[data-theme="dark"] .wm-mon {
  background: rgba(19, 34, 53, .9);
  border-color: var(--line);
}
html[data-theme="dark"] .wm-mon.now {
  border-color: #3d6c9c;
}
html[data-theme="dark"] .wm-d:hover,
html[data-theme="dark"] .wm-ui:hover {
  background: #1b314b;
}
html[data-theme="dark"] .wm-ui {
  border-bottom-color: #1c2f47;
}
html[data-theme="dark"] .wm-modal .sheet > .twin:last-child {
  background: linear-gradient(180deg, rgba(19, 34, 53, 0), #132235 30%);
}
html[data-theme="dark"] .wm-cact button {
  background: rgba(19, 34, 53, .94);
  color: #9ad2fc;
}

/* Đại dương & bong bóng nền trong Dark Mode */
html[data-theme="dark"] .bg .b1 { background: radial-gradient(circle, rgba(82, 162, 230, .26) 0%, transparent 70%); }
html[data-theme="dark"] .bg .b2 { background: radial-gradient(circle, rgba(70, 148, 218, .22) 0%, transparent 70%); }
html[data-theme="dark"] .bg .b3 { background: radial-gradient(circle, rgba(100, 180, 242, .20) 0%, transparent 70%); }
html[data-theme="dark"] .bub {
  background:
    radial-gradient(
      circle at 30% 25%,
      rgba(215, 240, 255, .75) 0%,
      rgba(145, 208, 252, .28) 22%,
      rgba(95, 175, 235, .14) 58%,
      rgba(65, 145, 210, .08) 100%
    );
  border-color: rgba(175, 224, 255, .48);
  box-shadow:
    inset -4px -6px 14px rgba(110, 190, 245, .15),
    0 0 14px rgba(110, 190, 245, .14);
}
@media (min-width: 1140px) {
  html[data-theme="dark"] .sea {
    background:
      radial-gradient(ellipse at 50% 15%, rgba(110, 188, 245, .12), transparent 65%),
      linear-gradient(180deg, rgba(20, 44, 72, .25) 0%, rgba(16, 36, 60, .45) 55%, rgba(12, 28, 48, .7) 100%);
  }
  html[data-theme="dark"] .sea::after {
    background:
      repeating-linear-gradient(170deg, rgba(145, 208, 252, .08) 0 2px, transparent 2px 13px),
      linear-gradient(180deg, rgba(58, 132, 196, .18), rgba(42, 104, 162, .34));
  }
}

`;

  function applyPastelBlueDefs(isDark) {
    if (typeof isDark !== 'boolean') {
      isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    }
    const root = document.documentElement;
    if (root && root.style) {
      root.style.setProperty('--sea-ink', isDark ? '#7ec6f9' : '#66b3e8');
      root.style.setProperty('--sea-ink-light', isDark ? '#a6dcff' : '#93cff8');
      root.style.setProperty('--sea-ink-soft', isDark ? '#88ccf9' : '#7cc0f0');
      root.style.setProperty('--sea-ink-deep', isDark ? '#5ca8e2' : '#529ed6');
    }
    const defs = document.querySelector('.sea-defs defs');
    if (defs) {
      const cTop = isDark ? '#92d2fc' : '#7ec4f4';
      const cBot = isDark ? '#66b2ea' : '#5ba6de';
      const sTop = isDark ? '#aee0ff' : '#98d3f9';
      const sBot = isDark ? '#7ac0f4' : '#6eb8ec';
      const rTop = isDark ? '#8ecdf8' : '#87c7f2';
      const rMid = isDark ? '#6eb8ec' : '#6bb3e6';
      const rBot = isDark ? '#549cd6' : '#559dd4';
      const kBot = isDark ? '#68b2e8' : '#5ca7df';
      const kTop = isDark ? '#9cd7fd' : '#8accf7';
      defs.innerHTML = `
        <linearGradient id="gBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style="stop-color:${cTop};stop-opacity:.95"/>
          <stop offset="1" style="stop-color:${cBot};stop-opacity:.68"/>
        </linearGradient>
        <linearGradient id="gSoft" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style="stop-color:${sTop};stop-opacity:.85"/>
          <stop offset="1" style="stop-color:${sBot};stop-opacity:.48"/>
        </linearGradient>
        <linearGradient id="gRock" x1="0" y1="0" x2=".35" y2="1">
          <stop offset="0" style="stop-color:${rTop};stop-opacity:.82"/>
          <stop offset=".6" style="stop-color:${rMid};stop-opacity:.58"/>
          <stop offset="1" style="stop-color:${rBot};stop-opacity:.40"/>
        </linearGradient>
        <linearGradient id="gKelp" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" style="stop-color:${kBot};stop-opacity:.55"/>
          <stop offset="1" style="stop-color:${kTop};stop-opacity:.94"/>
        </linearGradient>
        <linearGradient id="gSand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style="stop-color:#8acaf5;stop-opacity:.34"/>
          <stop offset="1" style="stop-color:#8acaf5;stop-opacity:.12"/>
        </linearGradient>
      `;
    }
  }

  function ensureBaseLayoutCss() {
    let style = document.getElementById('app-animations-base-layout');
    if (!style) {
      style = document.createElement('style');
      style.id = 'app-animations-base-layout';
      style.textContent = BASE_LAYOUT_CSS;
      (document.head || document.documentElement).appendChild(style);
    }
    applyPastelBlueDefs();
  }
  // ========== QUẢN LÝ CHẾ ĐỘ SÁNG / TỐI (LIGHT / DARK THEME) ==========
  const THEME_KEY = 'app_theme';

  function getSavedTheme() {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch (e) {}
    return 'light';
  }

  function applyTheme(theme, animateBtn) {
    const isDark = theme === 'dark';
    const root = document.documentElement;
    if (isDark) {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
    try { localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light'); } catch (e) {}

    // Cập nhật meta theme-color trên điện thoại
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', isDark ? '#0b1522' : '#f1f8ff');
    }

    // Cập nhật dải màu SVG sinh vật biển phù hợp với nền Sáng / Tối
    applyPastelBlueDefs(isDark);
    if (typeof DayGlow !== 'undefined' && DayGlow && DayGlow.start) setTimeout(() => DayGlow.start(), 0);

    // Cập nhật biểu tượng nút #btnTheme
    const btn = document.getElementById('btnTheme');
    if (btn) {
      btn.textContent = isDark ? '☀️' : '🌙';
      const label = isDark ? 'Chuyển sang chế độ Sáng' : 'Chuyển sang chế độ Tối';
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
      if (animateBtn && btn.animate && CONFIG.enabled && !CONFIG.reducedMotion) {
        btn.animate([
          { transform: 'rotate(-90deg) scale(0.75)', opacity: 0.5 },
          { transform: 'rotate(15deg) scale(1.12)', opacity: 1, offset: 0.65 },
          { transform: 'rotate(0deg) scale(1)', opacity: 1 }
        ], { duration: 360, easing: 'cubic-bezier(.2,.8,.2,1)' });
      }
    }
  }

  function ensureThemeButton() {
    const tools = document.getElementById('tools');
    if (!tools) return;
    let btn = document.getElementById('btnTheme');
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'btnTheme';
      btn.className = 'ibtn';
      const settingsBtn = document.getElementById('btnSettings');
      if (settingsBtn && settingsBtn.parentNode === tools) {
        tools.insertBefore(btn, settingsBtn);
      } else {
        tools.appendChild(btn);
      }
    }
    if (!btn._themeBound) {
      btn._themeBound = true;
      btn.addEventListener('click', () => {
        const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        applyTheme(next, true);
      });
    }
    applyTheme(getSavedTheme(), false);
  }

  // Nạp ngay lập tức để tránh FOUC (Flash of Unstyled SVG) & khôi phục chế độ Sáng/Tối
  ensureBaseLayoutCss();
  applyTheme(getSavedTheme(), false);

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
      daisy: true,            // Hoa cúc Daisy pastel nhiều kích cỡ, nổi lơ lửng chậm xung quanh bảng các ngày trong kỳ
      dayGlow: true,          // Phát sáng nhẹ màu xanh dương mờ (dương tiền) & đỏ mờ (âm tiền) cho các ngày trong kỳ
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

  // Helper lấy số mili-giây từ CSS custom property dạng "16s", "-2s", "120ms"
  function parseCssSec(val, defSec) {
    if (!val) return defSec * 1000;
    val = String(val).trim();
    if (val.endsWith('ms')) return parseFloat(val);
    if (val.endsWith('s')) return parseFloat(val) * 1000;
    const n = parseFloat(val);
    return isNaN(n) ? defSec * 1000 : n * 1000;
  }

  function clamp(min, val, max) {
    return Math.min(max, Math.max(min, val));
  }

  function getSeaGw(el) {
    const sea = el && el.closest('.sea');
    if (sea && sea.clientWidth > 0) return sea.clientWidth;
    return Math.max(0, (window.innerWidth - 980) / 2);
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

  // Helper tạo keyframes cho cá/rùa bơi ngang
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
    if (!el.animate) return null;

    const opt = Object.assign({}, options);
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
      return null;
    }
  }

  // Quản lý style động cho các pseudo-elements (::before, ::after)
  let dynamicStyleEl = null;
  function updatePseudoStyles() {
    ensureBaseLayoutCss();
    if (!dynamicStyleEl) {
      dynamicStyleEl = document.createElement('style');
      dynamicStyleEl.id = 'app-animations-dynamic';
      (document.head || document.documentElement).appendChild(dynamicStyleEl);
    }

    if (!CONFIG.enabled || CONFIG.reducedMotion) {
      dynamicStyleEl.textContent = `
        .top h1::after, .hero:before, .hero:after, .hero .lbl::before,
        .btn.primary, #qGo, #qGo::before, .bar > i::after, .bg::before, .bg::after,
        .btn:hover::after, .chip:hover::after, .ibtn:hover::after, .row.today, .day.today {
          animation: none !important;
        }
      `;
      return;
    }

    const sp = CONFIG.speed || 1.0;
    const ambientOn = CONFIG.categories.ambient !== false;
    const oceanOn = CONFIG.categories.ocean !== false;
    const uiOn = CONFIG.categories.ui !== false;

    dynamicStyleEl.textContent = `
      /* Hoạt ảnh pseudo-elements & trạng thái liên tục do JS điều khiển */
      ${ambientOn ? `
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
      .btn:hover::after, .chip:hover::after, .ibtn:hover::after { animation: jsShineSweep ${0.65 / sp}s ease-out !important; }
      ` : ''}
      ${uiOn ? `
      .row.today, .day.today { animation: jsTodayGlow ${3.4 / sp}s ease-in-out infinite !important; }
      ` : ''}
      ${oceanOn ? `
      .bg::before { animation: jsOceanLight ${18 / sp}s ease-in-out infinite alternate !important; }
      .bg::after { animation: jsOceanLight ${24 / sp}s ease-in-out infinite alternate-reverse !important; }
      ` : ''}

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
      @keyframes jsShineSweep {
        from { left: -75%; }
        to   { left: 140%; }
      }
      @keyframes jsTodayGlow {
        0%,100% { box-shadow:0 0 0 1px rgba(130,196,236,.12), 0 0 0 0 rgba(102,174,232,0); }
        50%     { box-shadow:0 0 0 1px rgba(130,196,236,.22), 0 0 0 6px rgba(102,174,232,.13); }
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
        let delay = Math.min(index, 10) * 30;
        const customI = item.style.getPropertyValue('--i');
        if (customI !== '') delay = parseFloat(customI) * 14;
        UI.fadeLift(item, delay, 420);
      });
    },

    // Hiệu ứng hộp thoại trồi lên lần lượt (sheet children stagger)
    sheetEnter(sheet) {
      if (!sheet) return;
      Array.from(sheet.children).forEach((child, index) => {
        UI.fadeLift(child, Math.min(index, 7) * 32, 380);
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

  // ========== 7.5. HOA CÚC DAISY PASTEL NỔI XUNG QUANH BẢNG CÁC NGÀY TRONG KỲ (CALENDAR DAISIES) ==========
  const DAISY_PRESETS = [
    { type: 'blue',   s: 34, top: 4,  left: 5,  dur: 17000, dl: -3000,  dx: 12,  dy: -18, rot: 24,  op: 0.86 },
    { type: 'pink',   s: 24, top: 7,  left: 27, dur: 21000, dl: -8000,  dx: -14, dy: -22, rot: -28, op: 0.80 },
    { type: 'purple', s: 28, top: 3,  left: 51, dur: 15000, dl: -5000,  dx: 15,  dy: -14, rot: 20,  op: 0.84 },
    { type: 'blue',   s: 20, top: 6,  left: 74, dur: 19000, dl: -11000, dx: -10, dy: -20, rot: -22, op: 0.75 },
    { type: 'pink',   s: 38, top: 5,  left: 92, dur: 22000, dl: -2000,  dx: 14,  dy: -16, rot: 26,  op: 0.90 },

    { type: 'purple', s: 22, top: 23, left: 2,  dur: 18000, dl: -9000,  dx: -12, dy: -24, rot: -25, op: 0.78 },
    { type: 'blue',   s: 17, top: 29, left: 16, dur: 23000, dl: -4000,  dx: 11,  dy: -15, rot: 18,  op: 0.72 },
    { type: 'pink',   s: 26, top: 27, left: 83, dur: 16000, dl: -13000, dx: -13, dy: -26, rot: -20, op: 0.82 },
    { type: 'purple', s: 34, top: 25, left: 96, dur: 20000, dl: -7000,  dx: 12,  dy: -20, rot: 25,  op: 0.88 },

    { type: 'pink',   s: 18, top: 47, left: 4,  dur: 24000, dl: -15000, dx: 13,  dy: -16, rot: 22,  op: 0.75 },
    { type: 'blue',   s: 30, top: 51, left: 12, dur: 17000, dl: -1000,  dx: -12, dy: -24, rot: -24, op: 0.85 },
    { type: 'purple', s: 22, top: 45, left: 87, dur: 19000, dl: -10000, dx: 11,  dy: -18, rot: 20,  op: 0.78 },
    { type: 'blue',   s: 26, top: 53, left: 95, dur: 22000, dl: -6000,  dx: -14, dy: -22, rot: -26, op: 0.82 },

    { type: 'purple', s: 36, top: 69, left: 1,  dur: 20000, dl: -12000, dx: 14,  dy: -20, rot: 28,  op: 0.90 },
    { type: 'pink',   s: 20, top: 73, left: 20, dur: 16000, dl: -4000,  dx: -10, dy: -18, rot: -18, op: 0.75 },
    { type: 'blue',   s: 28, top: 67, left: 79, dur: 23000, dl: -14000, dx: 13,  dy: -25, rot: 22,  op: 0.85 },
    { type: 'pink',   s: 18, top: 75, left: 93, dur: 18000, dl: -8000,  dx: -11, dy: -16, rot: -20, op: 0.72 },

    { type: 'blue',   s: 24, top: 91, left: 7,  dur: 19000, dl: -6000,  dx: 12,  dy: -15, rot: 22,  op: 0.80 },
    { type: 'purple', s: 32, top: 89, left: 34, dur: 21000, dl: -16000, dx: -15, dy: -24, rot: -26, op: 0.88 },
    { type: 'pink',   s: 24, top: 92, left: 61, dur: 17000, dl: -2000,  dx: 12,  dy: -18, rot: 20,  op: 0.82 },
    { type: 'blue',   s: 36, top: 90, left: 89, dur: 24000, dl: -10000, dx: -14, dy: -22, rot: -25, op: 0.90 }
  ];

  function ensureDaisyDefs() {
    if (document.getElementById('daisyDefsSvg')) return;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'daisyDefsSvg';
    svg.setAttribute('class', 'daisy-defs');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
    svg.innerHTML = `
      <defs>
        <g id="appDaisyBlue">
          <g class="df-p" fill="#9ad4fb">
            <ellipse cx="12" cy="4.8" rx="2.1" ry="4.5"/>
            <ellipse cx="12" cy="4.8" rx="2.1" ry="4.5" transform="rotate(36 12 12)"/>
            <ellipse cx="12" cy="4.8" rx="2.1" ry="4.5" transform="rotate(72 12 12)"/>
            <ellipse cx="12" cy="4.8" rx="2.1" ry="4.5" transform="rotate(108 12 12)"/>
            <ellipse cx="12" cy="4.8" rx="2.1" ry="4.5" transform="rotate(144 12 12)"/>
            <ellipse cx="12" cy="4.8" rx="2.1" ry="4.5" transform="rotate(180 12 12)"/>
            <ellipse cx="12" cy="4.8" rx="2.1" ry="4.5" transform="rotate(216 12 12)"/>
            <ellipse cx="12" cy="4.8" rx="2.1" ry="4.5" transform="rotate(252 12 12)"/>
            <ellipse cx="12" cy="4.8" rx="2.1" ry="4.5" transform="rotate(288 12 12)"/>
            <ellipse cx="12" cy="4.8" rx="2.1" ry="4.5" transform="rotate(324 12 12)"/>
          </g>
          <circle cx="12" cy="12" r="3.2" fill="#ffd566"/>
          <circle cx="11.2" cy="11.2" r="1.1" fill="#fff" opacity="0.75"/>
        </g>
        <g id="appDaisyPink">
          <g class="df-p" fill="#fbaece">
            <ellipse cx="12" cy="4.8" rx="2.1" ry="4.5"/>
            <ellipse cx="12" cy="4.8" rx="2.1" ry="4.5" transform="rotate(36 12 12)"/>
            <ellipse cx="12" cy="4.8" rx="2.1" ry="4.5" transform="rotate(72 12 12)"/>
            <ellipse cx="12" cy="4.8" rx="2.1" ry="4.5" transform="rotate(108 12 12)"/>
            <ellipse cx="12" cy="4.8" rx="2.1" ry="4.5" transform="rotate(144 12 12)"/>
            <ellipse cx="12" cy="4.8" rx="2.1" ry="4.5" transform="rotate(180 12 12)"/>
            <ellipse cx="12" cy="4.8" rx="2.1" ry="4.5" transform="rotate(216 12 12)"/>
            <ellipse cx="12" cy="4.8" rx="2.1" ry="4.5" transform="rotate(252 12 12)"/>
            <ellipse cx="12" cy="4.8" rx="2.1" ry="4.5" transform="rotate(288 12 12)"/>
            <ellipse cx="12" cy="4.8" rx="2.1" ry="4.5" transform="rotate(324 12 12)"/>
          </g>
          <circle cx="12" cy="12" r="3.2" fill="#ffe270"/>
          <circle cx="11.2" cy="11.2" r="1.1" fill="#fff" opacity="0.75"/>
        </g>
        <g id="appDaisyPurple">
          <g class="df-p" fill="#cbaaf8">
            <ellipse cx="12" cy="4.8" rx="2.1" ry="4.5"/>
            <ellipse cx="12" cy="4.8" rx="2.1" ry="4.5" transform="rotate(36 12 12)"/>
            <ellipse cx="12" cy="4.8" rx="2.1" ry="4.5" transform="rotate(72 12 12)"/>
            <ellipse cx="12" cy="4.8" rx="2.1" ry="4.5" transform="rotate(108 12 12)"/>
            <ellipse cx="12" cy="4.8" rx="2.1" ry="4.5" transform="rotate(144 12 12)"/>
            <ellipse cx="12" cy="4.8" rx="2.1" ry="4.5" transform="rotate(180 12 12)"/>
            <ellipse cx="12" cy="4.8" rx="2.1" ry="4.5" transform="rotate(216 12 12)"/>
            <ellipse cx="12" cy="4.8" rx="2.1" ry="4.5" transform="rotate(252 12 12)"/>
            <ellipse cx="12" cy="4.8" rx="2.1" ry="4.5" transform="rotate(288 12 12)"/>
            <ellipse cx="12" cy="4.8" rx="2.1" ry="4.5" transform="rotate(324 12 12)"/>
          </g>
          <circle cx="12" cy="12" r="3.2" fill="#ffd566"/>
          <circle cx="11.2" cy="11.2" r="1.1" fill="#fff" opacity="0.75"/>
        </g>
      </defs>
    `;
    (document.body || document.documentElement).appendChild(svg);
  }

  function ensureDaisyStyles() {
    if (document.getElementById('daisyStyles')) return;
    const st = document.createElement('style');
    st.id = 'daisyStyles';
    st.textContent = `
      #calWrap {
        position: relative;
        overflow: hidden;
        isolation: isolate;
      }
      #calWrap > :not(.daisy-field) {
        position: relative;
        z-index: 2;
      }
      .daisy-field {
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 1;
        overflow: hidden;
        border-radius: inherit;
      }
      .daisy-item {
        position: absolute;
        display: block;
        will-change: transform, opacity;
        filter: drop-shadow(0 2px 6px rgba(102, 174, 232, .24));
      }
      .daisy-item svg {
        width: 100%;
        height: 100%;
        display: block;
      }
      html[data-theme="dark"] .daisy-item {
        filter: drop-shadow(0 0 8px rgba(160, 215, 255, .32)) drop-shadow(0 2px 4px rgba(0, 0, 0, .4));
      }
      html[data-theme="dark"] #appDaisyBlue .df-p { fill: #86cbf8; }
      html[data-theme="dark"] #appDaisyPink .df-p { fill: #f99fc4; }
      html[data-theme="dark"] #appDaisyPurple .df-p { fill: #c09af6; }
    `;
    (document.head || document.documentElement).appendChild(st);
  }

  const Daisy = {
    anims: [],
    start() {
      this.stop();
      if (!CONFIG.enabled || CONFIG.reducedMotion || CONFIG.categories.daisy === false) return;

      const calWrap = document.getElementById('calWrap');
      if (!calWrap) return;

      ensureDaisyDefs();
      ensureDaisyStyles();

      let field = calWrap.querySelector('.daisy-field');
      if (!field) {
        field = document.createElement('div');
        field.className = 'daisy-field';
        field.setAttribute('aria-hidden', 'true');

        const map = { blue: '#appDaisyBlue', pink: '#appDaisyPink', purple: '#appDaisyPurple' };
        field.innerHTML = DAISY_PRESETS.map((d) =>
          `<span class="daisy-item" style="width:${d.s}px;height:${d.s}px;top:${d.top}%;left:${d.left}%;opacity:${d.op};" ` +
          `data-dur="${d.dur}" data-dl="${d.dl}" data-dx="${d.dx}" data-dy="${d.dy}" data-rot="${d.rot}">` +
          `<svg viewBox="0 0 24 24"><use href="${map[d.type]}"/></svg>` +
          `</span>`
        ).join('');

        calWrap.insertBefore(field, calWrap.firstChild);
      }

      field.querySelectorAll('.daisy-item').forEach((el) => {
        const dur = parseFloat(el.getAttribute('data-dur')) || 18000;
        const dl = parseFloat(el.getAttribute('data-dl')) || 0;
        const dx = parseFloat(el.getAttribute('data-dx')) || 12;
        const dy = parseFloat(el.getAttribute('data-dy')) || -18;
        const rot = parseFloat(el.getAttribute('data-rot')) || 24;

        const a = runAnimation(el, [
          { transform: 'translate3d(0, 0, 0) rotate(0deg) scale(1)', offset: 0 },
          { transform: `translate3d(${(dx * 0.9).toFixed(1)}px, ${(dy * 0.7).toFixed(1)}px, 0) rotate(${(rot * 0.9).toFixed(0)}deg) scale(1.06)`, offset: 0.32 },
          { transform: `translate3d(${(-dx * 0.8).toFixed(1)}px, ${(dy * 1.3).toFixed(1)}px, 0) rotate(${(-rot * 0.75).toFixed(0)}deg) scale(0.95)`, offset: 0.68 },
          { transform: `translate3d(${(dx * 0.4).toFixed(1)}px, ${(dy * 0.5).toFixed(1)}px, 0) rotate(${(rot * 0.35).toFixed(0)}deg) scale(1.02)`, offset: 0.86 },
          { transform: 'translate3d(0, 0, 0) rotate(0deg) scale(1)', offset: 1 }
        ], {
          duration: dur,
          delay: dl,
          iterations: Infinity,
          easing: 'ease-in-out'
        }, 'daisy');

        if (a) this.anims.push(a);
      });
    },

    stop() {
      this.anims.forEach((a) => a.cancel());
      this.anims = [];
      const field = document.querySelector('#calWrap .daisy-field');
      if (field && field.parentNode) {
        field.parentNode.removeChild(field);
      }
    }
  };

  // ========== 7.6. HIỆU ỨNG PHÁT SÁNG NHẸ Ô NGÀY DƯƠNG TIỀN (XANH DƯƠNG MỜ) & ÂM TIỀN (ĐỎ MỜ) ==========
  function ensureDayGlowStyles() {
    if (document.getElementById('dayGlowStyles')) return;
    const st = document.createElement('style');
    st.id = 'dayGlowStyles';
    st.textContent = `
      /* Ô ngày đã chốt DƯƠNG TIỀN (.pos): màu xanh dương mờ & phát sáng nhẹ */
      #calWrap .wk .day.pos:not(.void) {
        background: linear-gradient(145deg, rgba(158, 216, 255, .54) 0%, rgba(194, 231, 255, .42) 55%, rgba(216, 240, 255, .50) 100%) !important;
        border-color: rgba(82, 168, 238, .78) !important;
        box-shadow: 0 0 9px rgba(82, 170, 242, .25), inset 0 0 12px rgba(120, 195, 255, .20);
      }
      #calWrap .wk .day.pos:not(.void)::after {
        background: linear-gradient(90deg, #4da3eb, #7cc4fa) !important;
        box-shadow: 0 0 6px rgba(77, 163, 235, .65);
      }
      #calWrap .wk .day.pos:not(.void) .f.df,
      #calWrap .wk .day.pos:not(.void) .c.df {
        color: #1f6fb2 !important;
      }

      /* Ô ngày đã chốt ÂM TIỀN (.neg): màu đỏ mờ & phát sáng nhẹ */
      #calWrap .wk .day.neg:not(.void) {
        background: linear-gradient(145deg, rgba(255, 176, 192, .54) 0%, rgba(255, 202, 214, .42) 55%, rgba(255, 218, 226, .50) 100%) !important;
        border-color: rgba(235, 100, 126, .78) !important;
        box-shadow: 0 0 9px rgba(235, 95, 122, .25), inset 0 0 12px rgba(245, 120, 142, .18);
      }
      #calWrap .wk .day.neg:not(.void)::after {
        background: linear-gradient(90deg, #e55c78, #f28a9f) !important;
        box-shadow: 0 0 6px rgba(229, 92, 120, .65);
      }
      #calWrap .wk .day.neg:not(.void) .f.df,
      #calWrap .wk .day.neg:not(.void) .c.df {
        color: #c83e5b !important;
      }

      /* Chế độ Tối (Dark Mode) cho ô ngày Dương tiền & Âm tiền */
      html[data-theme="dark"] #calWrap .wk .day.pos:not(.void) {
        background: linear-gradient(145deg, rgba(34, 104, 172, .46) 0%, rgba(26, 82, 138, .36) 55%, rgba(22, 68, 120, .42) 100%) !important;
        border-color: rgba(92, 182, 252, .75) !important;
        box-shadow: 0 0 10px rgba(82, 175, 250, .30), inset 0 0 14px rgba(82, 175, 250, .20);
      }
      html[data-theme="dark"] #calWrap .wk .day.pos:not(.void) .f.df,
      html[data-theme="dark"] #calWrap .wk .day.pos:not(.void) .c.df {
        color: #82c8ff !important;
      }

      html[data-theme="dark"] #calWrap .wk .day.neg:not(.void) {
        background: linear-gradient(145deg, rgba(158, 42, 68, .46) 0%, rgba(124, 32, 54, .36) 55%, rgba(102, 26, 46, .42) !important) !important;
        background: linear-gradient(145deg, rgba(158, 42, 68, .46) 0%, rgba(124, 32, 54, .36) 55%, rgba(102, 26, 46, .42) 100%) !important;
        border-color: rgba(245, 110, 136, .75) !important;
        box-shadow: 0 0 10px rgba(242, 102, 128, .30), inset 0 0 14px rgba(242, 102, 128, .20);
      }
      html[data-theme="dark"] #calWrap .wk .day.neg:not(.void) .f.df,
      html[data-theme="dark"] #calWrap .wk .day.neg:not(.void) .c.df {
        color: #ff99ae !important;
      }
    `;
    (document.head || document.documentElement).appendChild(st);
  }

  const DayGlow = {
    anims: [],
    start() {
      this.stop();
      ensureDayGlowStyles();
      if (!CONFIG.enabled || CONFIG.reducedMotion || CONFIG.categories.dayGlow === false) return;

      const calWrap = document.getElementById('calWrap');
      if (!calWrap) return;

      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

      // Khung hình phát sáng nhịp thở cho ngày dương tiền (xanh dương mờ)
      const posFrames = isDark
        ? [
            { boxShadow: '0 0 8px rgba(82, 175, 250, .24), inset 0 0 10px rgba(82, 175, 250, .15)' },
            { boxShadow: '0 0 16px rgba(98, 190, 255, .52), inset 0 0 18px rgba(98, 190, 255, .30)' }
          ]
        : [
            { boxShadow: '0 0 7px rgba(82, 170, 242, .20), inset 0 0 10px rgba(120, 195, 255, .15)' },
            { boxShadow: '0 0 15px rgba(72, 165, 245, .44), inset 0 0 16px rgba(120, 195, 255, .30)' }
          ];

      // Khung hình phát sáng nhịp thở cho ngày âm tiền (đỏ mờ)
      const negFrames = isDark
        ? [
            { boxShadow: '0 0 8px rgba(242, 102, 128, .24), inset 0 0 10px rgba(242, 102, 128, .15)' },
            { boxShadow: '0 0 16px rgba(252, 116, 142, .52), inset 0 0 18px rgba(252, 116, 142, .30)' }
          ]
        : [
            { boxShadow: '0 0 7px rgba(235, 95, 122, .20), inset 0 0 10px rgba(245, 120, 142, .14)' },
            { boxShadow: '0 0 15px rgba(235, 86, 114, .44), inset 0 0 16px rgba(245, 120, 142, .28)' }
          ];

      calWrap.querySelectorAll('.wk .day.pos:not(.void)').forEach((el, idx) => {
        const a = runAnimation(el, posFrames, {
          duration: 3200,
          delay: -(idx * 310),
          iterations: Infinity,
          direction: 'alternate',
          easing: 'ease-in-out'
        }, 'dayGlow');
        if (a) this.anims.push(a);
      });

      calWrap.querySelectorAll('.wk .day.neg:not(.void)').forEach((el, idx) => {
        const a = runAnimation(el, negFrames, {
          duration: 3200,
          delay: -(idx * 310),
          iterations: Infinity,
          direction: 'alternate',
          easing: 'ease-in-out'
        }, 'dayGlow');
        if (a) this.anims.push(a);
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

      // 7.4. Sao biển thở (star) — giữ nguyên góc xoay -15deg của .s1
      document.querySelectorAll('.sea .star').forEach((s) => {
        const dl = s.classList.contains('s2') ? -3000 : 0;
        const isS1 = s.classList.contains('s1');
        const frames = isS1
          ? [{ transform: 'rotate(-15deg) scale(1)', offset: 0 }, { transform: 'rotate(-15deg) scale(1.08)', offset: 1 }]
          : KEYFRAMES.starBreath;
        const a = runAnimation(s, frames, { duration: 7000, delay: dl, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }, 'sea');
        if (a) this.anims.push(a);
      });

      // 7.5. Cá bơi ngang, nhấp nhô & vẫy đuôi
      document.querySelectorAll('.sea .fish').forEach((f) => {
        const t = parseCssSec(f.style.getPropertyValue('--t'), 32);
        const dl = parseCssSec(f.style.getPropertyValue('--dl'), 0);

        const gw = getSeaGw(f);
        const fRatio = parseFloat(f.style.getPropertyValue('--f')) || 0.18;
        const fishW = f.clientWidth || clamp(14, gw * fRatio, 78);
        const sx = Math.max(0, gw - fishW - 14);

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

        const gw = getSeaGw(c);
        const crabW = c.clientWidth || (isSmall ? clamp(34, gw * 0.21, 58) : clamp(45, gw * 0.34, 82));
        const walk = Math.max(0, gw - crabW - 35);

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

        const jaw = c.querySelector('.jaw');
        if (jaw) {
          const a5 = runAnimation(jaw, KEYFRAMES.jawSnap, { duration: 2500, iterations: Infinity, easing: 'ease-in-out' }, 'sea');
          if (a5) this.anims.push(a5);
        }

        const legs = c.querySelector('.legs');
        if (legs) {
          const a6 = runAnimation(legs, KEYFRAMES.legsScuttle, { duration: 600, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }, 'sea');
          if (a6) this.anims.push(a6);
        }
      });

      // 7.7. Rùa biển bơi & đập vây
      document.querySelectorAll('.sea .turtle').forEach((turtle) => {
        const gw = getSeaGw(turtle);
        const turtleW = turtle.clientWidth || clamp(70, gw * 0.46, 132);
        const sx = Math.max(0, gw - turtleW - 14);

        const a1 = runAnimation(turtle, makeSwimKeyframes(sx), { duration: 90000, delay: -22000, iterations: Infinity, easing: 'linear' }, 'sea');
        if (a1) this.anims.push(a1);

        const svg = turtle.querySelector('svg');
        if (svg) {
          const a2 = runAnimation(svg, KEYFRAMES.turtleBob, { duration: 7000, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }, 'sea');
          if (a2) this.anims.push(a2);
        }

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

  // ========== 8. TỰ ĐỘNG QUAN SÁT THAY ĐỔI DOM & SỰ KIỆN ==========
  let observer = null;
  let eventsBound = false;

  function setupObserver() {
    if (!eventsBound) {
      eventsBound = true;
      document.addEventListener('change', (e) => {
        const t = e.target;
        if (t && t.matches && t.matches('.chk input:checked')) {
          const span = t.nextElementSibling;
          if (span) UI.checkPop(span);
        }
      });
    }

    if (observer || typeof MutationObserver === 'undefined') return;

    observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.attributeName === 'class') {
          const target = m.target;
          if (!target || !target.classList) continue;
          if (target.classList.contains('flash')) {
            UI.flash(target);
          }
          if (target.classList.contains('nudge')) {
            UI.nudge(target);
          }
          if (target.classList.contains('enter')) {
            UI.enterList(target);
          }
          if (target.classList.contains('modal') && target.classList.contains('on')) {
            const sheet = target.querySelector('.sheet');
            if (sheet) UI.sheetEnter(sheet);
          }
          if (target.classList.contains('toast') && target.classList.contains('on')) {
            UI.toastEnter(target);
          }
          if (target.id === 'notice' && !target.classList.contains('hidden')) {
            UI.slideDown(target);
          }
          if (target.id === 'hero') {
            Meadow.checkOverState();
          }
          if (target.id === 'list' || target.id === 'calWrap') {
            Daisy.start();
            DayGlow.start();
          }
        } else if (m.type === 'childList' && m.addedNodes.length) {
          const target = m.target;
          if (target && target.classList && target.classList.contains('chips')) {
            Array.from(target.querySelectorAll('.chip')).forEach((chip, idx) => {
              UI.popIn(chip, Math.min(idx, 7) * 30);
            });
          }
          if (target && (target.id === 'list' || target.id === 'calWrap' || (target.closest && target.closest('#calWrap')))) {
            DayGlow.start();
          }
        }
      }
    });

    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ['class']
    });
  }

  // Hiệu ứng xuất hiện ban đầu cho các thẻ thống kê và ô nhập nhanh
  function animateInitialCards() {
    const big = document.getElementById('hBig');
    if (big) UI.numberAppear(big);
    document.querySelectorAll('.stats .stat').forEach((st, i) => {
      UI.fadeLift(st, i * 70, 550);
    });
    const quick = document.getElementById('quick');
    if (quick) UI.fadeLift(quick, 80, 550);
  }

  // ========== 9. GIAO DIỆN ĐIỀU KHIỂN CHÍNH (PUBLIC API) ==========
  let resizeTimer = null;
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
    daisy: Daisy,
    dayGlow: DayGlow,

    // Khởi động toàn bộ hoạt ảnh
    // Điều khiển Chế độ Sáng / Tối
    getTheme() { return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; },
    setTheme(theme) { applyTheme(theme === 'dark' ? 'dark' : 'light', true); },
    toggleTheme() { const next = this.getTheme() === 'dark' ? 'light' : 'dark'; applyTheme(next, true); return next; },

    init() {
      ensureBaseLayoutCss();
      ensureThemeButton();
      updatePseudoStyles();
      animateInitialCards();
      Ocean.start();
      Meadow.start();
      Sea.start();
      Daisy.start();
      DayGlow.start();
      setupObserver();

      // Cập nhật lại khoảng cách bơi khi co giãn kích thước màn hình
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          Sea.start();
        }, 180);
      });
    },

    // Làm mới lại các phần tử vừa render mới
    refresh() {
      ensureBaseLayoutCss();
      ensureThemeButton();
      updatePseudoStyles();
      Ocean.start();
      Meadow.start();
      Sea.start();
      Daisy.start();
      DayGlow.start();
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
        if (category === 'daisy') isEnabled ? Daisy.start() : Daisy.stop();
        if (category === 'dayGlow') isEnabled ? DayGlow.start() : DayGlow.stop();
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
