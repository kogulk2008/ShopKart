/* ============================================================
   SHOPKART — cart.js
   Cart now lives server-side, scoped to the logged-in user.
   This file caches it client-side and renders the cart page.
   ============================================================ */

let SK_CART_CACHE = [];

/** Fetches the current user's cart from the API. Call at bootstrap (and after login/logout). */
async function loadCartCache(){
  if(!isLoggedIn()){ SK_CART_CACHE = []; return SK_CART_CACHE; }
  try{
    SK_CART_CACHE = await apiFetch('/cart');
  }catch(e){
    SK_CART_CACHE = [];
  }
  return SK_CART_CACHE;
}

function getCart(){
  return SK_CART_CACHE;
}

function getCartCount(){
  return SK_CART_CACHE.reduce((sum, item) => sum + item.qty, 0);
}

async function addToCart(productId, qty = 1){
  try{
    SK_CART_CACHE = await apiFetch('/cart', {
      method: 'POST',
      body: JSON.stringify({ productId: Number(productId), qty })
    });
    updateNavBadges();
    return true;
  }catch(e){
    showToast(e.message || 'Could not add to cart.', 'error');
    return false;
  }
}

async function removeFromCart(productId){
  try{
    SK_CART_CACHE = await apiFetch(`/cart/${productId}`, { method: 'DELETE' });
  }catch(e){
    showToast(e.message || 'Could not remove item.', 'error');
  }
  updateNavBadges();
}

async function updateCartQty(productId, qty){
  if(qty < 1) qty = 1;
  try{
    SK_CART_CACHE = await apiFetch(`/cart/${productId}`, {
      method: 'PUT',
      body: JSON.stringify({ qty })
    });
  }catch(e){
    showToast(e.message || 'Could not update quantity.', 'error');
  }
  updateNavBadges();
  if(document.getElementById('cartItemsList')) renderCartPage();
}

/** Wrapper for the Remove button — awaits the API call, then re-renders. */
async function removeCartItemAndRefresh(productId){
  await removeFromCart(productId);
  renderCartPage();
}

async function handleAddToCart(event, productId){
  if(event) event.stopPropagation();
  if(!isLoggedIn()){
    showToast('Please login to add items to your cart.', 'info');
    setTimeout(() => location.href = 'login.html?redirect=' + encodeURIComponent(location.pathname + location.search), 900);
    return;
  }
  const product = getProductById(productId);
  const ok = await addToCart(productId, 1);
  if(ok && product) showToast(`${product.name} added to cart`, 'success');
}

function cartSubtotal(){
  return SK_CART_CACHE.reduce((sum, item) => {
    const p = getProductById(item.id);
    return p ? sum + (p.price * item.qty) : sum;
  }, 0);
}

function cartOriginalTotal(){
  return SK_CART_CACHE.reduce((sum, item) => {
    const p = getProductById(item.id);
    return p ? sum + ((p.originalPrice || p.price) * item.qty) : sum;
  }, 0);
}

/* ---------------- Cart page rendering ---------------- */

function renderCartPage(){
  const listEl = document.getElementById('cartItemsList');
  const emptyEl = document.getElementById('cartEmptyState');
  const summaryEl = document.getElementById('cartSummaryBox');
  if(!listEl) return;

  const cart = getCart();
  if(!cart.length){
    listEl.innerHTML = '';
    if(emptyEl) emptyEl.style.display = 'block';
    if(summaryEl) summaryEl.style.display = 'none';
    return;
  }
  if(emptyEl) emptyEl.style.display = 'none';
  if(summaryEl) summaryEl.style.display = 'block';

  listEl.innerHTML = cart.map(item => {
    const p = getProductById(item.id);
    if(!p) return '';
    return `
    <div class="cart-item">
      <img src="${p.image}" alt="${p.name}">
      <div class="flex-grow-1">
        <div class="d-flex justify-content-between">
          <a href="product-details.html?id=${p.id}" class="fw-semibold text-white">${p.name}</a>
          <div>
            <span class="fw-bold text-white">₹${(p.price * item.qty).toLocaleString('en-IN')}</span>
          </div>
        </div>
        <div class="text-mist-dim small mb-2">${p.category} · ₹${p.price.toLocaleString('en-IN')} each</div>
        <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div class="qty-selector">
            <button onclick="updateCartQty(${p.id}, ${item.qty - 1})"><i class="fa-solid fa-minus"></i></button>
            <span class="qty-val">${item.qty}</span>
            <button onclick="updateCartQty(${p.id}, ${item.qty + 1})"><i class="fa-solid fa-plus"></i></button>
          </div>
          <div class="d-flex gap-2">
            <button class="btn btn-sk-ghost btn-sm-icon" title="Move to wishlist" onclick="moveCartItemToWishlist(${p.id})"><i class="fa-regular fa-heart"></i></button>
            <button class="btn btn-sk-danger btn-sm-icon" title="Remove" onclick="removeCartItemAndRefresh(${p.id})"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');

  renderCartSummary();
}

function renderCartSummary(){
  const subtotal = cartSubtotal();
  const originalTotal = cartOriginalTotal();
  const discount = Math.max(0, originalTotal - subtotal);
  const delivery = subtotal > 0 && subtotal < 999 ? 79 : 0;
  const total = subtotal + delivery;

  const setText = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
  setText('sumSubtotal', `₹${subtotal.toLocaleString('en-IN')}`);
  setText('sumDiscount', `- ₹${discount.toLocaleString('en-IN')}`);
  setText('sumDelivery', delivery === 0 ? 'FREE' : `₹${delivery}`);
  setText('sumTotal', `₹${total.toLocaleString('en-IN')}`);
}

async function moveCartItemToWishlist(productId){
  await addToWishlistSilently(productId);
  await removeFromCart(productId);
  renderCartPage();
  showToast('Moved to wishlist', 'success');
}

onDataReady(() => {
  if(document.getElementById('cartItemsList')) renderCartPage();
});
