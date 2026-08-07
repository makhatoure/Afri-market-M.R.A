// ========================================================
// AFRIMARK — LOGIQUE GLOBALE ET HYBRIDE (SUPABASE + FALLBACK)
// ========================================================

const CART_KEY = 'afrimark_cart';

// ---- PRODUITS DE SECOURS (DÉMO DESIGN FIGMA) ----
const FALLBACK_PRODUCTS = [
  { id: '1', name: "Peinture Unilatex - Senac", price_fcfa: 9000, unit: "pot", min_quantity: 10, image_url: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400&q=80" },
  { id: '2', name: "Lunettes tendance femme", price_fcfa: 2500, unit: "pièce", min_quantity: 12, image_url: "https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=400&q=80" },
  { id: '3', name: "Tissu Maylouss", price_fcfa: 2000, unit: "pièce", min_quantity: 30, image_url: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=400&q=80" },
  { id: '4', name: "Barquette 500g alimentaire", price_fcfa: 100, unit: "unité", min_quantity: 100, image_url: "https://images.unsplash.com/photo-1503364428-b0fd49da42b1?w=400&q=80" },
  { id: '5', name: "Sac de pommes de terre 5kg", price_fcfa: 2500, unit: "sac", min_quantity: 10, image_url: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&q=80" },
  { id: '6', name: "Boucles d'oreilles bijoux", price_fcfa: 500, unit: "pièce", min_quantity: 20, image_url: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400&q=80" },
  { id: '7', name: "Perruque Blend Hair", price_fcfa: 10000, unit: "pièce", min_quantity: 10, image_url: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80" },
  { id: '8', name: "Beurre de karité brut 100% naturel", price_fcfa: 1000, unit: "pot", min_quantity: 20, image_url: "https://images.unsplash.com/photo-1619451334792-150fd785ee74?w=400&q=80" },
];

// ---- CHARGEMENT DES PRODUITS (SUPABASE OU FALLBACK) ----
async function loadProducts(category = null) {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  let productsToDisplay = [];

  try {
    if (typeof fetchProductsFromDB === 'function') {
      const dbProducts = await fetchProductsFromDB(category);
      if (dbProducts && dbProducts.length > 0) {
        productsToDisplay = dbProducts;
      }
    }
  } catch (err) {
    console.warn('Utilisation des données démo locales:', err);
  }

  // Si Supabase ne renvoie rien encore, afficher les produits démo
  if (productsToDisplay.length === 0) {
    productsToDisplay = FALLBACK_PRODUCTS;
  }

  grid.innerHTML = productsToDisplay.map(p => `
    <div class="product-card" onclick="window.location.href='fiche-produit.html?id=${p.id}'">
      <div class="product-card-img"><img src="${p.image_url}" alt="${p.name}" loading="lazy"></div>
      <div class="product-card-body">
        <h3>${p.name}</h3>
        <div class="product-price">
          <strong>À partir de : ${Number(p.price_fcfa).toLocaleString('fr-FR')} FCFA / ${p.unit}</strong>
          <div class="product-min">Commande min. : ${p.min_quantity} ${p.unit}s</div>
        </div>
      </div>
    </div>
  `).join('');
}

// ---- AUTHENTIFICATION ----
async function registerUser(email, password, fullName, role, companyName) {
  if (!supabase) return { error: 'Supabase non connecté' };
  try {
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: { full_name: fullName, role } }
    });
    if (error) throw error;

    localStorage.setItem('afrimark_user', JSON.stringify({ id: data.user?.id, email, name: fullName, role }));
    return { data: data.user };
  } catch (err) {
    return { error: err.message };
  }
}

async function loginUser(email, password) {
  if (!supabase) return { error: 'Supabase non connecté' };
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const userSession = { id: data.user.id, email: data.user.email, name: email.split('@')[0], role: 'commercant' };
    localStorage.setItem('afrimark_user', JSON.stringify(userSession));
    return { data: userSession };
  } catch (err) {
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
  if (user && navCta) {
    navCta.textContent = user.name || 'Mon espace';
    navCta.href = 'dashboard.html';
  }
  
  loadProducts();
  updateCartBadge();
});
