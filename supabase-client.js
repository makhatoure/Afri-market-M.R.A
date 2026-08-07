// ========================================================
// AFRIMARK — CLIENT SUPABASE (DATABASE & AUTH)
// ========================================================

const SUPABASE_URL = 'https://zyrzyuzmrdhvcmevxeal.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5cnp5dXptcmRodmNtZXZ4ZWFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNTUyOTYsImV4cCI6MjEwMTYzMTI5Nn0._RkWMp5NiV88nNHWjisT9okLemt92nYcO5GOGiBiOjc';

// Initialisation globale du client Supabase
let supabase = null;

if (window.supabase) {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('✅ Supabase connecté avec succès !');
} else {
  console.error('❌ SDK Supabase non prêt.');
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
