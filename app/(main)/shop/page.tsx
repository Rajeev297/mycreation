"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatPrice, generateSessionId, waLink } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  slug: string;
  category: { name: string; slug: string } | null;
  category_id: string;
  subcategory: string;
  description: string;
  price: number;
  compare_price: number | null;
  images: string[];
  stock: number;
  badge: string | null;
}

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [cartAddMsg, setCartAddMsg] = useState<string | null>(null);
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    generateSessionId();
    fetchProducts();
    fetchCategories();
    fetchWishlist();
    fetchSettings();
  }, []);

  async function fetchProducts() {
    try {
      const res = await fetch("/api/admin/products");
      if (res.ok) setProducts(await res.json());
    } catch {}
  }

  async function fetchCategories() {
    try {
      const res = await fetch("/api/admin/categories");
      if (res.ok) setCategories(await res.json());
    } catch {}
  }

  async function fetchSettings() {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const s = await res.json();
        setSettings(s);
        const waBtn = document.getElementById("floatWaBtn");
        if (waBtn && s.whatsapp) {
          waBtn.setAttribute("href", waLink(s.whatsapp, "Hi! I am interested in your jewellery."));
        }
      }
    } catch {}
  }

  async function fetchWishlist() {
    const sid = sessionStorage.getItem("mc_session_id");
    if (!sid) return;
    try {
      const res = await fetch(`/api/wishlist?session_id=${sid}`);
      const data = await res.json();
      setWishlistIds(new Set((data.items ?? []).map((i: { product: Product }) => i.product.id)));
    } catch {}
  }

  async function addToCart(productId: string) {
    const sid = sessionStorage.getItem("mc_session_id");
    if (!sid) return;
    await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sid, product_id: productId }),
    });
    setCartAddMsg("Added to cart!");
    setTimeout(() => setCartAddMsg(null), 2000);
  }

  async function toggleWishlist(productId: string) {
    const sid = sessionStorage.getItem("mc_session_id");
    if (!sid) return;
    if (wishlistIds.has(productId)) {
      const res = await fetch("/api/wishlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: productId }),
      });
      if (res.ok) {
        wishlistIds.delete(productId);
        setWishlistIds(new Set(wishlistIds));
      }
    } else {
      await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sid, product_id: productId }),
      });
      setWishlistIds(new Set([...wishlistIds, productId]));
    }
  }

  const filtered = activeCategory === "all"
    ? products
    : products.filter((p) => p.category?.slug === activeCategory);

  return (
    <>
      <section style={{ padding: "3rem 5% 2rem", background: "var(--cream)" }}>
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div className="section-label">Browse Our Collection</div>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(2rem,4vw,3.2rem)",
            fontWeight: 300,
            lineHeight: 1.12,
            color: "var(--dark)",
          }}>Shop Handmade Jewellery</h1>
        </div>

        {/* Category Filters */}
        <div
          style={{
            display: "flex",
            gap: "0.6rem",
            flexWrap: "wrap",
            justifyContent: "center",
            marginBottom: "2.5rem",
          }}
        >
          <button
            onClick={() => setActiveCategory("all")}
            style={{
              padding: "0.5rem 1.2rem",
              fontSize: "0.68rem",
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              background: activeCategory === "all" ? "var(--burg)" : "transparent",
              color: activeCategory === "all" ? "white" : "var(--burg)",
              border: "1.5px solid var(--burg)",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.slug)}
              style={{
                padding: "0.5rem 1.2rem",
                fontSize: "0.68rem",
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                background: activeCategory === cat.slug ? "var(--burg)" : "transparent",
                color: activeCategory === cat.slug ? "white" : "var(--burg)",
                border: "1.5px solid var(--burg)",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {cartAddMsg && (
          <div
            style={{
              textAlign: "center",
              padding: "0.6rem",
              background: "var(--green-wa)",
              color: "white",
              fontSize: "0.8rem",
              marginBottom: "1.5rem",
              borderRadius: 0,
            }}
          >
            {cartAddMsg}
          </div>
        )}

        {/* Product Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: "1.6rem",
          }}
        >
          {filtered.length === 0 && (
            <p style={{ gridColumn: "1 / -1", textAlign: "center", color: "var(--muted)", fontSize: "0.9rem", padding: "3rem 0" }}>
              No products in this category yet.
            </p>
          )}
          {filtered.map((product) => {
            const imgHtml = product.images?.[0]
              ? `<img src="${product.images[0]}" alt="${product.name}" style="width:100%;height:100%;object-fit:cover;" />`
              : `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.5rem;height:100%;color:var(--muted);font-size:0.7rem;">📷<span>No image</span></div>`;

            const waNum = (settings.whatsapp || "91XXXXXXXXXX").replace(/\D/g, "");
            const waMsg = encodeURIComponent(`Hi! I am interested in ${product.name} (₹${product.price})`);

            return (
              <div
                key={product.id}
                style={{
                  background: "var(--white)",
                  border: "1px solid var(--border-dk)",
                  overflow: "hidden",
                  position: "relative",
                  transition: "transform .3s, box-shadow .3s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-7px)"; e.currentTarget.style.boxShadow = "0 20px 48px var(--shadow)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
              >
                {/* Badge */}
                {product.badge && (
                  <div
                    style={{
                      position: "absolute",
                      top: "1rem",
                      left: "1rem",
                      zIndex: 2,
                      background: product.badge === "Bestseller" ? "var(--gold)" : "var(--burg)",
                      color: "white",
                      fontSize: "0.56rem",
                      fontWeight: 600,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      padding: "0.28rem 0.75rem",
                    }}
                  >
                    {product.badge}
                  </div>
                )}

                {/* Wishlist Heart */}
                <button
                  onClick={() => toggleWishlist(product.id)}
                  style={{
                    position: "absolute",
                    top: "1rem",
                    right: "1rem",
                    zIndex: 2,
                    background: "rgba(255,255,255,0.9)",
                    border: "none",
                    width: 32,
                    height: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    fontSize: "1rem",
                    borderRadius: "50%",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  }}
                >
                  {wishlistIds.has(product.id) ? "❤️" : "🤍"}
                </button>

                {/* Product Image */}
                <Link href={`/shop/${product.slug}`}>
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "3/4",
                      overflow: "hidden",
                      background: "var(--warm)",
                    }}
                    dangerouslySetInnerHTML={{ __html: imgHtml }}
                  />
                </Link>

                {/* Product Info */}
                <div style={{ padding: "1rem 1.2rem 1.2rem" }}>
                  <div
                    style={{
                      fontSize: "0.62rem",
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: "var(--muted)",
                      marginBottom: "0.3rem",
                    }}
                  >
                    {product.category?.name}
                    {product.subcategory ? ` · ${product.subcategory}` : ""}
                  </div>
                  <Link href={`/shop/${product.slug}`}>
                    <h3
                      style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        fontSize: "1.05rem",
                        fontWeight: 400,
                        color: "var(--dark)",
                        marginBottom: "0.3rem",
                        transition: "color 0.2s",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--burg)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = ""; }}
                    >
                      {product.name}
                    </h3>
                  </Link>

                  {/* Price */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
                    <span
                      style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        fontSize: "1.2rem",
                        fontWeight: 400,
                        color: "var(--burg)",
                      }}
                    >
                      {formatPrice(product.price)}
                    </span>
                    {product.compare_price && product.compare_price > product.price && (
                      <span
                        style={{
                          fontSize: "0.8rem",
                          color: "var(--muted)",
                          textDecoration: "line-through",
                        }}
                      >
                        {formatPrice(product.compare_price)}
                      </span>
                    )}
                  </div>

                  {/* Stock info */}
                  <div
                    style={{
                      fontSize: "0.65rem",
                      color: product.stock > 0 ? "var(--green-wa)" : "#e53935",
                      marginBottom: "0.8rem",
                    }}
                  >
                    {product.stock > 0 ? `✓ ${product.stock} in stock` : "✗ Out of stock"}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: "flex", gap: "0.6rem" }}>
                    <a
                      href={waLink(waNum, waMsg)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        flex: 1,
                        textAlign: "center",
                        background: "var(--green-wa)",
                        color: "white",
                        padding: "0.6rem 0",
                        fontSize: "0.68rem",
                        fontWeight: 600,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        cursor: "pointer",
                        textDecoration: "none",
                        transition: "background 0.2s",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#128c57"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "var(--green-wa)"; }}
                    >
                      Buy Now
                    </a>
                    <button
                      onClick={() => addToCart(product.id)}
                      disabled={product.stock === 0}
                      style={{
                        flex: 1,
                        background: "transparent",
                        color: product.stock === 0 ? "var(--border-dk)" : "var(--burg)",
                        border: "1.5px solid",
                        borderColor: product.stock === 0 ? "var(--border-dk)" : "var(--burg)",
                        padding: "0.6rem 0",
                        fontSize: "0.68rem",
                        fontWeight: 600,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        cursor: product.stock === 0 ? "not-allowed" : "pointer",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => { if (product.stock > 0) { (e.currentTarget as HTMLElement).style.backgroundColor = "var(--burg)"; (e.currentTarget as HTMLElement).style.color = "white"; } }}
                      onMouseLeave={(e) => { if (product.stock > 0) { (e.currentTarget as HTMLElement).style.backgroundColor = ""; (e.currentTarget as HTMLElement).style.color = ""; } }}
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
