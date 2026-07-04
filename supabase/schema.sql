-- ============================================================
-- My Creation — Supabase Database Schema
-- Paste this entire file into Supabase SQL Editor and run.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- CUSTOMERS (Supabase Auth users with profiles)
-- ============================================================
CREATE TABLE customers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id       UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT,
  phone         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.customers (auth_id, name, phone)
  VALUES (new.id, new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'phone');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE categories (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  description   TEXT,
  image_url     TEXT,
  sort_order    INTEGER DEFAULT 0,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

INSERT INTO categories (name, slug, description, sort_order) VALUES
  ('Earrings',       'earrings',       'Handcrafted earrings in various styles',         1),
  ('Necklaces',      'necklaces',      'Traditional and modern necklace designs',        2),
  ('Full Sets',      'full-sets',      'Complete jewellery sets for occasions',          3),
  ('Potli Bags',     'potli-bags',     'Hand-embroidered potli bags',                    4),
  ('Head Jewellery', 'head-jewellery', 'Maang tikka, matha patti and more',              5);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
  subcategory     TEXT,
  description     TEXT,
  price           NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  compare_price   NUMERIC(10,2) CHECK (compare_price IS NULL OR compare_price >= 0),
  images          TEXT[] DEFAULT '{}',
  stock           INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_active       BOOLEAN DEFAULT true,
  badge           TEXT CHECK (badge IN (NULL, 'New', 'Bestseller', 'Sale')),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_category ON products(category_id);

-- ============================================================
-- PROMO CODES
-- ============================================================
CREATE TABLE promo_codes (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                TEXT NOT NULL UNIQUE,
  description         TEXT,
  discount_percent    NUMERIC(5,2) CHECK (discount_percent >= 0 AND discount_percent <= 100),
  discount_amount     NUMERIC(10,2) CHECK (discount_amount >= 0),
  min_order_amount    NUMERIC(10,2) DEFAULT 0 CHECK (min_order_amount >= 0),
  max_uses            INTEGER,
  current_uses        INTEGER DEFAULT 0 CHECK (current_uses <= COALESCE(max_uses, current_uses + 1)),
  is_active           BOOLEAN DEFAULT true,
  expires_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT at_least_one_discount CHECK (
    discount_percent IS NOT NULL OR discount_amount IS NOT NULL
  )
);

-- ============================================================
-- CART ITEMS (session-based)
-- ============================================================
CREATE TABLE cart_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id    TEXT NOT NULL,
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity      INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, product_id)
);

CREATE INDEX idx_cart_session ON cart_items(session_id);

-- ============================================================
-- WISHLIST ITEMS (session-based)
-- ============================================================
CREATE TABLE wishlist_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id    TEXT NOT NULL,
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, product_id)
);

CREATE INDEX idx_wishlist_session ON wishlist_items(session_id);

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE orders (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id        TEXT NOT NULL,
  customer_name     TEXT NOT NULL,
  customer_email    TEXT,
  customer_phone    TEXT NOT NULL,
  shipping_address  TEXT,
  notes             TEXT,
  promo_code_id     UUID REFERENCES promo_codes(id) ON DELETE SET NULL,
  subtotal          NUMERIC(10,2) NOT NULL,
  discount          NUMERIC(10,2) DEFAULT 0,
  total             NUMERIC(10,2) NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','in-progress','shipped','delivered','cancelled')),
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_orders_session ON orders(session_id);
CREATE INDEX idx_orders_status ON orders(status);

-- ============================================================
-- ORDER ITEMS
-- ============================================================
CREATE TABLE order_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name  TEXT NOT NULL,
  quantity      INTEGER NOT NULL CHECK (quantity > 0),
  unit_price    NUMERIC(10,2) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);

-- ============================================================
-- SITE SETTINGS
-- ============================================================
CREATE TABLE site_settings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key           TEXT NOT NULL UNIQUE,
  value         TEXT NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT now()
);

INSERT INTO site_settings (key, value) VALUES
  ('whatsapp',    '+91XXXXXXXXXX'),
  ('email',       'mycreation@email.com'),
  ('phone',       '+91 XXXXXXXXXX'),
  ('city',        'Bhubaneswar, Odisha, India'),
  ('instagram',   '#'),
  ('facebook',    '#'),
  ('footer_tag',  'Handcrafted jewellery by Smitarani Mishra — where art, tradition, and love come together in every single piece.');

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE products       ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings  ENABLE ROW LEVEL SECURITY;

-- Public read for products & categories
CREATE POLICY "public_read_products"    ON products    FOR SELECT USING (true);
CREATE POLICY "public_read_categories"  ON categories  FOR SELECT USING (true);

-- Cart & wishlist: session-based access
CREATE POLICY "session_cart"    ON cart_items     USING (session_id = current_setting('app.session_id', true));
CREATE POLICY "session_wish"    ON wishlist_items USING (session_id = current_setting('app.session_id', true));

-- Orders: session-based read
CREATE POLICY "session_orders"  ON orders         USING (session_id = current_setting('app.session_id', true));

-- Admin: service role bypasses RLS
-- Seed sample products (replace images with real URLs later)
INSERT INTO products (name, slug, category_id, subcategory, description, price, compare_price, stock, badge)
SELECT 'Traditional Jhumka Pair',  'traditional-jhumka-pair',  id, 'Assamese',   'Handcrafted traditional Assamese Jhumka with intricate detailing.',  1299.00, 1599.00, 10, 'New'       FROM categories WHERE slug='earrings'
UNION ALL
SELECT 'Sambalpuri Beaded Haar',   'sambalpuri-beaded-haar',   id, 'Sambalpuri', 'Beautiful Sambalpuri-style beaded necklace, handmade with care.',      2499.00, 2999.00, 5,  'Bestseller' FROM categories WHERE slug='necklaces'
UNION ALL
SELECT 'Wedding Bridal Set',       'wedding-bridal-set',        id, 'Bridal',     'Complete bridal jewellery set — necklace, earrings, and maang tikka.', 5999.00, NULL,    3,  NULL        FROM categories WHERE slug='full-sets'
UNION ALL
SELECT 'Silk Embroidered Potli',   'silk-embroidered-potli',    id, 'Bengali',    'Hand-embroidered silk potli bag with golden thread work.',             899.00,  1199.00, 20, 'New'       FROM categories WHERE slug='potli-bags'
UNION ALL
SELECT 'Boho Floral Earrings',     'boho-floral-earrings',      id, 'Boho',       'Lightweight boho-style floral drop earrings for everyday wear.',       749.00,  NULL,    15, NULL        FROM categories WHERE slug='earrings'
UNION ALL
SELECT 'Arabian Gold-Toned Set',   'arabian-gold-toned-set',    id, 'Arabian',    'Gold-toned Arabian evening set — necklace + earrings + bangles.',       4499.00, 5499.00, 7,  'Sale'       FROM categories WHERE slug='full-sets';
