/* ============================================================
   SHOPKART — api.js
   Thin fetch() wrapper for talking to the Flask backend.
   Must load before every other ShopKart script.
   ============================================================ */

const API_BASE = '/api';
const SK_TOKEN_KEY = 'sk_token';
const SK_USER_KEY = 'sk_user';

/* ---------------- Ready-callback queue ----------------
   Page scripts register work that needs products/cart/wishlist
   data already loaded. app.js runs these, in order, once the
   initial data fetch is complete. */
const SK_READY_CALLBACKS = [];
function onDataReady(fn){ SK_READY_CALLBACKS.push(fn); }

function getToken(){ return localStorage.getItem(SK_TOKEN_KEY); }
function setToken(token){ localStorage.setItem(SK_TOKEN_KEY, token); }
function clearToken(){ localStorage.removeItem(SK_TOKEN_KEY); }

function cacheUser(user){ localStorage.setItem(SK_USER_KEY, JSON.stringify(user)); }
function clearCachedUser(){ localStorage.removeItem(SK_USER_KEY); }

async function apiFetch(path, options = {}){
  const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
  const token = getToken();
  if(token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try{
    res = await fetch(API_BASE + path, Object.assign({}, options, { headers }));
  }catch(networkErr){
    const err = new Error('Could not reach the ShopKart server. Is the backend running?');
    err.status = 0;
    throw err;
  }

  let data = null;
  try{ data = await res.json(); }catch(e){ data = null; }

  if(!res.ok){
    const err = new Error((data && data.message) || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}
