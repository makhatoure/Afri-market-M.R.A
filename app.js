// ===========================
// AFRIMARK — app.js
// Logique globale de la plateforme
// ===========================

// ---- DATA ----
const PRODUCTS = [
  { id: 1, name: "Peinture Unilatex - Senac", desc: "Peinture acrylique murs int./ext.", price: "9 000", unit: "FCFA / pot", min: "10 pots", img: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400&q=80", cat: "Maison", supplier: "Senac" },
  { id: 2, name: "Lunettes tendance femme", desc: "Modèles tendance pour femmes.", price: "2 500", unit: "FCFA / pièce", min: "12 pièces", img: "https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=400&q=80", cat: "Accessoires", supplier: "OpticsPlus" },
  { id: 3, name: "Tissu Maylouss", desc: "Différentes couleurs disponibles.", price: "2 000", unit: "FCFA / pièce", min: "30 pièces", img: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=400&q=80", cat: "Textiles", supplier: "Ryn's Home" },
  { id: 4, name: "Barquette 500g alimentaire", desc: "Résistante, adaptée aux usages alimentaires.", price: "100", unit: "FCFA / unité", min: "100 pièces", img: "https://images.unsplash.com/photo-1503364428-b0fd49da42b1?w=400&q=80", cat: "Emballage", supplier: "PackSenegal" },
  { id: 5, name: "Sac de pommes de terre 5kg", desc: "Pommes de terre fraîches, gros.", price: "2 500", unit: "FCFA / sac", min: "10 sacs", img: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&q=80", cat: "Alimentation", supplier: "AgriProduits" },
  { id: 6, name: "Boucles d'oreilles bijoux", desc: "Boucles tendance et élégantes.", price: "500", unit: "FCFA / pièce", min: "20 pièces", img: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400&q=80", cat: "Bijoux", supplier: "GoldTrade" },
  { id: 7, name: "Perruque Blend Hair", desc: "Perruques de qualité type Blend Hair.", price: "10 000", unit: "FCFA / pièce", min: "10 pièces", img: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80", cat: "Cosmétiques", supplier: "Ryn's Home" },
  { id: 8, name: "Beurre de karité brut", desc: "Beurre de karité 100% naturel.", price: "1 000", unit: "FCFA / pot", min: "20 pots", img: "https://images.unsplash.com/photo-1619451334792-150fd785ee74?w=400&q=80", cat: "Cosmétiques", supplier: "Ryn's Home" },
  { id: 9, name: "Crème Queen Elisabeth", desc: "Crème de soin pour le corps.", price: "1 000", unit: "FCFA / pièce", min: "5 pièces", img: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&q=80", cat: "Cosmétiques", supplier: "Ryn's Home" },
  { id: 10, name: "Palette de maquillage", desc: "Palette complète avec plusieurs finitions.", price: "2 800", unit: "FCFA / pièce", min: "12 pièces", img: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=400&q=80", cat: "Cosmétiques", supplier: "BeautyPlus" },
];

const CART_KEY = 'afrimark_cart';
const USER_KEY = 'afrimark_user';

// ---- CART ----
function getCart() { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; } }
function saveCart(cart) { localStorage.setItem(CART_KEY, JSON.stringify(cart)); updateCartBadge(); }
function addToCart(product, qty = 1) {
  const cart = getCart();
  const existing = cart.find(i => i.id === product.id);
  if (existing) { existing.qty += qty; } else { cart.push({ ...product, qty }); }
  saveCart(cart);
  showToast('✓ Produit ajouté au panier', 'success');
}
function removeFromCart(productId) {
  const cart = getCart().filter(i => i.id !== productId);
  saveCart(cart);
}
function updateCartQty(productId, qty) {
  const cart = getCart();
  const item = cart.find(i => i.id === productId);
  if (item) { item.qty = Math.max(1, qty); saveCart(cart); }
}
function updateCartBadge() {
  const cart = getCart();
  const total = cart.reduce((s, i) => s + i.qty, 0);
  document.querySelectorAll('.cart-badge').forEach(b => {
    b.textContent = total;
    b.style.display = total > 0 ? 'flex' : 'none';
  });
}

// ---- USER ----
function getUser() { try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; } }
function setUser(user) { localStorage.setItem(USER_KEY, JSON.stringify(user)); }
function logout() { localStorage.removeItem(USER_KEY); window.location.href = 'index.html'; }

// ---- SEARCH ----
function doSearch() {
  const input = document.getElementById('hero-search-input') || document.getElementById('search-overlay-input') || document.querySelector('.search-input');
  const query = input ? input.value.trim() : '';
  if (query) { window.location.href = `recherche.html?q=${encodeURIComponent(query)}`; }
  else { window.location.href = 'recherche.html'; }
}

// ---- TOAST ----
function showToast(msg, type = '') {
  let container = document.querySelector('.toast-container');
  if (!container) { container = document.createElement('div'); container.className = 'toast-container'; document.body.appendChild(container); }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 2500);
}

// ---- USER DROPDOWN ----
function initUserDropdown() {
  const btn = document.getElementById('user-menu-btn');
  const dropdown = document.getElementById('user-dropdown');
  if (!btn || !dropdown) return;
  btn.addEventListener('click', (e) => { e.stopPropagation(); dropdown.classList.toggle('open'); });
  document.addEventListener('click', () => dropdown.classList.remove('open'));
}

// ---- SEARCH OVERLAY ----
function initSearchOverlay() {
  const toggleBtn = document.getElementById('search-toggle-btn');
  const overlay = document.getElementById('search-overlay');
  const closeBtn = document.getElementById('close-search-btn');
  const input = document.getElementById('search-overlay-input');
  if (!toggleBtn || !overlay) return;
  toggleBtn.addEventListener('click', () => { overlay.classList.toggle('open'); if (overlay.classList.contains('open') && input) input.focus(); });
  if (closeBtn) closeBtn.addEventListener('click', () => overlay.classList.remove('open'));
  if (input) input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
}

// ---- RENDER PRODUCTS (Homepage) ----
function renderHomepageProducts() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;
  grid.innerHTML = PRODUCTS.slice(0, 10).map(p => `
    <div class="product-card" onclick="window.location.href='fiche-produit.html?id=${p.id}'">
      <div class="product-card-img"><img src="${p.img}" alt="${p.name}" loading="lazy"></div>
      <div class="product-card-body">
        <h3>${p.name}</h3>
        <div class="product-price">
          <strong>À partir de : ${p.price} ${p.unit.replace('FCFA / ','').includes('FCFA') ? '' : 'FCFA / ' + p.unit.split('/ ')[1]}</strong>
          <div class="product-min">Commande min. : ${p.min}</div>
        </div>
      </div>
    </div>
  `).join('');
}

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  initUserDropdown();
  initSearchOverlay();
  renderHomepageProducts();
  updateCartBadge();

  // Hero search Enter key
  const heroInput = document.getElementById('hero-search-input');
  if (heroInput) heroInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });

  // Auth: update nav if user is logged in
  const user = getUser();
  const navCta = document.getElementById('nav-cta');
  if (user && navCta) {
    navCta.textContent = 'Mon espace';
    navCta.href = 'dashboard.html';
  }
});
