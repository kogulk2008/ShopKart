/* ============================================================
   SHOPKART — dashboard-sidebar.js
   Shared sidebar for Profile / Orders / Wishlist / Settings
   ============================================================ */

function renderDashboardSidebar(){
  const el = document.getElementById('dashSidebarPlaceholder');
  if(!el) return;
  if(!isLoggedIn()) return;

  const user = getCurrentUser();
  const page = currentPage();
  const initials = user && user.name ? user.name.trim().split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase() : 'U';

  const navItem = (href, icon, label) => `<a href="${href}" class="${page === href ? 'active' : ''}"><i class="fa-solid ${icon}"></i>${label}</a>`;

  el.outerHTML = `
  <div class="dash-sidebar card-surface" id="dashSidebarPlaceholder">
    <div class="profile-mini">
      <div class="dash-avatar">${initials}</div>
      <h6 class="mb-0">${user ? user.name : 'Guest'}</h6>
      <small class="text-mist-dim">${user ? user.email : ''}</small>
    </div>
    <nav>
      ${navItem('profile.html', 'fa-user', 'My Profile')}
      ${navItem('orders.html', 'fa-box', 'My Orders')}
      ${navItem('wishlist.html', 'fa-heart', 'Wishlist')}
      ${navItem('profile.html#addresses', 'fa-location-dot', 'Addresses')}
      ${navItem('profile.html#settings', 'fa-gear', 'Settings')}
      <a href="#" onclick="logoutUser(); return false;"><i class="fa-solid fa-right-from-bracket"></i>Logout</a>
    </nav>
  </div>`;
}

onDataReady(renderDashboardSidebar);
