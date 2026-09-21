/* ============================================================
   SHOPKART — app.js
   Shared chrome: navbar, footer, mobile menu, toasts,
   recently-viewed tracking, and the app bootstrap sequence.
   ============================================================ */

function currentPage(){
  const path = location.pathname.split('/').pop() || 'index.html';
  return path;
}

function navbarHTML(){
  const page = currentPage();
  const link = (href, label) => `<a href="${href}" class="${page === href ? 'active' : ''}">${label}</a>`;
  return `
  <div class="sk-nav-wrap">
    <nav class="sk-navbar">
      <a href="index.html" class="sk-logo">
        <span class="logo-badge"><i class="fa-solid fa-bag-shopping"></i></span>
        ShopKart
      </a>
      <div class="sk-nav-links">
        ${link('index.html', 'Home')}
        ${link('products.html', 'Categories')}
        ${link('deals.html', 'Deals')}
        ${link('about.html', 'About')}
      </div>
      <div class="sk-nav-actions">
        <a href="products.html" class="sk-icon-btn" title="Search"><i class="fa-solid fa-magnifying-glass"></i></a>
        <a href="${isLoggedIn() ? 'profile.html' : 'login.html'}" class="sk-icon-btn" title="Account"><i class="fa-regular fa-user"></i></a>
        <a href="wishlist.html" class="sk-icon-btn" title="Wishlist">
          <i class="fa-regular fa-heart"></i>
          <span class="sk-badge-count" id="navWishlistCount" style="display:none;">0</span>
        </a>
        <a href="cart.html" class="sk-icon-btn" title="Cart">
          <i class="fa-solid fa-cart-shopping"></i>
          <span class="sk-badge-count" id="navCartCount" style="display:none;">0</span>
        </a>
        <button class="sk-icon-btn sk-nav-toggle" id="mobileMenuBtn" title="Menu"><i class="fa-solid fa-bars"></i></button>
      </div>
    </nav>
  </div>

  <div class="sk-overlay" id="skOverlay"></div>
  <div class="sk-mobile-menu" id="skMobileMenu">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <span class="sk-logo" style="font-size:1.1rem;"><span class="logo-badge" style="width:32px;height:32px;font-size:.9rem;"><i class="fa-solid fa-bag-shopping"></i></span>ShopKart</span>
      <button class="sk-icon-btn" id="closeMobileMenu"><i class="fa-solid fa-xmark"></i></button>
    </div>
    ${link('index.html', 'Home')}
    ${link('products.html', 'Categories')}
    ${link('deals.html', 'Deals')}
    ${link('about.html', 'About')}
    ${link('cart.html', 'Cart')}
    ${link('wishlist.html', 'Wishlist')}
    ${isLoggedIn() ? link('profile.html', 'My Profile') : link('login.html', 'Login / Register')}
    ${isSeller() ? link('seller-dashboard.html', 'Seller Dashboard') : ''}
  </div>

  <div class="sk-bottom-nav">
    <a href="index.html" class="${page === 'index.html' ? 'active' : ''}"><i class="fa-solid fa-house"></i>Home</a>
    <a href="products.html" class="${page === 'products.html' ? 'active' : ''}"><i class="fa-solid fa-magnifying-glass"></i>Explore</a>
    <a href="cart.html" class="${page === 'cart.html' ? 'active' : ''}"><i class="fa-solid fa-cart-shopping"></i>Cart</a>
    <a href="wishlist.html" class="${page === 'wishlist.html' ? 'active' : ''}"><i class="fa-regular fa-heart"></i>Wishlist</a>
    <a href="${isLoggedIn() ? 'profile.html' : 'login.html'}" class="${page === 'profile.html' ? 'active' : ''}"><i class="fa-regular fa-user"></i>Account</a>
  </div>
  `;
}

function footerHTML(){
  return `
  <footer class="sk-footer">
    <div class="container container-xl">
      <div class="row g-4">
        <div class="col-6 col-md-3">
          <span class="sk-logo" style="font-size:1.15rem;"><span class="logo-badge" style="width:32px;height:32px;font-size:.9rem;"><i class="fa-solid fa-bag-shopping"></i></span>ShopKart</span>
          <p class="text-mist-dim small mt-3">A smart, modern marketplace for everything you need — backed by a real database, built from the ground up.</p>
          <div class="mt-3">
         <a href="YOUR_FACEBOOK_LINK" target="_blank" rel="noopener">
    <i class="fa-brands fa-facebook-f"></i>
</a>

<a href="https://www.instagram.com/kogul_2008/" target="_blank" rel="noopener">
    <i class="fa-brands fa-instagram"></i>
</a>

<a href="YOUR_X_LINK" target="_blank" rel="noopener">
    <i class="fa-brands fa-x-twitter"></i>
</a>

<a href="YOUR_YOUTUBE_LINK" target="_blank" rel="noopener">
    <i class="fa-brands fa-youtube"></i>
</a> </div>
        </div>
        <div class="col-6 col-md-3">
          <h6>Shopping</h6>
          <a href="products.html">All Products</a>
          <a href="deals.html">Today's Deals</a>
          <a href="wishlist.html">Wishlist</a>
          <a href="cart.html">My Cart</a>
        </div>
        <div class="col-6 col-md-3">
          <h6>Customer Support</h6>
          <a href="about.html">About ShopKart</a>
          <a href="orders.html">Track Order</a>
          <a href="#" onclick="return false;">Returns &amp; Refunds</a>
          <a href="#" onclick="return false;">Shipping Info</a>
          <a href="#" onclick="return false;">Contact Us</a>
        </div>
        <div class="col-6 col-md-3">
          <h6>Seller &amp; Legal</h6>
          <a href="seller-dashboard.html">Seller Dashboard</a>
          <a href="#" onclick="return false;">Privacy Policy</a>
          <a href="#" onclick="return false;">Terms of Service</a>
          <a href="#" onclick="return false;">Returns Policy</a>
        </div>
      </div>
      <hr style="border-color: var(--sk-glass-border); margin: 2rem 0 1.2rem;">
      <div class="d-flex flex-wrap justify-content-between gap-2 text-mist-dim small">
        <span>© <span id="footYear"></span> ShopKart. All rights reserved.</span>
        <span>Built as an original concept marketplace — not affiliated with any other retailer.</span>
      </div>
    </div>
  </footer>`;
}

function renderChrome(){
  const navEl = document.getElementById('navbar-placeholder');
  const footEl = document.getElementById('footer-placeholder');
  if(navEl) navEl.innerHTML = navbarHTML();
  if(footEl) footEl.innerHTML = footerHTML();
  const yearEl = document.getElementById('footYear');
  if(yearEl) yearEl.textContent = new Date().getFullYear();
  bindMobileMenu();
  updateNavBadges();
}

function bindMobileMenu(){
  const btn = document.getElementById('mobileMenuBtn');
  const menu = document.getElementById('skMobileMenu');
  const overlay = document.getElementById('skOverlay');
  const closeBtn = document.getElementById('closeMobileMenu');
  if(!menu || !overlay) return;
  const open = () => { menu.classList.add('open'); overlay.classList.add('open'); document.body.classList.add('no-scroll'); };
  const close = () => { menu.classList.remove('open'); overlay.classList.remove('open'); document.body.classList.remove('no-scroll'); };
  if(btn) btn.addEventListener('click', open);
  if(closeBtn) closeBtn.addEventListener('click', close);
  if(overlay) overlay.addEventListener('click', close);
}

function updateNavBadges(){
  const cartCount = typeof getCartCount === 'function' ? getCartCount() : 0;
  const wishCount = typeof getWishlist === 'function' ? getWishlist().length : 0;
  document.querySelectorAll('#navCartCount').forEach(el => {
    el.textContent = cartCount;
    el.style.display = cartCount > 0 ? 'flex' : 'none';
  });
  document.querySelectorAll('#navWishlistCount').forEach(el => {
    el.textContent = wishCount;
    el.style.display = wishCount > 0 ? 'flex' : 'none';
  });
}

/* ---------------- Toasts ---------------- */
function ensureToastStack(){
  let stack = document.getElementById('skToastStack');
  if(!stack){
    stack = document.createElement('div');
    stack.id = 'skToastStack';
    stack.className = 'sk-toast-stack';
    document.body.appendChild(stack);
  }
  return stack;
}

function showToast(message, type = 'info'){
  const stack = ensureToastStack();
  const icon = type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info';
  const toast = document.createElement('div');
  toast.className = `sk-toast ${type}`;
  toast.innerHTML = `<i class="fa-solid ${icon}"></i><span>${message}</span>`;
  stack.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity .3s ease, transform .3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(30px)';
    setTimeout(() => toast.remove(), 300);
  }, 2600);
}

/* ---------------- Recently viewed ---------------- */
function getRecentlyViewed(){
  try{ return JSON.parse(localStorage.getItem('sk_recent_views')) || []; }
  catch(e){ return []; }
}

function trackRecentlyViewed(productId){
  let list = getRecentlyViewed().filter(id => id !== Number(productId));
  list.unshift(Number(productId));
  list = list.slice(0, 10);
  localStorage.setItem('sk_recent_views', JSON.stringify(list));
}

function renderRecentlyViewed(containerId, excludeId){
  const el = document.getElementById(containerId);
  if(!el) return;
  const ids = getRecentlyViewed().filter(id => id !== Number(excludeId));
  const products = ids.map(id => getProductById(id)).filter(Boolean).slice(0, 8);
  const section = el.closest('section');
  if(!products.length){
    if(section) section.style.display = 'none';
    return;
  }
  if(section) section.style.display = '';
  el.innerHTML = products.map(p => productCardHTML(p)).join('');
}

/** Recommend products from categories the user has recently viewed. */
function renderRecommended(containerId, excludeId){
  const el = document.getElementById(containerId);
  if(!el) return;
  const recentIds = getRecentlyViewed();
  const section = el.closest('section');
  const recentProducts = recentIds.map(id => getProductById(id)).filter(Boolean);
  const categories = [...new Set(recentProducts.map(p => p.category))];
  let pool = getProducts().filter(p => categories.includes(p.category) && p.id !== Number(excludeId));
  if(pool.length < 4){
    const extra = getProducts().filter(p => !pool.includes(p) && p.id !== Number(excludeId))
      .sort((a,b) => b.rating - a.rating);
    pool = pool.concat(extra);
  }
  const finalList = pool.slice(0, 8);
  if(!finalList.length){
    if(section) section.style.display = 'none';
    return;
  }
  el.innerHTML = finalList.map(p => productCardHTML(p)).join('');
}

/* ---------------- Countdown timer (Flash Deals) ---------------- */
function startCountdown(elId, hours = 8){
  const el = document.getElementById(elId);
  if(!el) return;
  let target = sessionStorage.getItem('sk_deal_target');
  if(!target){
    target = Date.now() + hours * 3600 * 1000;
    sessionStorage.setItem('sk_deal_target', target);
  }
  target = Number(target);

  function tick(){
    let diff = Math.max(0, target - Date.now());
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    const pad = n => String(n).padStart(2, '0');
    el.innerHTML = `
      <div class="cd-box"><span class="cd-num">${pad(h)}</span><span class="cd-label">Hrs</span></div>
      <div class="cd-box"><span class="cd-num">${pad(m)}</span><span class="cd-label">Min</span></div>
      <div class="cd-box"><span class="cd-num">${pad(s)}</span><span class="cd-label">Sec</span></div>
    `;
    if(diff <= 0){
      sessionStorage.removeItem('sk_deal_target');
    }
  }
  tick();
  setInterval(tick, 1000);
}

/* ---------------- Bootstrap ----------------
   Sequence matters: we must know who's logged in (refreshAuthState)
   before rendering the navbar, and products/cart/wishlist must be
   loaded before any page-specific onDataReady() callback runs. */
document.addEventListener('DOMContentLoaded', async () => {
  await refreshAuthState();
  renderChrome();

  await Promise.all([
    loadProductsCache(),
    loadCartCache(),
    loadWishlistCache()
  ]);
  updateNavBadges();

  for(const fn of SK_READY_CALLBACKS){
    try{ await fn(); }
    catch(e){ console.error('onDataReady callback failed:', e); }
  }
});
