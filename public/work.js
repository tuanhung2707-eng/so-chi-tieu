// =====================================================================
// MỤC "CÔNG VIỆC" (bản đơn giản) – 3 phần: Linh kiện · Mật khẩu máy · Lịch năm
// Được index.html nạp khi bạn mở mục Công việc lần đầu.
// Cần chạy supabase/work_schema.sql trước (tạo bảng + kho chứa ảnh/datasheet).
// =====================================================================
const BUCKET = 'work-files';
const MAX_FILE = 50 * 1024 * 1024;                 // 50 MB / file (khớp giới hạn của kho chứa)
const GROUPS = ['Diode', 'BJT', 'MOSFET', 'Tụ điện', 'Điện trở', 'IC nguồn', 'IC sạc', 'IC điều khiển', 'Bảo vệ', 'Khác'];
const MARKS = [['red', 'Quan trọng'], ['blue', 'Công việc'], ['green', 'Nghỉ'], ['amber', 'Hẹn / nhắc'], ['purple', 'Khác']];
const WORK_VERSION = 'v4 · 15/10/2026';             // hiện ở cuối mục Công việc để biết bản mới đã được tải chưa
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
  else if (/row-level security|permission denied|not authorized|violates row/i.test(msg)) msg = 'Không có quyền ghi. Hãy chắc là đã chạy file supabase/work_schema.sql và bạn đang đăng nhập đúng tài khoản.';
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
  window.addEventListener('unhandledrejection', (e) => { const m = e.reason && e.reason.message ? e.reason.message : String(e.reason); if (/work|components|supabase|storage/i.test(m)) C.toast('Lỗi: ' + m, true); });
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
  try { P.rows = must(await C.sb.from('components').select('*').order('name')); P.loaded = true; renderParts(); }
  catch (e) { $('pGrid').innerHTML = ''; fail(e); }
}
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
      gotRows(must(await C.sb.from('components').delete().eq('id', r.id).select('id')));
    });
    P.rows = P.rows.filter((x) => x.id !== r.id); closeDlg(); renderParts(); C.toast('Đã xóa');
  } catch (er) { fail(er); }
}
// thêm nhanh một đoạn ghi chú (có ghi ngày) vào "Ghi chú cách sửa" mà không phải mở form sửa
async function quickNote(r, txt) {
  const stamp = dmy(todayStr());
  const next = (r.repair_text ? r.repair_text + '\n\n' : '') + '[' + stamp + '] ' + txt;
  try {
    const saved = must(await track(async () => C.sb.from('components').update({ repair_text: next, updated_at: new Date().toISOString() }).eq('id', r.id).select().maybeSingle()));
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
      return gotRow(must(await C.sb.from('components').update({ images: imgs, updated_at: new Date().toISOString() }).eq('id', r.id).select().maybeSingle()));
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
      const saved = old ? gotRow(must(await C.sb.from('components').update(row).eq('id', id).select().maybeSingle()))
                        : must(await C.sb.from('components').insert(Object.assign({ id }, row)).select().single());
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
   3) LỊCH NĂM: đánh dấu màu + ghi chú cho từng ngày
===================================================================== */
const K = { year: new Date().getFullYear(), days: {} };
const MARK_LABEL = {}; MARKS.forEach((m) => { MARK_LABEL[m[0]] = m[1]; });

function initCal() {
  $('wm-cal').innerHTML =
    '<div class="wm-bar wm-calbar"><div class="wm-yr"><button class="wm-ib" data-c="prev" type="button" aria-label="Năm trước">‹</button><b id="kYear"></b><button class="wm-ib" data-c="next" type="button" aria-label="Năm sau">›</button></div>' +
    '<button class="chip" data-c="today" type="button">Hôm nay</button></div>' +
    '<div class="wm-legend" id="kLegend">' + MARKS.map((m) => '<span><b class="c-' + m[0] + '"></b>' + m[1] + '</span>').join('') + '<em>Bấm vào một ngày để đánh dấu và ghi chú</em></div>' +
    '<div class="wm-months" id="kMonths"></div><div class="card wm-up" id="kList"></div>';
  $('wm-cal').addEventListener('click', (e) => {
    const b = e.target.closest('[data-c]');
    if (b) {
      const a = b.getAttribute('data-c');
      if (a === 'prev') setYear(K.year - 1); else if (a === 'next') setYear(K.year + 1);
      else if (a === 'today') { setYear(new Date().getFullYear()).then(() => { const t = document.querySelector('.wm-d.today'); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'center' }); }); }
      return;
    }
    const d = e.target.closest('[data-day]'); if (d) openDay(d.getAttribute('data-day'));
  });
}
async function setYear(y) { K.year = y; await loadCal(true); }
async function loadCal(force) {
  $('kYear').textContent = K.year;
  if (K.loadedYear === K.year && !force) { renderCal(); return; }
  K.days = {}; renderCal();
  try {
    const rows = must(await C.sb.from('cal_days').select('*').gte('day', K.year + '-01-01').lte('day', K.year + '-12-31').order('day'));
    K.days = {}; rows.forEach((r) => { K.days[r.day] = r; });
    K.loadedYear = K.year; renderCal();
  } catch (e) { fail(e); }
}
function renderCal() {
  $('kYear').textContent = K.year;
  const today = todayStr(), now = new Date();
  const names = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
  let html = '';
  for (let m = 0; m < 12; m++) {
    const first = (new Date(Date.UTC(K.year, m, 1)).getUTCDay() + 6) % 7, dim = new Date(Date.UTC(K.year, m + 1, 0)).getUTCDate();
    let cells = '';
    for (let i = 0; i < first; i++) cells += '<i class="wm-dv"></i>';
    for (let d = 1; d <= dim; d++) {
      const key = K.year + '-' + pad2(m + 1) + '-' + pad2(d), x = K.days[key];
      cells += '<button type="button" class="wm-d' + (key === today ? ' today' : '') + (x && x.mark ? ' m-' + x.mark : '') + (x && x.note ? ' has' : '') + ((first + d - 1) % 7 === 6 ? ' sun' : '') +
        '" data-day="' + key + '"' + (x && x.note ? ' title="' + esc(x.note) + '"' : '') + '><span>' + d + '</span></button>';
    }
    html += '<section class="wm-mon' + (K.year === now.getFullYear() && m === now.getMonth() ? ' now' : '') + '"><h4>' + names[m] + '</h4><div class="wm-wd"><i>T2</i><i>T3</i><i>T4</i><i>T5</i><i>T6</i><i>T7</i><i class="sun">CN</i></div><div class="wm-dg">' + cells + '</div></section>';
  }
  $('kMonths').innerHTML = html;
  const list = Object.keys(K.days).sort().map((k) => K.days[k]).filter((x) => x.note || x.mark);
  $('kList').innerHTML = '<h4>Ghi chú và đánh dấu năm ' + K.year + ' <span>' + list.length + '</span></h4>' + (list.length ? list.map((x) =>
    '<button type="button" class="wm-ui" data-day="' + x.day + '"><b class="c-' + (x.mark || 'none') + '"></b><span class="wm-ud">' + dmy(x.day).slice(0, 5) + ' · ' + DOW_LONG[new Date(x.day + 'T00:00:00').getDay()] + '</span><span class="wm-ut">' +
    (x.note ? esc(x.note.split('\n')[0]) : '<i>' + esc(MARK_LABEL[x.mark] || '') + '</i>') + '</span></button>').join('') :
    '<div class="wm-empty" style="padding:8px 0">Chưa có ngày nào được đánh dấu hoặc ghi chú.</div>');
}
function openDay(day) {
  const dt = new Date(day + 'T00:00:00'), cur = K.days[day] || { mark: '', note: '' };
  let mark = cur.mark || '';
  openDlg('<h2>' + DOW_LONG[dt.getDay()] + ', ' + dmy(day) + '</h2>' +
    '<div class="field"><label>Đánh dấu</label><div class="wm-cols" id="kCols">' + MARKS.map((m) => '<button type="button" class="c-' + m[0] + (mark === m[0] ? ' on' : '') + '" data-col="' + m[0] + '"><b></b>' + m[1] + '</button>').join('') + '</div></div>' +
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
        const saved = must(await track(async () => C.sb.from('cal_days').upsert({ user_id: user().id, day, mark, note, updated_at: new Date().toISOString() }, { onConflict: 'user_id,day' }).select().single()));
        K.days[day] = saved;
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

    const rows = await C.sb.from('components').select('id,name,user_id').limit(500);
    let mineRows = [];
    if (rows.error) add(false, 'Không đọc được bảng linh kiện: ' + et(rows.error), 'Chạy lại toàn bộ file supabase/work_schema.sql trong Supabase → SQL Editor.');
    else {
      mineRows = rows.data.filter((r) => r.user_id === me.id);
      add(true, 'Đọc được ' + rows.data.length + ' linh kiện (' + mineRows.length + ' thuộc tài khoản này)');
      if (rows.data.length > mineRows.length) add(false, (rows.data.length - mineRows.length) + ' linh kiện thuộc TÀI KHOẢN KHÁC nên không sửa/xóa được', 'Thường do chạy file seed_tu_excel.sql khi có nhiều tài khoản. Cần chuyển các dòng này sang tài khoản của bạn bằng SQL.');
    }

    // thử thêm -> sửa -> xóa một dòng tạm
    let tid = null;
    const ins = await C.sb.from('components').insert({ name: '__kiem_tra__' }).select('id').maybeSingle();
    if (ins.error || !ins.data) add(false, 'Thêm dòng thử: THẤT BẠI ' + (ins.error ? et(ins.error) : ''), 'Bảng thiếu quyền ghi hoặc chính sách bảo mật (RLS) chưa đúng. Chạy lại supabase/work_schema.sql.');
    else {
      tid = ins.data.id; add(true, 'Thêm dòng thử: được');
      const up = await C.sb.from('components').update({ name: '__kiem_tra_sua__' }).eq('id', tid).select('id');
      if (up.error || !up.data || !up.data.length) add(false, 'Sửa dòng thử: THẤT BẠI ' + (up.error ? et(up.error) : '(server không báo lỗi nhưng không sửa dòng nào)'), 'Thiếu quyền UPDATE. Chạy lại supabase/work_schema.sql.');
      else add(true, 'Sửa dòng thử: được');
      const de = await C.sb.from('components').delete().eq('id', tid).select('id');
      if (de.error || !de.data || !de.data.length) add(false, 'Xóa dòng thử: THẤT BẠI ' + (de.error ? et(de.error) : '(server không báo lỗi nhưng không xóa dòng nào)'), 'Thiếu quyền DELETE. Chạy lại supabase/work_schema.sql. Nếu còn sót dòng tên "__kiem_tra__", hãy xóa tay trong Table Editor.');
      else add(true, 'Xóa dòng thử: được');
    }
    // thử sửa nhẹ (chỉ đổi giờ cập nhật) một linh kiện thật của bạn
    if (mineRows.length) {
      const r0 = mineRows[0], up2 = await C.sb.from('components').update({ updated_at: new Date().toISOString() }).eq('id', r0.id).select('id');
      if (up2.error || !up2.data || !up2.data.length) add(false, 'Sửa linh kiện thật "' + r0.name + '": THẤT BẠI ' + (up2.error ? et(up2.error) : '(không sửa dòng nào)'), 'Dòng này có thể không thuộc tài khoản của bạn.');
      else add(true, 'Sửa linh kiện thật "' + r0.name + '": được');
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
