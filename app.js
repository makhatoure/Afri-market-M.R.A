// ========================================================
// AfroBaza — LOGIQUE GLOBALE ET HYBRIDE (SUPABASE + FALLBACK)
// ========================================================

const CART_KEY = 'AfroBaza_cart';

// ---- CHARGEMENT DES PRODUITS (SUPABASE REEL) ----
async function loadProducts(category = null) {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 40px;">Chargement des produits...</div>';

  try {
    let dbProducts = [];
    if (typeof fetchProductsFromDB === 'function') {
      dbProducts = await fetchProductsFromDB(category);
    }

    if (!dbProducts || dbProducts.length === 0) {
      grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: #666;">Aucun produit trouvé dans la base de données.</div>';
      return;
    }

    grid.innerHTML = dbProducts.map(p => `
      <div class="product-card" onclick="window.location.href='fiche-produit.html?id=${p.id}'">
        <div class="product-card-img"><img src="${p.image_url || 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400&q=80'}" alt="${p.name}" loading="lazy"></div>
        <div class="product-card-body">
          <h3>${p.name}</h3>
          <div class="product-price">
            <strong>À partir de : ${Number(p.price_fcfa).toLocaleString('fr-FR')} FCFA / ${p.unit}</strong>
            <div class="product-min">Commande min. : ${p.min_quantity} ${p.unit}s</div>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Erreur lors du chargement des produits Supabase:', err);
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: red;">Erreur de connexion à la base de données.</div>';
  }
}

// ---- AUTHENTIFICATION ----
function getSupabaseClient() {
  if (typeof supabaseClient !== 'undefined' && supabaseClient) return supabaseClient;
  if (typeof initSupabaseClient === 'function') return initSupabaseClient();
  return null;
}

async function registerUser(email, password, fullName, role, companyName) {
  const client = getSupabaseClient();
  if (!client) return { error: 'Client Supabase non initialisé.' };
  try {
    // 1. Inscription Auth
    const { data, error } = await client.auth.signUp({
      email, password, options: { data: { full_name: fullName, role, company: companyName } }
    });
    if (error) throw error;

    // 2. Création manuelle du profil en base (si un ID utilisateur est retourné)
    if (data.user) {
      try {
        await client.from('profiles').insert([{
          id: data.user.id,
          email: email,
          full_name: fullName,
          role: role || 'commercant',
          company_name: companyName || null
        }]);
      } catch (profileErr) {
        console.warn('Création du profil secondaire ignorée:', profileErr);
      }
    }

    localStorage.setItem('AfroBaza_user', JSON.stringify({ id: data.user?.id, email, name: fullName, role }));
    return { data: data.user };
  } catch (err) {
    return { error: err.message };
  }
}

async function loginUser(email, password) {
  const client = getSupabaseClient();
  if (!client) return { error: 'Client Supabase non connecté' };
  try {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const userSession = { id: data.user.id, email: data.user.email, name: email.split('@')[0], role: 'commercant' };
    localStorage.setItem('AfroBaza_user', JSON.stringify(userSession));
    return { data: userSession };
  } catch (err) {
    return { error: err.message };
  }
}

function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem('AfroBaza_user')); } catch { return null; }
}

function logoutUser() {
  const client = getSupabaseClient();
  if (client) client.auth.signOut();
  localStorage.removeItem('AfroBaza_user');
  window.location.href = 'index.html';
}

// ---- PANIER & TOAST ----
function getCart() { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; } }
function saveCart(cart) { localStorage.setItem(CART_KEY, JSON.stringify(cart)); updateCartBadge(); }

function addToCart(product, qty = 1) {
  const cart = getCart();
  const existing = cart.find(i => i.id === product.id);
  if (existing) { existing.qty += qty; } else { cart.push({ ...product, qty }); }
  saveCart(cart);
  showToast('✓ Produit ajouté au panier', 'success');
}

function updateCartBadge() {
  const cart = getCart();
  const total = cart.reduce((s, i) => s + i.qty, 0);
  document.querySelectorAll('.cart-badge').forEach(b => {
    b.textContent = total;
    b.style.display = total > 0 ? 'flex' : 'none';
  });
}

function showToast(msg, type = '') {
  let container = document.querySelector('.toast-container');
  if (!container) { container = document.createElement('div'); container.className = 'toast-container'; document.body.appendChild(container); }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 2500);
}

// ---- INITIALISATION AUTO ----
document.addEventListener('DOMContentLoaded', () => {
  const user = getCurrentUser();
  const navCta = document.getElementById('nav-cta');
  const navActions = document.querySelector('.nav-actions');

  if (user) {
    if (navCta) {
      navCta.textContent = 'Mon espace (' + (user.name || user.email.split('@')[0]) + ')';
      navCta.href = 'dashboard.html';
    }

    if (navActions && !document.getElementById('logout-btn-nav')) {
      const logoutBtn = document.createElement('button');
      logoutBtn.id = 'logout-btn-nav';
      logoutBtn.className = 'btn-outline';
      logoutBtn.style.borderColor = '#ef4444';
      logoutBtn.style.color = '#ef4444';
      logoutBtn.style.padding = '8px 14px';
      logoutBtn.style.fontSize = '13px';
      logoutBtn.style.cursor = 'pointer';
      logoutBtn.textContent = 'Déconnexion 🚪';
      logoutBtn.onclick = logoutUser;
      navActions.appendChild(logoutBtn);
    }
  }
  
  loadProducts();
  updateCartBadge();
});
