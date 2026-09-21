/* ============================================================
   SHOPKART — auth.js
   Real authentication against the Flask + database backend.
   Passwords are hashed server-side and never touch LocalStorage;
   only the JWT access token and a cached copy of the profile
   (for instant, synchronous UI checks) are kept client-side.
   ============================================================ */

/** Synchronous check — true if we're holding an access token. */
function isLoggedIn(){
  return !!getToken();
}

/** Synchronous read of the last-known profile (kept in sync via refreshAuthState). */
function getCurrentUser(){
  try{ return JSON.parse(localStorage.getItem(SK_USER_KEY)); }
  catch(e){ return null; }
}

function isSeller(){
  const u = getCurrentUser();
  return !!(u && u.role === 'seller');
}

/** Call once at page bootstrap: validates the token with the server and refreshes the cached profile. */
async function refreshAuthState(){
  if(!getToken()){
    clearCachedUser();
    return null;
  }
  try{
    const user = await apiFetch('/auth/me');
    cacheUser(user);
    return user;
  }catch(e){
    // Token missing/expired/invalid — log out locally.
    clearToken();
    clearCachedUser();
    return null;
  }
}

async function registerUser({ name, email, phone, password, role }){
  try{
    const result = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, phone, password, role })
    });
    setToken(result.token);
    cacheUser(result.user);
    return { ok: true, user: result.user };
  }catch(e){
    return { ok: false, message: e.message };
  }
}

async function loginUser(email, password){
  try{
    const result = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setToken(result.token);
    cacheUser(result.user);
    return { ok: true, user: result.user };
  }catch(e){
    return { ok: false, message: e.message };
  }
}

function logoutUser(){
  clearToken();
  clearCachedUser();
  location.href = 'index.html';
}

/** Call on pages that require login. Redirects to login with a return path. */
function requireAuth(){
  if(!isLoggedIn()){
    showToast('Please login to continue.', 'info');
    setTimeout(() => {
      location.href = 'login.html?redirect=' + encodeURIComponent(location.pathname + location.search);
    }, 700);
    return false;
  }
  return true;
}

/** Call on pages that require a seller account. */
function requireSeller(){
  if(!requireAuth()) return false;
  if(!isSeller()){
    showToast('This page is only available to seller accounts.', 'error');
    setTimeout(() => location.href = 'index.html', 900);
    return false;
  }
  return true;
}
