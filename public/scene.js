/* =====================================================================
   scene.js – Cảnh "Hôm nay còn được tiêu" sinh động
   1. Bầu trời & màu cảnh đổi theo giờ thật: sáng (5–8h) · trưa (8–17h) · chiều (17–19h) · tối (19–5h)
      mặt trời / mặt trăng đi theo giờ, sao đêm, đom đóm, chim bay, bướm, thỏ ló đầu.
   2. Cảnh phản ứng theo số tiền hôm nay: còn nhiều → hoa nở; sắp hết → trời âm u, hoa khép;
      tiêu lố → mưa, cà chua héo xanh; chiều mà mới tiêu ít → cầu vồng.
   3. Nền trang đổi màu theo buổi + vài ngôi sao bạc lấp lánh.
   4. Parallax: các lớp cảnh lệch nhau theo chuột (máy tính) hoặc khi nghiêng điện thoại.
   Mọi hoạt ảnh chỉ dùng transform/opacity và tự dừng khi thẻ không hiện trên màn hình.
   ===================================================================== */
(function () {
  'use strict';
  var hero = document.getElementById('hero');
  if (!hero) return;
  var scene = hero.querySelector('.hero-scene');
  var land = hero.querySelector('.landscape');
  if (!scene || !land) return;

  var REDUCE = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var SVGNS = 'http://www.w3.org/2000/svg';
  var STAR = 'polygon(50% 0,61% 39%,100% 50%,61% 61%,50% 100%,39% 61%,0 50%,39% 39%)';

  function el(tag, cls, parent, style) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (style) e.setAttribute('style', style);
    if (parent) parent.appendChild(e);
    return e;
  }
  function svgEl(tag, attrs, parent) {
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  /* ---------- Quản lý hoạt ảnh: tạm dừng khi không nhìn thấy ---------- */
  var anims = [], onScreen = true;
  function canRun() { return onScreen && document.visibilityState === 'visible'; }
  function anim(node, kf, opts) {
    if (REDUCE || !node || !node.animate) return null;
    var a = node.animate(kf, opts);
    anims.push(a);
    if (!canRun()) { try { a.pause(); } catch (e) {} }
    return a;
  }
  function syncAnims() {
    var run = canRun();
    anims.forEach(function (a) {
      try { if (run) { if (a.playState === 'paused') a.play(); } else if (a.playState === 'running') a.pause(); } catch (e) {}
    });
  }
  document.addEventListener('visibilitychange', syncAnims);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { onScreen = es.some(function (x) { return x.isIntersecting; }); syncAnims(); }).observe(hero);
  }
  var rnd = function (a, b) { return a + Math.random() * (b - a); };

  /* ---------- 1. Dựng các lớp cảnh ---------- */
  // Lớp trời: mặt trời, mặt trăng, sao
  var sky = el('div', 'sc-layer sc-sky');
  var sun = el('i', 'sc-sun', sky);
  var moon = el('i', 'sc-moon', sky);
  var stars = el('div', 'sc-stars', sky);
  [[8, 14], [22, 8], [34, 26], [47, 10], [58, 30], [66, 6], [74, 20], [86, 12], [92, 30], [40, 40], [16, 34], [80, 38]].forEach(function (p, i) {
    var s = el('i', 'sc-star' + (i % 4 === 0 ? ' b' : ''), stars, 'left:' + p[0] + '%;top:' + p[1] + '%');
    anim(s, [{ opacity: .15, transform: 'scale(.6)' }, { opacity: 1, transform: 'scale(1)' }],
      { duration: rnd(1600, 3200), delay: -rnd(0, 3000), iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
  });

  // Lớp núi xa (tạo chiều sâu cho parallax)
  var far = el('div', 'sc-layer sc-far');
  far.innerHTML =
    '<svg viewBox="0 0 400 100" preserveAspectRatio="none" aria-hidden="true">' +
      '<path d="M0 100 V62 L28 44 L52 58 L84 30 L112 52 L140 40 L170 60 L204 34 L236 54 L262 42 L296 62 L330 36 L362 54 L400 44 V100 Z" opacity=".75"/>' +
      '<path d="M0 100 V74 Q40 60 80 70 T160 66 T240 72 T320 64 T400 70 V100 Z" opacity=".8"/>' +
      '<rect class="haze" x="0" y="0" width="400" height="100"/>' +
    '</svg>';

  // Lớp hiệu ứng phía trước: mây xám, mưa, cầu vồng, chim, bướm, đom đóm
  var fx = el('div', 'sc-layer sc-fx');
  var rainbow = el('i', 'sc-rainbow', fx);
  var veil = el('i', 'sc-veil', fx);
  var rain = el('i', 'sc-rain', fx);
  var rainAnim = null;   // mưa chỉ chạy khi tiêu lố, còn lại không tốn tài nguyên
  function setRain(on) {
    if (on && !rainAnim) rainAnim = anim(rain, [{ transform: 'translate3d(-10px,0,0)' }, { transform: 'translate3d(0,96px,0)' }], { duration: 520, iterations: Infinity, easing: 'linear' });
    if (!on && rainAnim) { try { rainAnim.cancel(); } catch (e) {} anims.splice(anims.indexOf(rainAnim), 1); rainAnim = null; }
  }

  scene.insertBefore(far, scene.firstChild);
  scene.insertBefore(sky, scene.firstChild);
  scene.appendChild(fx);

  // Chim bay ngang trời (ban ngày)
  var BIRD = '<svg viewBox="0 0 16 8"><path d="M0 4 Q4 0 8 4 Q12 0 16 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  var birds = [];
  [[5, 0, 1], [9, 1800, .8], [3, 9000, .9]].forEach(function (b) {
    var n = el('i', 'sc-bird', fx, 'top:' + b[0] + '%;left:0;transform:scale(' + b[2] + ')');
    n.innerHTML = BIRD;
    birds.push({ node: n, delay: b[1], s: b[2] });
    anim(n.firstChild, [{ transform: 'scaleY(1)' }, { transform: 'scaleY(-.6)' }], { duration: rnd(260, 360), iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
  });
  var birdAnims = [];
  function flyBirds() {
    birdAnims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
    birdAnims = [];
    var w = hero.clientWidth + 60;
    birds.forEach(function (b) {
      var a = anim(b.node, [
        { opacity: 0, transform: 'translate3d(-30px,0,0) scale(' + b.s + ')', offset: 0 },
        { opacity: .9, transform: 'translate3d(' + (w * .08) + 'px,-4px,0) scale(' + b.s + ')', offset: .06 },
        { opacity: .9, transform: 'translate3d(' + (w * .5) + 'px,6px,0) scale(' + b.s + ')', offset: .3 },
        { opacity: 0, transform: 'translate3d(' + w + 'px,-6px,0) scale(' + b.s + ')', offset: .55 },
        { opacity: 0, transform: 'translate3d(' + w + 'px,-6px,0) scale(' + b.s + ')', offset: 1 }
      ], { duration: 26000, delay: -b.delay, iterations: Infinity, easing: 'linear' });
      if (a) birdAnims.push(a);
    });
  }

  // Bướm lượn trên đồng cỏ (ban ngày, khi còn tiền)
  [['#ff9ec7', '#ffd1e4', 18, 70], ['#ffd54d', '#fff1a8', 52, 62]].forEach(function (b, i) {
    var n = el('i', 'sc-bf', fx, 'left:' + b[2] + '%;top:' + b[3] + '%');
    n.innerHTML = '<svg viewBox="0 0 11 10"><g class="w"><path fill="' + b[0] + '" d="M5.5 5 C3 0 0 1 .5 4 C1 6 3.5 6 5.5 5 Z M5.5 5 C8 0 11 1 10.5 4 C10 6 7.5 6 5.5 5 Z"/>' +
      '<path fill="' + b[1] + '" d="M5.5 5.4 C3.5 9 1.5 9 2 7 C2.6 5.8 4 5.6 5.5 5.4 Z M5.5 5.4 C7.5 9 9.5 9 9 7 C8.4 5.8 7 5.6 5.5 5.4 Z"/></g></svg>';
    anim(n, [
      { opacity: 1, transform: 'translate3d(0,0,0) rotate(-8deg)' },
      { opacity: 1, transform: 'translate3d(22px,-14px,0) rotate(10deg)', offset: .25 },
      { opacity: 1, transform: 'translate3d(40px,-4px,0) rotate(-6deg)', offset: .5 },
      { opacity: 1, transform: 'translate3d(18px,8px,0) rotate(8deg)', offset: .75 },
      { opacity: 1, transform: 'translate3d(0,0,0) rotate(-8deg)' }
    ], { duration: 9000 + i * 2400, delay: -i * 3000, iterations: Infinity, easing: 'ease-in-out' });
    anim(n.firstChild, [{ transform: 'scaleX(1)' }, { transform: 'scaleX(.3)' }], { duration: 180 + i * 40, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
  });

  // Đom đóm (ban đêm)
  for (var f = 0; f < 9; f++) {
    var ff = el('i', 'sc-ff', fx, 'left:' + rnd(8, 92).toFixed(1) + '%;top:' + rnd(48, 88).toFixed(1) + '%');
    var dx = rnd(-18, 18), dy = rnd(-16, 10);
    anim(ff, [
      { opacity: 0, transform: 'translate3d(0,0,0)' },
      { opacity: 1, transform: 'translate3d(' + (dx * .5).toFixed(1) + 'px,' + (dy * .5).toFixed(1) + 'px,0)', offset: .4 },
      { opacity: .2, transform: 'translate3d(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px,0)', offset: .7 },
      { opacity: 0, transform: 'translate3d(' + (dx * 1.3).toFixed(1) + 'px,' + (dy * .8).toFixed(1) + 'px,0)' }
    ], { duration: rnd(3200, 5200), delay: -rnd(0, 5000), iterations: Infinity, easing: 'ease-in-out' });
  }

  /* ---------- 2. Thêm hoa nhiều màu & chú thỏ vào cảnh đồng cỏ có sẵn ---------- */
  var flowers = land.querySelector('.flowers');
  var ground = land.querySelector('.ground');
  if (flowers) {
    var COLORS = [['#ff7eb3', '#ffe066'], ['#ffffff', '#ffc94d'], ['#b18cff', '#fff3a6'], ['#ff9f68', '#fff0b3'], ['#ffd54d', '#e0802c']];
    [-150, -60, 22, 96, 196, 238, 290, 428].forEach(function (x, i) {
      var y = 191 + (i % 3), h = 7 + (i % 3) * 2, c = COLORS[i % COLORS.length];
      var g = svgEl('g', { 'class': 'sc-fl' }, flowers);
      svgEl('path', { d: 'M' + x + ' ' + y + ' V' + (y - h), stroke: 'currentColor', 'stroke-width': '1.2', fill: 'none' }, g);
      var head = svgEl('g', { 'class': 'head' }, g);
      for (var k = 0; k < 5; k++) {
        var ang = k / 5 * Math.PI * 2 - Math.PI / 2;
        svgEl('circle', { cx: (x + Math.cos(ang) * 2.2).toFixed(2), cy: (y - h + Math.sin(ang) * 2.2).toFixed(2), r: '1.7', fill: c[0] }, head);
      }
      svgEl('circle', { cx: x, cy: y - h, r: '1.25', fill: c[1] }, head);
    });
  }
  var bunnyMove = null;
  if (ground) {
    var defs = svgEl('defs', {}, null);
    var cp = svgEl('clipPath', { id: 'scBunnyClip' }, defs);
    svgEl('rect', { x: '232', y: '150', width: '40', height: '48' }, cp);
    land.insertBefore(defs, land.firstChild);
    var bun = svgEl('g', { 'class': 'sc-bunny', 'clip-path': 'url(#scBunnyClip)' }, null);
    bunnyMove = svgEl('g', { 'class': 'mv' }, bun);
    svgEl('ellipse', { cx: '247', cy: '177', rx: '2.4', ry: '8', transform: 'rotate(-12 247 184)' }, bunnyMove);
    svgEl('ellipse', { cx: '254', cy: '177', rx: '2.4', ry: '8', transform: 'rotate(10 254 184)' }, bunnyMove);
    svgEl('ellipse', { 'class': 'ear-in', cx: '247', cy: '178', rx: '1', ry: '5.5', transform: 'rotate(-12 247 184)' }, bunnyMove);
    svgEl('ellipse', { 'class': 'ear-in', cx: '254', cy: '178', rx: '1', ry: '5.5', transform: 'rotate(10 254 184)' }, bunnyMove);
    svgEl('ellipse', { cx: '250.5', cy: '191', rx: '6.5', ry: '5.6' }, bunnyMove);
    svgEl('circle', { 'class': 'eye', cx: '248.3', cy: '190', r: '.85' }, bunnyMove);
    svgEl('circle', { 'class': 'eye', cx: '252.7', cy: '190', r: '.85' }, bunnyMove);
    ground.parentNode.insertBefore(bun, ground);
    anim(bunnyMove, [
      { transform: 'translate(0px,20px)', offset: 0 },
      { transform: 'translate(0px,20px)', offset: .62 },
      { transform: 'translate(0px,2px)', offset: .68 },
      { transform: 'translate(0px,3px) rotate(0deg)', offset: .76 },
      { transform: 'translate(0px,2px)', offset: .84 },
      { transform: 'translate(0px,20px)', offset: .9 },
      { transform: 'translate(0px,20px)', offset: 1 }
    ], { duration: 11000, delay: -4000, iterations: Infinity, easing: 'ease-in-out' });
    if (!bunnyMove.animate || REDUCE) bunnyMove.setAttribute('transform', 'translate(0 20)');
  }

  /* ---------- 3. Nền trang theo buổi + sao bạc lấp lánh ---------- */
  var wash = el('div', 'sky-wash');
  wash.setAttribute('aria-hidden', 'true');
  document.body.insertBefore(wash, document.body.firstChild);
  // sao bạc nằm ở lớp riêng, trong suốt: không bắt trình duyệt vẽ lại cả lớp nền mỗi khung hình
  var sparkles = el('div', 'sky-sparkles');
  sparkles.setAttribute('aria-hidden', 'true');
  document.body.insertBefore(sparkles, wash.nextSibling);
  [[6, 18], [93, 12], [3, 62], [96, 54], [12, 90], [88, 86], [50, 4]].forEach(function (p, i) {
    var s = el('i', 'sp', sparkles, 'left:' + p[0] + '%;top:' + p[1] + '%');
    anim(s, [
      { opacity: 0, transform: 'scale(0) rotate(0deg)' },
      { opacity: 0, transform: 'scale(0) rotate(0deg)', offset: .72 },
      { opacity: .9, transform: 'scale(1.15) rotate(45deg)', offset: .84 },
      { opacity: 0, transform: 'scale(0) rotate(90deg)' }
    ], { duration: 6000 + i * 900, delay: -i * 1300, iterations: Infinity, easing: 'ease-in-out' });
  });

  /* ---------- 4. Buổi trong ngày ---------- */
  function phaseOf(h) {
    if (h >= 5 && h < 8) return 'dawn';
    if (h >= 8 && h < 17) return 'day';
    if (h >= 17 && h < 19) return 'dusk';
    return 'night';
  }
  function placeBody(node, t) {
    // t: 0 → 1 dọc theo cung trời; né góc trái phía trên (nơi có chữ)
    var x = 40 + t * 46, y = 12 + (1 - Math.sin(Math.PI * t)) * 30;
    node.style.left = x.toFixed(1) + '%';
    node.style.top = y.toFixed(1) + '%';
  }
  var lastPhase = '';
  function updateTime() {
    var now = new Date(), h = now.getHours() + now.getMinutes() / 60, ph = phaseOf(Math.floor(h));
    hero.setAttribute('data-phase', ph);
    document.documentElement.setAttribute('data-phase', ph);
    placeBody(sun, Math.min(1, Math.max(0, (h - 5) / 14)));
    var tn = h >= 19 ? (h - 19) / 10 : (h + 5) / 10;
    placeBody(moon, Math.min(1, Math.max(0, tn)));
    if (ph !== lastPhase) { lastPhase = ph; updateMood(); }
  }

  /* ---------- 5. Tâm trạng của cảnh theo số tiền hôm nay ---------- */
  var bar = document.getElementById('hBar');
  function updateMood() {
    var over = hero.classList.contains('over');
    var pct = bar ? parseFloat(bar.style.width) || 0 : 0;
    var mood = over ? 'over' : pct >= 80 ? 'low' : pct >= 50 ? 'normal' : 'lush';
    if (hero.getAttribute('data-mood') !== mood) hero.setAttribute('data-mood', mood);
    setRain(mood === 'over');
    var rb = !over && pct < 60 && hero.getAttribute('data-phase') === 'dusk' ? '1' : '0';
    if (hero.getAttribute('data-rainbow') !== rb) hero.setAttribute('data-rainbow', rb);
  }
  new MutationObserver(updateMood).observe(hero, { attributes: true, attributeFilter: ['class'] });
  if (bar) new MutationObserver(updateMood).observe(bar, { attributes: true, attributeFilter: ['style'] });

  updateTime();
  updateMood();
  flyBirds();
  setInterval(updateTime, 60000);
  var rz = null;
  window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(flyBirds, 300); });

  /* ---------- 6. Parallax ---------- */
  if (REDUCE) return;
  var layers = [[sky, 4], [far, 9], [land, 14]];   // độ lệch tối đa (px) của từng lớp: xa lệch ít, gần lệch nhiều
  var tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
  function frame() {
    cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
    layers.forEach(function (l) {
      l[0].style.transform = 'translate3d(' + (cx * l[1]).toFixed(2) + 'px,' + (cy * l[1] * .5).toFixed(2) + 'px,0)';
    });
    if (Math.abs(tx - cx) > 0.002 || Math.abs(ty - cy) > 0.002) raf = requestAnimationFrame(frame); else raf = 0;
  }
  function aim(x, y) {
    tx = Math.max(-1, Math.min(1, x)); ty = Math.max(-1, Math.min(1, y));
    if (!raf && canRun()) raf = requestAnimationFrame(frame);
  }
  if (window.matchMedia && window.matchMedia('(hover: hover)').matches) {
    window.addEventListener('pointermove', function (e) {
      if (!onScreen) return;
      var r = hero.getBoundingClientRect();
      aim(-((e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2)), -((e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2)));
    }, { passive: true });
  }
  // Điện thoại: nghiêng máy (Android chạy ngay; iPhone cần cấp quyền nên chỉ xin khi bạn chạm vào thẻ)
  var tiltOn = false;
  function onTilt(e) {
    if (!onScreen || e.gamma == null) return;
    aim(-(e.gamma / 25), -((e.beta - 40) / 30));
  }
  function startTilt() {
    if (tiltOn) return;
    tiltOn = true;
    window.addEventListener('deviceorientation', onTilt, { passive: true });
  }
  if (window.DeviceOrientationEvent) {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      hero.addEventListener('click', function ask() {
        hero.removeEventListener('click', ask);
        DeviceOrientationEvent.requestPermission().then(function (s) { if (s === 'granted') startTilt(); }).catch(function () {});
      });
    } else if (window.matchMedia && window.matchMedia('(hover: none)').matches) {
      startTilt();
    }
  }
})();
