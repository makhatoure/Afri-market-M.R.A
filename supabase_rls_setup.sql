-- =======================================================
-- AfroBaza - RLS Fix pour la messagerie et devis
-- Coller ce script dans : Supabase > SQL Editor > New Query
-- =======================================================

-- TABLE: devis
ALTER TABLE IF EXISTS devis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "devis_select" ON devis;
DROP POLICY IF EXISTS "devis_insert" ON devis;
DROP POLICY IF EXISTS "devis_update" ON devis;

-- Un utilisateur voit ses devis ou les devis adressés aux fournisseurs
CREATE POLICY "devis_select" ON devis
  FOR SELECT USING (
    merchant_id = auth.uid()
    OR supplier_id = auth.uid()
    OR supplier_id IS NULL
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'fournisseur'
    )
  );

CREATE POLICY "devis_insert" ON devis
  FOR INSERT WITH CHECK (
    merchant_id = auth.uid()
  );

CREATE POLICY "devis_update" ON devis
  FOR UPDATE USING (
    merchant_id = auth.uid()
    OR supplier_id = auth.uid()
    OR supplier_id IS NULL
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'fournisseur'
    )
  );

-- TABLE: messages
ALTER TABLE IF EXISTS messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select" ON messages;
DROP POLICY IF EXISTS "messages_insert" ON messages;

CREATE POLICY "messages_select" ON messages
  FOR SELECT USING (
    sender_id = auth.uid()
    OR devis_id IN (
      SELECT id FROM devis
      WHERE merchant_id = auth.uid()
         OR supplier_id = auth.uid()
         OR supplier_id IS NULL
         OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'fournisseur')
    )
  );

CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
  );
