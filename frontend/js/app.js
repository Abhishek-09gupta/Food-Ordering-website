/* ---------------- API CONFIG ---------------- */
// The frontend and backend now run as separate apps on different ports/origins.
// Change this if you deploy the backend somewhere other than localhost:4000.
const API_BASE = 'http://localhost:4000/api';

/* Guest id persists in localStorage so a cart survives refreshes even before login */
function getGuestId(){
  let id = localStorage.getItem('tt_guest_id');
  if(!id){
    id = 'g_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('tt_guest_id', id);
  }
  return id;
}
function getToken(){ return localStorage.getItem('tt_token'); }
function getUser(){
  try { return JSON.parse(localStorage.getItem('tt_user') || 'null'); } catch(e){ return null; }
}
function setSession(token, user){
  localStorage.setItem('tt_token', token);
  localStorage.setItem('tt_user', JSON.stringify(user));
}
function clearSession(){
  localStorage.removeItem('tt_token');
  localStorage.removeItem('tt_user');
}

async function api(path, opts = {}, { retries = 2, delay = 500 } = {}){
  const headers = Object.assign({'Content-Type':'application/json'}, opts.headers || {});
  const token = getToken();
  if(token) headers['Authorization'] = 'Bearer ' + token;
  else headers['X-Guest-Id'] = getGuestId();

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(API_BASE + path, Object.assign({}, opts, { headers }));
      const data = await res.json().catch(()=> ({}));
      if(!res.ok) throw new Error(data.error || 'Something went wrong');
      return data;
    } catch (err) {
      lastError = err;
      if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

/* ---------------- STATE ---------------- */
let categories = [];
let restaurants = [];
let menuItems = [];
let favoriteIds = new Set();
let cartData = { items: [], totals: { subtotal:0, deliveryFee:0, tax:0, total:0 } };

let uiState = { activeCategory: 'all', search: '', showingFavoritesOnly: false };

/* ---------------- HELPERS ---------------- */
function findItem(id){ return menuItems.find(m => m.id === id); }
function fmt(n){ return '₹' + Math.round(n); }
function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(()=> t.classList.remove('show'), 2000);
}

function renderHeroCarousel(){
  const container = document.getElementById('heroCarousel');
  if(!container) return;
  const heroImages = Array.isArray(window.heroImages) ? window.heroImages.filter(Boolean) : [];
  if(heroImages.length){
    const idx = Math.floor(Date.now()/2500) % heroImages.length;
    container.innerHTML = `<img src="${heroImages[idx]}" alt="Featured dish" loading="eager">`;
    return;
  }
  container.innerHTML = `<div class="hero-placeholder" style="display:grid;place-items:center;height:100%;font-size:3rem;">🍽️</div>`;
}

/* ---------------- RENDER: CATEGORIES ---------------- */
function renderCategories(){
  const row = document.getElementById('catRow');
  const all = [{id:'all',name:'All',icon:'🍽️'}, ...categories];
  row.innerHTML = all.map(c => `
    <button class="cat-chip ${uiState.activeCategory===c.id?'active':''}" data-cat="${c.id}">
      <div class="cat-badge">${c.icon}</div>
      <span>${c.name}</span>
    </button>
  `).join('');
  row.querySelectorAll('.cat-chip').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      uiState.activeCategory = btn.dataset.cat;
      uiState.showingFavoritesOnly = false;
      goToPage('menu');
      renderCategories();
      renderFilters();
      loadMenu();
    });
  });
}

/* ---------------- RENDER: FOOD CARD ---------------- */
function foodCardHTML(item){
  const isFav = favoriteIds.has(item.id);
  const imageSrc = item.image || item.image_url || item.img || item.strMealThumb || '';
  const visual = imageSrc
    ? `<img src="${imageSrc}" alt="${item.name}" loading="lazy" style="width:100%;height:100%;object-fit:cover;">`
    : `<div class="food-emoji">${item.emoji || '🍽️'}</div>`;
  return `
  <div class="food-card">
    <div class="food-img">
      ${visual}
      <div class="tag-dot ${item.veg?'veg':'nonveg'}"></div>
      <button class="fav-btn ${isFav?'active':''}" data-fav="${item.id}">${isFav?'♥':'♡'}</button>
      ${item.popular?'<div class="popular-flag">🔥 Popular</div>':''}
    </div>
    <div class="food-body">
      <div class="food-top">
        <div>
          <div class="food-name">${item.name}</div>
          <div class="food-rest">${item.rest}</div>
        </div>
        <div class="food-rating">★ ${item.rating}</div>
      </div>
      <div class="food-bottom">
        <div class="price">${fmt(item.price)}</div>
        <button class="add-btn" data-add="${item.id}">+ Add</button>
      </div>
    </div>
  </div>`;
}
function attachCardEvents(container){
  container.querySelectorAll('[data-add]').forEach(btn=>{
    btn.addEventListener('click', ()=> addToCart(parseInt(btn.dataset.add)));
  });
  container.querySelectorAll('[data-fav]').forEach(btn=>{
    btn.addEventListener('click', ()=> toggleFavorite(parseInt(btn.dataset.fav)));
  });
}

/* ---------------- RENDER: HOME POPULAR ---------------- */
async function renderPopular(){
  const row = document.getElementById('popularRow');
  try {
    const items = await api('/menu?popular=true');
    window.heroImages = (items || []).slice(0,4).map((item) => item.image || item.image_url || item.img || item.strMealThumb).filter(Boolean);
    renderHeroCarousel();
    row.innerHTML = items.slice(0,4).map(foodCardHTML).join('');
    attachCardEvents(row);
  } catch(e){ row.innerHTML = `<p style="color:var(--muted);">Couldn't load popular dishes.</p>`; }
}

/* ---------------- RENDER: RESTAURANTS ---------------- */
function renderRestaurants(){
  const row = document.getElementById('restRow');
  row.innerHTML = restaurants.map(r=>`
    <div class="rest-card">
      <div class="rest-emoji">${r.emoji}</div>
      <div class="rest-info">
        <h3>${r.name}</h3>
        <div class="stars">★ ${r.rating}</div>
        <div class="rest-meta"><span>${r.cuisine} kitchen</span><span>🚴 ${r.time}</span></div>
      </div>
    </div>
  `).join('');
}

/* ---------------- RENDER: MENU FILTERS + LIST ---------------- */
function renderFilters(){
  const row = document.getElementById('filterRow');
  const all = [{id:'all',name:'All'}, ...categories];
  row.innerHTML = all.map(c=>`
    <button class="filter-chip ${uiState.activeCategory===c.id && !uiState.showingFavoritesOnly?'active':''}" data-fcat="${c.id}">${c.name}</button>
  `).join('');
  row.querySelectorAll('[data-fcat]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      uiState.activeCategory = btn.dataset.fcat;
      uiState.showingFavoritesOnly = false;
      renderFilters();
      renderCategories();
      loadMenu();
    });
  });
}

async function loadMenu(){
  const row = document.getElementById('menuRow');
  const empty = document.getElementById('emptyState');
  try {
    let items;
    if(uiState.showingFavoritesOnly){
      items = await api('/favorites');
    } else {
      const params = new URLSearchParams();
      if(uiState.activeCategory !== 'all') params.set('category', uiState.activeCategory);
      if(uiState.search.trim()) params.set('search', uiState.search.trim());
      items = await api('/menu?' + params.toString());
    }
    if(items.length===0){
      row.innerHTML='';
      empty.style.display='block';
    } else {
      empty.style.display='none';
      row.innerHTML = items.map(foodCardHTML).join('');
      attachCardEvents(row);
    }
  } catch(e){
    row.innerHTML = '';
    empty.style.display='block';
    showToast('Could not load the menu — is the server running?');
  }
}

/* ---------------- FAVORITES ---------------- */
async function loadFavorites(){
  try {
    const items = await api('/favorites');
    favoriteIds = new Set(items.map(i=>i.id));
    const favBadge = document.getElementById('favCount');
    favBadge.style.display = favoriteIds.size>0 ? 'flex':'none';
    favBadge.textContent = favoriteIds.size;
  } catch(e){ /* ignore on first load */ }
}
async function toggleFavorite(id){
  try {
    const res = await api('/favorites/' + id, { method:'POST' });
    favoriteIds = new Set(res.favorites);
    const favBadge = document.getElementById('favCount');
    favBadge.style.display = favoriteIds.size>0 ? 'flex':'none';
    favBadge.textContent = favoriteIds.size;
    renderPopular();
    loadMenu();
  } catch(e){ showToast('Could not update favorites'); }
}

/* ---------------- CART ---------------- */
async function loadCart(){
  try {
    cartData = await api('/cart');
  } catch(e){
    cartData = { items: [], totals: { subtotal:0, deliveryFee:0, tax:0, total:0 } };
  }
  renderCartCount();
  renderCartDrawer();
}
async function addToCart(id){
  try {
    cartData = await api('/cart', { method:'POST', body: JSON.stringify({ itemId:id, qty:1 }) });
    renderCartCount();
    renderCartDrawer();
    showToast('Added to your order');
  } catch(e){ showToast(e.message || 'Could not add item'); }
}
async function changeQty(id, delta){
  const line = cartData.items.find(c=>c.id===id);
  if(!line) return;
  const newQty = line.qty + delta;
  try {
    cartData = await api('/cart/' + id, { method:'PUT', body: JSON.stringify({ qty:newQty }) });
    renderCartCount();
    renderCartDrawer();
  } catch(e){ showToast('Could not update quantity'); }
}
async function removeFromCart(id){
  try {
    cartData = await api('/cart/' + id, { method:'DELETE' });
    renderCartCount();
    renderCartDrawer();
  } catch(e){ showToast('Could not remove item'); }
}
function renderCartCount(){
  const totalQty = cartData.items.reduce((s,c)=>s+c.qty,0);
  const badge = document.getElementById('cartCount');
  badge.style.display = totalQty>0 ? 'flex':'none';
  badge.textContent = totalQty;
}
function renderCartDrawer(){
  const body = document.getElementById('cartBody');
  if(cartData.items.length===0){
    body.innerHTML = `<div class="empty-state"><div class="e-icon">🎟️</div><div>Your order ticket is empty.<br>Add something tasty!</div></div>`;
  } else {
    body.innerHTML = cartData.items.map(item=>`
      <div class="ticket-item">
        <div class="ticket-emoji">${item.image ? `<img src="${item.image}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">` : item.emoji}</div>
        <div class="ticket-info">
          <div class="n">${item.name}</div>
          <div class="p">${fmt(item.price)} each</div>
        </div>
        <div class="qty-ctrl">
          <button data-dec="${item.id}">−</button>
          <span class="mono">${item.qty}</span>
          <button data-inc="${item.id}">+</button>
        </div>
        <button class="remove-x" data-remove="${item.id}">✕</button>
      </div>`).join('');
    body.querySelectorAll('[data-inc]').forEach(b=>b.addEventListener('click',()=>changeQty(parseInt(b.dataset.inc),1)));
    body.querySelectorAll('[data-dec]').forEach(b=>b.addEventListener('click',()=>changeQty(parseInt(b.dataset.dec),-1)));
    body.querySelectorAll('[data-remove]').forEach(b=>b.addEventListener('click',()=>removeFromCart(parseInt(b.dataset.remove))));
  }
  document.getElementById('drawerSubtotal').textContent = fmt(cartData.totals.subtotal);
  document.getElementById('drawerDelivery').textContent = fmt(cartData.totals.deliveryFee);
  document.getElementById('drawerTotal').textContent = fmt(cartData.totals.total);
}

/* ---------------- CHECKOUT ---------------- */
function renderCheckout(){
  const wrap = document.getElementById('checkoutItems');
  if(cartData.items.length===0){
    wrap.innerHTML = `<p style="color:var(--muted);font-size:13px;">No items yet — add something from the menu.</p>`;
  } else {
    wrap.innerHTML = cartData.items.map(item=>
      `<div class="summary-item"><span>${item.name} × ${item.qty}</span><span class="mono">${fmt(item.lineTotal)}</span></div>`
    ).join('');
  }
  document.getElementById('chkSubtotal').textContent = fmt(cartData.totals.subtotal);
  document.getElementById('chkDelivery').textContent = fmt(cartData.totals.deliveryFee);
  document.getElementById('chkTax').textContent = fmt(cartData.totals.tax);
  document.getElementById('chkTotal').textContent = fmt(cartData.totals.total);

  const user = getUser();
  if(user) document.getElementById('addrName').value = document.getElementById('addrName').value || user.name;
}

function validateCardDetails(){
  const cardName = document.getElementById('cardName')?.value.trim() || '';
  const cardNumber = document.getElementById('cardNumber')?.value.replace(/\s+/g, '') || '';
  const cardExpiry = document.getElementById('cardExpiry')?.value.trim() || '';
  const cardCvv = document.getElementById('cardCvv')?.value.trim() || '';

  if(!cardName){ return 'Please enter the cardholder name.'; }
  if(!/^\d{16}$/.test(cardNumber)){ return 'Please enter a valid 16-digit card number.'; }
  if(!/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry)){ return 'Please enter expiry in MM/YY format.'; }
  if(!/^\d{3,4}$/.test(cardCvv)){ return 'Please enter a valid CVV.'; }
  return null;
}

function proceedCardPayment(){
  const error = validateCardDetails();
  if(error){ showToast(error); return false; }
  showToast('Card details saved. You can place your order now.');
  return true;
}

async function placeOrder(){
  if(cartData.items.length===0){ showToast('Add items before placing an order'); return; }
  const address = {
    name: document.getElementById('addrName').value.trim(),
    phone: document.getElementById('addrPhone').value.trim(),
    line1: document.getElementById('addrLine1').value.trim(),
    line2: document.getElementById('addrLine2').value.trim(),
    city: document.getElementById('addrCity').value.trim(),
    pin: document.getElementById('addrPin').value.trim(),
    notes: document.getElementById('addrNotes').value.trim(),
  };
  if(!address.name || !address.phone || !address.line1 || !address.city || !address.pin){
    showToast('Please fill in your full delivery address');
    return;
  }
  const payment = document.querySelector('input[name="pay"]:checked').value;
  if(payment === 'card' && !proceedCardPayment()) return;

  try {
    const order = await api('/orders', { method:'POST', body: JSON.stringify({ address, payment }) });
    showToast(`🎉 Order ${order.id} placed!`);
    cartData = { items: [], totals: { subtotal:0, deliveryFee:0, tax:0, total:0 } };
    renderCartCount();
    renderCartDrawer();
    goToPage('home');
  } catch(e){
    showToast(e.message || 'Could not place order');
  }
}

async function loadOrders(){
  try {
    const orders = await api('/orders');
    const list = document.getElementById('ordersList');
    if(!orders.length){
      list.innerHTML = '<p style="color:var(--muted);">No orders yet. Your recent deliveries will appear here.</p>';
      return;
    }
    list.innerHTML = orders.map((order)=>{
      const steps = (order.tracking?.steps || []).map((step)=>`<div class="order-step ${step.active ? 'active' : ''} ${step.completed ? 'completed' : ''}">${step.label}</div>`).join('');
      return `
        <div class="order-card">
          <h4>${order.id}</h4>
          <div class="order-meta">
            <span>${new Date(order.createdAt).toLocaleString()}</span>
            <span>${order.status}</span>
            <span>${fmt(order.totals?.total || 0)}</span>
          </div>
          <div class="order-track">${steps}</div>
          <div class="order-actions">
            <button class="pill-btn chili" data-track="${order.id}">Advance tracking</button>
            <button class="pill-btn" data-cancel="${order.id}">Cancel</button>
          </div>
        </div>`;
    }).join('');
    list.querySelectorAll('[data-track]').forEach((btn)=>btn.addEventListener('click', ()=> updateOrder(btn.dataset.track, 'track')));
    list.querySelectorAll('[data-cancel]').forEach((btn)=>btn.addEventListener('click', ()=> updateOrder(btn.dataset.cancel, 'cancel')));
  } catch(e){
    document.getElementById('ordersList').innerHTML = '<p style="color:var(--muted);">Could not load order history.</p>';
  }
}

async function updateOrder(id, action){
  try {
    await api('/orders/' + id, { method:'PATCH', body: JSON.stringify({ action }) });
    showToast(action === 'cancel' ? 'Order cancelled.' : 'Tracking updated.');
    loadOrders();
  } catch(e){ showToast(e.message || 'Could not update order'); }
}

function openOrders(){
  const modal = document.getElementById('ordersModal');
  modal.classList.add('show');
  overlay.classList.add('show');
  loadOrders();
}
function closeOrdersFn(){
  document.getElementById('ordersModal').classList.remove('show');
  overlay.classList.remove('show');
}

/* ---------------- AUTH ---------------- */
function updateAccountIcon(){
  const btn = document.getElementById('loginBtn');
  const user = getUser();
  btn.textContent = user ? '😊' : '👤';
  btn.title = user ? `Signed in as ${user.name} — click to log out` : 'Account';
}
async function doLogin(){
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  if(!email || !password){ showToast('Enter your email and password'); return; }
  try {
    const res = await api('/auth/login', { method:'POST', body: JSON.stringify({ email, password }) });
    setSession(res.token, res.user);
    updateAccountIcon();
    closeAuthFn();
    showToast(`Welcome back, ${res.user.name.split(' ')[0]}!`);
    await loadFavorites();
    await loadCart();
  } catch(e){ showToast(e.message || 'Login failed'); }
}
async function doSignup(){
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  if(!name || !email || !password){ showToast('Fill in all fields to sign up'); return; }
  try {
    const res = await api('/auth/signup', { method:'POST', body: JSON.stringify({ name, email, password }) });
    setSession(res.token, res.user);
    updateAccountIcon();
    closeAuthFn();
    showToast(`Welcome, ${res.user.name.split(' ')[0]}!`);
    await loadFavorites();
    await loadCart();
  } catch(e){ showToast(e.message || 'Sign up failed'); }
}
async function handleForgotPassword(){
  const email = window.prompt('Enter the email linked to your account:');
  if(!email) return;
  const newPassword = window.prompt('Choose a new password:');
  if(!newPassword) return;
  try {
    await api('/auth/forgot-password', { method:'POST', body: JSON.stringify({ email: email.trim(), newPassword }) });
    showToast('Password changed successfully. Please log in.');
  } catch(e){ showToast(e.message || 'Could not reset password'); }
}
function doLogout(){
  clearSession();
  updateAccountIcon();
  showToast('Logged out');
  loadFavorites();
  loadCart();
}

/* ---------------- PAGE NAV ---------------- */
function goToPage(page){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+page).classList.add('active');
  document.querySelectorAll('.nav-links button[data-page]').forEach(b=>{
    b.classList.toggle('active', b.dataset.page===page);
  });
  if(page==='checkout') renderCheckout();
  window.scrollTo({top:0, behavior:'smooth'});
  document.getElementById('mobileNav').classList.remove('show');
}
function scrollToRestaurants(){
  goToPage('home');
  setTimeout(()=> document.getElementById('restaurantsSection').scrollIntoView({behavior:'smooth'}), 50);
}
function scrollToDelivery(){
  goToPage('home');
  setTimeout(()=> document.getElementById('deliverySection').scrollIntoView({behavior:'smooth'}), 50);
}

/* ---------------- EVENTS: NAV ---------------- */
document.querySelectorAll('[data-page]').forEach(el=>{
  el.addEventListener('click', ()=> goToPage(el.dataset.page));
});
document.getElementById('hamburger').addEventListener('click', ()=>{
  document.getElementById('mobileNav').classList.toggle('show');
});

/* ---------------- EVENTS: CART DRAWER ---------------- */
const drawer = document.getElementById('cartDrawer');
const overlay = document.getElementById('overlay');
function openCart(){ drawer.classList.add('show'); overlay.classList.add('show'); }
function closeCartFn(){ drawer.classList.remove('show'); overlay.classList.remove('show'); }
document.getElementById('cartBtn').addEventListener('click', openCart);
document.getElementById('closeCart').addEventListener('click', closeCartFn);
overlay.addEventListener('click', ()=>{ closeCartFn(); closeAuthFn(); closeOrdersFn(); });
document.getElementById('checkoutBtn').addEventListener('click', ()=>{
  closeCartFn();
  goToPage('checkout');
});
document.getElementById('ordersBtn').addEventListener('click', ()=>{
  closeCartFn();
  openOrders();
});

/* ---------------- EVENTS: ORDERS MODAL ---------------- */
document.getElementById('closeOrders').addEventListener('click', closeOrdersFn);

/* ---------------- EVENTS: AUTH MODAL ---------------- */
const authModal = document.getElementById('authModal');
function openAuth(){ authModal.classList.add('show'); overlay.classList.add('show'); }
function closeAuthFn(){ authModal.classList.remove('show'); overlay.classList.remove('show'); }
document.getElementById('loginBtn').addEventListener('click', ()=>{
  if(getUser()) doLogout();
  else openAuth();
});
document.getElementById('closeAuth').addEventListener('click', closeAuthFn);
document.querySelectorAll('.tab-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const isLogin = btn.dataset.tab==='login';
    document.getElementById('loginForm').style.display = isLogin?'block':'none';
    document.getElementById('signupForm').style.display = isLogin?'none':'block';
  });
});

/* ---------------- EVENTS: FAV FILTER ---------------- */
document.getElementById('favToggle').addEventListener('click', ()=>{
  uiState.showingFavoritesOnly = true;
  uiState.activeCategory = 'all';
  goToPage('menu');
  renderFilters();
  renderCategories();
  loadMenu();
});

/* ---------------- EVENTS: SEARCH ---------------- */
let searchDebounce;
function performSearch(){
  uiState.search = document.getElementById('searchInput').value.trim();
  uiState.showingFavoritesOnly = false;
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(()=>{
    goToPage('menu');
    loadMenu();
  }, 180);
}
document.getElementById('searchInput').addEventListener('input', (e)=>{
  uiState.search = e.target.value;
  uiState.showingFavoritesOnly = false;
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(loadMenu, 250);
});
document.getElementById('searchInput').addEventListener('keydown', (e)=>{
  if(e.key === 'Enter'){ e.preventDefault(); performSearch(); }
});
document.getElementById('searchButton').addEventListener('click', performSearch);

/* ---------------- EVENTS: DARK MODE ---------------- */
document.getElementById('darkToggle').addEventListener('click', ()=>{
  document.body.classList.toggle('dark');
  const dark = document.body.classList.contains('dark');
  document.getElementById('darkToggle').textContent = dark ? '☀️' : '🌙';
  localStorage.setItem('tt_dark', dark ? '1' : '0');
});

function createUpiQrMarkup(){
  const seed = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `
    <div class="upi-qr-card">
      <div class="upi-qr-head">Scan & pay with UPI</div>
      <img class="upi-qr-img" src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=upi%3A%2F%2Fpay%3Fpa%3Dtastyhub%40upi%26pn%3DTastyHub%26am%3D199" alt="UPI payment QR code" />
      <div class="upi-qr-meta">
        <strong>UPI ID</strong>
        <span>tastyhub@upi</span>
        <small>Ref: ${seed}</small>
      </div>
    </div>`;
}

function updatePaymentUi(){
  const selected = document.querySelector('input[name="pay"]:checked');
  const panel = document.getElementById('upiQrPanel');
  const cardForm = document.getElementById('cardPaymentForm');
  if (selected && selected.value === 'upi') {
    panel.style.display = 'block';
    panel.innerHTML = createUpiQrMarkup();
    cardForm.style.display = 'none';
  } else if (selected && selected.value === 'card') {
    panel.style.display = 'none';
    panel.innerHTML = '';
    cardForm.style.display = 'grid';
  } else {
    panel.style.display = 'none';
    panel.innerHTML = '';
    cardForm.style.display = 'none';
  }
}
document.querySelectorAll('input[name="pay"]').forEach((radio) => {
  radio.addEventListener('change', updatePaymentUi);
});
document.getElementById('cardProceedBtn').addEventListener('click', proceedCardPayment);

/* ---------------- INIT ---------------- */
async function init(){
  if(localStorage.getItem('tt_dark') === '1'){
    document.body.classList.add('dark');
    document.getElementById('darkToggle').textContent = '☀️';
  }
  updateAccountIcon();
  updatePaymentUi();
  renderHeroCarousel();
  window.setInterval(renderHeroCarousel, 2500);
  try {
    [categories, restaurants] = await Promise.all([
      api('/menu/categories'),
      api('/restaurants'),
    ]);
    renderCategories();
    renderRestaurants();
    renderFilters();
    renderPopular();
    loadMenu();
    loadFavorites();
    loadCart();
  } catch(e){
    showToast('The menu server is still warming up — it should appear shortly.');
    window.setTimeout(() => {
      renderCategories();
      renderRestaurants();
      renderFilters();
      renderPopular();
      loadMenu();
      loadFavorites();
      loadCart();
    }, 1200);
  }
}
init();
