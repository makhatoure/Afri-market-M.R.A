-- ========================================================
-- AfroBaza — SCHÉMA COMPLET SUPABASE (PostgreSQL + RLS + AUTO-PROFILE)
-- ========================================================

-- 1. EXTENSIONS & TYPES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('commercant', 'fournisseur', 'admin');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'devis_status') THEN
        CREATE TYPE devis_status AS ENUM ('sent', 'accepted', 'refused', 'pending');
    END IF;
END $$;

-- 2. TABLE DES PROFILS UTILISATEURS
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    role user_role DEFAULT 'commercant',
    company_name TEXT,
    location TEXT DEFAULT 'Dakar, Sénégal',
    is_verified BOOLEAN DEFAULT false,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABLE DES PRODUITS
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    price_fcfa NUMERIC NOT NULL,
    unit TEXT NOT NULL DEFAULT 'pot',
    min_quantity INTEGER NOT NULL DEFAULT 1,
    image_url TEXT,
    in_stock BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABLE DES DEMANDES DE DEVIS
CREATE TABLE IF NOT EXISTS public.devis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    devis_number TEXT UNIQUE NOT NULL,
    merchant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    total_amount_fcfa NUMERIC NOT NULL DEFAULT 0,
    status devis_status DEFAULT 'sent',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TABLE DES ARTICLES DE DEVIS
CREATE TABLE IF NOT EXISTS public.devis_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    devis_id UUID REFERENCES public.devis(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price_fcfa NUMERIC NOT NULL,
    total_price_fcfa NUMERIC NOT NULL
);

-- 6. POLITIQUES DE SÉCURITÉ (RLS - ROW LEVEL SECURITY)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devis_items ENABLE ROW LEVEL SECURITY;

-- Lecture publique des profils et produits
CREATE POLICY "Lecture publique profils" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Lecture publique produits" ON public.products FOR SELECT USING (true);
CREATE POLICY "Fournisseurs modifient leurs produits" ON public.products FOR ALL USING (auth.uid() = supplier_id);

-- Politiques de devis
CREATE POLICY "Voir ses propres devis" ON public.devis FOR SELECT USING (auth.uid() = merchant_id OR auth.uid() = supplier_id);
CREATE POLICY "Créer un devis" ON public.devis FOR INSERT WITH CHECK (auth.uid() = merchant_id);

-- 7. TRIGGER AUTOMATIQUE À L'INSCRIPTION
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, company_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'commercant'),
    new.raw_user_meta_data->>'company'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. PRODUITS D'EXEMPLE INITIALS
INSERT INTO public.products (name, description, category, price_fcfa, unit, min_quantity, image_url)
VALUES 
    ('Beurre de karité brut 100% naturel', 'Beurre de karité non raffiné idéal soin peau et cheveux.', 'Cosmétiques', 1000, 'Kg', 5, 'https://images.unsplash.com/photo-1619451334792-150fd785ee74?w=400&q=80'),
    ('Tissu Maylouss', 'Différentes couleurs disponibles.', 'Textiles', 2000, 'Pièce', 30, 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=400&q=80'),
    ('Perruque Blend Hair', 'Perruques de qualité type Blend Hair.', 'Cosmétiques', 10000, 'Pièce', 10, 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80'),
    ('Lunettes tendance femme', 'Lot de lunettes de soleil tendance.', 'Cosmétiques', 2500, 'Pièce', 12, 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=400&q=80'),
    ('Peinture Unilatex - Senac', 'Pot de peinture qualité supérieure 20L.', 'Maison', 9000, 'Pot', 10, 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400&q=80')
ON CONFLICT DO NOTHING;
