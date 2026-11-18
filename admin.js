/* =====================================================================
   Injanda Trading — admin panel
   Loaded after app.js and reuses its helpers (DB, persist, stockMove, toast…).
   Default admin login: user 123 / password 123 — change it in Settings.
   ===================================================================== */

const AI = {
  dash:    '<rect x="3" y="3" width="7.5" height="9" rx="1.6"/><rect x="13.5" y="3" width="7.5" height="5" rx="1.6"/><rect x="13.5" y="11" width="7.5" height="10" rx="1.6"/><rect x="3" y="15" width="7.5" height="6" rx="1.6"/>',
  orders:  '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9.5 8h5M9.5 12h5"/>',
  box:     '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  users:   '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.5a5.5 5.5 0 0 1 5.5 5.5"/>',
  image:   '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-8 8"/>',
  tag:     '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  sliders: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  plus:    '<path d="M12 5v14M5 12h14"/>',
  edit:    '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  trash:   '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/>',
  eye:     '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  out:     '<path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h8"/>',
  logout:  '<path d="M9 4H5v16h4M15 8l4 4-4 4M19 12H9"/>',
  search:  '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4-4"/>',
  x:       '<path d="M6 6l12 12M18 6 6 18"/>',
  up:      '<path d="M6 14l6-6 6 6"/>',
  down:    '<path d="M6 10l6 6 6-6"/>',
};
const aIco = (k, c = '') => `<svg class="i ${c}" viewBox="0 0 24 24" aria-hidden="true">${AI[k] || ''}</svg>`;

const SECS = [
  ['dash', 'Dashboard', 'dash', 'Sales and stock at a glance'],
  ['orders', 'Orders', 'orders', 'Orders and quote requests'],
  ['products', 'Products & stock', 'box', 'Catalogue, prices and inventory'],
  ['users', 'Customers', 'users', 'Registered customer accounts'],
  ['banners', 'Banners', 'image', 'Home page slides and tiles'],
  ['vouchers', 'Vouchers', 'tag', 'Discount codes for checkout'],
  ['settings', 'Settings', 'sliders', 'Store details, shipping and security'],
];
const AD = { sec: 'dash' };
let PENDING = null;

/* ---------- Small helpers ---------- */
const empty = t => `<div class="empty-a">${aIco('box')}<p>${t}</p></div>`;
const thumb = p => `<span class="th">${imgTag(p.img, '', false)}</span>`;
const fmtDate = t => new Date(t).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const lowStock = p => tracked(p) && p.stock <= (cfg().lowStock || 10);
const ordersOf = id => DB.orders.filter(o => o.uid === id).length;
const initials = n => String(n || 'A').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const catOpts = sel => CATEGORIES.slice(1).map(c => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
const stOpts = sel => Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${esc(v)}</option>`).join('');
const dlgClose = () => $('#adlg').classList.remove('on');
const parseSpec = t => Object.fromEntries(String(t || '').split('\n').map(l => { const i = l.indexOf(':'); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : null; }).filter(x => x && x[0]));
const orderTotal = o => (o.type === 'quote' || o.status === 'cancelled') ? 0 : (+o.total || 0);

function photoData(file) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, 800 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Could not read that image')); };
    img.src = url;
  });
}

/* ---------- Dialog ---------- */
function dlg(title, body, foot = '') {
  $('#adlgBox').innerHTML = `<div class="dlg-h"><h3>${title}</h3><button class="x" data-close aria-label="Close">${aIco('x')}</button></div><div class="dlg-b">${body}</div>${foot ? `<div class="dlg-f">${foot}</div>` : ''}`;
  $('#adlg').classList.add('on');
}
function confirmDo(title, msg, fn, label = 'Delete') {
  PENDING = fn;
  dlg(title, `<p class="muted">${msg}</p>`, `<button class="btn ghost" data-close>Cancel</button><button class="btn red" data-go>${label}</button>`);
}

/* ---------- Products ---------- */
function openProduct(id) {
  const p = id ? find(id) : null;
  const s = p || { cat: 'kites', kind: 'part', name: '', sku: '', price: 0, old: 0, unit: '', stock: null, img: '', desc: '', spec: {}, hidden: false };
  const spec = Object.entries(s.spec || {}).map(([k, v]) => `${k}: ${v}`).join('\n');
  dlg(p ? 'Edit product' : 'New product', `<form class="fgrid" id="fProd" data-form="product" data-id="${esc(id || '')}">
    <label class="full">Product name<input class="in" name="name" required value="${esc(s.name)}"></label>
    <label>SKU<input class="in" name="sku" value="${esc(s.sku)}" placeholder="Auto-generated"></label>
    <label>Category<select class="in" name="cat">${catOpts(s.cat)}</select></label>
    <label>Type<select class="in" name="kind"><option value="part" ${s.kind !== 'service' ? 'selected' : ''}>Product / part</option><option value="service" ${s.kind === 'service' ? 'selected' : ''}>Service</option></select></label>
    <label>Price (฿)<small>0 = request a quote</small><input class="in" name="price" type="number" min="0" step="1" value="${s.price || ''}"></label>
    <label>Old price (฿)<small>shows discount</small><input class="in" name="old" type="number" min="0" step="1" value="${s.old || ''}"></label>
    <label>Unit<input class="in" name="unit" placeholder="e.g. per set" value="${esc(s.unit)}"></label>
    <label>Stock<small>blank = not tracked</small><input class="in" name="stock" type="number" min="0" value="${s.stock ?? ''}"></label>
    <label class="full">Image key or URL<input class="in" name="img" value="${esc(s.img)}"></label>
    <label class="full">Or upload a photo<input class="in" name="photo" type="file" accept="image/*"></label>
    <label class="full">Description<textarea class="in" name="desc" rows="3">${esc(s.desc)}</textarea></label>
    <label class="full">Specifications<small>one per line — Name: value</small><textarea class="in" name="spec" rows="4">${esc(spec)}</textarea></label>
    <label class="swrow full"><span class="sw"><input type="checkbox" name="hidden" value="1" ${s.hidden ? 'checked' : ''}><i></i></span><span>Hide from the shop</span></label>
  </form>`, `<button class="btn ghost" data-close>Cancel</button><button class="btn" form="fProd">Save product</button>`);
}
async function saveProduct(d, id) {
  const p = id ? find(id) : null;
  let img = (d.img || '').trim();
  if (d.photo && d.photo.size) img = await photoData(d.photo);
  const kind = d.kind === 'service' ? 'service' : 'part';
  const data = {
    ...(p || {}), v: 2, id: p ? p.id : uid('p'), cat: d.cat, kind, name: d.name.trim(),
    sku: (d.sku || '').trim().toUpperCase() || ('P' + Date.now().toString(36).slice(-5).toUpperCase()),
    price: Math.max(0, +d.price || 0), old: Math.max(0, +d.old || 0), unit: (d.unit || '').trim(),
    img: img || 'set', desc: d.desc || '', spec: parseSpec(d.spec), hidden: d.hidden === '1',
    stock: kind === 'part' && d.stock !== '' ? Math.max(0, Math.trunc(+d.stock) || 0) : null,
  };
  if (p) Object.assign(p, data); else DB.products.push(data);
  persist(); dlgClose(); toast('Product saved'); adShow('products');
}
function openStock(id) {
  const p = find(id); if (!p) return;
  dlg('Adjust stock', `<form class="fgrid one" id="fStk" data-form="stock" data-id="${esc(id)}">
    <div class="stk-now full">${thumb(p)}<span><b>${esc(p.name)}</b><small>Current stock: <b>${p.stock}</b></small></span></div>
    <label>Change<small>use − to remove</small><input class="in" name="delta" type="number" required placeholder="e.g. 20 or -5"></label>
    <label>Reason<input class="in" name="reason" placeholder="Delivery, count correction…"></label>
  </form>`, `<button class="btn ghost" data-close>Cancel</button><button class="btn" form="fStk">Update stock</button>`);
}
function saveStock(d, id) {
  const p = find(id); const delta = Math.trunc(+d.delta || 0);
  if (!p) return;
  if (!delta) throw new Error('Enter a change other than 0');
  stockMove(p, delta, d.reason || 'Manual adjustment', me().name);
  persist(); dlgClose(); toast(`Stock now ${p.stock}`); adShow(AD.sec);
}

/* ---------- Orders ---------- */
function setStatus(ref, status) {
  const o = DB.orders.find(x => x.ref === ref); if (!o || o.status === status) return;
  const was = o.status; o.status = status;
  const release = status === 'cancelled' && was !== 'cancelled';
  const reopen = was === 'cancelled' && status !== 'cancelled';
  if (o.type !== 'quote' && (release || reopen)) {
    o.items.forEach(i => {
      const p = find(i.id);
      if (p && tracked(p)) stockMove(p, release ? i.qty : -i.qty, (release ? 'Cancelled ' : 'Reopened ') + o.ref, me().name);
    });
  }
  persist(); toast(`${o.ref}: ${STATUS[status]}`); adShow(AD.sec);
}
function openOrder(ref) {
  const o = DB.orders.find(x => x.ref === ref); if (!o) return;
  const c = o.customer || {};
  dlg(`${esc(o.ref)} <small>${o.type === 'quote' ? 'Quote request' : 'Order'}</small>`, `<div class="det">
    <div class="detc"><h5>Customer</h5><p><b>${esc(c.name)}</b>${c.company ? `<br>${esc(c.company)}` : ''}<br>${esc(c.phone || '')}<br>${esc(c.email || '')}</p>
      <h5>Delivery address</h5><p>${esc(c.addr || '—')}</p>${c.note ? `<h5>Notes</h5><p>${esc(c.note)}</p>` : ''}</div>
    <div class="deti"><h5>Items</h5>${o.items.length ? `<table class="tbl"><tbody>${o.items.map(i => `<tr><td>${esc(i.name)}<small>${esc(i.sku)}</small></td><td>× ${i.qty}</td><td>${i.price ? baht(i.price * i.qty) : 'Quote'}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">Quote request only — no items.</p>'}
      <div class="sumA"><span>Subtotal</span><span>${baht(o.sub)}</span></div>
      ${o.disc ? `<div class="sumA"><span>Voucher ${esc(o.code)}</span><span>−${baht(o.disc)}</span></div>` : ''}
      <div class="sumA"><span>Shipping</span><span>${o.ship ? baht(o.ship) : 'Free / TBC'}</span></div>
      <div class="sumA t"><span>Total</span><span>${o.type === 'quote' ? 'TBC' : baht(o.total)}</span></div>
      <label>Status<select class="in" data-status="${esc(o.ref)}">${stOpts(o.status)}</select></label></div>
  </div>`, `<button class="btn ghost" data-close>Close</button><a class="btn" href="mailto:${esc(c.email || '')}?subject=${encodeURIComponent('Your order ' + o.ref)}">Email customer</a>`);
}

/* ---------- Banners ---------- */
function openBanner(id) {
  const b = id ? DB.banners.find(x => x.id === id) : null;
  const s = b || { slot: 'main', tag: '', title: '', sub: '', img: '', bg: '#0d1726', cat: 'all' };
  dlg(b ? 'Edit banner' : 'New banner', `<form class="fgrid" id="fBan" data-form="banner" data-id="${esc(id || '')}">
    <label>Placement<select class="in" name="slot"><option value="main" ${s.slot !== 'side' ? 'selected' : ''}>Main slider</option><option value="side" ${s.slot === 'side' ? 'selected' : ''}>Side tile</option></select></label>
    <label>Links to<select class="in" name="cat"><option value="all" ${s.cat === 'all' ? 'selected' : ''}>All products</option>${catOpts(s.cat)}</select></label>
    <label class="full">Tag line<input class="in" name="tag" value="${esc(s.tag)}"></label>
    <label class="full">Headline<input class="in" name="title" required value="${esc(s.title)}"></label>
    <label class="full">Subtext<input class="in" name="sub" value="${esc(s.sub)}"></label>
    <label>Image key or URL<input class="in" name="img" value="${esc(s.img)}"></label>
    <label>Or upload<input class="in" name="photo" type="file" accept="image/*"></label>
    <label>Background colour<input class="in" name="bg" type="color" value="${esc(s.bg)}"></label>
  </form>`, `<button class="btn ghost" data-close>Cancel</button><button class="btn" form="fBan">Save banner</button>`);
}
async function saveBanner(d, id) {
  let img = (d.img || '').trim();
  if (d.photo && d.photo.size) img = await photoData(d.photo);
  const b = { id: id || uid('b'), slot: d.slot === 'side' ? 'side' : 'main', tag: d.tag || '', title: d.title || '', sub: d.sub || '', img: img || 'set', bg: d.bg || '#0d1726', cat: d.cat || 'all' };
  const i = DB.banners.findIndex(x => x.id === id);
  if (i < 0) DB.banners.push(b); else DB.banners[i] = b;
  persist(); dlgClose(); toast('Banner saved'); adShow('banners');
}
function moveBanner(id, dir) {
  const i = DB.banners.findIndex(b => b.id === id), j = i + dir;
  if (i < 0 || j < 0 || j >= DB.banners.length) return;
  [DB.banners[i], DB.banners[j]] = [DB.banners[j], DB.banners[i]];
  persist(); adShow('banners');
}

/* ---------- Vouchers ---------- */
function openVoucher(id) {
  const v = id ? DB.vouchers.find(x => x.id === id) : null;
  const s = v || { code: '', pct: 10, fix: 0, min: 0, on: true };
  const kind = s.fix && !s.pct ? 'fix' : 'pct', val = kind === 'pct' ? s.pct : s.fix;
  dlg(v ? 'Edit voucher' : 'New voucher', `<form class="fgrid" id="fVou" data-form="voucher" data-id="${esc(id || '')}">
    <label class="full">Code<input class="in" name="code" required value="${esc(s.code)}" placeholder="e.g. WELCOME10" style="text-transform:uppercase"></label>
    <label>Discount type<select class="in" name="kind"><option value="pct" ${kind === 'pct' ? 'selected' : ''}>Percent (%)</option><option value="fix" ${kind === 'fix' ? 'selected' : ''}>Fixed amount (฿)</option></select></label>
    <label>Value<input class="in" name="value" type="number" min="0" step="1" required value="${val || ''}"></label>
    <label>Minimum spend (฿)<input class="in" name="min" type="number" min="0" step="1" value="${s.min || ''}"></label>
    <label class="swrow"><span class="sw"><input type="checkbox" name="on" value="1" ${s.on ? 'checked' : ''}><i></i></span><span>Active</span></label>
  </form>`, `<button class="btn ghost" data-close>Cancel</button><button class="btn" form="fVou">Save voucher</button>`);
}
function saveVoucher(d, id) {
  const code = String(d.code || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!code) throw new Error('Enter a voucher code');
  if (DB.vouchers.some(v => v.code === code && v.id !== id)) throw new Error('That code already exists');
  const val = Math.max(0, +d.value || 0);
  const v = { id: id || uid('v'), code, pct: d.kind === 'pct' ? Math.min(100, val) : 0, fix: d.kind === 'fix' ? val : 0, min: Math.max(0, +d.min || 0), on: d.on === '1' };
  const i = DB.vouchers.findIndex(x => x.id === id);
  if (i < 0) DB.vouchers.push(v); else DB.vouchers[i] = v;
  persist(); dlgClose(); toast('Voucher saved'); adShow('vouchers');
}

/* ---------- Settings ---------- */
function saveSettings(d) {
  DB.settings = {
    ...DB.settings,
    storeName: (d.storeName || '').trim() || 'Injanda', logoSub: d.logoSub || '', tagline: d.tagline || '', announce: d.announce || '',
    phone: d.phone || '', email: d.email || '', address: d.address || '',
    freeShip: Math.max(0, +d.freeShip || 0), shipFee: Math.max(0, +d.shipFee || 0), lowStock: Math.max(0, +d.lowStock || 0),
  };
  persist(); renderChrome(); adShow('settings'); toast('Settings saved');
}
async function changePw(d) {
  const u = me(); if (!u) return;
  if (u.pass !== await sha(d.cur)) throw new Error('Current password is wrong');
  if (d.next !== d.again) throw new Error('New passwords do not match');
  u.pass = await sha(d.next); persist(); toast('Password updated');
}

/* ---------- Views ---------- */
function ordersTable(list) {
  return `<div class="tw"><table class="tbl"><thead><tr><th>Reference</th><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>
  ${list.map(o => `<tr data-q="${esc(`${o.ref} ${o.customer?.name} ${o.customer?.phone} ${o.customer?.email}`.toLowerCase())}">
    <td><b>${esc(o.ref)}</b>${o.type === 'quote' ? '<small>Quote request</small>' : ''}</td>
    <td>${fmtDate(o.date)}</td>
    <td>${esc(o.customer?.name)}<small>${esc(o.customer?.company || o.customer?.phone || '')}</small></td>
    <td>${o.items.reduce((a, i) => a + i.qty, 0) || '—'}</td>
    <td>${o.type === 'quote' ? 'TBC' : baht(o.total)}</td>
    <td><select class="in sm" data-status="${esc(o.ref)}" aria-label="Status">${stOpts(o.status)}</select></td>
    <td class="acts"><button class="ib" data-act="order" data-id="${esc(o.ref)}" title="Details">${aIco('eye')}</button></td></tr>`).join('')}
  </tbody></table></div>`;
}
function vDash() {
  const live = DB.orders.filter(o => o.status !== 'cancelled');
  const rev = DB.orders.reduce((a, o) => a + orderTotal(o), 0);
  const open = DB.orders.filter(o => o.status === 'new').length;
  const low = DB.products.filter(lowStock).sort((a, b) => a.stock - b.stock);
  const recent = [...DB.orders].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  const kpi = (l, v, s, ic) => `<div class="kpi"><i>${aIco(ic)}</i><span>${l}</span><b>${v}</b><small>${s}</small></div>`;
  return `<div class="kpis">
    ${kpi('Sales (excl. cancelled)', baht(rev), `${live.length} active orders`, 'orders')}
    ${kpi('New requests', open, 'Waiting for your reply', 'tag')}
    ${kpi('Products in shop', DB.products.filter(p => !p.hidden).length, `${DB.products.filter(p => p.hidden).length} hidden`, 'box')}
    ${kpi('Customers', DB.users.filter(u => u.role === 'customer').length, 'Registered accounts', 'users')}
  </div>
  <div class="two-col">
    <section class="panel"><div class="ph2"><h4>Recent orders</h4><button class="btn ghost sm" data-sec="orders">View all</button></div>${recent.length ? ordersTable(recent) : empty('No orders yet')}</section>
    <section class="panel"><div class="ph2"><h4>Low stock</h4><small>at or below ${cfg().lowStock || 10}</small></div>
      ${low.length ? `<div class="lrows">${low.map(p => `<div class="lrow">${thumb(p)}<span>${esc(p.name)}<small>${esc(p.sku)}</small></span><b class="lowtag ${p.stock <= 0 ? 'out' : ''}">${p.stock} left</b></div>`).join('')}</div>` : empty('Everything is well stocked')}
    </section>
  </div>`;
}
function vOrders() {
  const list = [...DB.orders].sort((a, b) => b.date.localeCompare(a.date));
  return `<div class="toolbar-a"><div class="sbox">${aIco('search', '')}<input class="in" data-filter placeholder="Search reference, name, phone or email"></div><span class="muted">${list.length} in total</span></div>
    ${list.length ? ordersTable(list) : empty('No orders yet')}`;
}
function vProducts() {
  return `<div class="toolbar-a"><div class="sbox">${aIco('search', '')}<input class="in" data-filter placeholder="Search name, SKU or category"></div>
    <button class="btn sm" data-act="new-product">${aIco('plus')}Add product</button></div>
    <div class="tw"><table class="tbl"><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Shop</th><th></th></tr></thead><tbody>
    ${DB.products.map(p => `<tr data-q="${esc(`${p.name} ${p.sku} ${catName(p.cat)}`.toLowerCase())}" class="${p.hidden ? 'dim' : ''}">
      <td><div class="prow">${thumb(p)}<span><b>${esc(p.name)}</b><small>${esc(p.sku)} · ${p.kind === 'service' ? 'Service' : 'Part'}</small></span></div></td>
      <td>${esc(catName(p.cat))}</td>
      <td>${priced(p) ? baht(p.price) + (p.unit ? `<small>${esc(p.unit)}</small>` : '') : '<span class="muted">Quote</span>'}</td>
      <td>${tracked(p) ? `<b>${p.stock}</b> ${lowStock(p) ? `<span class="lowtag ${p.stock <= 0 ? 'out' : ''}">${p.stock <= 0 ? 'Out' : 'Low'}</span>` : ''}` : '<span class="muted">—</span>'}</td>
      <td><span class="pill ${p.hidden ? 'cancelled' : 'done'}">${p.hidden ? 'Hidden' : 'Visible'}</span></td>
      <td class="acts"><button class="ib" data-act="stock" data-id="${esc(p.id)}" title="Adjust stock" ${tracked(p) ? '' : 'disabled'}>${aIco('box')}</button><button class="ib" data-act="edit-product" data-id="${esc(p.id)}" title="Edit">${aIco('edit')}</button><button class="ib del" data-act="del-product" data-id="${esc(p.id)}" title="Delete">${aIco('trash')}</button></td>
    </tr>`).join('') || `<tr><td colspan="6">${empty('No products yet')}</td></tr>`}
    </tbody></table></div>`;
}
function vUsers() {
  const list = DB.users.filter(u => u.role === 'customer');
  return `<div class="toolbar-a"><div class="sbox">${aIco('search', '')}<input class="in" data-filter placeholder="Search name, email or phone"></div><span class="muted">${list.length} customers</span></div>
    <div class="tw"><table class="tbl"><thead><tr><th>Customer</th><th>Phone</th><th>Orders</th><th>Joined</th><th></th></tr></thead><tbody>
    ${list.map(u => `<tr data-q="${esc(`${u.name} ${u.email} ${u.phone}`.toLowerCase())}"><td><b>${esc(u.name)}</b><small>${esc(u.email)}</small></td><td>${esc(u.phone || '—')}</td><td>${ordersOf(u.id)}</td><td>${u.at ? fmtDate(u.at) : '—'}</td>
      <td class="acts"><button class="ib del" data-act="del-user" data-id="${esc(u.id)}" title="Delete">${aIco('trash')}</button></td></tr>`).join('') || `<tr><td colspan="5">${empty('No customers yet')}</td></tr>`}
    </tbody></table></div>`;
}
function vBanners() {
  const list = DB.banners;
  return `<div class="toolbar-a"><p class="muted">Main slides rotate on the home page; side tiles sit below. Use the arrows to change the order.</p>
    <button class="btn sm" data-act="new-banner">${aIco('plus')}Add banner</button></div>
  <div class="bgrid">${list.map((b, i) => `<article class="bcard" style="--bg:${esc(b.bg)}">
    <div class="bprev">${imgTag(b.img, '', false)}<div class="st"><em>${esc(b.tag)}</em><h4>${esc(b.title)}</h4><p>${esc(b.sub)}</p></div></div>
    <div class="bmeta"><span class="pill ${b.slot === 'main' ? 'new' : 'shipped'}">${b.slot === 'main' ? 'Main slide' : 'Side tile'}</span>
      <span class="acts">
        <button class="ib" data-act="move-banner" data-id="${esc(b.id)}" data-dir="-1" ${i === 0 ? 'disabled' : ''} title="Move up">${aIco('up')}</button>
        <button class="ib" data-act="move-banner" data-id="${esc(b.id)}" data-dir="1" ${i === list.length - 1 ? 'disabled' : ''} title="Move down">${aIco('down')}</button>
        <button class="ib" data-act="edit-banner" data-id="${esc(b.id)}" title="Edit">${aIco('edit')}</button>
        <button class="ib del" data-act="del-banner" data-id="${esc(b.id)}" title="Delete">${aIco('trash')}</button>
      </span></div></article>`).join('') || empty('No banners yet')}</div>`;
}
function vVouchers() {
  return `<div class="toolbar-a"><p class="muted">Customers type the code at checkout. A code applies only when the minimum spend is met.</p>
    <button class="btn sm" data-act="new-voucher">${aIco('plus')}New voucher</button></div>
    <div class="tw"><table class="tbl"><thead><tr><th>Code</th><th>Discount</th><th>Minimum</th><th>Active</th><th></th></tr></thead><tbody>
    ${DB.vouchers.map(v => `<tr><td><code>${esc(v.code)}</code></td><td>${v.pct ? v.pct + '% off' : baht(v.fix) + ' off'}</td><td>${v.min ? baht(v.min) : '—'}</td>
      <td><label class="sw"><input type="checkbox" data-vtoggle="${esc(v.id)}" ${v.on ? 'checked' : ''} aria-label="Active"><i></i></label></td>
      <td class="acts"><button class="ib" data-act="edit-voucher" data-id="${esc(v.id)}" title="Edit">${aIco('edit')}</button><button class="ib del" data-act="del-voucher" data-id="${esc(v.id)}" title="Delete">${aIco('trash')}</button></td></tr>`).join('') || `<tr><td colspan="5">${empty('No vouchers yet')}</td></tr>`}
    </tbody></table></div>`;
}
function vSettings() {
  const c = cfg(), u = me() || {};
  const f = (name, label, val, type = 'text', extra = '') => `<label>${label}<input class="in" name="${name}" type="${type}" value="${esc(val ?? '')}" ${extra}></label>`;
  return `<div class="two-col">
    <form class="panel fgrid" data-form="settings">
      <h4 class="full">Store details</h4>
      ${f('storeName', 'Store name', c.storeName)}${f('logoSub', 'Logo subtitle', c.logoSub)}
      <label class="full">Tagline<input class="in" name="tagline" value="${esc(c.tagline)}"></label>
      <label class="full">Top bar announcement<input class="in" name="announce" value="${esc(c.announce)}"></label>
      ${f('phone', 'Phone', c.phone)}${f('email', 'Email', c.email, 'email')}
      <label class="full">Address<textarea class="in" name="address" rows="2">${esc(c.address)}</textarea></label>
      <h4 class="full">Shipping & stock</h4>
      ${f('freeShip', 'Free shipping from (฿)', c.freeShip, 'number', 'min="0"')}${f('shipFee', 'Shipping fee (฿)', c.shipFee, 'number', 'min="0"')}
      ${f('lowStock', 'Low-stock alert at', c.lowStock, 'number', 'min="0"')}
      <div class="full"><button class="btn">Save settings</button></div>
    </form>
    <div class="stack">
      <form class="panel fgrid one" data-form="pw">
        <h4>Admin password</h4>
        <label>Current password<input class="in" name="cur" type="password" required autocomplete="current-password"></label>
        <label>New password<input class="in" name="next" type="password" minlength="6" required autocomplete="new-password"></label>
        <label>Confirm new password<input class="in" name="again" type="password" minlength="6" required autocomplete="new-password"></label>
        <div><button class="btn">Update password</button></div>
      </form>
      <div class="panel"><h4>Signed in</h4><p class="muted"><b>${esc(u.name)}</b> · ${esc(u.email || '')}</p><p class="muted">Change the default password before going live.</p></div>
    </div></div>`;
}

const VIEWS = { dash: vDash, orders: vOrders, products: vProducts, users: vUsers, banners: vBanners, vouchers: vVouchers, settings: vSettings };

/* ---------- Shell ---------- */
function adShow(sec = AD.sec) {
  AD.sec = sec;
  const meta = SECS.find(s => s[0] === sec) || SECS[0];
  const u = me() || {};
  const newOrders = DB.orders.filter(o => o.status === 'new').length;
  $('#admin').innerHTML = `
  <aside class="ad-side">
    <div class="ad-logo"><span class="mk">${esc((cfg().storeName || 'I').trim()[0].toUpperCase())}</span><span><b>${esc(cfg().storeName)}</b><small>Admin panel</small></span></div>
    <nav class="ad-nav">${SECS.map(([k, l, ic]) => `<button class="${k === sec ? 'on' : ''}" data-sec="${k}">${aIco(ic)}<span>${l}</span>${k === 'orders' && newOrders ? `<em>${newOrders}</em>` : ''}</button>`).join('')}</nav>
    <button class="ad-store" data-store>${aIco('out')}<span>View store</span></button>
  </aside>
  <main class="ad-main">
    <header class="ad-top"><div><h2>${esc(meta[1])}</h2><p>${esc(meta[3])}</p></div>
      <div class="who"><span class="av">${esc(initials(u.name))}</span><span class="wn">${esc(u.name || 'Admin')}</span><button class="ib" data-logout title="Log out" aria-label="Log out">${aIco('logout')}</button></div></header>
    <div class="ad-body">${(VIEWS[meta[0]] || vDash)()}</div>
  </main>`;
}
function enterAdmin() {
  if (!isAdmin()) { location.hash = '#/login'; return; }
  DB.vouchers.forEach(v => { v.id ||= uid('v'); });
  $('#admin').hidden = false;
  document.body.classList.add('lock');
  adShow(AD.sec || 'dash');
  $('#admin').scrollTop = 0;
}
function exitAdmin() {
  $('#admin').hidden = true; $('#admin').innerHTML = '';
  dlgClose(); document.body.classList.remove('lock');
}

/* ---------- Actions ---------- */
const ACT = {
  'new-product': () => openProduct(),
  'edit-product': id => openProduct(id),
  'del-product': id => { const p = find(id); if (p) confirmDo('Delete product', `Remove <b>${esc(p.name)}</b> from the shop? Past orders keep their record.`, () => { drop('products', id); persist(); adShow('products'); toast('Product deleted'); }); },
  stock: id => openStock(id),
  order: id => openOrder(id),
  'new-banner': () => openBanner(),
  'edit-banner': id => openBanner(id),
  'del-banner': id => confirmDo('Delete banner', 'This banner will disappear from the home page.', () => { DB.banners = DB.banners.filter(b => b.id !== id); persist(); adShow('banners'); toast('Banner deleted'); }),
  'move-banner': (id, el) => moveBanner(id, +el.dataset.dir),
  'new-voucher': () => openVoucher(),
  'edit-voucher': id => openVoucher(id),
  'del-voucher': id => confirmDo('Delete voucher', 'Customers will no longer be able to use this code.', () => { DB.vouchers = DB.vouchers.filter(v => v.id !== id); persist(); adShow('vouchers'); toast('Voucher deleted'); }),
  'del-user': id => { const u = DB.users.find(x => x.id === id); if (u) confirmDo('Delete customer', `Delete <b>${esc(u.name)}</b>? Their past orders stay in the list.`, () => { drop('users', id); persist(); adShow('users'); toast('Customer deleted'); }); },
};
const FORMS = { product: saveProduct, banner: saveBanner, voucher: saveVoucher, stock: saveStock, settings: saveSettings, pw: changePw };

/* ---------- Events (admin only) ---------- */
document.addEventListener('click', e => {
  const t = e.target;
  if (!t.closest || !t.closest('#admin, #adlg')) return;
  const g = a => t.closest(`[${a}]`); let el;
  if ((el = g('data-sec'))) return adShow(el.dataset.sec);
  if (g('data-store')) { exitAdmin(); route(); return; }
  if (g('data-logout')) return signOut();
  if (g('data-go')) { const fn = PENDING; PENDING = null; dlgClose(); return fn && fn(); }
  if (g('data-close') || t.id === 'adlg') return dlgClose();
  if ((el = g('data-act'))) { const fn = ACT[el.dataset.act]; if (fn) fn(el.dataset.id, el); }
});
document.addEventListener('submit', async e => {
  const f = e.target;
  if (!f.dataset || !FORMS[f.dataset.form]) return;
  e.preventDefault();
  try {
    await FORMS[f.dataset.form](Object.fromEntries(new FormData(f)), f.dataset.id || '');
    if (f.dataset.form === 'pw') f.reset();
  } catch (x) { toast(x.message || 'Something went wrong'); }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (!t.dataset) return;
  if (t.dataset.status) return setStatus(t.dataset.status, t.value);
  if (t.dataset.vtoggle) {
    const v = DB.vouchers.find(x => x.id === t.dataset.vtoggle);
    if (v) { v.on = t.checked; persist(); toast(`${v.code} ${v.on ? 'enabled' : 'disabled'}`); }
  }
});
document.addEventListener('input', e => {
  const t = e.target;
  if (!t.hasAttribute || !t.hasAttribute('data-filter')) return;
  const q = t.value.trim().toLowerCase();
  $$('#admin [data-q]').forEach(r => { r.hidden = !!q && !r.dataset.q.includes(q); });
});
