-- ========================================================
-- AFRIMARK — SCHÉMA DE BASE DE DONNÉES SUPABASE (PostgreSQL)
-- ========================================================

-- 1. EXTENSIONS & TYPES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_role AS ENUM ('commercant', 'fournisseur', 'admin');
CREATE TYPE devis_status AS ENUM ('sent', 'accepted', 'refused', 'pending');

-- 2. TABLE DES PROFILS UTILISATEURS (Commerçants & Fournisseurs)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- 6. DONNÉES INITIALES (SEEDING)
INSERT INTO public.profiles (id, email, full_name, role, company_name, location, is_verified, avatar_url)
VALUES 
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'rynshome@afrimark.com', 'Ryn''s Home', 'fournisseur', 'Ryn''s Home SARL', 'Dakar, Sénégal', true, 'https://images.unsplash.com/photo-1619451334792-150fd785ee74?w=400&q=80'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'aminata@afrimark.com', 'Aminata Gueye', 'commercant', 'Boutique Aminata', 'Dakar, Sénégal', false, 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&q=80')
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.products (supplier_id, name, description, category, price_fcfa, unit, min_quantity, image_url)
VALUES 
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Beurre de karité brut 100% naturel', 'Beurre de karité non raffiné idéal soin peau et cheveux.', 'Cosmétiques', 1000, 'Kg', 5, 'https://images.unsplash.com/photo-1619451334792-150fd785ee74?w=400&q=80'),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Tissu Maylouss', 'Différentes couleurs disponibles.', 'Textiles', 2000, 'Pièce', 30, 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=400&q=80'),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Perruque Blend Hair', 'Perruques de qualité type Blend Hair.', 'Cosmétiques', 10000, 'Pièce', 10, 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80')
ON CONFLICT DO NOTHING;
