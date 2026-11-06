// =====================================================================
// MỤC "CÔNG VIỆC" (bản đơn giản) – 3 phần: Linh kiện · Mật khẩu máy · Lịch năm
// Được index.html nạp khi bạn mở mục Công việc lần đầu.
// Cần chạy supabase/work_schema.sql trước (tạo bảng + kho chứa ảnh/datasheet).
// =====================================================================
const BUCKET = 'work-files';
const TBL = 'wk_parts';                           // bảng Linh kiện (tạo bởi supabase/work_schema.sql)
const MAX_FILE = 50 * 1024 * 1024;                 // 50 MB / file (khớp giới hạn của kho chứa)
const GROUPS = ['Diode', 'BJT', 'MOSFET', 'Tụ điện', 'Điện trở', 'IC nguồn', 'IC sạc', 'IC điều khiển', 'Bảo vệ', 'Khác'];
const MARKS = [['red', 'Quan trọng'], ['blue', 'Công việc'], ['amber', 'Hẹn / nhắc'], ['purple', 'Khác'], ['her', 'Her']];
const WORK_VERSION = 'v8 · 06/11/2026';             // hiện ở cuối mục Công việc để biết bản mới đã được tải chưa
const PW_FOLD = 24;                                 // máy có nhiều mật khẩu thì chỉ hiện bấy nhiêu cái, còn lại bấm "Xem thêm"

let C = null;                                       // { sb, getUser, toast, esc, setStatus }
let built = false;
const $ = (id) => document.getElementById(id);
const esc = (s) => C.esc(s);
const must = (r) => { if (r.error) throw r.error; return r.data; };
const user = () => C.getUser();
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2));
const pad2 = (n) => (n < 10 ? '0' : '') + n;
const ymd = (d) => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
const todayStr = () => ymd(new Date());
const dmy = (s) => { const p = s.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; };
const fmtDate = (iso) => { const d = new Date(iso); return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear(); };
const multiline = (t) => esc(t).replace(/\n/g, '<br>');
const DOW_LONG = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

async function track(fn) {
  C.setStatus('saving');
  try { return await fn(); } finally { C.setStatus('ok'); }
}
function fail(e) {
  console.error('[Công việc]', e);
  let msg = (e && e.message) ? e.message : String(e);
  if (/relation .* does not exist|schema cache|Could not find the table/i.test(msg)) msg = 'Chưa tạo bảng dữ liệu. Hãy chạy file supabase/work_schema.sql trong Supabase.';
  else if (/Bucket not found/i.test(msg)) msg = 'Chưa có kho chứa file. Hãy chạy file supabase/work_schema.sql trong Supabase.';
  else if (/row-level security|permission denied|not authorized|violates row/i.test(msg)) msg = 'Không có quyền ghi. Hãy chạy lại file supabase/work_schema.sql trong Supabase (SQL Editor) rồi tải lại trang.';
  else if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) msg = 'Mất kết nối mạng. Hãy thử lại.';
  if (e && e.code && String(msg).indexOf(e.code) < 0) msg += ' (mã lỗi ' + e.code + ')';
  C.toast(msg, true);
  const box = document.querySelector('#wmDlg.on .wm-err');             // hiện luôn trong hộp thoại đang mở
  if (box) { box.textContent = msg; const sh = box.closest('.sheet'); if (sh) sh.scrollTop = sh.scrollHeight; }   // ô lỗi nằm sát thanh nút ở đáy nên cuộn xuống cuối là thấy
}
// Supabase chặn quyền sửa/xóa thường KHÔNG báo lỗi mà chỉ trả về 0 dòng -> kiểm tra rõ ràng để không báo "Đã xóa" oan
const NO_ROW = 'Không thực hiện được: mục này không còn tồn tại hoặc không thuộc tài khoản bạn đang đăng nhập. Hãy tải lại trang (Ctrl+Shift+R) rồi thử lại.';
function gotRow(data) { if (!data) throw new Error(NO_ROW); return data; }
function gotRows(data) { if (!data || !data.length) throw new Error(NO_ROW); return data; }

/* ---------------------------------------------------------------------
   Hộp thoại dùng chung, xác nhận xóa, chép vào bộ nhớ tạm
--------------------------------------------------------------------- */
let dlgClose = null;
function openDlg(html, opts) {
  const m = $('wmDlg'), sh = m.querySelector('.sheet');
  sh.onclick = sh.onchange = sh.onkeydown = null;
  sh.className = 'sheet' + (opts && opts.wide ? ' wm-wide' : '');
  sh.innerHTML = html;
  m.classList.add('on'); document.body.classList.add('lock');
  dlgClose = (opts && opts.onClose) || null;
  const first = sh.querySelector('[data-autofocus]');
  // tự đặt con trỏ vào ô đầu tiên, trừ khi bạn đã bấm vào một ô khác trong hộp thoại
  if (first && window.innerWidth > 700) setTimeout(() => { if (!sh.contains(document.activeElement)) first.focus(); }, 80);
}
function closeDlg() {
  const m = $('wmDlg');
  if (!m.classList.contains('on')) return;
  m.classList.remove('on');
  if (!document.querySelector('.modal.on')) document.body.classList.remove('lock');
  const f = dlgClose; dlgClose = null; if (f) f();
}
function askConfirm(text, okLabel) {
  return new Promise((resolve) => {
    const m = $('wmAsk');
    m.querySelector('.wm-ask-t').textContent = text;
    m.querySelector('[data-ok]').textContent = okLabel || 'Xóa';
    m.classList.add('on'); document.body.classList.add('lock');
    const done = (v) => {
      m.classList.remove('on'); m.onclick = null;
      if (!document.querySelector('.modal.on')) document.body.classList.remove('lock');
      resolve(v);
    };
    m.onclick = (e) => {
      if (e.target.closest('[data-ok]')) done(true);
      else if (e.target.closest('[data-no]') || e.target === m) done(false);
    };
  });
}
function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
  return new Promise((res, rej) => {
    const t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.appendChild(t); t.select();
    try { document.execCommand('copy') ? res() : rej(new Error('copy')); } catch (e) { rej(e); } finally { t.remove(); }
  });
}

/* ---------------------------------------------------------------------
   Kho ảnh/file riêng tư (đường dẫn ký tạm thời)
--------------------------------------------------------------------- */
const urlCache = new Map();                          // path -> { url, exp }
async function signedMany(paths) {
  const now = Date.now(), need = [];
  paths.forEach((p) => { const c = urlCache.get(p); if (!c || c.exp < now + 60000) need.push(p); });
  if (need.length) {
    const r = await C.sb.storage.from(BUCKET).createSignedUrls(need, 3600);
    if (r.error) throw r.error;
    (r.data || []).forEach((x) => { if (x && x.signedUrl && !x.error) urlCache.set(x.path, { url: x.signedUrl, exp: now + 3500 * 1000 }); });
  }
  const out = {}; paths.forEach((p) => { const c = urlCache.get(p); out[p] = c ? c.url : ''; });
  return out;
}
async function signedOne(path, opts) {
  const r = await C.sb.storage.from(BUCKET).createSignedUrl(path, 300, opts);
  if (r.error) throw r.error;
  return r.data.signedUrl;
}
async function removeFiles(paths) {
  paths = (paths || []).filter(Boolean);
  if (!paths.length) return;
  const r = await C.sb.storage.from(BUCKET).remove(paths);
  if (r.error) console.warn('Không xóa được file trên kho:', r.error.message);
  paths.forEach((p) => urlCache.delete(p));
}
async function fillImgs(root) {
  const imgs = Array.prototype.slice.call(root.querySelectorAll('img[data-p]'));
  if (!imgs.length) return;
  try {
    const urls = await signedMany(Array.from(new Set(imgs.map((i) => i.getAttribute('data-p')))));
    imgs.forEach((i) => { const u = urls[i.getAttribute('data-p')]; if (u) i.src = u; });
  } catch (e) { /* ảnh không tải được thì bỏ qua */ }
}

/* ---------------------------------------------------------------------
   Khung chính + chuyển phần
--------------------------------------------------------------------- */
const TABS = [['parts', 'Linh kiện'], ['pw', 'Mật khẩu máy'], ['cal', 'Lịch năm']];
let activeTab = 'parts';

function build() {
  $('work').innerHTML =
    '<div class="wm-tabs seg" id="wmTabs">' + TABS.map((t) => '<button type="button" data-t="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>' +
    TABS.map((t) => '<section class="wm-panel hidden" id="wm-' + t[0] + '"></section>').join('') +
    '<div class="wm-foot">Mục Công việc <b>' + WORK_VERSION + '</b> · <button class="chip" id="wmCheck" type="button">Kiểm tra kết nối &amp; quyền</button></div>';
  if (!$('wmDlg')) {
    document.body.insertAdjacentHTML('beforeend',
      '<div class="modal wm-modal" id="wmDlg"><div class="sheet"></div></div>' +
      '<div class="modal wm-modal wm-askm" id="wmAsk"><div class="sheet wm-asksheet"><div class="wm-ask-t"></div>' +
      '<div class="twin"><button class="btn" data-no type="button">Hủy</button><button class="btn danger" data-ok type="button">Xóa</button></div></div></div>' +
      '<div class="wm-light" id="wmLight"><button class="wm-lx" type="button" aria-label="Đóng" data-x>✕</button>' +
      '<button class="wm-ln wm-lp" type="button" aria-label="Ảnh trước" data-p>‹</button><img alt=""><button class="wm-ln wm-lnx" type="button" aria-label="Ảnh sau" data-n>›</button></div>');
    $('wmDlg').addEventListener('mousedown', (e) => { if (e.target === $('wmDlg')) closeDlg(); });
    bindLight();
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if ($('wmLight').classList.contains('on')) closeLight(); else closeDlg();
    });
  }
  $('wmTabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) switchTab(b.getAttribute('data-t')); });
  $('wmCheck').onclick = runCheck;
  // lỗi chương trình bất ngờ cũng được báo ra thay vì im lặng
  window.addEventListener('error', (e) => { if (/work\.js/.test(e.filename || '')) C.toast('Lỗi chương trình: ' + e.message, true); });
  window.addEventListener('unhandledrejection', (e) => { const m = e.reason && e.reason.message ? e.reason.message : String(e.reason); if (/work|wk_parts|supabase|storage/i.test(m)) C.toast('Lỗi: ' + m, true); });
  initParts(); initPw(); initCal();
  built = true;
}
function switchTab(t) {
  activeTab = t;
  try { localStorage.setItem('work_tab', t); } catch (e) {}
  Array.prototype.forEach.call($('wmTabs').children, (b) => b.classList.toggle('on', b.getAttribute('data-t') === t));
  TABS.forEach((x) => $('wm-' + x[0]).classList.toggle('hidden', x[0] !== t));
  if (t === 'parts') loadParts(); else if (t === 'pw') loadPw(); else loadCal();
}
export function initWork(ctx) { C = ctx; }
export function openWork() {
  if (!built) build();
  let t = 'parts'; try { t = localStorage.getItem('work_tab') || 'parts'; } catch (e) {}
  if (!TABS.some((x) => x[0] === t)) t = 'parts';
  switchTab(t);
}
export function leaveWork() { if (built) { closeDlg(); closeLight(); } }

/* ---------------------------------------------------------------------
   Xử lý ảnh: thu nhỏ trước khi tải lên cho nhẹ và nhanh
--------------------------------------------------------------------- */
async function loadBitmap(file) {
  if (window.createImageBitmap) { try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) {} }
  return new Promise((res, rej) => {
    const u = URL.createObjectURL(file), im = new Image();
    im.onload = () => { res(im); URL.revokeObjectURL(u); };
    im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('Không đọc được ảnh')); };
    im.src = u;
  });
}
function toJpeg(bmp, max, q) {
  const w0 = bmp.width || bmp.naturalWidth, h0 = bmp.height || bmp.naturalHeight, k = Math.min(1, max / Math.max(w0, h0));
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w0 * k)); c.height = Math.max(1, Math.round(h0 * k));
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Không nén được ảnh'))), 'image/jpeg', q));
}
async function prepImage(file) {
  const bmp = await loadBitmap(file);
  const full = await toJpeg(bmp, 1600, 0.82), thumb = await toJpeg(bmp, 420, 0.75);
  if (bmp.close) bmp.close();
  return { isNew: true, full, thumb, preview: URL.createObjectURL(thumb) };
}

/* ---- xem ảnh lớn ---- */
let lightList = [], lightIdx = 0;
function openLight(list, i) { lightList = list; lightIdx = i; $('wmLight').classList.add('on'); showLight(); }
async function showLight() {
  const im = lightList[lightIdx], box = $('wmLight'), img = box.querySelector('img');
  img.removeAttribute('src');
  const one = lightList.length < 2;
  box.querySelector('[data-p]').style.display = box.querySelector('[data-n]').style.display = one ? 'none' : '';
  try { const u = await signedMany([im.p]); if (box.classList.contains('on')) img.src = u[im.p]; } catch (e) {}
}
function closeLight() { $('wmLight').classList.remove('on'); }
function bindLight() {
  $('wmLight').addEventListener('click', (e) => {
    if (e.target.closest('[data-p]')) { lightIdx = (lightIdx + lightList.length - 1) % lightList.length; showLight(); }
    else if (e.target.closest('[data-n]')) { lightIdx = (lightIdx + 1) % lightList.length; showLight(); }
    else if (e.target.tagName !== 'IMG') closeLight();
  });
}

/* =====================================================================
   1) LINH KIỆN: nhóm · tên · mã · hình ảnh · datasheet · chức năng · ghi chú cách sửa
===================================================================== */
const P = { loaded: false, rows: [], q: '', grp: '' };
let E = null;                                        // trạng thái form đang sửa

const GEAR = '<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 3v3M12 3v3M15 3v3M9 18v3M12 18v3M15 18v3M3 9h3M3 12h3M3 15h3M18 9h3M18 12h3M18 15h3"/></svg>';

function initParts() {
  $('wm-parts').innerHTML =
    '<div class="wm-bar"><div class="wm-search"><input id="pQ" type="search" placeholder="Tìm tên, mã linh kiện, chức năng…" autocomplete="off"></div>' +
    '<button class="btn primary" id="pAdd" type="button">＋ Thêm linh kiện</button></div>' +
    '<div class="wm-banner hidden" id="pBanner"></div>' +
    '<div class="chips wm-tags" id="pGrps"></div><div class="wm-grid" id="pGrid"></div><div class="wm-empty hidden" id="pEmpty"></div>';
  $('pQ').addEventListener('input', () => { P.q = $('pQ').value.trim().toLowerCase(); renderParts(); });
  $('pAdd').onclick = () => editPart(null);
  $('pGrps').addEventListener('click', (e) => { const b = e.target.closest('[data-g]'); if (!b) return; P.grp = P.grp === b.getAttribute('data-g') ? '' : b.getAttribute('data-g'); renderParts(); });
  $('pGrid').addEventListener('click', (e) => {
    const c = e.target.closest('[data-id]'); if (!c) return;
    const id = c.getAttribute('data-id'), act = e.target.closest('[data-act]');
    if (act) { const r = P.rows.find((x) => x.id === id); if (!r) return; if (act.getAttribute('data-act') === 'edit') editPart(id); else deletePart(r); return; }
    viewPart(id);
  });
  $('pGrid').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.target.closest('[data-act]')) { const c = e.target.closest('[data-id]'); if (c) viewPart(c.getAttribute('data-id')); } });
}
async function loadParts() {
  if (P.loaded) { renderParts(); return; }
  $('pGrid').innerHTML = '<div class="sk" style="height:150px"></div><div class="sk" style="height:150px"></div>';
  try { P.rows = must(await C.sb.from(TBL).select('*').order('name')); P.loaded = true; showParts(''); renderParts(); }
  catch (e) { $('pGrid').innerHTML = ''; $('pEmpty').classList.add('hidden'); showParts('Chưa mở được mục Linh kiện: ' + ((e && e.message) || e) + (e && e.code ? ' [' + e.code + ']' : '') +
    '. Cách xử lý: mở Supabase → SQL Editor → dán toàn bộ file supabase/work_schema.sql → Run, rồi tải lại trang.'); fail(e); }
}
// hiện / ẩn dòng báo lỗi đỏ ở đầu mục Linh kiện
function showParts(msg) { const b = $('pBanner'); b.textContent = msg; b.classList.toggle('hidden', !msg); }

function renderParts() {
  const cnt = {};
  P.rows.forEach((r) => { cnt[r.grp] = (cnt[r.grp] || 0) + 1; });
  const order = GROUPS.filter((g) => cnt[g]).concat(Object.keys(cnt).filter((g) => GROUPS.indexOf(g) < 0));
  $('pGrps').innerHTML = order.map((g) => '<button type="button" class="chip' + (P.grp === g ? ' on' : '') + '" data-g="' + esc(g) + '">' + esc(g) + ' <small>' + cnt[g] + '</small></button>').join('');
  const rows = P.rows.filter((r) => {
    if (P.grp && r.grp !== P.grp) return false;
    return !P.q || (r.name + ' ' + r.code + ' ' + r.grp + ' ' + r.function_text + ' ' + r.repair_text).toLowerCase().indexOf(P.q) >= 0;
  });
  const empty = $('pEmpty');
  if (!rows.length) {
    empty.classList.remove('hidden');
    empty.innerHTML = P.rows.length ? 'Không có linh kiện nào khớp.' : 'Chưa có linh kiện nào.<br>Bấm <b>＋ Thêm linh kiện</b> để lưu tên, mã, hình ảnh, datasheet và cách sửa.';
  } else empty.classList.add('hidden');
  $('pGrid').innerHTML = rows.map((r) => {
    const cover = (r.images || [])[0];
    return '<article class="wm-card wm-part" data-id="' + esc(r.id) + '" tabindex="0">' +
      '<div class="wm-cover' + (cover ? '' : ' noimg') + '">' + (cover ? '<img data-p="' + esc(cover.t || cover.p) + '" alt="" loading="lazy">' : '<span class="wm-noimg">' + GEAR + '</span>') +
      ((r.images || []).length > 1 ? '<i class="wm-count">' + r.images.length + ' ảnh</i>' : '') +
      ((r.datasheet_path || r.datasheet_url) ? '<i class="wm-ds">Datasheet</i>' : '') +
      '<div class="wm-cact"><button type="button" data-act="edit" aria-label="Sửa" title="Sửa">✎</button><button type="button" class="bad" data-act="del" aria-label="Xóa" title="Xóa">✕</button></div></div>' +
      '<div class="wm-card-b"><span class="wm-grp">' + esc(r.grp) + '</span><h3>' + esc(r.name) + '</h3>' +
      (r.code ? '<div class="wm-code">' + esc(r.code) + '</div>' : '') +
      (r.function_text ? '<p>' + esc(r.function_text) + '</p>' : '') + '</div></article>';
  }).join('');
  fillImgs($('pGrid'));
}

function replaceRow(saved) { const i = P.rows.findIndex((x) => x.id === saved.id); if (i >= 0) P.rows[i] = saved; else P.rows.push(saved); }

async function deletePart(r) {
  const imgs = r.images || [];
  if (!(await askConfirm('Xóa linh kiện "' + r.name + '" cùng ảnh và datasheet? Không thể hoàn tác.'))) return;
  try {
    await track(async () => {
      await removeFiles(imgs.reduce((a, im) => a.concat([im.p, im.t]), []).concat([r.datasheet_path]));
      gotRows(must(await C.sb.from(TBL).delete().eq('id', r.id).select('id')));
    });
    P.rows = P.rows.filter((x) => x.id !== r.id); closeDlg(); renderParts(); C.toast('Đã xóa');
  } catch (er) { fail(er); }
}
// thêm nhanh một đoạn ghi chú (có ghi ngày) vào "Ghi chú cách sửa" mà không phải mở form sửa
async function quickNote(r, txt) {
  const stamp = dmy(todayStr());
  const next = (r.repair_text ? r.repair_text + '\n\n' : '') + '[' + stamp + '] ' + txt;
  try {
    const saved = must(await track(async () => C.sb.from(TBL).update({ repair_text: next, updated_at: new Date().toISOString() }).eq('id', r.id).select().maybeSingle()));
    replaceRow(gotRow(saved)); renderParts(); viewPart(r.id); C.toast('Đã thêm ghi chú');
  } catch (e) { fail(e); }
}
// thêm nhanh ảnh vào linh kiện đã có
async function quickPhotos(r, files) {
  const uploaded = [];
  C.toast('Đang tải ảnh…');
  try {
    const saved = await track(async () => {
      const imgs = (r.images || []).slice();
      for (const f of files) {
        if (!/^image\//.test(f.type)) { C.toast('"' + f.name + '" không phải ảnh', true); continue; }
        const im = await prepImage(f);
        const base = user().id + '/parts/' + r.id + '/' + uid(), pth = base + '.jpg', th = base + '_t.jpg';
        const r1 = await C.sb.storage.from(BUCKET).upload(pth, im.full, { contentType: 'image/jpeg', upsert: false }); if (r1.error) throw r1.error; uploaded.push(pth);
        const r2 = await C.sb.storage.from(BUCKET).upload(th, im.thumb, { contentType: 'image/jpeg', upsert: false }); if (r2.error) throw r2.error; uploaded.push(th);
        URL.revokeObjectURL(im.preview); imgs.push({ p: pth, t: th });
      }
      return gotRow(must(await C.sb.from(TBL).update({ images: imgs, updated_at: new Date().toISOString() }).eq('id', r.id).select().maybeSingle()));
    });
    replaceRow(saved); renderParts(); viewPart(r.id); C.toast('Đã thêm ảnh');
  } catch (e) { await removeFiles(uploaded); fail(e); }
}

function viewPart(id) {
  const r = P.rows.find((x) => x.id === id); if (!r) return;
  const imgs = r.images || [];
  const ds = [];
  if (r.datasheet_path) ds.push('<button class="btn" data-ds="file" type="button">Mở datasheet' + (r.datasheet_name ? ' (' + esc(r.datasheet_name) + ')' : '') + '</button>');
  if (r.datasheet_url) ds.push('<button class="btn" data-ds="url" type="button">Mở link datasheet</button>');
  openDlg('<div class="wm-dtop"><div class="wm-dh"><span class="wm-grp">' + esc(r.grp) + '</span><h2>' + esc(r.name) + '</h2>' + (r.code ? '<div class="wm-code wm-code-big">' + esc(r.code) + '</div>' : '') + '</div>' +
    '<div class="wm-va"><button class="wm-ib" data-edit type="button" aria-label="Sửa" title="Sửa">✎</button><button class="wm-ib bad" data-del type="button" aria-label="Xóa" title="Xóa">✕</button></div></div>' +
    (imgs.length ? '<div class="wm-gal">' + imgs.map((im, i) => '<button type="button" data-i="' + i + '"><img data-p="' + esc(im.t || im.p) + '" alt=""></button>').join('') + '</div>' : '') +
    '<div class="wm-sec"><h4>Chức năng</h4><div class="wm-txt">' + (r.function_text ? multiline(r.function_text) : '<span class="muted">Chưa ghi.</span>') + '</div></div>' +
    '<div class="wm-sec"><h4>Ghi chú cách sửa</h4><div class="wm-txt">' + (r.repair_text ? multiline(r.repair_text) : '<span class="muted">Chưa ghi.</span>') + '</div></div>' +
    '<div class="wm-sec"><h4>Datasheet</h4>' + (ds.length ? '<div class="wm-dsb">' + ds.join('') + '</div>' : '<span class="muted">Chưa có.</span>') + '</div>' +
    '<div class="wm-quick"><div class="wm-qh">Thêm nhanh vào linh kiện này</div><div class="wm-qb"><button class="chip" data-q="note" type="button">＋ Thêm ghi chú</button><button class="chip" data-q="photo" type="button">＋ Thêm ảnh</button></div>' +
    '<input type="file" id="qPhoto" accept="image/*" multiple hidden>' +
    '<div class="wm-qbox hidden" id="qBox"><textarea id="qTxt" rows="3" placeholder="Ghi thêm lỗi gặp phải, cách xử lý… (tự ghi kèm ngày hôm nay)"></textarea>' +
    '<div class="twin wm-nostick"><button class="btn" data-q="cancel" type="button">Hủy</button><button class="btn primary" data-q="save" type="button">Lưu ghi chú</button></div></div></div>' +
    '<div class="prev bad wm-err"></div><div class="hint">Cập nhật ' + fmtDate(r.updated_at) + '</div>' +
    '<div class="twin"><button class="btn danger" data-del type="button">Xóa</button><button class="btn" data-edit type="button">Sửa</button><button class="btn primary" data-close type="button">Đóng</button></div>', { wide: true });
  const sh = $('wmDlg').querySelector('.sheet');
  fillImgs(sh);
  $('qPhoto').onchange = () => { const f = Array.prototype.slice.call($('qPhoto').files); $('qPhoto').value = ''; if (f.length) quickPhotos(r, f); };
  sh.onclick = async (e) => {
    const g = e.target.closest('.wm-gal button');
    if (g) { openLight(imgs, Number(g.getAttribute('data-i'))); return; }
    const d = e.target.closest('[data-ds]');
    if (d) {
      try {
        if (d.getAttribute('data-ds') === 'url') { const u = /^https?:\/\//i.test(r.datasheet_url) ? r.datasheet_url : 'https://' + r.datasheet_url; window.open(u, '_blank', 'noopener'); }
        else { const w = window.open('', '_blank'); const u = await signedOne(r.datasheet_path); if (w) { w.opener = null; w.location = u; } else location.href = u; }
      } catch (er) { fail(er); }
      return;
    }
    const q = e.target.closest('[data-q]');
    if (q) {
      const a = q.getAttribute('data-q');
      if (a === 'note') { $('qBox').classList.remove('hidden'); $('qTxt').focus(); }
      else if (a === 'photo') $('qPhoto').click();
      else if (a === 'cancel') { $('qTxt').value = ''; $('qBox').classList.add('hidden'); }
      else if (a === 'save') { const t = $('qTxt').value.trim(); if (!t) { $('qTxt').focus(); return; } q.disabled = true; q.textContent = 'Đang lưu…'; quickNote(r, t); }
      return;
    }
    if (e.target.closest('[data-close]')) closeDlg();
    else if (e.target.closest('[data-edit]')) editPart(r.id);
    else if (e.target.closest('[data-del]')) deletePart(r);
  };
}

function editPart(id) {
  const r = id ? P.rows.find((x) => x.id === id) : null;
  E = { id, images: ((r && r.images) || []).map((im) => ({ isNew: false, p: im.p, t: im.t })), removed: [], busy: false,
        ds: r && r.datasheet_path ? { isNew: false, path: r.datasheet_path, name: r.datasheet_name } : null, dsRemoved: '' };
  const grps = GROUPS.concat(r && GROUPS.indexOf(r.grp) < 0 ? [r.grp] : []);
  openDlg('<h2>' + (r ? 'Sửa linh kiện' : 'Thêm linh kiện') + '</h2>' +
    '<div class="field"><label for="pName">Tên linh kiện *</label><input id="pName" data-autofocus maxlength="200" placeholder="vd: Diode Schottky"></div>' +
    '<div class="wm-two"><div class="field"><label for="pCode">Mã linh kiện</label><input id="pCode" maxlength="200" placeholder="vd: SS34 / SS24"></div>' +
    '<div class="field"><label for="pGrp">Nhóm</label><select id="pGrp">' + grps.map((g) => '<option>' + esc(g) + '</option>').join('') + '</select></div></div>' +
    '<div class="field"><label>Hình ảnh</label><div class="wm-photos" id="pPhotos"></div><input type="file" id="pFile" accept="image/*" multiple hidden></div>' +
    '<div class="field"><label>Datasheet (nếu có)</label><div class="wm-dsrow" id="pDs"></div>' +
    '<input type="file" id="pDsFile" accept=".pdf,application/pdf,image/*,.doc,.docx,.xls,.xlsx" hidden>' +
    '<input id="pDsUrl" type="url" inputmode="url" maxlength="1000" placeholder="hoặc dán đường link datasheet (https://…)" style="margin-top:8px"></div>' +
    '<div class="field"><label for="pFn">Chức năng</label><textarea id="pFn" rows="3" placeholder="Linh kiện này dùng để làm gì…"></textarea></div>' +
    '<div class="field"><label for="pRepair">Ghi chú cách sửa</label><textarea id="pRepair" rows="5" placeholder="Cách kiểm tra, lỗi thường gặp, cách xử lý…"></textarea></div>' +
    '<div class="prev bad wm-err" id="pErr"></div>' +
    '<div class="twin"><button class="btn" data-cancel type="button">Hủy</button><button class="btn primary" data-save type="button">Lưu</button></div>',
    { wide: true, onClose: () => { if (E) E.images.forEach((im) => { if (im.isNew) URL.revokeObjectURL(im.preview); }); E = null; } });
  $('pName').value = r ? r.name : ''; $('pCode').value = r ? r.code : ''; $('pGrp').value = r ? r.grp : (P.grp || GROUPS[0]);
  $('pFn').value = r ? r.function_text : ''; $('pRepair').value = r ? r.repair_text : ''; $('pDsUrl').value = r ? r.datasheet_url : '';
  renderPhotos(); renderDs();
  $('pFile').onchange = async () => {
    const files = Array.prototype.slice.call($('pFile').files); $('pFile').value = '';
    for (const f of files) {
      if (!E) return;
      if (!/^image\//.test(f.type)) { C.toast('"' + f.name + '" không phải ảnh', true); continue; }
      try { const im = await prepImage(f); if (!E) { URL.revokeObjectURL(im.preview); return; } E.images.push(im); renderPhotos(); }
      catch (er) { C.toast('Không đọc được ảnh "' + f.name + '"', true); }
    }
  };
  $('pDsFile').onchange = () => {
    const f = $('pDsFile').files[0]; $('pDsFile').value = ''; if (!f || !E) return;
    if (f.size > MAX_FILE) { C.toast('File datasheet lớn hơn 50 MB', true); return; }
    E.ds = { isNew: true, file: f, name: f.name }; renderDs();
  };
  $('wmDlg').querySelector('.sheet').onclick = (e) => {
    const rm = e.target.closest('[data-rm]');
    if (rm) { const im = E.images.splice(Number(rm.getAttribute('data-rm')), 1)[0]; if (im.isNew) URL.revokeObjectURL(im.preview); else E.removed.push(im.p, im.t); renderPhotos(); return; }
    if (e.target.closest('[data-addph]')) { $('pFile').click(); return; }
    if (e.target.closest('[data-pickds]')) { $('pDsFile').click(); return; }
    if (e.target.closest('[data-rmds]')) { if (E.ds && !E.ds.isNew) E.dsRemoved = E.ds.path; E.ds = null; renderDs(); return; }
    if (e.target.closest('[data-cancel]')) closeDlg();
    else if (e.target.closest('[data-save]')) savePart(r);
  };
}
function renderPhotos() {
  $('pPhotos').innerHTML = E.images.map((im, i) => '<div class="wm-ph"><img ' + (im.isNew ? 'src="' + im.preview + '"' : 'data-p="' + esc(im.t || im.p) + '"') + ' alt=""><button type="button" data-rm="' + i + '" aria-label="Bỏ ảnh">✕</button></div>').join('') +
    '<button type="button" class="wm-addph" data-addph><span>＋</span>Thêm ảnh</button>';
  fillImgs($('pPhotos'));
}
function renderDs() {
  $('pDs').innerHTML = E.ds
    ? '<span class="wm-dsname">📎 ' + esc(E.ds.name || 'datasheet') + '</span><button class="chip" data-rmds type="button">Bỏ file</button>'
    : '<button class="chip" data-pickds type="button">⬆ Tải file datasheet (PDF…)</button>';
}
async function savePart(old) {
  if (E.busy) return;
  const name = $('pName').value.trim();
  if (!name) { $('pErr').textContent = 'Hãy nhập tên linh kiện.'; $('pName').focus(); return; }
  $('pErr').textContent = ''; E.busy = true;
  const btn = $('wmDlg').querySelector('[data-save]'); btn.disabled = true; btn.textContent = 'Đang lưu…';
  const id = E.id || uid(), uploaded = [];
  try {
    await track(async () => {
      const imgs = [];
      for (const im of E.images) {
        if (!im.isNew) { imgs.push({ p: im.p, t: im.t }); continue; }
        const base = user().id + '/parts/' + id + '/' + uid(), p = base + '.jpg', t = base + '_t.jpg';
        let r1 = await C.sb.storage.from(BUCKET).upload(p, im.full, { contentType: 'image/jpeg', upsert: false }); if (r1.error) throw r1.error; uploaded.push(p);
        let r2 = await C.sb.storage.from(BUCKET).upload(t, im.thumb, { contentType: 'image/jpeg', upsert: false }); if (r2.error) throw r2.error; uploaded.push(t);
        imgs.push({ p, t });
      }
      let dsPath = '', dsName = '';
      if (E.ds && !E.ds.isNew) { dsPath = E.ds.path; dsName = E.ds.name || ''; }
      else if (E.ds && E.ds.isNew) {
        const m = /\.([A-Za-z0-9]{1,8})$/.exec(E.ds.name);
        dsPath = user().id + '/parts/' + id + '/datasheet-' + uid() + (m ? '.' + m[1].toLowerCase() : ''); dsName = E.ds.name;
        const up = await C.sb.storage.from(BUCKET).upload(dsPath, E.ds.file, { contentType: E.ds.file.type || 'application/octet-stream', upsert: false });
        if (up.error) throw up.error; uploaded.push(dsPath);
      }
      const row = { grp: $('pGrp').value || 'Khác', name, code: $('pCode').value.trim(), images: imgs, datasheet_path: dsPath, datasheet_name: dsName,
                    datasheet_url: $('pDsUrl').value.trim(), function_text: $('pFn').value.trim(), repair_text: $('pRepair').value.trim(), updated_at: new Date().toISOString() };
      const saved = old ? gotRow(must(await C.sb.from(TBL).update(row).eq('id', id).select().maybeSingle()))
                        : must(await C.sb.from(TBL).insert(Object.assign({ id, user_id: user().id }, row)).select().single());
      await removeFiles(E.removed.concat([E.dsRemoved]));
      const i = P.rows.findIndex((x) => x.id === id); if (i >= 0) P.rows.splice(i, 1);
      P.rows.push(saved); P.rows.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    });
    closeDlg(); renderParts(); C.toast('Đã lưu');
  } catch (e) {
    await removeFiles(uploaded);
    fail(e); if (E) { E.busy = false; } btn.disabled = false; btn.textContent = 'Lưu';
  }
}

/* =====================================================================
   2) MẬT KHẨU MÁY: mỗi máy có nhiều mật khẩu (lưu thẳng, không mã hóa)
===================================================================== */
const W = { loaded: false, rows: [], q: '', open: new Set() };

function initPw() {
  $('wm-pw').innerHTML =
    '<div class="wm-bar"><div class="wm-search"><input id="wQ" type="search" placeholder="Tìm tên máy hoặc mật khẩu…" autocomplete="off"></div>' +
    '<button class="btn primary" id="wAdd" type="button">＋ Thêm máy</button></div>' +
    '<div class="hint" style="margin:0 2px 10px">Bấm vào một mật khẩu để chép.</div><div class="wm-pwlist" id="wList"></div>';
  $('wQ').addEventListener('input', () => { W.q = $('wQ').value.trim().toLowerCase(); renderPw(); });
  $('wAdd').onclick = () => editPw(null);
  $('wList').addEventListener('click', async (e) => {
    const card = e.target.closest('[data-id]'); if (!card) return;
    const r = W.rows.find((x) => x.id === card.getAttribute('data-id')); if (!r) return;
    const chip = e.target.closest('[data-i]');
    if (chip) {
      const it = (r.passwords || [])[Number(chip.getAttribute('data-i'))]; if (!it) return;
      copyText(it.v).then(() => { C.toast('Đã chép: ' + it.v); chip.classList.add('ok'); setTimeout(() => chip.classList.remove('ok'), 900); }, () => C.toast('Không chép được, hãy bôi đen rồi chép tay', true));
      return;
    }
    const act = e.target.closest('[data-w]'); if (!act) return;
    const a = act.getAttribute('data-w');
    if (a === 'more') { if (W.open.has(r.id)) W.open.delete(r.id); else W.open.add(r.id); renderPw(); }
    else if (a === 'edit') editPw(r.id);
    else if (a === 'del') {
      if (!(await askConfirm('Xóa máy "' + r.name + '" cùng toàn bộ mật khẩu? Không thể hoàn tác.'))) return;
      try { await track(async () => gotRows(must(await C.sb.from('machine_passwords').delete().eq('id', r.id).select('id')))); W.rows = W.rows.filter((x) => x.id !== r.id); renderPw(); C.toast('Đã xóa'); }
      catch (er) { fail(er); }
    }
  });
}
async function loadPw() {
  if (W.loaded) { renderPw(); return; }
  $('wList').innerHTML = '<div class="sk" style="height:110px"></div><div class="sk" style="height:110px;margin-top:10px"></div>';
  try { W.rows = must(await C.sb.from('machine_passwords').select('*').order('name')); W.loaded = true; renderPw(); }
  catch (e) { $('wList').innerHTML = ''; fail(e); }
}
function renderPw() {
  const q = W.q;
  const rows = W.rows.filter((r) => !q || (r.name + ' ' + (r.passwords || []).map((p) => p.l + ' ' + p.v).join(' ')).toLowerCase().indexOf(q) >= 0);
  if (!rows.length) { $('wList').innerHTML = '<div class="wm-empty">' + (W.rows.length ? 'Không có máy nào khớp.' : 'Chưa có máy nào.<br>Bấm <b>＋ Thêm máy</b> để lưu tên máy và các mật khẩu của máy đó.') + '</div>'; return; }
  $('wList').innerHTML = rows.map((r) => {
    const all = (r.passwords || []).map((p, i) => Object.assign({ i }, p));
    const open = W.open.has(r.id) || !!q, list = open ? all : all.slice(0, PW_FOLD);
    const groups = []; list.forEach((p) => { let g = groups.find((x) => x.l === p.l); if (!g) { g = { l: p.l, items: [] }; groups.push(g); } g.items.push(p); });
    return '<article class="wm-card wm-pwcard" data-id="' + esc(r.id) + '"><div class="wm-ph2"><h3>' + esc(r.name) + ' <small>' + all.length + ' mật khẩu</small></h3>' +
      '<div class="wm-va"><button class="wm-ib" data-w="edit" type="button" aria-label="Sửa">✎</button><button class="wm-ib bad" data-w="del" type="button" aria-label="Xóa">✕</button></div></div>' +
      (all.length ? groups.map((g) => (g.l ? '<div class="wm-pl">' + esc(g.l) + '</div>' : '') +
        '<div class="wm-pws">' + g.items.map((p) => '<button type="button" class="wm-pwc" data-i="' + p.i + '">' + esc(p.v) + '</button>').join('') + '</div>').join('') : '<div class="muted">Chưa có mật khẩu.</div>') +
      (all.length > PW_FOLD && !q ? '<button type="button" class="chip wm-more" data-w="more">' + (open ? 'Thu gọn' : 'Xem thêm ' + (all.length - PW_FOLD) + ' mật khẩu') + '</button>' : '') + '</article>';
  }).join('');
}
function pwRow(l, v) {
  return '<div class="wm-pr"><input class="wl" placeholder="Nhãn (không bắt buộc)" maxlength="80" value="' + esc(l) + '"><input class="wv" placeholder="Mật khẩu" maxlength="300" value="' + esc(v) + '"><button class="wm-ib bad" type="button" data-rmrow aria-label="Xóa dòng">✕</button></div>';
}
function editPw(id) {
  const r = id ? W.rows.find((x) => x.id === id) : null;
  openDlg('<h2>' + (r ? 'Sửa máy' : 'Thêm máy') + '</h2>' +
    '<div class="field"><label for="wName">Tên / loại máy *</label><input id="wName" data-autofocus maxlength="200" placeholder="vd: PRODIGY, CT8600P"></div>' +
    '<div class="field"><label>Mật khẩu</label><div id="wRows" class="wm-prs"></div>' +
    '<div class="wm-addrow"><button class="chip" data-addrow type="button">＋ Thêm mật khẩu</button><button class="chip" data-paste type="button">Dán nhiều mật khẩu</button></div>' +
    '<div class="wm-pastebox hidden" id="wPaste"><textarea id="wPasteTxt" rows="4" placeholder="Mỗi dòng một mật khẩu"></textarea>' +
    '<input id="wPasteLbl" maxlength="80" placeholder="Nhãn chung cho các mật khẩu này (không bắt buộc)" style="margin-top:8px">' +
    '<button class="btn block" data-pasteok type="button">Thêm vào danh sách</button></div></div>' +
    '<div class="prev bad wm-err" id="wErr"></div><div class="twin"><button class="btn" data-cancel type="button">Hủy</button><button class="btn primary" data-save type="button">Lưu</button></div>', { wide: true });
  $('wName').value = r ? r.name : '';
  const rows = $('wRows');
  const pws = r ? (r.passwords || []) : [];
  rows.innerHTML = (pws.length ? pws : [{ l: '', v: '' }]).map((p) => pwRow(p.l, p.v)).join('');
  $('wmDlg').querySelector('.sheet').onclick = async (e) => {
    if (e.target.closest('[data-rmrow]')) { e.target.closest('.wm-pr').remove(); return; }
    if (e.target.closest('[data-addrow]')) { rows.insertAdjacentHTML('beforeend', pwRow('', '')); const l = rows.querySelectorAll('.wv'); l[l.length - 1].focus(); return; }
    if (e.target.closest('[data-paste]')) { $('wPaste').classList.toggle('hidden'); $('wPasteTxt').focus(); return; }
    if (e.target.closest('[data-pasteok]')) {
      const lbl = $('wPasteLbl').value.trim(), lines = $('wPasteTxt').value.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
      if (!lines.length) return;
      const first = rows.querySelector('.wm-pr'); if (first && !first.querySelector('.wv').value.trim() && !first.querySelector('.wl').value.trim() && rows.children.length === 1) first.remove();
      rows.insertAdjacentHTML('beforeend', lines.map((v) => pwRow(lbl, v)).join(''));
      $('wPasteTxt').value = ''; $('wPaste').classList.add('hidden'); C.toast('Đã thêm ' + lines.length + ' mật khẩu vào danh sách, nhớ bấm Lưu'); return;
    }
    if (e.target.closest('[data-cancel]')) { closeDlg(); return; }
    const b = e.target.closest('[data-save]'); if (!b) return;
    const name = $('wName').value.trim(); if (!name) { $('wErr').textContent = 'Hãy nhập tên / loại máy.'; return; }
    const out = [], seen = new Set();
    rows.querySelectorAll('.wm-pr').forEach((row) => {
      const v = row.querySelector('.wv').value.trim(), l = row.querySelector('.wl').value.trim();
      if (!v || seen.has(l + '\u0001' + v)) return; seen.add(l + '\u0001' + v); out.push({ l, v });
    });
    b.disabled = true; b.textContent = 'Đang lưu…';
    try {
      const row = { name, passwords: out, updated_at: new Date().toISOString() };
      const saved = must(await track(async () => (r ? C.sb.from('machine_passwords').update(row).eq('id', r.id).select().maybeSingle()
                                                   : C.sb.from('machine_passwords').insert(row).select().single())));
      gotRow(saved);
      const i = W.rows.findIndex((x) => x.id === saved.id); if (i >= 0) W.rows.splice(i, 1);
      W.rows.push(saved); W.rows.sort((a, b2) => a.name.localeCompare(b2.name, 'vi'));
      closeDlg(); renderPw(); C.toast('Đã lưu');
    } catch (er) { fail(er); b.disabled = false; b.textContent = 'Lưu'; }
  };
}

/* =====================================================================
   3) LỊCH THÁNG HIỆN TẠI: ô vuông bo góc + đánh dấu "Her" (trái tim hồng phát sáng)
===================================================================== */
const K = { year: new Date().getFullYear(), month: new Date().getMonth(), days: {} };
const MARK_LABEL = {}; MARKS.forEach((m) => { MARK_LABEL[m[0]] = m[1]; });
const HER_TAG = '[Her] ';

function syncCurrentMonth() {
  const now = new Date();
  K.year = now.getFullYear();
  K.month = now.getMonth();
}

// Chuẩn hóa dữ liệu đọc từ Supabase (hỗ trợ cả trường hợp DB giới hạn cột mark bằng CHECK constraint)
function normalizeCalRow(r) {
  if (!r) return r;
  const copy = Object.assign({}, r);
  if (copy.note && copy.note.indexOf(HER_TAG) === 0) {
    copy.mark = 'her';
    copy.note = copy.note.slice(HER_TAG.length);
  }
  // Nhãn "Nghỉ" (green) đã bỏ: ngày cũ mang nhãn này coi như không đánh dấu (vẫn giữ ghi chú)
  if (copy.mark === 'green') copy.mark = '';
  return copy;
}

// Tạo các trái tim hồng phát sáng bên trong ô ngày được đánh dấu "Her"
// Icon trái tim kiểu Pixel (8-bit crispEdges) dùng cho cả nhãn đánh dấu "Her" và hiệu ứng bay
const PIXEL_HEART_SVG =
  '<svg viewBox="0 0 11 10" shape-rendering="crispEdges" aria-hidden="true">' +
    '<path fill="#ff66dc" d="M2 0h2v1h1v1h1V1h1V0h2v1h1v1h1v3h-1v1H9v1H8v1H7v1H6v1H5V9H4V8H3V7H2V6H1V5H0V2h1V1h1V0z"/>' +
    '<path fill="#ffb8f0" d="M2 1h2v1H3v1H2V1zm-1 1h1v2H1V2z"/>' +
  '</svg>';
const HEART_SVG = PIXEL_HEART_SVG;

// Icon ngôi sao đỏ kiểu Pixel (8-bit crispEdges) cho nhãn "Quan trọng" (red)
const PIXEL_STAR_RED_SVG =
  '<svg viewBox="0 0 11 11" shape-rendering="crispEdges" aria-hidden="true">' +
    '<path fill="#ffffff" d="M5 0h1v2h1v1h4v1h-1v1H9v1H8v1h1v3H8v1H7v-1H6V9H5v1H4v1H3v-1H2V7h1V6H2V5H1V4H0V3h4V2h1V0z"/>' +
    '<path fill="#ef1d26" d="M5 1h1v2h1v1h3v1H8v1H7v1h1v3H7V9H6V8H5v1H4v1H3V7h1V6H3V5H1V4h3V3h1V1z"/>' +
    '<path fill="#ff9ca0" d="M5 2h1v2H4V3h1V2zM3 4h2v1H3V4z"/>' +
  '</svg>';

// Icon ngọn lửa xanh dương kiểu Pixel (8-bit crispEdges) cho nhãn "Công việc" (blue)
const PIXEL_FLAME_BLUE_SVG =
  '<svg viewBox="0 0 11 13" shape-rendering="crispEdges" aria-hidden="true">' +
    '<path fill="#1b6ef3" d="M5 0h1v1h1v2h1v1h1v2h1v4H9v1H8v1H3v-1H2v-1H1V6h1V4h1V3h1V2h1V0z"/>' +
    '<path fill="#47b8ff" d="M5 2h1v2h1v1h1v2h1v3H8v1H3v-1H2V7h1V5h1V4h1V2z"/>' +
    '<path fill="#d4f6ff" d="M5 5h1v2h1v3H4V7h1V5z"/>' +
  '</svg>';

// Icon con bướm vàng phát sáng (kiểu Pixel) cho nhãn "Hẹn / nhắc" (amber)
const PIXEL_BUTTERFLY_GOLD_SVG =
  '<svg viewBox="0 0 13 11" shape-rendering="crispEdges" aria-hidden="true">' +
    '<path fill="#f5a623" d="M1 0h3v1h1v2h1V1h1v2h1V1h1V0h3v1h1v4h-1v1h-1v1h1v3h-3v-1H8V8H7v2H6V8H5v1H4v1H1V7h1V6H1V5H0V1h1V0z"/>' +
    '<path fill="#ffe066" d="M1 1h3v1h1v2H2V3H1V1zm8 0h3v2h-1v1H8V2h1V1zM2 7h2v2H2V7zm7 0h2v2H9V7z"/>' +
    '<path fill="#fff9db" d="M2 1h2v1H2V1zm8 0h2v1h-2V1z"/>' +
    '<path fill="#b86b00" d="M6 2h1v7H6V2z"/>' +
  '</svg>';

// Icon viên pha lê thạch anh tím kiểu Pixel (8-bit crispEdges) cho nhãn "Khác" (purple)
const PIXEL_GEM_PURPLE_SVG =
  '<svg viewBox="0 0 11 9" shape-rendering="crispEdges" aria-hidden="true">' +
    '<path fill="#8b45ff" d="M3 0h5v1h1v1h1v1h1v1h-1v1H9v1H8v1H7v1H6v1H5V8H4V7H3V6H2V5H1V4H0V3h1V2h1V1h1V0z"/>' +
    '<path fill="#5b21b6" d="M1 3h9v1H1V3zm5 1h3v1H8v1H7v1H6V4z"/>' +
    '<path fill="#c9a6ff" d="M3 1h2v1H4v1H2V2h1V1z"/>' +
    '<path fill="#f5edff" d="M7 1h1v1H7V1zM3 1h1v1H3V1z"/>' +
  '</svg>';

function markDotHtml(code) {
  if (code === 'her') {
    return '<b class="c-her is-pixel">' + PIXEL_HEART_SVG + '</b>';
  }
  if (code === 'red') {
    return '<b class="c-red is-pixel">' + PIXEL_STAR_RED_SVG + '</b>';
  }
  if (code === 'blue') {
    return '<b class="c-blue is-pixel">' + PIXEL_FLAME_BLUE_SVG + '</b>';
  }
  if (code === 'amber') {
    return '<b class="c-amber is-pixel">' + PIXEL_BUTTERFLY_GOLD_SVG + '</b>';
  }
  if (code === 'purple') {
    return '<b class="c-purple is-pixel">' + PIXEL_GEM_PURPLE_SVG + '</b>';
  }
  return '<b class="c-' + (code || 'none') + '"></b>';
}

const HER_PARTICLES = [
  { x: 16, s: 11, dur: 2900, dl: -300, dx: 5, p: 0.95 },
  { x: 74, s: 9,  dur: 3300, dl: -1400, dx: -6, p: 0.9 },
  { x: 46, s: 13, dur: 3600, dl: -2100, dx: 4, p: 1.0 },
  { x: 28, s: 6.5, dur: 2600, dl: -900, dx: -4, p: 0.8 },
  { x: 62, s: 7.5, dur: 3100, dl: -2600, dx: 5, p: 0.85 },
  { x: 84, s: 6,  dur: 2700, dl: -1750, dx: -3, p: 0.75 },
  { x: 38, s: 8.5, dur: 3400, dl: -600, dx: -5, p: 0.88 }
];

function buildHerFxHtml() {
  return '<span class="her-fx" aria-hidden="true">' +
    HER_PARTICLES.map((p) =>
      '<i class="her-h" style="left:' + p.x + '%;width:' + p.s + 'px;height:' + p.s + 'px" ' +
      'data-dur="' + p.dur + '" data-dl="' + p.dl + '" data-dx="' + p.dx + '" data-pk="' + p.p + '">' +
      HEART_SVG + '</i>'
    ).join('') +
    '</span>';
}

// Hiệu ứng lửa xanh dương cháy rực ở thanh dưới cho nhãn "Công việc" (m-blue)
function buildWorkFireFxHtml() {
  return (
    '<span class="work-fx" aria-hidden="true">' +

        // Lớp lửa xanh dương đậm ngoài cùng phủ toàn bộ thanh dưới
        '<svg class="wf-svg wf-bot wf-outer" viewBox="0 0 100 62" preserveAspectRatio="none">' +
          '<path fill="#1464f6" d="M0 62 L0 30 C5 22, 12 34, 16 18 C20 28, 26 24, 31 12 C36 25, 43 28, 49 8 C55 24, 62 26, 68 11 C73 25, 80 22, 85 15 C90 27, 96 22, 100 28 L100 62 Z"/>' +
          '<path fill="#2986ff" opacity="0.88" d="M0 62 L0 36 C7 28, 14 38, 22 20 C28 33, 36 27, 42 15 C49 30, 57 25, 63 14 C70 29, 78 26, 86 19 C92 31, 97 27, 100 34 L100 62 Z"/>' +
        '</svg>' +
        // Lớp lửa xanh lam sáng (cyan-blue) ở tầng giữa
        '<svg class="wf-svg wf-bot wf-mid" viewBox="0 0 100 62" preserveAspectRatio="none">' +
          '<path fill="#45b6ff" d="M0 62 L0 42 C6 34, 15 41, 20 26 C26 37, 33 33, 39 21 C45 34, 53 31, 59 18 C65 33, 73 32, 79 23 C85 35, 93 33, 100 40 L100 62 Z"/>' +
        '</svg>' +
        // Lõi lửa xanh băng - trắng sáng rực sát đáy thanh dưới
        '<svg class="wf-svg wf-bot wf-inner" viewBox="0 0 100 62" preserveAspectRatio="none">' +
          '<path fill="#8ce6ff" d="M0 62 L0 48 C8 42, 16 47, 23 35 C30 44, 38 41, 45 30 C52 42, 60 39, 67 31 C74 43, 83 40, 90 34 C95 43, 98 44, 100 48 L100 62 Z"/>' +
          '<path fill="#e3fbff" d="M0 62 L0 54 C10 49, 20 53, 28 44 C36 51, 46 48, 53 41 C61 50, 71 47, 79 43 C87 50, 94 49, 100 53 L100 62 Z"/>' +
        '</svg>' +
      // Các tàn lửa xanh dương bay từ thanh dưới lên
      '<i class="wf-ember" style="left:16%;bottom:24%;width:4px;height:4px" data-dur="760" data-dl="-120" data-dx="4" data-dy="-18"></i>' +
      '<i class="wf-ember c" style="left:36%;bottom:28%;width:3.5px;height:3.5px" data-dur="680" data-dl="-380" data-dx="-5" data-dy="-22"></i>' +
      '<i class="wf-ember" style="left:54%;bottom:30%;width:4.5px;height:4.5px" data-dur="720" data-dl="-240" data-dx="5" data-dy="-24"></i>' +
      '<i class="wf-ember c" style="left:72%;bottom:26%;width:3.5px;height:3.5px" data-dur="640" data-dl="-510" data-dx="-4" data-dy="-19"></i>' +
      '<i class="wf-ember" style="left:84%;bottom:22%;width:4px;height:4px" data-dur="740" data-dl="-190" data-dx="-3" data-dy="-16"></i>' +
    '</span>'
  );
}

// Hiệu ứng ngôi sao đỏ viền trắng phát sáng trên nền caro đỏ-hồng cho nhãn "Quan trọng" (m-red) theo clip mẫu
const RED_STAR_SVG =
  '<svg viewBox="0 0 28 28" aria-hidden="true">' +
    '<path d="M14 2.2l3.35 6.78 7.49 1.09-5.42 5.28 1.28 7.46L14 19.28l-6.7 3.53 1.28-7.46-5.42-5.28 7.49-1.09L14 2.2z" ' +
    'fill="#eb1c24" stroke="#ffffff" stroke-width="3.6" stroke-linejoin="round" paint-order="stroke"/>' +
  '</svg>';

const RED_STAR_PARTICLES = [
  { x: 10, y: 18, s: 14, dur: 3600, dl: -400,  dx: 8,  dy: -16, rot: 140 },
  { x: 70, y: 12, s: 12, dur: 3200, dl: -1500, dx: -9, dy: 14,  rot: -160 },
  { x: 66, y: 62, s: 15, dur: 3800, dl: -900,  dx: -7, dy: -18, rot: 180 },
  { x: 16, y: 66, s: 11, dur: 3100, dl: -2200, dx: 10, dy: -12, rot: -140 },
  { x: 44, y: 20, s: 7.5, dur: 2800, dl: -700, dx: -6, dy: 12,  rot: 200 },
  { x: 32, y: 74, s: 8.5, dur: 3400, dl: -1800, dx: 7, dy: -15, rot: -180 },
  { x: 82, y: 40, s: 8,  dur: 2900, dl: -1100, dx: -8, dy: -10, rot: 160 },
  { x: 18, y: 44, s: 6.5, dur: 2700, dl: -2500, dx: 6, dy: 10,  rot: -200 }
];

function buildRedStarFxHtml() {
  return (
    '<span class="red-fx" aria-hidden="true">' +
      '<i class="red-grid"></i>' +
      RED_STAR_PARTICLES.map((p) =>
        '<i class="red-st" style="left:' + p.x + '%;top:' + p.y + '%;width:' + p.s + 'px;height:' + p.s + 'px" ' +
        'data-dur="' + p.dur + '" data-dl="' + p.dl + '" data-dx="' + p.dx + '" data-dy="' + p.dy + '" data-rot="' + p.rot + '">' +
        RED_STAR_SVG + '</i>'
      ).join('') +
    '</span>'
  );
}

// Hiệu ứng đàn bướm vàng kim phát sáng kèm tia lấp lánh chéo trên nền đêm cho nhãn "Hẹn / nhắc" (m-amber) theo ảnh mẫu
const GOLD_BUTTERFLY_SVG =
  '<svg viewBox="0 0 28 28" aria-hidden="true">' +
    // Tia sáng chéo 4 cánh (starburst lens flare) phía sau con bướm giống ảnh mẫu
    '<path class="bf-flare" fill="#ffe89e" opacity="0.72" d="M14 14 L2 2 L14 12.6 L26 2 L15.4 14 L26 26 L14 15.4 L2 26 Z"/>' +
    // Cánh bướm vàng ánh kim phát sáng
    '<g class="bf-wings">' +
      '<path fill="#fff8dc" stroke="#f7b733" stroke-width="0.9" d="M13.6 13.2 C10.2 6.8, 3.4 5.2, 2.8 10.2 C2.4 13.2, 6.2 15.2, 10.8 14.8 C6.8 16.4, 5.2 20.8, 8.2 22.4 C10.8 23.6, 13.0 19.8, 13.7 15.8 Z"/>' +
      '<path fill="#fff8dc" stroke="#f7b733" stroke-width="0.9" d="M14.4 13.2 C17.8 6.8, 24.6 5.2, 25.2 10.2 C25.6 13.2, 21.8 15.2, 17.2 14.8 C21.2 16.4, 22.8 20.8, 19.8 22.4 C17.2 23.6, 15.0 19.8, 14.3 15.8 Z"/>' +
      '<ellipse cx="14" cy="14.5" rx="0.85" ry="4.2" fill="#fffdf2"/>' +
    '</g>' +
  '</svg>';

const AMBER_BUTTERFLIES = [
  { x: 14, y: 78, s: 15, dur: 3400, dl: -300,  dx: 9,   dy: -48, rot: -16, flap: 280 },
  { x: 68, y: 84, s: 13, dur: 3100, dl: -1600, dx: -10, dy: -52, rot: 14,  flap: 310 },
  { x: 42, y: 88, s: 16, dur: 3700, dl: -950,  dx: 7,   dy: -56, rot: -12, flap: 260 },
  { x: 24, y: 62, s: 9.5, dur: 2900, dl: -2100, dx: -7, dy: -38, rot: 18,  flap: 240 },
  { x: 76, y: 58, s: 10.5, dur: 3200, dl: -750, dx: -8, dy: -40, rot: -15, flap: 290 },
  { x: 52, y: 70, s: 8.5, dur: 2700, dl: -1350, dx: 6,  dy: -42, rot: 12,  flap: 230 },
  { x: 12, y: 44, s: 8,   dur: 2800, dl: -2450, dx: 8,  dy: -32, rot: -10, flap: 250 },
  { x: 82, y: 36, s: 9,   dur: 3000, dl: -1850, dx: -6, dy: -30, rot: 15,  flap: 270 }
];

function buildAmberButterflyFxHtml() {
  return (
    '<span class="amber-fx" aria-hidden="true">' +
      AMBER_BUTTERFLIES.map((b) =>
        '<i class="amb-bf" style="left:' + b.x + '%;top:' + b.y + '%;width:' + b.s + 'px;height:' + b.s + 'px" ' +
        'data-dur="' + b.dur + '" data-dl="' + b.dl + '" data-dx="' + b.dx + '" data-dy="' + b.dy + '" data-rot="' + b.rot + '" data-flap="' + b.flap + '">' +
        GOLD_BUTTERFLY_SVG + '</i>'
      ).join('') +
    '</span>'
  );
}

// Hiệu ứng "tinh vân tím": nền vũ trụ tím xoay chậm, pha lê thạch anh tím trôi lơ lửng
// và các tia sáng 4 cánh lấp lánh cho nhãn "Khác" (m-purple)
const PURPLE_GEM_SVG =
  '<svg viewBox="0 0 28 28" aria-hidden="true">' +
    '<path d="M8 4h12l6 7H2z" fill="#e2d0ff"/>' +
    '<path d="M2 11h24L14 25z" fill="#9b5cff"/>' +
    '<path d="M14 11l-3 0 3 14z" fill="#7c3aed"/>' +
    '<path d="M2 11h24M8 4l3 7 3-7 3 7 3-7M11 11l3 14 3-14" fill="none" stroke="#f6efff" stroke-width="0.9" stroke-linejoin="round"/>' +
    '<path d="M8 4h12l6 7-12 14L2 11z" fill="none" stroke="#5b21b6" stroke-width="1.1" stroke-linejoin="round"/>' +
  '</svg>';
const PURPLE_SPARK_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true">' +
    '<path fill="#ffffff" d="M12 0C13 8 16 11 24 12C16 13 13 16 12 24C11 16 8 13 0 12C8 11 11 8 12 0Z"/>' +
  '</svg>';

const PURPLE_GEMS = [
  { x: 14, y: 66, s: 12, dur: 4200, dl: -600,  dx: 5,  dy: -30, rot: 24 },
  { x: 64, y: 72, s: 10, dur: 3800, dl: -2100, dx: -6, dy: -34, rot: -28 },
  { x: 40, y: 80, s: 8,  dur: 3500, dl: -1300, dx: 4,  dy: -38, rot: 20 },
  { x: 78, y: 48, s: 7,  dur: 3300, dl: -2800, dx: -4, dy: -26, rot: -18 }
];
const PURPLE_SPARKS = [
  { x: 12, y: 16, s: 9,  dur: 1900, dl: -200 },
  { x: 74, y: 12, s: 7,  dur: 2300, dl: -1200 },
  { x: 84, y: 64, s: 8,  dur: 2100, dl: -700 },
  { x: 22, y: 50, s: 5.5, dur: 1700, dl: -1500 },
  { x: 52, y: 22, s: 5,  dur: 2500, dl: -400 },
  { x: 46, y: 70, s: 6,  dur: 2000, dl: -1800 }
];

function buildPurpleNebulaFxHtml() {
  return (
    '<span class="oth-fx" aria-hidden="true">' +
      '<i class="oth-neb"></i>' +
      '<i class="oth-dust"></i>' +
      PURPLE_GEMS.map((g) =>
        '<i class="oth-gem" style="left:' + g.x + '%;top:' + g.y + '%;width:' + g.s + 'px;height:' + g.s + 'px" ' +
        'data-dur="' + g.dur + '" data-dl="' + g.dl + '" data-dx="' + g.dx + '" data-dy="' + g.dy + '" data-rot="' + g.rot + '">' +
        PURPLE_GEM_SVG + '</i>'
      ).join('') +
      PURPLE_SPARKS.map((p) =>
        '<i class="oth-sp" style="left:' + p.x + '%;top:' + p.y + '%;width:' + p.s + 'px;height:' + p.s + 'px" ' +
        'data-dur="' + p.dur + '" data-dl="' + p.dl + '">' + PURPLE_SPARK_SVG + '</i>'
      ).join('') +
    '</span>'
  );
}

/* Quản lý hiệu ứng của lịch: mọi animation được ghi lại để
   - hủy hết khi vẽ lại lịch (không chồng animation cũ lên mới),
   - tạm dừng khi lịch không hiện trên màn hình / chuyển tab / ẩn ứng dụng, chạy tiếp khi quay lại.
   Nhờ vậy trình duyệt không phải vẽ liên tục những thứ không ai nhìn thấy => hết giật, hết nháy màn. */
const FX = { anims: [], onScreen: true, bound: false };
function fxShouldRun() { return FX.onScreen && document.visibilityState === 'visible'; }
function fxAnim(el, keyframes, opts) {
  const a = el.animate(keyframes, opts);
  FX.anims.push(a);
  if (!fxShouldRun()) { try { a.pause(); } catch (e) {} }
  return a;
}
function fxSync() {
  const run = fxShouldRun();
  FX.anims.forEach((a) => { try { if (run) { if (a.playState === 'paused') a.play(); } else if (a.playState === 'running') a.pause(); } catch (e) {} });
}
function fxReset() {
  FX.anims.forEach((a) => { try { a.cancel(); } catch (e) {} });
  FX.anims = [];
}
function fxBind() {
  if (FX.bound) return;
  FX.bound = true;
  document.addEventListener('visibilitychange', fxSync);
  const box = $('kMonths');
  if (box && 'IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      FX.onScreen = entries.some((en) => en.isIntersecting);
      fxSync();
    }).observe(box);
  }
}
// Viền sáng "thở": chỉ đổi độ mờ (opacity) của một lớp sáng cố định, không vẽ lại bóng đổ mỗi khung hình
function glowPulse(cell, duration) {
  const g = cell.querySelector('.wm-glow');
  if (!g) return;
  fxAnim(g, [{ opacity: 0.25 }, { opacity: 1 }], { duration: duration, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
}

function animateMarkedCells(root) {
  const container = root || $('kMonths');
  if (!container) return;
  const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  fxReset();

  // Nhiều ngày có hiệu ứng (hoặc màn hình điện thoại): bớt một nửa hạt bay trong mỗi ô cho nhẹ máy
  const fxCells = container.querySelectorAll('.wm-d.m-her, .wm-d.m-blue, .wm-d.m-red, .wm-d.m-amber, .wm-d.m-purple');
  if (fxCells.length > 6 || window.innerWidth < 520) {
    fxCells.forEach((cell) => {
      cell.querySelectorAll('.her-h, .wf-ember, .red-st, .amb-bf, .oth-gem, .oth-sp').forEach((el, i) => {
        if (i % 2) el.remove();
      });
    });
  }

  // 1. Hiệu ứng trái tim bay cho các ô "Her" (m-her)
  const hearts = container.querySelectorAll('.wm-d.m-her .her-h');
  hearts.forEach((h) => {
    if (!h.animate || reduce) {
      h.style.opacity = '0.75';
      h.style.bottom = '35%';
      return;
    }
    const dur = parseFloat(h.getAttribute('data-dur')) || 3000;
    const dl = parseFloat(h.getAttribute('data-dl')) || 0;
    const dx = parseFloat(h.getAttribute('data-dx')) || 4;
    const pk = parseFloat(h.getAttribute('data-pk')) || 0.9;

    fxAnim(h, [
      { transform: 'translate3d(0px, 8px, 0) scale(0.45)', opacity: 0, offset: 0 },
      { transform: 'translate3d(' + (dx * 0.5).toFixed(1) + 'px, -8px, 0) scale(0.95)', opacity: pk, offset: 0.25 },
      { transform: 'translate3d(' + (-dx * 0.6).toFixed(1) + 'px, -26px, 0) scale(1.08)', opacity: pk * 0.9, offset: 0.6 },
      { transform: 'translate3d(' + (dx * 0.3).toFixed(1) + 'px, -44px, 0) scale(0.85)', opacity: pk * 0.45, offset: 0.85 },
      { transform: 'translate3d(0px, -56px, 0) scale(0.55)', opacity: 0, offset: 1 }
    ], {
      duration: dur,
      delay: dl,
      iterations: Infinity,
      easing: 'ease-in-out'
    });
  });

  container.querySelectorAll('.wm-d.m-her').forEach((cell) => {
    if (!cell.animate || reduce) return;
    glowPulse(cell, 2200);
  });

  // 2. Hiệu ứng lửa xanh dương ở thanh dưới cho các ô "Công việc" (m-blue)
  container.querySelectorAll('.wm-d.m-blue').forEach((cell) => {
    if (!cell.animate || reduce) return;

    const botOuter = cell.querySelector('.wf-outer');
    const botMid = cell.querySelector('.wf-mid');
    const botInner = cell.querySelector('.wf-inner');

    if (botOuter) {
      fxAnim(botOuter, [
        { transform: 'scale(1, 1) skewX(0deg) translateY(0px)' },
        { transform: 'scale(1.06, 1.18) skewX(-5deg) translateY(-1px)', offset: 0.34 },
        { transform: 'scale(0.96, 0.90) skewX(5deg) translateY(1px)', offset: 0.70 },
        { transform: 'scale(1, 1) skewX(0deg) translateY(0px)' }
      ], { duration: 660, iterations: Infinity, easing: 'ease-in-out' });
    }
    if (botMid) {
      fxAnim(botMid, [
        { transform: 'scale(1, 1) skewX(0deg)' },
        { transform: 'scale(0.95, 1.22) skewX(6deg)', offset: 0.42 },
        { transform: 'scale(1.05, 0.88) skewX(-5deg)', offset: 0.76 },
        { transform: 'scale(1, 1) skewX(0deg)' }
      ], { duration: 540, delay: -180, iterations: Infinity, easing: 'ease-in-out' });
    }
    if (botInner) {
      fxAnim(botInner, [
        { transform: 'scale(1, 1) skewX(0deg)' },
        { transform: 'scale(1.04, 1.25) skewX(-4deg)', offset: 0.45 },
        { transform: 'scale(0.96, 0.86) skewX(4deg)', offset: 0.80 },
        { transform: 'scale(1, 1) skewX(0deg)' }
      ], { duration: 480, delay: -90, iterations: Infinity, easing: 'ease-in-out' });
    }

    cell.querySelectorAll('.wf-ember').forEach((em) => {
      const dur = parseFloat(em.getAttribute('data-dur')) || 700;
      const dl = parseFloat(em.getAttribute('data-dl')) || 0;
      const dx = parseFloat(em.getAttribute('data-dx')) || 4;
      const dy = parseFloat(em.getAttribute('data-dy')) || -18;
      fxAnim(em, [
        { transform: 'translate3d(0, 0, 0) scale(0.45)', opacity: 0, offset: 0 },
        { transform: 'translate3d(' + (dx * 0.5).toFixed(1) + 'px, ' + (dy * 0.45).toFixed(1) + 'px, 0) scale(1.08)', opacity: 0.95, offset: 0.38 },
        { transform: 'translate3d(' + dx + 'px, ' + dy + 'px, 0) scale(0.25)', opacity: 0, offset: 1 }
      ], { duration: dur, delay: dl, iterations: Infinity, easing: 'ease-out' });
    });

    glowPulse(cell, 880);
  });

  // 3. Hiệu ứng ngôi sao đỏ viền trắng trên nền caro đỏ-hồng cho các ô "Quan trọng" (m-red)
  container.querySelectorAll('.wm-d.m-red').forEach((cell) => {
    if (!cell.animate || reduce) return;

    const grid = cell.querySelector('.red-grid');
    if (grid) {
      fxAnim(grid, [
        { transform: 'translate3d(0px, 0px, 0)' },
        { transform: 'translate3d(-12px, -12px, 0)' }
      ], { duration: 4200, iterations: Infinity, easing: 'linear' });
    }

    cell.querySelectorAll('.red-st').forEach((st) => {
      const dur = parseFloat(st.getAttribute('data-dur')) || 3200;
      const dl = parseFloat(st.getAttribute('data-dl')) || 0;
      const dx = parseFloat(st.getAttribute('data-dx')) || 8;
      const dy = parseFloat(st.getAttribute('data-dy')) || -14;
      const rot = parseFloat(st.getAttribute('data-rot')) || 160;

      fxAnim(st, [
        { transform: 'translate3d(0px, 0px, 0) rotate(0deg) scale(0.55)', opacity: 0, offset: 0 },
        { transform: 'translate3d(' + (dx * 0.35).toFixed(1) + 'px, ' + (dy * 0.35).toFixed(1) + 'px, 0) rotate(' + (rot * 0.35).toFixed(0) + 'deg) scale(1.06)', opacity: 1, offset: 0.28 },
        { transform: 'translate3d(' + (dx * 0.75).toFixed(1) + 'px, ' + (dy * 0.75).toFixed(1) + 'px, 0) rotate(' + (rot * 0.75).toFixed(0) + 'deg) scale(0.95)', opacity: 0.92, offset: 0.72 },
        { transform: 'translate3d(' + dx + 'px, ' + dy + 'px, 0) rotate(' + rot + 'deg) scale(0.5)', opacity: 0, offset: 1 }
      ], { duration: dur, delay: dl, iterations: Infinity, easing: 'ease-in-out' });
    });

    glowPulse(cell, 1800);
  });

  // 4. Hiệu ứng đàn bướm vàng kim phát sáng bay lượn cho các ô "Hẹn / nhắc" (m-amber)
  container.querySelectorAll('.wm-d.m-amber').forEach((cell) => {
    if (!cell.animate || reduce) return;

    cell.querySelectorAll('.amb-bf').forEach((bf) => {
      const dur = parseFloat(bf.getAttribute('data-dur')) || 3200;
      const dl = parseFloat(bf.getAttribute('data-dl')) || 0;
      const dx = parseFloat(bf.getAttribute('data-dx')) || 8;
      const dy = parseFloat(bf.getAttribute('data-dy')) || -44;
      const rot = parseFloat(bf.getAttribute('data-rot')) || -14;
      const flap = parseFloat(bf.getAttribute('data-flap')) || 270;

      // Chuyển động bay lượn mềm mại và tỏa sáng
      fxAnim(bf, [
        { transform: 'translate3d(0px, 6px, 0) rotate(' + rot + 'deg) scale(0.45)', opacity: 0, offset: 0 },
        { transform: 'translate3d(' + (dx * 0.55).toFixed(1) + 'px, ' + (dy * 0.32).toFixed(1) + 'px, 0) rotate(' + (-rot * 0.6).toFixed(1) + 'deg) scale(1.05)', opacity: 1, offset: 0.28 },
        { transform: 'translate3d(' + (-dx * 0.45).toFixed(1) + 'px, ' + (dy * 0.68).toFixed(1) + 'px, 0) rotate(' + (rot * 0.8).toFixed(1) + 'deg) scale(0.96)', opacity: 0.92, offset: 0.68 },
        { transform: 'translate3d(' + (dx * 0.3).toFixed(1) + 'px, ' + dy + 'px, 0) rotate(' + (-rot * 0.4).toFixed(1) + 'deg) scale(0.5)', opacity: 0, offset: 1 }
      ], { duration: dur, delay: dl, iterations: Infinity, easing: 'ease-in-out' });

      // Vẫy cánh bướm liên tục
      const wings = bf.querySelector('svg');
      if (wings) {
        fxAnim(wings, [
          { transform: 'scaleX(1)' },
          { transform: 'scaleX(0.32)' }
        ], { duration: flap, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
      }
    });

    glowPulse(cell, 2000);
  });

  // 5. Hiệu ứng tinh vân tím + pha lê thạch anh tím + tia lấp lánh cho các ô "Khác" (m-purple)
  container.querySelectorAll('.wm-d.m-purple').forEach((cell) => {
    if (!cell.animate || reduce) return;

    const neb = cell.querySelector('.oth-neb');
    if (neb) {
      fxAnim(neb, [
        { transform: 'rotate(0deg) scale(1)' },
        { transform: 'rotate(180deg) scale(1.12)' },
        { transform: 'rotate(360deg) scale(1)' }
      ], { duration: 14000, iterations: Infinity, easing: 'linear' });
    }
    const dust = cell.querySelector('.oth-dust');
    if (dust) {
      fxAnim(dust, [
        { opacity: 0.45, transform: 'translate3d(0, 0, 0)' },
        { opacity: 0.9, transform: 'translate3d(-3px, -4px, 0)' }
      ], { duration: 2600, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
    }

    cell.querySelectorAll('.oth-gem').forEach((g) => {
      const dur = parseFloat(g.getAttribute('data-dur')) || 3800;
      const dl = parseFloat(g.getAttribute('data-dl')) || 0;
      const dx = parseFloat(g.getAttribute('data-dx')) || 4;
      const dy = parseFloat(g.getAttribute('data-dy')) || -30;
      const rot = parseFloat(g.getAttribute('data-rot')) || 20;
      fxAnim(g, [
        { transform: 'translate3d(0px, 4px, 0) rotate(0deg) scale(0.5)', opacity: 0, offset: 0 },
        { transform: 'translate3d(' + (dx * 0.4).toFixed(1) + 'px, ' + (dy * 0.3).toFixed(1) + 'px, 0) rotate(' + (rot * 0.4).toFixed(0) + 'deg) scale(1.05)', opacity: 1, offset: 0.3 },
        { transform: 'translate3d(' + (-dx * 0.3).toFixed(1) + 'px, ' + (dy * 0.7).toFixed(1) + 'px, 0) rotate(' + (-rot * 0.3).toFixed(0) + 'deg) scale(0.95)', opacity: 0.9, offset: 0.7 },
        { transform: 'translate3d(' + dx + 'px, ' + dy + 'px, 0) rotate(' + rot + 'deg) scale(0.55)', opacity: 0, offset: 1 }
      ], { duration: dur, delay: dl, iterations: Infinity, easing: 'ease-in-out' });
    });

    cell.querySelectorAll('.oth-sp').forEach((sp) => {
      const dur = parseFloat(sp.getAttribute('data-dur')) || 2000;
      const dl = parseFloat(sp.getAttribute('data-dl')) || 0;
      fxAnim(sp, [
        { transform: 'scale(0) rotate(0deg)', opacity: 0 },
        { transform: 'scale(1.15) rotate(45deg)', opacity: 1, offset: 0.45 },
        { transform: 'scale(0.6) rotate(80deg)', opacity: 0.5, offset: 0.7 },
        { transform: 'scale(0) rotate(90deg)', opacity: 0 }
      ], { duration: dur, delay: dl, iterations: Infinity, easing: 'ease-in-out' });
    });

    glowPulse(cell, 2400);
  });
}

const MONTH_NAMES = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

function initCal() {
  if (!document.getElementById('wm-cal-single-style')) {
    const st = document.createElement('style');
    st.id = 'wm-cal-single-style';
    st.textContent = `
      /* Thanh chọn tháng & danh sách 12 tháng */
      .wm-yr {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
      }
      .wm-msel,
      .wm-ysel {
        width: auto !important;
        padding: 7px 12px !important;
        font-size: 14.5px !important;
        font-weight: 800;
        border-radius: 12px !important;
        background: var(--card);
        color: var(--text);
        border: 1px solid var(--line);
        cursor: pointer;
      }
      .wm-mpills {
        display: grid;
        grid-template-columns: repeat(6, minmax(0, 1fr));
        gap: 6px;
        margin: 0 0 14px;
      }
      .wm-mpills .chip {
        padding: 7px 6px;
        font-size: 12.5px;
        text-align: center;
        justify-content: center;
        border-radius: 11px;
      }
      .wm-mpills .chip.on {
        background: var(--accent);
        border-color: var(--accent);
        color: #fff;
        font-weight: 800;
        box-shadow: 0 3px 10px rgba(102, 174, 232, .28);
      }
      @media (max-width: 520px) {
        .wm-mpills {
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 5px;
        }
        .wm-mpills .chip {
          font-size: 12px;
          padding: 6px 4px;
        }
      }

      /* Bố cục lịch 1 tháng với các ô ngày hình vuông bo góc */
      #kMonths {
        grid-template-columns: 1fr;
        max-width: 460px;
        margin: 0 auto 16px;
      }
      #kMonths .wm-mon {
        padding: 16px 16px 15px;
        border-radius: 22px;
      }
      #kMonths .wm-mon h4 {
        font-size: 16px;
        margin-bottom: 12px;
        text-align: center;
      }
      #kMonths .wm-wd,
      #kMonths .wm-dg {
        gap: 7px;
      }
      #kMonths .wm-dv {
        aspect-ratio: 1 / 1;
        border-radius: 13px;
        background: rgba(200, 224, 244, .18);
        border: 1px dashed rgba(180, 210, 236, .35);
      }
      html[data-theme="dark"] #kMonths .wm-dv {
        background: rgba(25, 45, 68, .25);
        border-color: rgba(55, 88, 125, .35);
      }
      #kMonths .wm-d {
        aspect-ratio: 1 / 1 !important;
        height: auto !important;
        border-radius: 13px;
        font-size: 14px;
        font-weight: 700;
        overflow: hidden;
        isolation: isolate;
      }
      /* Chỉ áp màu nền mặc định cho ô ngày CHƯA đánh dấu để các ngày có nhãn hiện đúng màu của nhãn */
      #kMonths .wm-d:not([class*="m-"]) {
        border: 1px solid rgba(205, 226, 245, .75);
        background: rgba(246, 251, 255, .85);
      }
      html[data-theme="dark"] #kMonths .wm-d:not([class*="m-"]) {
        background: rgba(22, 39, 60, .85);
        border-color: rgba(45, 75, 108, .75);
      }

      /* Mỗi nhãn có nền và hiệu ứng riêng */
      /* Riêng nhãn "Quan trọng" (.m-red) dùng nền caro đỏ-hồng + các ngôi sao đỏ viền trắng phát sáng theo clip mẫu */
      #kMonths .wm-d.m-red {
        background: #e63939 !important;
        border: 1.5px solid #ff5252 !important;
        color: #ffffff !important;
      }
      #kMonths .wm-d.m-red > span:not(.red-fx) {
        color: #ffffff !important;
        font-weight: 850;
        text-shadow: 0 1px 3px rgba(120, 0, 0, .95), 0 0 8px rgba(180, 0, 10, .85), 0 0 2px #fff;
      }
      #kMonths .wm-d.m-red.has::after {
        background: #ffffff !important;
        box-shadow: 0 0 6px #ffffff;
        z-index: 2;
      }
      .red-fx {
        position: absolute;
        inset: 0;
        pointer-events: none;
        overflow: hidden;
        z-index: 1;
        border-radius: inherit;
      }
      .red-grid {
        position: absolute;
        inset: -14px;
        background-color: #f46868;
        background-image:
          linear-gradient(180deg, rgba(165, 8, 14, .62) 0%, rgba(215, 28, 32, .18) 45%, rgba(255, 130, 130, .08) 100%),
          repeating-conic-gradient(#ea3b3b 0% 25%, #f77e7e 0% 50%);
        background-size: 100% 100%, 12px 12px;
        will-change: transform;
      }
      .red-st {
        position: absolute;
        display: block;
        opacity: 0;
        will-change: transform, opacity;
        filter: drop-shadow(0 0 2.5px rgba(255, 255, 255, .95)) drop-shadow(0 0 6px rgba(255, 220, 220, .8));
      }
      .red-st svg {
        width: 100%;
        height: 100%;
        display: block;
      }
      /* Nhãn "Hẹn / nhắc" (.m-amber): Nền đêm ánh vàng kim + đàn bướm vàng phát sáng theo ảnh mẫu */
      #kMonths .wm-d.m-amber {
        background: radial-gradient(circle at 50% 58%, #261b06 0%, #110b02 65%, #050300 100%) !important;
        border: 1.5px solid rgba(247, 192, 75, .80) !important;
        color: #fff8e3 !important;
      }
      #kMonths .wm-d.m-amber > span:not(.amber-fx) {
        color: #fff9e6 !important;
        font-weight: 800;
        text-shadow: 0 0 6px rgba(255, 208, 90, .95), 0 0 14px rgba(235, 160, 25, .85);
      }
      #kMonths .wm-d.m-amber.has::after {
        background: #ffe89e !important;
        box-shadow: 0 0 6px #f7b733;
        z-index: 2;
      }
      .amber-fx {
        position: absolute;
        inset: 0;
        pointer-events: none;
        overflow: hidden;
        z-index: 1;
        border-radius: inherit;
      }
      .amb-bf {
        position: absolute;
        display: block;
        opacity: 0;
        will-change: transform, opacity;
        filter: drop-shadow(0 0 3px rgba(255, 236, 160, .98)) drop-shadow(0 0 8px rgba(240, 172, 40, .88));
      }
      .amb-bf svg {
        width: 100%;
        height: 100%;
        display: block;
        overflow: visible;
      }
      .amb-bf svg {
        transform-origin: 50% 50%;
      }
      .wm-legend .c-amber.is-pixel,
      .wm-ui .c-amber.is-pixel,
      .wm-cols .c-amber b.is-pixel {
        width: 16px !important;
        height: 14px !important;
        border-radius: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
        display: inline-flex !important;
        align-items: center;
        justify-content: center;
        vertical-align: -2px;
        filter: drop-shadow(0 0 3px rgba(245, 175, 35, .92)) drop-shadow(0 0 7px rgba(255, 220, 110, .75));
      }
      .wm-legend .c-amber.is-pixel svg,
      .wm-ui .c-amber.is-pixel svg,
      .wm-cols .c-amber b.is-pixel svg {
        width: 100%;
        height: 100%;
        display: block;
      }
      /* Nhãn "Khác" (.m-purple): Nền tinh vân tím xoay chậm + pha lê thạch anh tím trôi + tia sáng lấp lánh */
      #kMonths .wm-d.m-purple {
        background: radial-gradient(circle at 50% 55%, #2a1052 0%, #150630 62%, #08021a 100%) !important;
        border: 1.5px solid rgba(178, 128, 255, .80) !important;
        color: #f3eaff !important;
      }
      #kMonths .wm-d.m-purple > span:not(.oth-fx) {
        color: #f7f0ff !important;
        font-weight: 800;
        text-shadow: 0 0 6px rgba(190, 140, 255, .95), 0 0 14px rgba(130, 60, 255, .85);
      }
      #kMonths .wm-d.m-purple.has::after {
        background: #e2d0ff !important;
        box-shadow: 0 0 6px #a970ff;
        z-index: 2;
      }
      /* Lớp sáng viền của các ô có hiệu ứng (chỉ animate opacity => nhẹ, không giật) */
      .wm-glow {
        position: absolute;
        inset: 0;
        z-index: 1;
        pointer-events: none;
        border-radius: inherit;
        opacity: .6;
        box-shadow: inset 0 0 14px var(--glow-in, rgba(255, 255, 255, .3));
        will-change: opacity;
      }
      #kMonths .wm-d.m-red    { --glow-in: rgba(255, 255, 255, .30); box-shadow: 0 0 10px rgba(245, 50, 60, .55); }
      #kMonths .wm-d.m-blue   { --glow-in: rgba(75, 195, 255, .55);  box-shadow: 0 0 10px rgba(45, 150, 255, .58); }
      #kMonths .wm-d.m-amber  { --glow-in: rgba(255, 210, 95, .34);  box-shadow: 0 0 11px rgba(250, 200, 90, .55); }
      #kMonths .wm-d.m-purple { --glow-in: rgba(214, 180, 255, .34); box-shadow: 0 0 11px rgba(160, 100, 255, .58); }
      #kMonths .wm-d.m-her    { --glow-in: rgba(255, 105, 224, .36); box-shadow: 0 0 11px rgba(255, 95, 220, .52); }
      .oth-fx {
        position: absolute;
        inset: 0;
        pointer-events: none;
        overflow: hidden;
        z-index: 1;
        border-radius: inherit;
      }
      .oth-neb {
        position: absolute;
        inset: -35%;
        background:
          radial-gradient(circle at 30% 35%, rgba(196, 92, 255, .55) 0%, rgba(196, 92, 255, 0) 32%),
          radial-gradient(circle at 70% 60%, rgba(90, 110, 255, .45) 0%, rgba(90, 110, 255, 0) 34%),
          radial-gradient(circle at 45% 78%, rgba(255, 110, 220, .30) 0%, rgba(255, 110, 220, 0) 28%);
        will-change: transform;
      }
      .oth-dust {
        position: absolute;
        inset: 0;
        background-image:
          radial-gradient(1px 1px at 18% 28%, #fff 50%, transparent 51%),
          radial-gradient(1px 1px at 62% 18%, #e9dcff 50%, transparent 51%),
          radial-gradient(1px 1px at 82% 44%, #fff 50%, transparent 51%),
          radial-gradient(1px 1px at 34% 82%, #d8c4ff 50%, transparent 51%),
          radial-gradient(1px 1px at 72% 86%, #fff 50%, transparent 51%),
          radial-gradient(1px 1px at 8% 62%, #e9dcff 50%, transparent 51%);
        opacity: .6;
        will-change: transform, opacity;
      }
      .oth-gem {
        position: absolute;
        display: block;
        opacity: 0;
        will-change: transform, opacity;
        filter: drop-shadow(0 0 2.5px rgba(230, 210, 255, .95)) drop-shadow(0 0 7px rgba(150, 80, 255, .85));
      }
      .oth-sp {
        position: absolute;
        display: block;
        opacity: 0;
        margin: -3px 0 0 -3px;
        will-change: transform, opacity;
        filter: drop-shadow(0 0 3px rgba(255, 255, 255, .95)) drop-shadow(0 0 6px rgba(185, 130, 255, .9));
      }
      .oth-gem svg,
      .oth-sp svg {
        width: 100%;
        height: 100%;
        display: block;
        overflow: visible;
      }
      .wm-legend .c-purple.is-pixel,
      .wm-ui .c-purple.is-pixel,
      .wm-cols .c-purple b.is-pixel {
        width: 15px !important;
        height: 13px !important;
        border-radius: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
        display: inline-flex !important;
        align-items: center;
        justify-content: center;
        vertical-align: -2px;
        filter: drop-shadow(0 0 3px rgba(150, 80, 255, .92)) drop-shadow(0 0 7px rgba(200, 160, 255, .75));
      }
      .wm-legend .c-purple.is-pixel svg,
      .wm-ui .c-purple.is-pixel svg,
      .wm-cols .c-purple b.is-pixel svg {
        width: 100%;
        height: 100%;
        display: block;
      }

      /* Hỗ trợ chế độ Tối (Dark Mode) cho các ô màu nhãn để vẫn nổi rõ màu của nhãn */


      #kMonths .wm-d > span:not(.her-fx):not(.work-fx):not(.red-fx):not(.amber-fx):not(.oth-fx):not(.wm-glow) {
        position: relative;
        z-index: 2;
      }
      @media (max-width: 520px) {
        #kMonths .wm-wd,
        #kMonths .wm-dg { gap: 5px; }
        #kMonths .wm-d,
        #kMonths .wm-dv { border-radius: 11px; font-size: 13px; }
      }

      /* 1) Nhãn & hiệu ứng "Công việc" (.m-blue): Lửa xanh dương cháy ở thanh dưới */
      #kMonths .wm-d.m-blue {
        background: radial-gradient(circle at 50% 92%, #0c2b5e 0%, #061530 58%, #030914 100%) !important;
        border: 1.5px solid rgba(58, 168, 255, .82) !important;
        color: #eaf8ff !important;
      }
      #kMonths .wm-d.m-blue > span:not(.work-fx) {
        color: #f0faff !important;
        font-weight: 800;
        text-shadow: 0 0 6px rgba(56, 178, 255, .95), 0 0 14px rgba(20, 108, 255, .88);
      }
      #kMonths .wm-d.m-blue.has::after {
        background: #b8f2ff !important;
        box-shadow: 0 0 6px #38a8ff;
        z-index: 2;
      }
      .work-fx {
        position: absolute;
        inset: 0;
        pointer-events: none;
        overflow: hidden;
        z-index: 1;
        border-radius: inherit;
      }
      .wf-svg.wf-bot {
        position: absolute;
        transform-origin: 50% 100%;
        left: -2%;
        right: -2%;
        bottom: -2px;
        width: 104%;
        height: 54%;
        display: block;
      }
      .wf-svg.wf-outer {
        filter: drop-shadow(0 -2px 5px rgba(32, 145, 255, .9));
      }
      .wf-ember {
        position: absolute;
        border-radius: 50%;
        background: #45b6ff;
        box-shadow: 0 0 5px #1e88ff;
        opacity: 0;
        will-change: transform, opacity;
      }
      .wf-ember.c {
        background: #caf6ff;
        box-shadow: 0 0 6px #58c8ff;
      }
      .wm-legend .c-blue.is-pixel,
      .wm-ui .c-blue.is-pixel,
      .wm-cols .c-blue b.is-pixel {
        width: 14px !important;
        height: 16px !important;
        border-radius: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
        display: inline-flex !important;
        align-items: center;
        justify-content: center;
        vertical-align: -3px;
        filter: drop-shadow(0 0 3px rgba(30, 130, 255, .9)) drop-shadow(0 0 7px rgba(85, 195, 255, .75));
      }
      .wm-legend .c-blue.is-pixel svg,
      .wm-ui .c-blue.is-pixel svg,
      .wm-cols .c-blue b.is-pixel svg {
        width: 100%;
        height: 100%;
        display: block;
      }

      /* 2) Nhãn màu & hiệu ứng "Her" (Trái tim hồng Pixel phát sáng trên nền đêm) */
      .c-her {
        --mc: #ff5cd6;
        --mb: #1e0726;
      }
      .wm-legend .c-red.is-pixel,
      .wm-ui .c-red.is-pixel,
      .wm-cols .c-red b.is-pixel,
      .wm-legend .c-her.is-pixel,
      .wm-ui .c-her.is-pixel,
      .wm-cols .c-her b.is-pixel {
        width: 15px !important;
        height: 14px !important;
        border-radius: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
        display: inline-flex !important;
        align-items: center;
        justify-content: center;
        vertical-align: -2px;
        filter: drop-shadow(0 0 4px rgba(255, 92, 214, .95)) drop-shadow(0 0 8px rgba(235, 30, 180, .75));
      }
      .wm-legend .c-red.is-pixel,
      .wm-ui .c-red.is-pixel,
      .wm-cols .c-red b.is-pixel {
        width: 15px !important;
        height: 15px !important;
        filter: drop-shadow(0 0 3px rgba(239, 29, 38, .85)) drop-shadow(0 0 6px rgba(255, 120, 120, .65));
      }
      .wm-legend .c-red.is-pixel svg,
      .wm-ui .c-red.is-pixel svg,
      .wm-cols .c-red b.is-pixel svg,
      .wm-legend .c-her.is-pixel svg,
      .wm-ui .c-her.is-pixel svg,
      .wm-cols .c-her b.is-pixel svg {
        width: 100%;
        height: 100%;
        display: block;
      }
      .wm-cols button.c-her {
        background: linear-gradient(145deg, #1b0622 0%, #2a0a36 100%) !important;
        color: #ff9ef0 !important;
        border-color: rgba(255, 92, 214, .45);
        text-shadow: 0 0 8px rgba(255, 92, 214, .55);
      }
      .wm-cols button.c-her.on {
        border-color: #ff6ee0 !important;
        box-shadow: 0 0 12px rgba(255, 92, 214, .55), inset 0 0 8px rgba(255, 92, 214, .25) !important;
      }

      /* Ô ngày được đánh dấu "Her" */
      #kMonths .wm-d.m-her {
        background: radial-gradient(circle at 50% 65%, #2b0938 0%, #14031c 70%, #09010d 100%) !important;
        border: 1.5px solid rgba(255, 92, 214, .65) !important;
        color: #ffe3fa !important;
      }
      #kMonths .wm-d.m-her > span:not(.her-fx) {
        color: #ffe6fb !important;
        font-weight: 800;
        text-shadow: 0 0 6px rgba(255, 92, 214, .95), 0 0 14px rgba(255, 70, 205, .75);
      }
      #kMonths .wm-d.m-her.has::after {
        background: #ff85e4 !important;
        box-shadow: 0 0 6px #ff5cd6;
        z-index: 2;
      }
      .her-fx {
        position: absolute;
        inset: 0;
        pointer-events: none;
        overflow: hidden;
        z-index: 1;
        border-radius: inherit;
      }
      .her-h {
        position: absolute;
        bottom: -8px;
        display: block;
        opacity: 0;
        will-change: transform, opacity;
        filter: drop-shadow(0 0 3px rgba(255, 105, 224, .95)) drop-shadow(0 0 7px rgba(235, 30, 180, .85));
      }
      .her-h svg {
        width: 100%;
        height: 100%;
        display: block;
      }
    `;
    document.head.appendChild(st);
  }

  const curY = new Date().getFullYear();
  let yearOpts = '';
  for (let y = curY - 5; y <= curY + 5; y++) {
    yearOpts += '<option value="' + y + '">Năm ' + y + '</option>';
  }

  $('wm-cal').innerHTML =
    '<div class="wm-bar wm-calbar">' +
      '<div class="wm-yr">' +
        '<button class="wm-ib" data-c="prev" type="button" aria-label="Tháng trước" title="Tháng trước">‹</button>' +
        '<select id="kMonthSel" class="wm-msel" aria-label="Chọn tháng">' +
          MONTH_NAMES.map((name, i) => '<option value="' + i + '">' + name + '</option>').join('') +
        '</select>' +
        '<select id="kYearSel" class="wm-ysel" aria-label="Chọn năm">' + yearOpts + '</select>' +
        '<button class="wm-ib" data-c="next" type="button" aria-label="Tháng sau" title="Tháng sau">›</button>' +
      '</div>' +
      '<button class="chip" data-c="today" type="button">Hôm nay</button>' +
    '</div>' +
    '<div class="wm-mpills" id="kMonthPills">' +
      MONTH_NAMES.map((name, i) => '<button type="button" class="chip" data-m="' + i + '">' + name + '</button>').join('') +
    '</div>' +
    '<div class="wm-legend" id="kLegend">' + MARKS.map((m) => '<span>' + markDotHtml(m[0]) + m[1] + '</span>').join('') + '<em>Bấm vào một ngày để đánh dấu và ghi chú</em></div>' +
    '<div class="wm-months" id="kMonths"></div><div class="card wm-up" id="kList"></div>';

  $('kMonthSel').addEventListener('change', (e) => {
    setMonthYear(K.year, parseInt(e.target.value, 10));
  });
  $('kYearSel').addEventListener('change', (e) => {
    setMonthYear(parseInt(e.target.value, 10), K.month);
  });

  $('wm-cal').addEventListener('click', (e) => {
    const mb = e.target.closest('[data-m]');
    if (mb) {
      setMonthYear(K.year, parseInt(mb.getAttribute('data-m'), 10));
      return;
    }
    const b = e.target.closest('[data-c]');
    if (b) {
      const a = b.getAttribute('data-c');
      if (a === 'prev') {
        let ny = K.year, nm = K.month - 1;
        if (nm < 0) { nm = 11; ny -= 1; }
        setMonthYear(ny, nm);
      } else if (a === 'next') {
        let ny = K.year, nm = K.month + 1;
        if (nm > 11) { nm = 0; ny += 1; }
        setMonthYear(ny, nm);
      } else if (a === 'today') {
        syncCurrentMonth();
        loadCal(true).then(() => {
          const t = document.querySelector('.wm-d.today');
          if (t) t.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      }
      return;
    }
    const d = e.target.closest('[data-day]'); if (d) openDay(d.getAttribute('data-day'));
  });
}

function syncMonthControls() {
  const ms = $('kMonthSel'), ys = $('kYearSel'), pills = $('kMonthPills');
  if (ms) ms.value = String(K.month);
  if (ys) {
    if (!ys.querySelector('option[value="' + K.year + '"]')) {
      const opt = document.createElement('option');
      opt.value = String(K.year);
      opt.textContent = 'Năm ' + K.year;
      ys.appendChild(opt);
    }
    ys.value = String(K.year);
  }
  if (pills) {
    Array.prototype.forEach.call(pills.children, (btn) => {
      btn.classList.toggle('on', parseInt(btn.getAttribute('data-m'), 10) === K.month);
    });
  }
}

async function setMonthYear(y, m) {
  K.year = y;
  K.month = m;
  await loadCal();
}

async function loadCal(force) {
  const ym = K.year + '-' + pad2(K.month + 1);
  const dim = new Date(Date.UTC(K.year, K.month + 1, 0)).getUTCDate();
  syncMonthControls();
  if (K.loadedYm === ym && !force) { renderCal(); return; }
  K.days = {}; renderCal();
  try {
    const rows = must(await C.sb.from('cal_days').select('*').gte('day', ym + '-01').lte('day', ym + '-' + pad2(dim)).order('day'));
    K.days = {}; rows.forEach((r) => { K.days[r.day] = normalizeCalRow(r); });
    K.loadedYm = ym; renderCal();
  } catch (e) { fail(e); }
}

function renderCal() {
  const m = K.month, ym = K.year + '-' + pad2(m + 1);
  syncMonthControls();
  const today = todayStr(), now = new Date();
  const first = (new Date(Date.UTC(K.year, m, 1)).getUTCDay() + 6) % 7, dim = new Date(Date.UTC(K.year, m + 1, 0)).getUTCDate();
  let cells = '';
  for (let i = 0; i < first; i++) cells += '<i class="wm-dv"></i>';
  for (let d = 1; d <= dim; d++) {
    const key = ym + '-' + pad2(d), x = K.days[key];
    const mark = x && x.mark ? x.mark : '';
    const fxHtml = mark === 'her' ? buildHerFxHtml() : (mark === 'blue' ? buildWorkFireFxHtml() : (mark === 'red' ? buildRedStarFxHtml() : (mark === 'amber' ? buildAmberButterflyFxHtml() : (mark === 'purple' ? buildPurpleNebulaFxHtml() : ''))));
    cells += '<button type="button" class="wm-d' + (key === today ? ' today' : '') + (mark ? ' m-' + mark : '') + (x && x.note ? ' has' : '') + ((first + d - 1) % 7 === 6 ? ' sun' : '') +
      '" data-day="' + key + '"' + (x && x.note ? ' title="' + esc(x.note) + '"' : '') + '>' +
      fxHtml + (fxHtml ? '<i class="wm-glow" aria-hidden="true"></i>' : '') +
      '<span>' + d + '</span></button>';
  }
  const isCurrentMonth = (K.year === now.getFullYear() && m === now.getMonth());
  $('kMonths').innerHTML = '<section class="wm-mon' + (isCurrentMonth ? ' now' : '') + '"><h4>' + MONTH_NAMES[m] + ' năm ' + K.year + '</h4><div class="wm-wd"><i>T2</i><i>T3</i><i>T4</i><i>T5</i><i>T6</i><i>T7</i><i class="sun">CN</i></div><div class="wm-dg">' + cells + '</div></section>';
  fxBind();
  animateMarkedCells($('kMonths'));

  const prefix = ym + '-';
  const list = Object.keys(K.days).filter((k) => k.startsWith(prefix)).sort().map((k) => K.days[k]).filter((x) => x.note || x.mark);
  $('kList').innerHTML = '<h4>Ghi chú và đánh dấu ' + MONTH_NAMES[m].toLowerCase() + '/' + K.year + ' <span>' + list.length + '</span></h4>' + (list.length ? list.map((x) =>
    '<button type="button" class="wm-ui" data-day="' + x.day + '">' + markDotHtml(x.mark || 'none') + '<span class="wm-ud">' + dmy(x.day).slice(0, 5) + ' · ' + DOW_LONG[new Date(x.day + 'T00:00:00').getDay()] + '</span><span class="wm-ut">' +
    (x.note ? esc(x.note.split('\n')[0]) : '<i>' + esc(MARK_LABEL[x.mark] || '') + '</i>') + '</span></button>').join('') :
    '<div class="wm-empty" style="padding:8px 0">Chưa có ngày nào trong ' + MONTH_NAMES[m].toLowerCase() + ' được đánh dấu hoặc ghi chú.</div>');
}
function openDay(day) {
  const dt = new Date(day + 'T00:00:00'), cur = K.days[day] || { mark: '', note: '' };
  let mark = cur.mark || '';
  openDlg('<h2>' + DOW_LONG[dt.getDay()] + ', ' + dmy(day) + '</h2>' +
    '<div class="field"><label>Đánh dấu</label><div class="wm-cols" id="kCols">' + MARKS.map((m) => '<button type="button" class="c-' + m[0] + (mark === m[0] ? ' on' : '') + '" data-col="' + m[0] + '">' + markDotHtml(m[0]) + m[1] + '</button>').join('') + '</div></div>' +
    '<div class="field"><label for="kNote">Ghi chú</label><textarea id="kNote" rows="5" data-autofocus placeholder="Việc cần làm, cuộc hẹn, nhắc nhở…"></textarea></div>' +
    '<div class="prev bad wm-err"></div><div class="twin">' + (K.days[day] ? '<button class="btn danger" data-k="del" type="button">Xóa</button>' : '') + '<button class="btn" data-k="cancel" type="button">Hủy</button><button class="btn primary" data-k="save" type="button">Lưu</button></div>');
  $('kNote').value = cur.note || '';
  $('wmDlg').querySelector('.sheet').onclick = async (e) => {
    const col = e.target.closest('[data-col]');
    if (col) { mark = mark === col.getAttribute('data-col') ? '' : col.getAttribute('data-col'); Array.prototype.forEach.call($('kCols').children, (x) => x.classList.toggle('on', x.getAttribute('data-col') === mark)); return; }
    const b = e.target.closest('[data-k]'); if (!b) return;
    const a = b.getAttribute('data-k');
    if (a === 'cancel') { closeDlg(); return; }
    b.disabled = true;
    try {
      const note = $('kNote').value.trim();
      if (a === 'del' || (!mark && !note)) {
        if (K.days[day]) await track(async () => gotRows(must(await C.sb.from('cal_days').delete().eq('day', day).select('day'))));
        delete K.days[day];
      } else {
        let saved;
        try {
          saved = must(await track(async () => C.sb.from('cal_days').upsert({ user_id: user().id, day, mark, note, updated_at: new Date().toISOString() }, { onConflict: 'user_id,day' }).select().single()));
        } catch (dbErr) {
          // Nếu bảng cal_days trên Supabase có ràng buộc CHECK chỉ cho phép 5 màu cũ, tự động lưu kèm tiền tố [Her]
          if (mark === 'her' && /check constraint|cal_days_mark_check/i.test(String(dbErr && dbErr.message || dbErr))) {
            saved = must(await track(async () => C.sb.from('cal_days').upsert({ user_id: user().id, day, mark: 'purple', note: HER_TAG + note, updated_at: new Date().toISOString() }, { onConflict: 'user_id,day' }).select().single()));
          } else {
            throw dbErr;
          }
        }
        K.days[day] = normalizeCalRow(saved);
      }
      closeDlg(); renderCal(); C.toast('Đã lưu');
    } catch (er) { fail(er); b.disabled = false; }
  };
}

/* =====================================================================
   KIỂM TRA KẾT NỐI & QUYỀN: thử đọc / thêm / sửa / xóa thật trên Supabase và nói rõ chỗ nào bị chặn
===================================================================== */
async function runCheck() {
  const lines = [];
  openDlg('<h2>Kiểm tra kết nối &amp; quyền</h2><p class="hint" style="margin-top:2px">Web sẽ thử đọc, thêm, sửa, xóa một dòng thử và kiểm tra kho ảnh. Dữ liệu thật của bạn không bị xóa.</p><div class="wm-chk" id="chkList"><div class="muted">Đang kiểm tra…</div></div>' +
    '<div class="twin"><button class="btn" data-ck="copy" type="button">Chép kết quả</button><button class="btn primary" data-ck="close" type="button">Đóng</button></div>', { wide: true });
  const draw = () => {
    $('chkList').innerHTML = lines.map((l) => '<div class="wm-ck ' + (l.ok === true ? 'ok' : l.ok === false ? 'bad' : '') + '"><b>' + (l.ok === true ? '✔' : l.ok === false ? '✘' : '•') + '</b><div>' + esc(l.text) +
      (l.hint ? '<small>' + esc(l.hint) + '</small>' : '') + '</div></div>').join('') + (lines.done ? '' : '<div class="muted" style="padding:6px 2px">Đang kiểm tra…</div>');
  };
  const add = (ok, text, hint) => { lines.push({ ok, text, hint }); draw(); };
  const et = (e) => (e && e.message ? e.message : String(e)) + (e && e.code ? ' [' + e.code + ']' : '');
  $('wmDlg').querySelector('.sheet').onclick = (e) => {
    const b = e.target.closest('[data-ck]'); if (!b) return;
    if (b.getAttribute('data-ck') === 'close') closeDlg();
    else copyText('Mục Công việc ' + WORK_VERSION + '\n' + lines.map((l) => (l.ok === true ? '[OK] ' : l.ok === false ? '[LỖI] ' : '- ') + l.text + (l.hint ? ' → ' + l.hint : '')).join('\n')).then(() => C.toast('Đã chép kết quả, hãy dán gửi cho người hỗ trợ'), () => C.toast('Không chép được', true));
  };
  try {
    add(null, 'Phiên bản mục Công việc đang chạy: ' + WORK_VERSION);
    const ur = await C.sb.auth.getUser(), me = ur.data && ur.data.user;
    if (!me) { add(false, 'Chưa đăng nhập hoặc phiên đã hết hạn', 'Đăng xuất rồi đăng nhập lại.'); lines.done = true; draw(); return; }
    add(true, 'Đang đăng nhập bằng: ' + me.email + ' (mã ' + me.id.slice(0, 8) + '…)');

    const rows = await C.sb.from(TBL).select('id,name,user_id').limit(500);
    let mineRows = [];
    if (rows.error) add(false, 'Không đọc được bảng linh kiện: ' + et(rows.error), 'Chạy lại toàn bộ file supabase/work_schema.sql trong Supabase → SQL Editor.');
    else {
      mineRows = rows.data.filter((r) => r.user_id === me.id);
      add(true, 'Đọc được ' + rows.data.length + ' linh kiện (' + mineRows.length + ' thuộc tài khoản này)');
      if (rows.data.length > mineRows.length) add(false, (rows.data.length - mineRows.length) + ' linh kiện thuộc TÀI KHOẢN KHÁC nên không sửa/xóa được', 'Thường do chạy file seed_tu_excel.sql khi có nhiều tài khoản. Cần chuyển các dòng này sang tài khoản của bạn bằng SQL.');
    }

    // thử thêm -> sửa -> xóa một dòng tạm
    let tid = null;
    const ins = await C.sb.from(TBL).insert({ user_id: me.id, grp: 'Khác', name: '__kiem_tra__' }).select('id').maybeSingle();
    if (ins.error || !ins.data) add(false, 'Thêm dòng thử: THẤT BẠI ' + (ins.error ? et(ins.error) : ''), 'Quy tắc bảo mật (RLS) của bảng bị lệch. Hãy chạy file supabase/work_schema.sql trong Supabase → SQL Editor, rồi kiểm tra lại.');
    else {
      tid = ins.data.id; add(true, 'Thêm dòng thử: được');
      const up = await C.sb.from(TBL).update({ name: '__kiem_tra_sua__' }).eq('id', tid).select('id');
      if (up.error || !up.data || !up.data.length) add(false, 'Sửa dòng thử: THẤT BẠI ' + (up.error ? et(up.error) : '(server không báo lỗi nhưng không sửa dòng nào)'), 'Thiếu quyền UPDATE. Hãy chạy file supabase/work_schema.sql.');
      else add(true, 'Sửa dòng thử: được');
      const de = await C.sb.from(TBL).delete().eq('id', tid).select('id');
      if (de.error || !de.data || !de.data.length) add(false, 'Xóa dòng thử: THẤT BẠI ' + (de.error ? et(de.error) : '(server không báo lỗi nhưng không xóa dòng nào)'), 'Thiếu quyền DELETE. Hãy chạy file supabase/work_schema.sql. Nếu còn sót dòng tên "__kiem_tra__", hãy xóa tay trong Table Editor.');
      else add(true, 'Xóa dòng thử: được');
    }
    // thử đúng thao tác "Lưu" thật của web (ghi lại đủ mọi cột với giá trị hiện có) trên một linh kiện thật của bạn
    if (mineRows.length) {
      const r0 = mineRows[0], fr = await C.sb.from(TBL).select('*').eq('id', r0.id).maybeSingle();
      if (fr.error || !fr.data) add(false, 'Không đọc được chi tiết linh kiện "' + r0.name + '": ' + (fr.error ? et(fr.error) : ''), 'Chạy file supabase/work_schema.sql.');
      else {
        const d = fr.data, payload = { grp: d.grp, name: d.name, code: d.code, images: d.images, datasheet_path: d.datasheet_path, datasheet_name: d.datasheet_name,
          datasheet_url: d.datasheet_url, function_text: d.function_text, repair_text: d.repair_text, updated_at: new Date().toISOString() };
        const up2 = await C.sb.from(TBL).update(payload).eq('id', r0.id).select('id');
        if (up2.error || !up2.data || !up2.data.length) add(false, 'Lưu thử linh kiện thật "' + r0.name + '": THẤT BẠI ' + (up2.error ? et(up2.error) : '(không sửa dòng nào)'),
          up2.error && /column|schema cache/i.test(up2.error.message || '') ? 'Bảng thiếu cột. Hãy chạy file supabase/work_schema.sql.' : 'Dòng này có thể không thuộc tài khoản của bạn, hoặc thiếu quyền. Hãy chạy supabase/work_schema.sql.');
        else add(true, 'Lưu thử linh kiện thật "' + r0.name + '" (đủ mọi cột): được');
      }
    }

    // kho ảnh / datasheet
    const path = me.id + '/_kiem_tra_' + Date.now() + '.txt';
    const upl = await C.sb.storage.from(BUCKET).upload(path, new Blob(['ok'], { type: 'text/plain' }), { contentType: 'text/plain', upsert: false });
    if (upl.error) add(false, 'Kho ảnh/datasheet: không tải lên được: ' + et(upl.error), 'Chưa có kho "work-files" hoặc thiếu quyền. Chạy lại supabase/work_schema.sql (mục 5).');
    else {
      const sg = await C.sb.storage.from(BUCKET).createSignedUrl(path, 60);
      await C.sb.storage.from(BUCKET).remove([path]);
      add(!sg.error, sg.error ? 'Kho ảnh/datasheet: tải lên được nhưng không tạo được đường dẫn xem: ' + et(sg.error) : 'Kho ảnh/datasheet: tải lên, xem và xóa đều được');
    }
    // các bảng còn lại
    for (const t of ['machine_passwords', 'cal_days']) {
      const r = await C.sb.from(t).select('*', { count: 'exact', head: true });
      add(!r.error, r.error ? 'Bảng ' + t + ': lỗi ' + et(r.error) : 'Bảng ' + t + ': đọc được (' + (r.count || 0) + ' dòng)', r.error ? 'Chạy lại supabase/work_schema.sql.' : '');
    }
    const bad = lines.filter((l) => l.ok === false).length;
    add(bad === 0, bad === 0 ? 'KẾT LUẬN: mọi thứ đều hoạt động. Nếu nút Sửa/Xóa vẫn không chạy thì lỗi nằm ở trình duyệt, hãy tải lại bằng Ctrl+Shift+R và kiểm tra dòng phiên bản ở trên.' : 'KẾT LUẬN: có ' + bad + ' mục lỗi (đánh dấu ✘ ở trên). Hãy bấm "Chép kết quả" và gửi cho người hỗ trợ.');
  } catch (e) { add(false, 'Lỗi khi kiểm tra: ' + et(e)); }
  lines.done = true; draw();
}
