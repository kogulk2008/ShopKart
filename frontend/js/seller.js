/* ============================================================
   SHOPKART — seller.js
   Seller dashboard: product CRUD, orders view, sales overview.
   All writes go through the API and hit the real database.
   ============================================================ */

let SK_EDIT_PRODUCT_ID = null;
let SK_PRODUCT_IMAGE_DATA = null;
let SK_SELLER_ORDERS_CACHE = [];

async function initSellerDashboard(){
  const wrap = document.getElementById('sellerDashboard');
  if(!wrap) return;
  if(!requireSeller()) return;

  populateSellerCategoryOptions();
  renderSellerProducts();
  await refreshSellerOrders();

  document.getElementById('productForm').addEventListener('submit', handleProductFormSubmit);
  document.getElementById('productImageInput').addEventListener('change', handleImagePreview);
  document.getElementById('addProductBtn').addEventListener('click', () => openProductModal());
}

function populateSellerCategoryOptions(){
  const sel = document.getElementById('productCategorySelect');
  if(!sel) return;
  sel.innerHTML = SK_CATEGORIES.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
}

function handleImagePreview(e){
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    SK_PRODUCT_IMAGE_DATA = ev.target.result;
    document.getElementById('imagePreview').src = SK_PRODUCT_IMAGE_DATA;
    document.getElementById('imagePreviewWrap').classList.remove('d-none');
  };
  reader.readAsDataURL(file);
}

function openProductModal(product){
  SK_PRODUCT_IMAGE_DATA = null;
  const form = document.getElementById('productForm');
  form.reset();
  document.getElementById('imagePreviewWrap').classList.add('d-none');
  document.getElementById('productModalTitle').textContent = product ? 'Edit Product' : 'Add Product';

  if(product){
    SK_EDIT_PRODUCT_ID = product.id;
    document.getElementById('productName').value = product.name;
    document.getElementById('productCategorySelect').value = product.category;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productOriginalPrice').value = product.originalPrice || '';
    document.getElementById('productStock').value = product.stock;
    document.getElementById('productRating').value = product.rating;
    document.getElementById('productDescription').value = product.description || '';
    SK_PRODUCT_IMAGE_DATA = product.image;
    document.getElementById('imagePreview').src = product.image;
    document.getElementById('imagePreviewWrap').classList.remove('d-none');
  } else {
    SK_EDIT_PRODUCT_ID = null;
  }

  const modal = new bootstrap.Modal(document.getElementById('productModal'));
  modal.show();
}

async function handleProductFormSubmit(e){
  e.preventDefault();
  const name = document.getElementById('productName').value.trim();
  const category = document.getElementById('productCategorySelect').value;
  const price = Number(document.getElementById('productPrice').value);
  const originalPrice = Number(document.getElementById('productOriginalPrice').value) || price;
  const stock = Number(document.getElementById('productStock').value);
  const rating = Math.min(5, Math.max(0, Number(document.getElementById('productRating').value) || 4.0));
  const description = document.getElementById('productDescription').value.trim();

  if(!name || !category || !price || stock < 0){
    showToast('Please fill in all required fields correctly.', 'error');
    return;
  }

  const payload = {
    name, category, price, originalPrice, stock, rating, description,
    image: SK_PRODUCT_IMAGE_DATA || skImg(name.slice(0, 14), '#3b6bff', '#3fd0ff')
  };

  const submitBtn = e.target.querySelector('button[type="submit"]');
  if(submitBtn){ submitBtn.disabled = true; }

  try{
    if(SK_EDIT_PRODUCT_ID){
      await apiFetch(`/products/${SK_EDIT_PRODUCT_ID}`, { method: 'PUT', body: JSON.stringify(payload) });
      showToast('Product updated successfully.', 'success');
    } else {
      await apiFetch('/products', { method: 'POST', body: JSON.stringify(payload) });
      showToast('Product added successfully.', 'success');
    }
    await loadProductsCache();
    bootstrap.Modal.getInstance(document.getElementById('productModal')).hide();
    renderSellerProducts();
  }catch(err){
    showToast(err.message || 'Could not save product.', 'error');
  }finally{
    if(submitBtn){ submitBtn.disabled = false; }
  }
}

async function deleteSellerProduct(id){
  if(!confirm('Delete this product? This cannot be undone.')) return;
  try{
    await apiFetch(`/products/${id}`, { method: 'DELETE' });
    await loadProductsCache();
    renderSellerProducts();
    showToast('Product deleted.', 'success');
  }catch(err){
    showToast(err.message || 'Could not delete product.', 'error');
  }
}

function editSellerProduct(id){
  const product = getProductById(id);
  if(product) openProductModal(product);
}

function renderSellerProducts(){
  const tbody = document.getElementById('sellerProductsBody');
  if(!tbody) return;
  const products = getProducts();
  if(!products.length){
    tbody.innerHTML = `<tr><td colspan="7" class="empty-mini"><i class="fa-solid fa-box-open"></i>No products yet. Add your first product.</td></tr>`;
    renderSellerStats();
    return;
  }
  tbody.innerHTML = products.map(p => `
    <tr>
      <td><img src="${p.image}" alt="${p.name}"></td>
      <td>${p.name}</td>
      <td>${p.category}</td>
      <td>₹${p.price.toLocaleString('en-IN')}</td>
      <td>${p.stock > 0 ? p.stock : '<span class="text-danger">Out</span>'}</td>
      <td>${p.rating} <i class="fa-solid fa-star text-warning" style="font-size:.75rem;"></i></td>
      <td>
        <button class="btn btn-sk-ghost btn-sm-icon" style="width:34px;height:34px;" title="Edit" onclick="editSellerProduct(${p.id})"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-sk-danger btn-sm-icon" style="width:34px;height:34px;" title="Delete" onclick="deleteSellerProduct(${p.id})"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>`).join('');
  renderSellerStats();
}

function renderSellerStats(){
  const products = getProducts();
  const orders = SK_SELLER_ORDERS_CACHE;
  const totalSales = orders.reduce((sum, o) => sum + (o.totals ? o.totals.total : 0), 0);
  const setText = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
  setText('statTotalProducts', products.length);
  setText('statTotalOrders', orders.length);
  setText('statTotalSales', `₹${totalSales.toLocaleString('en-IN')}`);
  setText('statOutOfStock', products.filter(p => p.stock <= 0).length);
}

async function refreshSellerOrders(){
  SK_SELLER_ORDERS_CACHE = await getOrdersFromAPI();
  renderSellerOrders();
  renderSellerStats();
}

const SK_ORDER_STATUSES = ['Ordered', 'Packed', 'Shipped', 'Delivered'];

function renderSellerOrders(){
  const wrap = document.getElementById('sellerOrdersList');
  if(!wrap) return;
  const orders = SK_SELLER_ORDERS_CACHE;
  if(!orders.length){
    wrap.innerHTML = `<div class="empty-mini"><i class="fa-solid fa-receipt"></i>No orders placed yet.</div>`;
    return;
  }
  wrap.innerHTML = orders.map(o => `
    <div class="order-card card-surface">
      <div class="d-flex justify-content-between flex-wrap gap-2 mb-2">
        <div>
          <div class="fw-semibold">Order #${o.id}</div>
          <div class="text-mist-dim small">${new Date(o.date).toLocaleString('en-IN')} · ${o.items.length} item(s) · ${o.userEmail || ''}</div>
        </div>
        <div class="text-end">
          <span class="status-badge status-${o.status}">${o.status}</span>
          <div class="fw-bold mt-1">₹${o.totals.total.toLocaleString('en-IN')}</div>
        </div>
      </div>
      <div class="d-flex align-items-center gap-2 flex-wrap">
        <label class="text-mist small mb-0">Update status:</label>
        <select class="form-select form-select-sm" style="width:auto;" onchange="handleOrderStatusChange('${o.id}', this.value)">
          ${SK_ORDER_STATUSES.map(s => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </div>
    </div>`).join('');
}

async function handleOrderStatusChange(orderCode, status){
  const updated = await updateOrderStatus(orderCode, status);
  if(updated){
    showToast(`Order ${orderCode} marked as ${status}.`, 'success');
    await refreshSellerOrders();
  }
}

onDataReady(initSellerDashboard);
