// ========================================================
// AFRIMARK — CLIENT SUPABASE (DATABASE & AUTH)
// ========================================================

const SUPABASE_URL = 'https://zyrzyuzmrdhvcmevxeal.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_c1e_-XfzHs_tZp9Zm6E5WQ_Yz8YU-xh';

// Initialisation globale du client Supabase
let supabase = null;

if (window.supabase) {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('✅ Supabase connecté avec succès !');
} else {
  console.error('❌ Erreur : SDK Supabase non trouvé dans le head.');
}

// 1. Récupérer les produits en base
async function fetchProductsFromDB(category = null) {
  if (!supabase) return null;
  try {
    let query = supabase.from('products').select('*');
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
