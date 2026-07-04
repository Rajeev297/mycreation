"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatPrice, generateSessionId, waLink } from "@/lib/utils";

interface Product {
  id: string; name: string; slug: string;
  category: { name: string; slug: string } | null;
  price: number; compare_price: number | null;
  images: string[]; stock: number; badge: string | null;
}

interface WishlistItem {
  id: string;
  product: Product;
}

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    generateSessionId();
    fetchWishlist();
    fetchSettings();
  }, []);

  async function fetchWishlist() {
    const sid = sessionStorage.getItem("mc_session_id");
    if (!sid) return;
    try {
      const res = await fetch(`/api/wishlist?session_id=${sid}`);
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {}
  }

  async function fetchSettings() {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) setSettings(await res.json());
    } catch {}
  }

  async function removeFromWishlist(productId: string) {
    const sid = sessionStorage.getItem("mc_session_id");
    if (!sid) return;
    const item = items.find((i) => i.product.id === productId);
    if (!item) return;
    await fetch("/api/wishlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id }),
    });
    setItems(items.filter((i) => i.product.id !== productId));
  }

  async function addToCart(productId: string) {
    const sid = sessionStorage.getItem("mc_session_id");
    if (!sid) return;
    await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sid, product_id: productId }),
    });
    removeFromWishlist(productId);
  }

  const waNum = (settings.whatsapp || "91XXXXXXXXXX").replace(/\D/g, "");

  return (
    <section style={{ padding: "3rem 5% 4rem", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: "2.5rem" }}>
        <div className="section-label">Saved For Later</div>
        <h1 className="section-title">Your Wishlist</h1>
        <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: "0.5rem" }}>
          {items.length === 0 ? "Your wishlist is empty. Start browsing our collection!" : `${items.length} item${items.length > 1 ? "s" : ""} saved`}
        </p>
      </div>

      {items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 0" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🤍</div>
          <p style={{ color: "var(--muted)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
            Nothing here yet. Browse products and tap the heart to save.
          </p>
          <Link href="/shop" className="btn-primary">
            Browse Shop
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem" }}>
          {items.map((item) => {
            const p = item.product;
            const waMsg = encodeURIComponent(`Hi! I am interested in ${p.name} (${formatPrice(p.price)})`);
            return (
              <div
                key={p.id}
                style={{
                  background: "var(--white)",
                  border: "1px solid var(--border-dk)",
                  overflow: "hidden",
                  position: "relative",
                  transition: "transform .3s, box-shadow .3s",
                }}
                className="hover:translate-y-[-5px] hover:shadow-[0_16px_40px_var(--shadow)]"
              >
                {p.badge && (
                  <div style={{
                    position: "absolute", top: "0.8rem", left: "0.8rem", zIndex: 2,
                    background: "var(--burg)", color: "white", fontSize: "0.52rem",
                    fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase",
                    padding: "0.2rem 0.6rem",
                  }}>
                    {p.badge}
                  </div>
                )}

                <button
                  onClick={() => removeFromWishlist(p.id)}
                  style={{
                    position: "absolute", top: "0.8rem", right: "0.8rem", zIndex: 2,
                    background: "rgba(255,255,255,0.9)", border: "none",
                    width: 30, height: 30, display: "flex", alignItems: "center",
                    justifyContent: "center", cursor: "pointer", fontSize: "0.9rem",
                    borderRadius: "50%", boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  }}
                  title="Remove"
                >
                  🗑️
                </button>

                <Link href={`/shop/${p.slug}`}>
                  <div style={{
                    width: "100%", aspectRatio: "3/4", overflow: "hidden",
                    background: "var(--warm)", display: "flex", alignItems: "center",
                    justifyContent: "center",
                  }}>
                    {p.images?.[0] ? (
                      <img src={p.images[0]} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ color: "var(--muted)", fontSize: "0.7rem" }}>📷 No image</span>
                    )}
                  </div>
                </Link>

                <div style={{ padding: "0.8rem 1rem" }}>
                  <div style={{ fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.2rem" }}>
                    {p.category?.name}
                  </div>
                  <Link href={`/shop/${p.slug}`} style={{ textDecoration: "none" }}>
                    <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1rem", fontWeight: 400, color: "var(--dark)", marginBottom: "0.3rem" }}>
                      {p.name}
                    </h3>
                  </Link>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem", color: "var(--burg)" }}>
                    {formatPrice(p.price)}
                  </span>

                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.8rem", paddingTop: "0.8rem", borderTop: "1px solid var(--border)" }}>
                    <a
                      href={waLink(waNum, waMsg)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        flex: 1, textAlign: "center", background: "var(--green-wa)", color: "white",
                        padding: "0.5rem 0", fontSize: "0.65rem", fontWeight: 600,
                        letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none",
                      }}
                      className="hover:bg-[#128c57]"
                    >
                      Buy Now
                    </a>
                    <button
                      onClick={() => addToCart(p.id)}
                      style={{
                        flex: 1, background: "transparent", color: "var(--burg)",
                        border: "1.5px solid var(--burg)", padding: "0.5rem 0",
                        fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.1em",
                        textTransform: "uppercase", cursor: "pointer",
                      }}
                    >
                      Move to Cart
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
