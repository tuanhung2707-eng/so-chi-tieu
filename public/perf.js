/* =====================================================================
   perf.js – Bộ điều phối hoạt ảnh cho nhẹ web
   Tự TẠM DỪNG mọi hoạt ảnh (cả WAAPI lẫn CSS animation) mà người dùng đang không nhìn thấy:
     - tab/ứng dụng bị ẩn,
     - vùng chứa đang bị ẩn (biển hai bên trên điện thoại, mục không mở, hộp thoại đang đóng…),
     - vùng chứa nằm ngoài màn hình (đã cuộn qua).
   Khi nhìn thấy lại thì cho chạy tiếp đúng những hoạt ảnh mà nó đã dừng (không đụng tới hoạt ảnh
   do chỗ khác chủ động tạm dừng). Không thay đổi giao diện.
   ===================================================================== */
(function () {
  'use strict';
  if (!document.getAnimations) return;

  var pausedByUs = new WeakSet();
  // Vùng chứa: hoạt ảnh của một phần tử được xét theo vùng lớn chứa nó (phần tử con có thể bay ra ngoài khung)
  var ZONES = '.mbg, .sea, #hero, #kMonths, .wm-panel, .modal, .wm-modal, .daisy-field, .sky-sparkles, .top, #work, #app';

  function zoneOf(el) {
    return (el.closest && el.closest(ZONES)) || el;
  }
  function isVisible(el, cache) {
    if (cache.has(el)) return cache.get(el);
    var v = el.isConnected;
    if (v && el.checkVisibility) v = el.checkVisibility();
    if (v) {
      var r = el.getBoundingClientRect(), m = 80;
      v = (r.width > 0 || r.height > 0) &&
        r.bottom > -m && r.top < window.innerHeight + m && r.right > -m && r.left < window.innerWidth + m;
    }
    cache.set(el, v);
    return v;
  }

  function sync() {
    var hidden = document.visibilityState !== 'visible';
    var cache = new Map();
    var list = document.getAnimations();
    for (var i = 0; i < list.length; i++) {
      var a = list[i], eff = a.effect, t = eff && eff.target;
      if (!t || a.playState === 'idle' || a.playState === 'finished') continue;
      var on = !hidden && isVisible(zoneOf(t), cache);
      try {
        if (!on && a.playState === 'running') { a.pause(); pausedByUs.add(a); }
        else if (on && a.playState === 'paused' && pausedByUs.has(a)) { a.play(); pausedByUs.delete(a); }
      } catch (e) {}
    }
  }

  var queued = false;
  function soon() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; sync(); });
  }

  document.addEventListener('visibilitychange', sync);
  window.addEventListener('scroll', soon, { passive: true });
  window.addEventListener('resize', soon, { passive: true });
  document.addEventListener('click', function () { setTimeout(sync, 60); }, true);
  // đề phòng hoạt ảnh mới được tạo ở chỗ khuất (đổi mục, mở/đóng hộp thoại bằng phím…)
  setInterval(sync, 1500);
  setTimeout(sync, 300);
})();
