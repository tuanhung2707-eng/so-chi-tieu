/* =====================================================================
   meadow-bg.js – Dựng nền đồng cỏ toàn trang (xem meadow-bg.css)
   Máy tính: mây trôi, mặt trời / sao nhấp nháy, lá bay, bụi sáng, đom đóm (tối),
             bồ công anh đung đưa và hạt bồ công anh bay lơ lửng.
   Điện thoại (≤ 700px): cảnh đứng yên, chỉ bụi sáng và hạt bồ công anh chuyển động.
   Chỉ dùng transform/opacity; perf.js tự dừng khi tab bị ẩn.
   ===================================================================== */
(function () {
  'use strict';
  if (document.querySelector('.mbg')) return;
  var REDUCE = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var mqLite = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  var pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };

  var root = document.createElement('div');
  root.className = 'mbg';
  root.setAttribute('aria-hidden', 'true');

  function add(cls, html, style) {
    var e = document.createElement('div');
    e.className = cls;
    if (html) e.innerHTML = html;
    if (style) e.setAttribute('style', style);
    root.appendChild(e);
    return e;
  }

  /* ---------- Bầu trời, mặt trời, trăng, sao ---------- */
  add('mbg-sky');
  var halo = add('mbg-halo'), sun = add('mbg-sun');
  add('mbg-moonglow'); add('mbg-moon');
  var stars = add('mbg-stars'), starEls = [];
  for (var i = 0; i < 46; i++) {
    var st = document.createElement('i');
    st.className = 'mbg-star' + (i % 9 === 0 ? ' big' : '');
    st.style.left = rnd(1, 99).toFixed(1) + '%';
    st.style.top = rnd(2, 96).toFixed(1) + '%';
    st.style.opacity = rnd(.35, .95).toFixed(2);
    stars.appendChild(st);
    starEls.push(st);
  }

  /* ---------- Mây: trắng mềm, đáy xanh pastel, nhiều lớp xa – gần ---------- */
  var defs = '<svg width="0" height="0" style="position:absolute"><defs>' +
    '<linearGradient id="mbgCloud" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" style="stop-color:var(--cl-top)"/><stop offset=".55" style="stop-color:var(--cl-mid)"/><stop offset="1" style="stop-color:var(--cl-bot)"/>' +
    '</linearGradient></defs></svg>';
  add('mbg-defs', defs, 'width:0;height:0');
  var CLOUD = [
    // đám mây tròn đầy
    '<svg viewBox="0 0 240 100"><g fill="url(#mbgCloud)">' +
      '<ellipse cx="120" cy="74" rx="108" ry="22"/><circle cx="64" cy="60" r="30"/><circle cx="108" cy="44" r="40"/>' +
      '<circle cx="156" cy="50" r="34"/><circle cx="194" cy="64" r="24"/><circle cx="34" cy="70" r="20"/></g>' +
      '<g class="hl" fill="#fff" opacity=".3"><circle cx="100" cy="36" r="18"/><circle cx="150" cy="42" r="13"/><circle cx="60" cy="52" r="11"/></g></svg>',
    // đám mây dài, dẹt
    '<svg viewBox="0 0 300 80"><g fill="url(#mbgCloud)">' +
      '<ellipse cx="150" cy="60" rx="140" ry="16"/><circle cx="70" cy="50" r="22"/><circle cx="118" cy="38" r="30"/>' +
      '<circle cx="170" cy="42" r="26"/><circle cx="215" cy="50" r="20"/><circle cx="252" cy="56" r="14"/></g>' +
      '<g class="hl" fill="#fff" opacity=".3"><circle cx="112" cy="32" r="14"/><circle cx="166" cy="36" r="10"/></g></svg>',
    // cụm mây nhỏ
    '<svg viewBox="0 0 160 80"><g fill="url(#mbgCloud)">' +
      '<ellipse cx="80" cy="60" rx="70" ry="16"/><circle cx="52" cy="48" r="22"/><circle cx="88" cy="38" r="28"/><circle cx="120" cy="52" r="18"/></g>' +
      '<g class="hl" fill="#fff" opacity=".3"><circle cx="84" cy="30" r="12"/></g></svg>'
  ];
  // [kiểu, bề rộng px, top vh, lớp (độ mờ), giây trôi hết màn hình, vị trí bắt đầu 0..1]
  var CLOUDS = [
    [0, 300, 12, 1, 170, .08], [1, 360, 22, .95, 210, .55], [2, 170, 9, .8, 150, .78],
    [0, 220, 30, .75, 190, .32], [2, 130, 17, .65, 130, .2], [1, 260, 38, .6, 230, .9], [2, 110, 44, .5, 160, .62]
  ];
  var cloudEls = CLOUDS.map(function (c) {
    var e = add('mbg-cloud', CLOUD[c[0]], 'width:' + c[1] + 'px;top:' + c[2] + 'vh;opacity:calc(var(--cl-op) * ' + c[3] + ')');
    e._c = c;
    return e;
  });

  /* ---------- Đồng cỏ phía dưới: đồi, cây, bụi, hoa, cỏ ---------- */
  function tree(x, y, s, kind) {
    var t = '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' +
      '<path class="trunk" d="M-6 0 C-5 -30 -4 -52 -3 -70 L4 -70 C5 -52 6 -30 8 0 Z"/>';
    if (kind === 'round') {
      t += '<circle class="t2" cx="0" cy="-92" r="38"/><circle class="t1" cx="-26" cy="-80" r="26"/><circle class="t1" cx="24" cy="-78" r="28"/>' +
        '<circle class="t3" cx="-6" cy="-112" r="24"/><circle class="t3" cx="16" cy="-98" r="14" opacity=".8"/>';
    } else {
      t += '<path class="t2" d="M0 -150 L30 -92 L18 -92 L40 -50 L-40 -50 L-18 -92 L-30 -92 Z"/>' +
        '<path class="t1" d="M0 -150 L22 -108 L-22 -108 Z" opacity=".9"/>';
    }
    return t + '</g>';
  }
  function bush(x, y, s) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')" class="bush">' +
      '<circle cx="-18" cy="-10" r="16"/><circle cx="2" cy="-18" r="20"/><circle cx="22" cy="-10" r="15"/><ellipse cx="2" cy="-4" rx="34" ry="8"/></g>';
  }
  var FLC = [['#ff8fb8', '#ffe27a'], ['#ffffff', '#ffc94d'], ['#b79bff', '#fff3a6'], ['#ffb37a', '#fff0b3'], ['#ffe066', '#e88a2c'], ['#8fc8ff', '#fff6c2']];
  function flower(x, y, s, c) {
    var g = '<g class="fl" transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' +
      '<path d="M0 0 V-10" stroke="#4f9a4c" stroke-width="1.4"/>';
    for (var k = 0; k < 5; k++) {
      var a = k / 5 * Math.PI * 2 - Math.PI / 2;
      g += '<circle cx="' + (Math.cos(a) * 3).toFixed(1) + '" cy="' + (-10 + Math.sin(a) * 3).toFixed(1) + '" r="2.4" fill="' + c[0] + '"/>';
    }
    return g + '<circle cx="0" cy="-10" r="1.7" fill="' + c[1] + '"/></g>';
  }
  var land = '<svg viewBox="0 0 1440 280" preserveAspectRatio="xMidYMax slice">' +
    '<path class="far" d="M0 120 C160 70 300 90 440 104 C600 120 700 64 860 76 C1020 88 1120 120 1260 96 C1340 82 1400 86 1440 92 V280 H0Z"/>' +
    tree(70, 132, .7, 'pine') + tree(1385, 128, .75, 'pine') + tree(1265, 134, .55, 'round') +
    '<path class="mid" d="M0 168 C140 136 260 146 400 160 C560 176 680 132 840 140 C1000 148 1120 174 1280 158 C1360 150 1410 148 1440 152 V280 H0Z"/>' +
    tree(190, 176, .95, 'round') + tree(1180, 170, 1, 'round') + bush(300, 172, .9) + bush(1060, 168, .8) +
    '<path class="near" d="M0 214 C180 192 320 200 480 210 C660 222 800 194 980 200 C1140 206 1280 222 1440 206 V280 H0Z"/>' +
    tree(118, 222, 1.25, 'round') + tree(1322, 218, 1.3, 'round') + bush(36, 224, 1.1) + bush(1410, 218, 1.15) +
    '<path class="front" d="M0 252 C220 238 420 246 640 250 C860 254 1060 240 1260 244 C1350 246 1410 250 1440 248 V280 H0Z"/>';
  // hoa rải trên các lớp đồi
  var fl = '';
  for (var f = 0; f < 70; f++) {
    var fx = rnd(0, 1440), layer = f % 3;
    var fy = layer === 0 ? rnd(168, 190) : layer === 1 ? rnd(212, 236) : rnd(252, 274);
    fl += flower(fx.toFixed(0), fy.toFixed(0), (layer === 0 ? .7 : layer === 1 ? .95 : 1.2), pick(FLC));
  }
  // ngọn cỏ
  var gr = '';
  for (var g2 = 0; g2 < 90; g2++) {
    var gx = rnd(0, 1440), gy = rnd(244, 276);
    gr += 'M' + gx.toFixed(0) + ' ' + gy.toFixed(0) + ' q-2 -7 -5 -10 M' + gx.toFixed(0) + ' ' + gy.toFixed(0) + ' q1 -9 1 -13 M' + gx.toFixed(0) + ' ' + gy.toFixed(0) + ' q3 -6 6 -9 ';
  }
  land += fl + '<path class="grass" d="' + gr + '"/></svg>';
  add('mbg-land', land);

  /* ---------- Bồ công anh trên đồng cỏ ---------- */
  function dandelionSvg() {
    var s = '<svg viewBox="0 0 40 110"><path class="stem" d="M20 110 C18 86 22 60 20 30" fill="none" stroke-width="1.6"/>';
    for (var k = 0; k < 18; k++) {
      var a = k / 18 * Math.PI * 2, x2 = 20 + Math.cos(a) * 13, y2 = 26 + Math.sin(a) * 13;
      s += '<path class="seed" d="M20 26 L' + x2.toFixed(1) + ' ' + y2.toFixed(1) + '" stroke-width=".8" opacity=".85"/>' +
        '<circle class="tip" cx="' + x2.toFixed(1) + '" cy="' + y2.toFixed(1) + '" r="1.5" opacity=".9"/>';
    }
    return s + '<circle cx="20" cy="26" r="2.6" fill="#d8c79a"/></svg>';
  }
  // [vị trí % từ trái, chiều cao px]
  var DANS = [[4, 120], [9, 92], [17, 108], [83, 100], [90, 128], [96, 88]];
  var danEls = DANS.map(function (d) {
    return add('mbg-dan', dandelionSvg(), 'left:' + d[0] + '%;width:' + (d[1] * 0.36).toFixed(0) + 'px;height:' + d[1] + 'px');
  });

  /* ---------- Tầng giữa: hạt bồ công anh, lá, bụi sáng, đom đóm ---------- */
  var SEED = '<svg viewBox="0 0 16 22"><path class="seed" d="M8 22 V9" stroke-width=".9" fill="none"/>' +
    '<path class="seed" d="M8 9 L1 3 M8 9 L4 1 M8 9 L8 0 M8 9 L12 1 M8 9 L15 3 M8 9 L2 7 M8 9 L14 7" stroke-width=".7" fill="none" opacity=".9"/>' +
    '<circle class="tip" cx="8" cy="22" r="1.2"/></svg>';
  var LEAF = function (c) { return '<svg viewBox="0 0 14 14"><path fill="' + c + '" d="M1 13 C1 6 6 1 13 1 C13 8 8 13 1 13 Z"/><path d="M1 13 L10 4" stroke="rgba(255,255,255,.45)" stroke-width=".8"/></svg>'; };
  var seeds = [], leaves = [], motes = [], ffs = [];
  for (var s1 = 0; s1 < 9; s1++) seeds.push(add('mbg-seed', SEED));
  ['var(--leaf-1)', 'var(--leaf-2)', 'var(--leaf-3)', 'var(--leaf-1)', 'var(--leaf-2)', 'var(--leaf-3)', 'var(--leaf-1)'].forEach(function (c) { leaves.push(add('mbg-leaf', LEAF(c))); });
  for (var m = 0; m < 22; m++) motes.push(add('mbg-mote'));
  for (var q = 0; q < 14; q++) ffs.push(add('mbg-ff'));

  document.body.insertBefore(root, document.body.firstChild);

  /* ---------- Hoạt ảnh ---------- */
  var anims = [];
  function anim(el, kf, opts) {
    if (!el.animate) return null;
    var a = el.animate(kf, opts);
    anims.push(a);
    return a;
  }
  function stopAll() { anims.forEach(function (a) { try { a.cancel(); } catch (e) {} }); anims = []; }

  function start() {
    stopAll();
    if (REDUCE) return;
    var W = window.innerWidth, H = window.innerHeight, lite = mqLite.matches;

    // Bụi sáng: trôi lững lờ, lấp lánh (cả điện thoại)
    motes.forEach(function (e) {
      var x = rnd(0, W), y = rnd(H * .2, H * .82), dx = rnd(-40, 40), dy = rnd(-60, -20), s = rnd(.6, 1.6);
      anim(e, [
        { transform: 'translate3d(' + x.toFixed(0) + 'px,' + y.toFixed(0) + 'px,0) scale(' + s.toFixed(2) + ')', opacity: 0 },
        { transform: 'translate3d(' + (x + dx * .4).toFixed(0) + 'px,' + (y + dy * .4).toFixed(0) + 'px,0) scale(' + s.toFixed(2) + ')', opacity: .95, offset: .35 },
        { transform: 'translate3d(' + (x + dx * .7).toFixed(0) + 'px,' + (y + dy * .7).toFixed(0) + 'px,0) scale(' + (s * .8).toFixed(2) + ')', opacity: .4, offset: .65 },
        { transform: 'translate3d(' + (x + dx).toFixed(0) + 'px,' + (y + dy).toFixed(0) + 'px,0) scale(' + (s * .6).toFixed(2) + ')', opacity: 0 }
      ], { duration: rnd(7000, 13000), delay: -rnd(0, 13000), iterations: Infinity, easing: 'ease-in-out' });
    });

    // Hạt bồ công anh bay lơ lửng từ đồng cỏ lên, trôi theo gió (cả điện thoại)
    seeds.forEach(function (e, i) {
      var fromLeft = i % 2 === 0;
      var x0 = fromLeft ? rnd(0, W * .3) : rnd(W * .7, W), y0 = rnd(H * .72, H * .9);
      var dir = fromLeft ? 1 : -1, span = rnd(W * .25, W * .55), rise = rnd(H * .3, H * .55), wob = rnd(14, 30);
      var pts = [];
      for (var k = 0; k <= 6; k++) {
        var t = k / 6;
        pts.push({
          transform: 'translate3d(' + (x0 + dir * span * t).toFixed(0) + 'px,' + (y0 - rise * t + Math.sin(t * Math.PI * 3) * wob).toFixed(0) + 'px,0) rotate(' + (Math.sin(t * Math.PI * 4) * 16).toFixed(0) + 'deg)',
          opacity: k === 0 || k === 6 ? 0 : .95,
          offset: t
        });
      }
      anim(e, pts, { duration: rnd(18000, 30000), delay: -rnd(0, 30000), iterations: Infinity, easing: 'linear' });
    });

    // Sao: sáng nhẹ nhấp nháy (điện thoại để đứng yên)
    if (!lite) {
      starEls.forEach(function (st) {
        var o = parseFloat(st.style.opacity) || .7;
        anim(st, [{ opacity: o * .35 }, { opacity: o }], { duration: rnd(2200, 5200), delay: -rnd(0, 5000), iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
      });
    }
    if (lite) return;

    // Mặt trời thở nhẹ
    anim(halo, [{ transform: 'scale(1)', opacity: .8 }, { transform: 'scale(1.12)', opacity: 1 }], { duration: 5200, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
    anim(sun, [{ transform: 'scale(1)' }, { transform: 'scale(1.04)' }], { duration: 5200, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });

    // Mây trôi chậm từ trái sang phải, lớp gần trôi nhanh hơn lớp xa
    cloudEls.forEach(function (e) {
      var c = e._c, w = c[1], dist = W + w * 2;
      anim(e, [
        { transform: 'translate3d(' + (-w) + 'px,0,0)' },
        { transform: 'translate3d(' + (W + w) + 'px,0,0)' }
      ], { duration: c[4] * 1000 * (W / 1400 + .4), delay: -c[5] * c[4] * 1000 * (W / 1400 + .4), iterations: Infinity, easing: 'linear' });
      void dist;
    });

    // Bồ công anh đung đưa qua lại
    danEls.forEach(function (e, i) {
      anim(e, [{ transform: 'rotate(-5deg)' }, { transform: 'rotate(5deg)' }], { duration: rnd(3200, 4600), delay: -i * 700, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
    });

    // Lá cây bay chéo qua màn hình
    leaves.forEach(function (e) {
      var x0 = rnd(W * .55, W * 1.05), y0 = rnd(H * .05, H * .35), dx = -rnd(W * .5, W * .9), dy = rnd(H * .35, H * .6);
      var pts = [];
      for (var k = 0; k <= 5; k++) {
        var t = k / 5;
        pts.push({
          transform: 'translate3d(' + (x0 + dx * t + Math.sin(t * Math.PI * 2) * 40).toFixed(0) + 'px,' + (y0 + dy * t).toFixed(0) + 'px,0) rotate(' + (t * 540).toFixed(0) + 'deg)',
          opacity: k === 0 || k === 5 ? 0 : .9,
          offset: t
        });
      }
      anim(e, pts, { duration: rnd(16000, 26000), delay: -rnd(0, 26000), iterations: Infinity, easing: 'linear' });
    });

    // Đom đóm (chế độ tối – CSS tự ẩn ở chế độ sáng)
    ffs.forEach(function (e) {
      var x = rnd(W * .03, W * .97), y = rnd(H * .45, H * .9), dx = rnd(-50, 50), dy = rnd(-40, 20);
      anim(e, [
        { transform: 'translate3d(' + x.toFixed(0) + 'px,' + y.toFixed(0) + 'px,0)', opacity: 0 },
        { transform: 'translate3d(' + (x + dx * .5).toFixed(0) + 'px,' + (y + dy * .5).toFixed(0) + 'px,0)', opacity: 1, offset: .4 },
        { transform: 'translate3d(' + (x + dx).toFixed(0) + 'px,' + (y + dy).toFixed(0) + 'px,0)', opacity: .15, offset: .75 },
        { transform: 'translate3d(' + (x + dx * 1.2).toFixed(0) + 'px,' + (y + dy * .6).toFixed(0) + 'px,0)', opacity: 0 }
      ], { duration: rnd(4500, 8000), delay: -rnd(0, 8000), iterations: Infinity, easing: 'ease-in-out' });
    });
  }

  // Mây đứng yên trên điện thoại: đặt sẵn vị trí đẹp
  function placeStatic() {
    var W = window.innerWidth;
    cloudEls.forEach(function (e) { e.style.transform = 'translate3d(' + (e._c[5] * W - e._c[1] * .3).toFixed(0) + 'px,0,0)'; });
  }

  placeStatic();
  start();
  var rz = null, lastW = window.innerWidth;
  window.addEventListener('resize', function () {
    if (Math.abs(window.innerWidth - lastW) < 40) return;   // bỏ qua thanh địa chỉ điện thoại co giãn
    lastW = window.innerWidth;
    clearTimeout(rz);
    rz = setTimeout(function () { placeStatic(); start(); }, 300);
  });
})();
