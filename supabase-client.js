// ========================================================
// AfroBaza — CLIENT SUPABASE (DATABASE & AUTH)
// ========================================================

const SUPABASE_URL = 'https://zyrzyuzmrdhvcmevxeal.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5cnp5dXptcmRodmNtZXZ4ZWFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNTUyOTYsImV4cCI6MjEwMTYzMTI5Nn0._RkWMp5NiV88nNHWjisT9okLemt92nYcO5GOGiBiOjc';

// Initialisation globale du client Supabase
let supabaseClient = null;

function initSupabaseClient() {
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase connecté avec succès !');
    return supabaseClient;
  } else {
    console.error('❌ SDK Supabase CDN non prêt ou inaccessible.');
    return null;
  }
}

// Initialiser immédiatement ou dès le chargement du DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSupabaseClient);
} else {
  initSupabaseClient();
}

// 1. Récupérer les produits en base
async function fetchProductsFromDB(category = null) {
  const client = supabaseClient || initSupabaseClient();
  if (!client) return null;
  try {
    let query = client.from('products').select('*');
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
