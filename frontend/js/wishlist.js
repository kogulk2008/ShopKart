/* ============================================================
   SHOPKART — wishlist.js
   Wishlist now lives server-side, scoped to the logged-in user.
   ============================================================ */

let SK_WISHLIST_CACHE = [];

/** Fetches the current user's wishlist (array of product ids). Call at bootstrap. */
async function loadWishlistCache(){
  if(!isLoggedIn()){ SK_WISHLIST_CACHE = []; return SK_WISHLIST_CACHE; }
  try{
    SK_WISHLIST_CACHE = await apiFetch('/wishlist');
  }catch(e){
    SK_WISHLIST_CACHE = [];
  }
  return SK_WISHLIST_CACHE;
}

function getWishlist(){
  return SK_WISHLIST_CACHE;
}

/** Toggles wishlist state on the server and updates the local cache. Returns the new active state. */
async function toggleWishlist(productId){
  const id = Number(productId);
  try{
    const res = await apiFetch(`/wishlist/${id}`, { method: 'POST' });
    if(res.active) SK_WISHLIST_CACHE.push(id);
    else SK_WISHLIST_CACHE = SK_WISHLIST_CACHE.filter(i => i !== id);
    updateNavBadges();
    return res.active;
  }catch(e){
    showToast(e.message || 'Could not update wishlist.', 'error');
    return SK_WISHLIST_CACHE.includes(id);
  }
}

/** Adds to the wishlist only if not already present (used by "move to wishlist" from the cart). */
async function addToWishlistSilently(productId){
  const id = Number(productId);
  if(!SK_WISHLIST_CACHE.includes(id)){
    await toggleWishlist(id);
  }
}

async function handleWishlistToggle(event, productId){
  if(event) event.stopPropagation();
  if(!isLoggedIn()){
    showToast('Please login to use your wishlist.', 'info');
    setTimeout(() => location.href = 'login.html?redirect=' + encodeURIComponent(location.pathname + location.search), 900);
    return;
  }
  const nowActive = await toggleWishlist(productId);
  showToast(nowActive ? 'Added to wishlist' : 'Removed from wishlist', nowActive ? 'success' : 'info');
  // Refresh any wishlist buttons for this product across the page
  document.querySelectorAll(`.wishlist-btn`).forEach(btn => {
    const card = btn.closest('[data-id]');
    if(card && Number(card.dataset.id) === Number(productId)){
      btn.classList.toggle('active', nowActive);
      btn.innerHTML = `<i class="fa-${nowActive ? 'solid' : 'regular'} fa-heart"></i>`;
    }
  });
  if(document.getElementById('wishlistGrid')) renderWishlistPage();
}

function renderWishlistPage(){
  const grid = document.getElementById('wishlistGrid');
  const emptyEl = document.getElementById('wishlistEmptyState');
  if(!grid) return;
  const ids = getWishlist();
  const products = ids.map(id => getProductById(id)).filter(Boolean);

  if(!products.length){
    grid.innerHTML = '';
    if(emptyEl) emptyEl.style.display = 'block';
    return;
  }
  if(emptyEl) emptyEl.style.display = 'none';
  grid.innerHTML = products.map(p => `<div class="col-6 col-md-4 col-lg-3">${productCardHTML(p)}</div>`).join('');
}

onDataReady(() => {
  if(document.getElementById('wishlistGrid')) renderWishlistPage();

  // On the wishlist page, "Add to Cart" acts as "Move to Cart": it also removes the item from the wishlist.
  const grid = document.getElementById('wishlistGrid');
  if(grid){
    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('.product-actions .btn-sk-primary');
      if(!btn) return;
      const card = btn.closest('[data-id]');
      if(!card) return;
      const id = Number(card.dataset.id);
      setTimeout(() => {
        if(getCart().some(i => i.id === id)){
          toggleWishlist(id).then(() => {
            renderWishlistPage();
            showToast('Moved to cart', 'success');
          });
        }
      }, 150);
    });
  }
});
