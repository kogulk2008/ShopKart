/* ============================================================
   SHOPKART — products.js
   Product data now lives in the database; this file caches the
   catalog client-side (loaded once at bootstrap, refreshed after
   any seller CRUD action) and renders product/category cards.
   ============================================================ */

const SK_CATEGORIES = [
  { name: 'Electronics', icon: 'fa-microchip' },
  { name: 'Mobiles', icon: 'fa-mobile-screen' },
  { name: 'Laptops', icon: 'fa-laptop' },
  { name: 'Fashion', icon: 'fa-shirt' },
  { name: 'Shoes', icon: 'fa-shoe-prints' },
  { name: 'Toys', icon: 'fa-puzzle-piece' },
  { name: 'Books', icon: 'fa-book' },
  { name: 'Home & Kitchen', icon: 'fa-kitchen-set' },
  { name: 'Grocery', icon: 'fa-basket-shopping' },
  { name: 'Beauty', icon: 'fa-spa' },
  { name: 'Sports', icon: 'fa-dumbbell' },
  { name: 'Accessories', icon: 'fa-glasses' },
  { name: 'Healthcare', icon: 'fa-briefcase-medical' }
];

// Simple inline SVG placeholder generator — used as a default image for new
// seller products when no photo is uploaded.
function skImg(label, bg1, bg2){
  const text = encodeURIComponent(label);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'>
    <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0%' stop-color='${bg1}'/><stop offset='100%' stop-color='${bg2}'/>
    </linearGradient></defs>
    <rect width='400' height='400' rx='36' fill='url(#g)'/>
    <text x='50%' y='52%' font-size='30' font-family='Arial' fill='white' text-anchor='middle' dominant-baseline='middle' opacity='0.92'>${text}</text>
  </svg>`;
  return `data:image/svg+xml,${svg}`;
}

/* ---------------- Client-side product cache ---------------- */
let SK_PRODUCTS_CACHE = [];

/** Fetches the full catalog from the API and refreshes the cache. Call at bootstrap and after any CRUD. */
async function loadProductsCache(){
  try{
    SK_PRODUCTS_CACHE = await apiFetch('/products');
  }catch(e){
    console.error('Failed to load products:', e.message);
    showToast('Could not reach the ShopKart server. Is the backend running?', 'error');
    SK_PRODUCTS_CACHE = [];
  }
  return SK_PRODUCTS_CACHE;
}

/** Synchronous read from cache — safe to call anywhere after bootstrap has run. */
function getProducts(){
  return SK_PRODUCTS_CACHE;
}

function getProductById(id){
  return SK_PRODUCTS_CACHE.find(p => String(p.id) === String(id));
}

function getCategoryCount(catName){
  return SK_PRODUCTS_CACHE.filter(p => p.category === catName).length;
}

/* ---------------- Rendering helpers ---------------- */

function renderStars(rating){
  const full = Math.floor(rating);
  const half = (rating - full) >= 0.5;
  let html = '';
  for(let i=0;i<full;i++) html += '<i class="fa-solid fa-star"></i>';
  if(half) html += '<i class="fa-solid fa-star-half-stroke"></i>';
  for(let i=full+(half?1:0); i<5; i++) html += '<i class="fa-regular fa-star"></i>';
  return html;
}

function isInWishlist(id){
  return getWishlist().includes(Number(id));
}

/** Build a product card's HTML (used across home, products, wishlist, recently-viewed, etc). */
function productCardHTML(p){
  const wished = isInWishlist(p.id);
  const outOfStock = p.stock <= 0;
  return `
  <div class="product-card" data-id="${p.id}">
    <div class="product-thumb" onclick="location.href='product-details.html?id=${p.id}'" style="cursor:pointer;">
      ${p.discount ? `<span class="discount-tag">${p.discount}% OFF</span>` : ''}
      <img src="${p.image}" alt="${p.name}">
    </div>
    <button class="wishlist-btn ${wished ? 'active' : ''}" onclick="handleWishlistToggle(event, ${p.id})" aria-label="Toggle wishlist">
      <i class="fa-${wished ? 'solid' : 'regular'} fa-heart"></i>
    </button>
    <div class="product-body">
      <span class="product-cat">${p.category}</span>
      <a class="product-name" href="product-details.html?id=${p.id}">${p.name}</a>
      <div class="product-rating rating-stars">${renderStars(p.rating)} <span class="rate-num">${p.rating}</span></div>
      <div class="price-row">
        <span class="price-current">₹${p.price.toLocaleString('en-IN')}</span>
        ${p.originalPrice ? `<span class="price-old">₹${p.originalPrice.toLocaleString('en-IN')}</span>` : ''}
      </div>
      ${outOfStock ? '<span class="stock-warn"><i class="fa-solid fa-triangle-exclamation"></i> Out of stock</span>' : ''}
      <div class="product-actions">
        <button class="btn btn-sk-primary" ${outOfStock ? 'disabled' : ''} onclick="handleAddToCart(event, ${p.id})"><i class="fa-solid fa-cart-plus me-1"></i>Add to Cart</button>
      </div>
    </div>
  </div>`;
}

function renderProductGrid(containerEl, list, emptyMessage){
  if(!containerEl) return;
  if(!list.length){
    containerEl.innerHTML = `<div class="empty-mini w-100"><i class="fa-solid fa-box-open"></i><p>${emptyMessage || 'No products found.'}</p></div>`;
    return;
  }
  containerEl.innerHTML = list.map(p => `<div class="col-6 col-md-4 col-lg-3">${productCardHTML(p)}</div>`).join('');
}

function categoryCardHTML(cat){
  const count = getCategoryCount(cat.name);
  return `
  <div class="col-6 col-md-4 col-lg-2">
    <div class="cat-card" onclick="location.href='products.html?category=${encodeURIComponent(cat.name)}'">
      <div class="cat-icon"><i class="fa-solid ${cat.icon}"></i></div>
      <h6>${cat.name}</h6>
      <small>${count} products</small>
    </div>
  </div>`;
}
