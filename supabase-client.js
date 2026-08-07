// ========================================================
// AFRIMARK — CLIENT SUPABASE (DATABASE & AUTH)
// ========================================================

const SUPABASE_URL = 'https://zyrzyuzmrdhvcmevxeal.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_c1e_-XfzHs_tZp9Zm6E5WQ_Yz8YU-xh';

// Import dynamique du SDK Supabase JS depuis le CDN
let supabase = null;

async function initSupabase() {
  if (window.supabase) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase connecté avec succès !');
  } else {
    console.warn('⚠️ SDK Supabase en cours de chargement...');
  }
}

// 1. Récupérer les produits en base
async function fetchProductsFromDB(category = null) {
  if (!supabase) return null;
  try {
    let query = supabase.from('products').select('*, profiles(company_name, location, is_verified)');
    if (category) {
      query = query.eq('category', category);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Erreur Supabase fetchProducts:', err);
    return null;
  }
}

// 2. Créer une demande de devis en base
async function createDevisDB(merchantId, supplierId, items, totalAmount) {
  if (!supabase) return null;
  try {
    const devisNumber = 'DEV-' + Math.floor(100000 + Math.random() * 900000);
    
    // Insérer le devis
    const { data: devis, error: devisErr } = await supabase
      .from('devis')
      .insert([{ devis_number: devisNumber, merchant_id: merchantId, supplier_id: supplierId, total_amount_fcfa: totalAmount }])
      .select()
      .single();

    if (devisErr) throw devisErr;

    // Insérer les éléments du devis
    const devisItems = items.map(item => ({
      devis_id: devis.id,
      product_id: item.id || null,
      product_name: item.name,
      quantity: item.qty,
      unit_price_fcfa: item.price,
      total_price_fcfa: item.qty * item.price
    }));

    const { error: itemsErr } = await supabase.from('devis_items').insert(devisItems);
    if (itemsErr) throw itemsErr;

    return devis;
  } catch (err) {
    console.error('Erreur Supabase createDevis:', err);
    return null;
  }
}

// Auto-initialisation au chargement de la page
window.addEventListener('DOMContentLoaded', () => {
  if (typeof supabase === 'undefined' || !supabase) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    script.onload = initSupabase;
    document.head.appendChild(script);
  }
});
