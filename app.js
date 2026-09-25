// ========================================================
// AfroBaza â€” LOGIQUE GLOBALE ET HYBRIDE (SUPABASE + FALLBACK)
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
      grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: #666;">Aucun produit trouvÃ© dans la base de donnÃ©es.</div>';
      return;
    }

    grid.innerHTML = dbProducts.map(p => `
      <div class="product-card" onclick="window.location.href='fiche-produit.html?id=${p.id}'">
        <div class="product-card-img"><img src="${p.image_url || 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400&q=80'}" alt="${p.name}" loading="lazy"></div>
        <div class="product-card-body">
          <h3>${p.name}</h3>
          <div class="product-price">
            <strong>Ã€ partir de : ${Number(p.price_fcfa).toLocaleString('fr-FR')} FCFA / ${p.unit}</strong>
            <div class="product-min">Commande min. : ${p.min_quantity} ${p.unit}s</div>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Erreur lors du chargement des produits Supabase:', err);
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: red;">Erreur de connexion Ã  la base de donnÃ©es.</div>';
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
  if (!client) return { error: 'Client Supabase non initialisÃ©.' };
  try {
    // 1. Inscription Auth
    const { data, error } = await client.auth.signUp({
      email, password, options: { data: { full_name: fullName, role, company: companyName } }
    });
    if (error) throw error;

    // 2. CrÃ©ation manuelle du profil en base (si un ID utilisateur est retournÃ©)
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
        console.warn('CrÃ©ation du profil secondaire ignorÃ©e:', profileErr);
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
  if (!client) return { error: 'Client Supabase non connectÃ©' };
  try {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;

    let userRole = data.user.user_metadata?.role || 'commercant';
    let userName = data.user.user_metadata?.full_name || email.split('@')[0];

    // Tenter d'aller chercher le profil exact en BDD
    try {
      const { data: profile } = await client.from('profiles').select('role, full_name, company_name').eq('id', data.user.id).single();
      if (profile) {
        if (profile.role) userRole = profile.role;
        if (profile.company_name || profile.full_name) userName = profile.company_name || profile.full_name;
      }
    } catch (pErr) {
      console.warn('Erreur lecture profil Supabase:', pErr);
    }

    const userSession = { id: data.user.id, email: data.user.email, name: userName, role: userRole };
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
  showToast('âœ“ Produit ajoutÃ© au panier', 'success');
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

// ---- MODAL CONTACT FOURNISSEUR & DEMANDE DE DEVIS ----
function openContactSupplierModal(options = {}) {
  const { supplierName, supplierId, productName, productPrice, productUnit, productImg, initialQty } = options;
  const user = getCurrentUser();
  if (!user) {
    showToast('Veuillez vous connecter pour contacter un fournisseur', 'error');
    setTimeout(() => window.location.href = 'connexion.html', 1500);
    return;
  }

  // Remove existing modal if any
  const oldModal = document.getElementById('contact-supplier-modal');
  if (oldModal) oldModal.remove();

  const optionsJson = JSON.stringify(options || {}).replace(/"/g, '&quot;');

  const modalHtml = `
    <div id="contact-supplier-modal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px);">
      <div style="background:#fff;border-radius:16px;max-width:560px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);position:relative;padding:32px;">
        <button onclick="closeContactSupplierModal()" style="position:absolute;top:20px;right:20px;background:none;border:none;font-size:24px;color:#64748b;cursor:pointer;padding:4px;">âœ•</button>
        
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
          <div style="width:48px;height:48px;border-radius:12px;background:#fef3c7;color:#d97706;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:bold;">💬</div>
          <div>
            <h2 style="font-size:20px;font-weight:700;color:#0f172a;margin:0;">Contacter le fournisseur</h2>
            <p style="font-size:13px;color:#64748b;margin:2px 0 0 0;">Fournisseur: <strong>${supplierName || 'Fournisseur AfroBaza'}</strong> <span style="color:#16a34a;font-weight:600;">âœ“ VÃ©rifiÃ©</span></p>
          </div>
        </div>

        ${productName ? `
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:20px;display:flex;align-items:center;gap:16px;">
            ${productImg ? `<img src="${productImg}" style="width:60px;height:60px;border-radius:8px;object-fit:cover;">` : ''}
            <div style="flex:1;">
              <div style="font-weight:700;font-size:15px;color:#0f172a;">${productName}</div>
              <div style="font-size:13px;color:#64748b;margin-top:2px;">${productPrice ? Number(productPrice).toLocaleString('fr-FR') + ' FCFA / ' + (productUnit || 'unitÃ©') : ''}</div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:4px 8px;">
              <button type="button" onclick="adjustModalQty(-1)" style="border:none;background:none;font-weight:bold;cursor:pointer;padding:2px 6px;">-</button>
              <span id="modal-qty-val" style="font-weight:700;font-size:14px;min-width:24px;text-align:center;">${initialQty || 1}</span>
              <button type="button" onclick="adjustModalQty(1)" style="border:none;background:none;font-weight:bold;cursor:pointer;padding:2px 6px;">+</button>
            </div>
          </div>
        ` : ''}

        <form id="contact-supplier-form" onsubmit="handleSendSupplierMessage(event, ${optionsJson})">
          <div style="margin-bottom:16px;">
            <label style="display:block;font-size:14px;font-weight:600;color:#334155;margin-bottom:6px;">Message au fournisseur</label>
            <textarea id="modal-message-input" rows="4" style="width:100%;border:1px solid #cbd5e1;border-radius:10px;padding:12px;font-family:inherit;font-size:14px;resize:vertical;" placeholder="PrÃ©cisez vos besoins, questions sur les prix, quantitÃ©, dÃ©lais de livraison..." required>Bonjour, je souhaiterais obtenir des informations et Ã©changer directement avec vous concernant cette commande.</textarea>
          </div>

          <div style="margin-bottom:24px;">
            <label style="display:block;font-size:14px;font-weight:600;color:#334155;margin-bottom:6px;">Mode de livraison souhaitÃ©</label>
            <select id="modal-delivery-select" style="width:100%;border:1px solid #cbd5e1;border-radius:10px;padding:10px;font-family:inherit;font-size:14px;background:#fff;">
              <option value="Standard">Livraison Standard AfroBaza (24h - 48h)</option>
              <option value="Express">Livraison Express par transporteur dÃ©diÃ©</option>
              <option value="Retrait">Retrait direct en entrepÃ´t / boutique</option>
            </select>
          </div>

          <div style="display:flex;gap:12px;justify-content:flex-end;">
            <button type="button" class="btn-outline" onclick="closeContactSupplierModal()" style="padding:12px 20px;">Annuler</button>
            <button type="submit" class="btn-primary" style="padding:12px 24px;">Envoyer le message ðŸš€</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeContactSupplierModal() {
  const m = document.getElementById('contact-supplier-modal');
  if (m) m.remove();
}

function adjustModalQty(delta) {
  const qEl = document.getElementById('modal-qty-val');
  if (!qEl) return;
  let val = parseInt(qEl.textContent) || 1;
  val = Math.max(1, val + delta);
  qEl.textContent = val;
}

async function handleSendSupplierMessage(e, options) {
  e.preventDefault();
  const user = getCurrentUser();
  if (!user) return;

  const msg = document.getElementById('modal-message-input').value;
  const delivery = document.getElementById('modal-delivery-select').value;
  const qtyEl = document.getElementById('modal-qty-val');
  const qty = qtyEl ? parseInt(qtyEl.textContent) : (options.initialQty || 1);

  const client = getSupabaseClient();
  const devisNumber = '#DMD-' + Math.floor(100000 + Math.random() * 900000);

  if (client) {
    try {
      await client.from('devis').insert([{
        merchant_id: user.id,
        supplier_id: options.supplierId || null,
        status: 'pending',
        total_amount_fcfa: (options.productPrice || 0) * qty,
        items: [{
          name: options.productName || 'Prise de contact gÃ©nÃ©rale',
          price: options.productPrice || 0,
          qty: qty,
          unit: options.productUnit || 'unitÃ©',
          img: options.productImg || null,
          supplier: options.supplierName || 'Fournisseur AfroBaza'
        }],
        message: msg,
        delivery_option: delivery,
        reference: devisNumber
      }]);
    } catch (err) {
      console.warn('Erreur insertion Supabase devis:', err);
    }
  }

  // Show Confirmation UI (matching Confirmation_demande.png)
  const modalContainer = document.querySelector('#contact-supplier-modal > div');
  if (modalContainer) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    modalContainer.innerHTML = `
      <div style="text-align:center;padding:16px 8px;">
        <div style="width:72px;height:72px;border-radius:50%;background:#dcfce7;color:#16a34a;display:inline-flex;align-items:center;justify-content:center;font-size:36px;margin-bottom:20px;">âœ“</div>
        <h2 style="font-size:22px;font-weight:800;color:#0f172a;margin-bottom:8px;">Votre demande a Ã©tÃ© envoyÃ©e avec succÃ¨s !</h2>
        <p style="font-size:14px;color:#64748b;margin-bottom:24px;">Le fournisseur <strong>${options.supplierName || 'AfroBaza'}</strong> a bien reÃ§u votre message et y rÃ©pondra sous peu.</p>

        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px;text-align:left;">
          <div style="display:flex;justify-content:space-between;margin-bottom:10px;font-size:13px;color:#64748b;">
            <span>RÃ©fÃ©rence :</span><strong style="color:#0f172a;">${devisNumber}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:10px;font-size:13px;color:#64748b;">
            <span>Date & Heure :</span><strong style="color:#0f172a;">${dateStr}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:13px;color:#64748b;">
            <span>Fournisseur contactÃ© :</span><strong style="color:#16a34a;">1 fournisseur (VÃ©rifiÃ©)</strong>
          </div>
        </div>

        <div style="display:flex;gap:12px;justify-content:center;">
          <button class="btn-outline" onclick="closeContactSupplierModal()" style="padding:12px 20px;">Fermer</button>
          <a href="messagerie.html" class="btn-primary" style="padding:12px 24px;text-decoration:none;">Voir la conversation 💬</a>
        </div>
      </div>
    `;
  }
}

// ---- BADGE MESSAGES DANS LA NAVBAR ----
async function updateMessageBadge() {
  const user = getCurrentUser();
  if (!user) return;

  const navActions = document.querySelector('.nav-actions');
  if (!navActions) return;

  // Créer le bouton icône messagerie s'il n'existe pas encore
  let msgBtn = document.getElementById('nav-msg-btn');
  if (!msgBtn) {
    msgBtn = document.createElement('a');
    msgBtn.id = 'nav-msg-btn';
    msgBtn.href = 'messagerie.html';
    msgBtn.className = 'icon-btn';
    msgBtn.title = 'Messagerie & Messages';
    msgBtn.style.position = 'relative';
    msgBtn.style.display = 'inline-flex';
    msgBtn.style.alignItems = 'center';
    msgBtn.style.justifyContent = 'center';
    msgBtn.style.color = '#334155';
    msgBtn.innerHTML = `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <span class="msg-badge" id="nav-msg-badge" style="display:none;position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;border-radius:50%;width:18px;height:18px;font-size:11px;font-weight:700;align-items:center;justify-content:center;box-shadow:0 2px 4px rgba(0,0,0,0.15);">0</span>
    `;

    const dashBtn = navActions.querySelector('a[href="dashboard.html"]');
    if (dashBtn) {
      navActions.insertBefore(msgBtn, dashBtn);
    } else {
      navActions.appendChild(msgBtn);
    }
  }

  // Calculer le nombre de conversations/messages actifs pour cet utilisateur
  const client = getSupabaseClient();
  if (client) {
    try {
      const field = user.role === 'fournisseur' ? 'supplier_id' : 'merchant_id';
      const { data: devisList } = await client.from('devis').select('id').eq(field, user.id);
      if (devisList && devisList.length > 0) {
        const badge = document.getElementById('nav-msg-badge');
        if (badge) {
          badge.textContent = devisList.length;
          badge.style.display = 'flex';
        }
      }
    } catch (e) {
      console.warn('Erreur mise à jour badge messages:', e);
    }
  }
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
  updateMessageBadge();
});


