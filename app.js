// ========================================================
// AFRIMARK — DYNAMIQUE SUPABASE & GESTION EN TEMPS RÉEL
// ========================================================

const CART_KEY = 'afrimark_cart';

// ---- AUTHENTIFICATION & SESSIONS ----
async function registerUser(email, password, fullName, role, companyName) {
  if (!supabase) return { error: 'Supabase non connecté' };
  try {
    // 1. Inscription Auth Supabase
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role: role } }
    });
    if (authErr) throw authErr;

    // 2. Insérer dans la table public.profiles
    if (authData.user) {
      const { error: profileErr } = await supabase.from('profiles').insert([{
        id: authData.user.id,
        email: email,
        full_name: fullName,
        role: role,
        company_name: companyName || fullName
      }]);
      if (profileErr) console.warn('Note profil:', profileErr.message);
    }
    
    // Sauvegarder la session locale
    localStorage.setItem('afrimark_user', JSON.stringify({ id: authData.user?.id, email, name: fullName, role }));
    return { data: authData.user };
  } catch (err) {
    console.error('Erreur inscription:', err);
    return { error: err.message };
  }
}

async function loginUser(email, password) {
  if (!supabase) return { error: 'Supabase non connecté' };
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    // Récupérer le profil utilisateur
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
    const userSession = {
      id: data.user.id,
      email: data.user.email,
      name: profile ? profile.full_name : data.user.email,
      role: profile ? profile.role : 'commercant'
    };

    localStorage.setItem('afrimark_user', JSON.stringify(userSession));
    return { data: userSession };
  } catch (err) {
    console.error('Erreur connexion:', err);
    return { error: err.message };
  }
}

function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem('afrimark_user')); } catch { return null; }
}

function logoutUser() {
  if (supabase) supabase.auth.signOut();
  localStorage.removeItem('afrimark_user');
  window.location.href = 'index.html';
}

// ---- CHARGEMENT DES PRODUITS DEPUIS SUPABASE ----
async function loadProducts(category = null) {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px;">Chargement des produits depuis Supabase... ⏳</div>';

  if (typeof fetchProductsFromDB === 'function') {
    const dbProducts = await fetchProductsFromDB(category);
    if (dbProducts && dbProducts.length > 0) {
      grid.innerHTML = dbProducts.map(p => `
        <div class="product-card" onclick="window.location.href='fiche-produit.html?id=${p.id}'">
          <div class="product-card-img"><img src="${p.image_url || 'https://images.unsplash.com/photo-1619451334792-150fd785ee74?w=400&q=80'}" alt="${p.name}"></div>
          <div class="product-card-body">
            <h3>${p.name}</h3>
            <div class="product-price">
              <strong>À partir de : ${Number(p.price_fcfa).toLocaleString('fr-FR')} FCFA / ${p.unit}</strong>
              <div class="product-min">Commande min. : ${p.min_quantity} ${p.unit}s</div>
            </div>
          </div>
        </div>
      `).join('');
      return;
    }
  }

  // Fallback si la BDD est encore vide
  grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--gray);">Aucun produit en base. Connectez-vous en fournisseur pour en ajouter !</div>';
}

// ---- GESTION DU PANIER & DEVIS ----
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
  if (user && navCta) {
    navCta.textContent = user.name || 'Mon espace';
    navCta.href = 'dashboard.html';
  }
  
  if (document.getElementById('products-grid')) {
    setTimeout(loadProducts, 500);
  }
  updateCartBadge();
});
