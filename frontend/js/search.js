/* ============================================================
   SHOPKART — search.js
   Products listing page: search, filters, sorting
   ============================================================ */

let SK_ALL_PRODUCTS = [];

function initProductsPage(){
  const grid = document.getElementById('productsGrid');
  if(!grid) return;

  SK_ALL_PRODUCTS = getProducts();
  populateCategoryFilters();

  const params = new URLSearchParams(location.search);
  const initialSearch = params.get('search') || '';
  const initialCategory = params.get('category') || '';

  const searchInput = document.getElementById('productSearchInput');
  if(searchInput) searchInput.value = initialSearch;

  if(initialCategory){
    const cb = document.querySelector(`.cat-filter-cb[value="${CSS.escape(initialCategory)}"]`);
    if(cb) cb.checked = true;
  }

  bindFilterEvents();
  applyFiltersAndRender();
}

function populateCategoryFilters(){
  const wrap = document.getElementById('categoryFilterList');
  if(!wrap) return;
  wrap.innerHTML = SK_CATEGORIES.map(cat => `
    <div class="form-check mb-2">
      <input class="form-check-input cat-filter-cb" type="checkbox" value="${cat.name}" id="cat-${cat.name.replace(/[^a-zA-Z0-9]/g,'')}">
      <label class="form-check-label" for="cat-${cat.name.replace(/[^a-zA-Z0-9]/g,'')}">${cat.name} <span class="text-mist-dim">(${getCategoryCount(cat.name)})</span></label>
    </div>`).join('');
}

function bindFilterEvents(){
  const searchInput = document.getElementById('productSearchInput');
  if(searchInput){
    searchInput.addEventListener('input', debounce(applyFiltersAndRender, 250));
  }
  document.querySelectorAll('.cat-filter-cb').forEach(cb => cb.addEventListener('change', applyFiltersAndRender));
  document.querySelectorAll('.rating-filter-cb').forEach(cb => cb.addEventListener('change', applyFiltersAndRender));
  const priceRange = document.getElementById('priceRangeInput');
  if(priceRange){
    priceRange.addEventListener('input', () => {
      document.getElementById('priceRangeVal').textContent = `₹${Number(priceRange.value).toLocaleString('en-IN')}`;
      applyFiltersAndRender();
    });
  }
  const availCb = document.getElementById('availabilityFilterCb');
  if(availCb) availCb.addEventListener('change', applyFiltersAndRender);
  const sortSelect = document.getElementById('sortSelect');
  if(sortSelect) sortSelect.addEventListener('change', applyFiltersAndRender);
  const clearBtn = document.getElementById('clearFiltersBtn');
  if(clearBtn) clearBtn.addEventListener('click', clearAllFilters);
}

function debounce(fn, delay){
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

function clearAllFilters(){
  const searchInput = document.getElementById('productSearchInput');
  if(searchInput) searchInput.value = '';
  document.querySelectorAll('.cat-filter-cb').forEach(cb => cb.checked = false);
  document.querySelectorAll('.rating-filter-cb').forEach(cb => cb.checked = false);
  const availCb = document.getElementById('availabilityFilterCb');
  if(availCb) availCb.checked = false;
  const priceRange = document.getElementById('priceRangeInput');
  if(priceRange){ priceRange.value = priceRange.max; document.getElementById('priceRangeVal').textContent = `₹${Number(priceRange.max).toLocaleString('en-IN')}`; }
  const sortSelect = document.getElementById('sortSelect');
  if(sortSelect) sortSelect.value = 'popular';
  history.replaceState(null, '', location.pathname);
  applyFiltersAndRender();
}

function applyFiltersAndRender(){
  SK_ALL_PRODUCTS = getProducts();
  let list = [...SK_ALL_PRODUCTS];

  const query = (document.getElementById('productSearchInput')?.value || '').trim().toLowerCase();
  if(query){
    list = list.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query) ||
      (p.description || '').toLowerCase().includes(query)
    );
  }

  const selectedCats = Array.from(document.querySelectorAll('.cat-filter-cb:checked')).map(cb => cb.value);
  if(selectedCats.length){
    list = list.filter(p => selectedCats.includes(p.category));
  }

  const priceRange = document.getElementById('priceRangeInput');
  if(priceRange){
    const maxPrice = Number(priceRange.value);
    list = list.filter(p => p.price <= maxPrice);
  }

  const selectedRatings = Array.from(document.querySelectorAll('.rating-filter-cb:checked')).map(cb => Number(cb.value));
  if(selectedRatings.length){
    const minRating = Math.min(...selectedRatings);
    list = list.filter(p => p.rating >= minRating);
  }

  const availCb = document.getElementById('availabilityFilterCb');
  if(availCb && availCb.checked){
    list = list.filter(p => p.stock > 0);
  }

  const sortVal = document.getElementById('sortSelect')?.value || 'popular';
  switch(sortVal){
    case 'newest': list.sort((a,b) => b.id - a.id); break;
    case 'price-low': list.sort((a,b) => a.price - b.price); break;
    case 'price-high': list.sort((a,b) => b.price - a.price); break;
    case 'rating': list.sort((a,b) => b.rating - a.rating); break;
    default: list.sort((a,b) => (b.rating * 100 + (100 - a.discount)) - (a.rating * 100)); // popular: rating-weighted
  }

  const grid = document.getElementById('productsGrid');
  renderProductGrid(grid, list, 'No products match your filters. Try adjusting search or filters.');

  const countEl = document.getElementById('resultsCount');
  if(countEl) countEl.textContent = `${list.length} product${list.length !== 1 ? 's' : ''} found`;
}

onDataReady(initProductsPage);
