"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatPrice, generateSessionId, waLink } from "@/lib/utils";

interface Product {
  id: string; name: string; slug: string;
  category: { name: string; slug: string } | null;
  subcategory: string; description: string;
  price: number; compare_price: number | null;
  images: string[]; stock: number; badge: string | null;
}

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImg, setSelectedImg] = useState(0);
  const [inWishlist, setInWishlist] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [cartMsg, setCartMsg] = useState("");

  useEffect(() => {
    generateSessionId();
    fetchProduct();
    fetchSettings();
  }, [slug]);

  async function fetchProduct() {
    try {
      const res = await fetch("/api/admin/products");
      if (res.ok) {
        const all: Product[] = await res.json();
        const found = all.find((p) => p.slug === slug);
        setProduct(found ?? null);
        setLoading(false);
        if (found) checkWishlist(found.id);
      }
    } catch {
      setLoading(false);
    }
  }

  async function fetchSettings() {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) setSettings(await res.json());
    } catch {}
  }

  async function checkWishlist(productId: string) {
    const sid = sessionStorage.getItem("mc_session_id");
    if (!sid) return;
    try {
      const res = await fetch(`/api/wishlist?session_id=${sid}`);
      const data = await res.json();
      const ids = new Set((data.items ?? []).map((i: { product: Product }) => i.product.id));
      setInWishlist(ids.has(productId));
    } catch {}
  }

  async function toggleWishlist() {
    if (!product) return;
    const sid = sessionStorage.getItem("mc_session_id");
    if (!sid) return;
    if (inWishlist) {
      const res = await fetch("/api/wishlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: product.id }),
      });
      if (res.ok) setInWishlist(false);
    } else {
      await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sid, product_id: product.id }),
      });
      setInWishlist(true);
    }
  }

  async function addToCart() {
    if (!product) return;
    const sid = sessionStorage.getItem("mc_session_id");
    if (!sid) return;
    await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sid, product_id: product.id }),
    });
    setCartMsg("✓ Added to cart!");
    setTimeout(() => setCartMsg(""), 2000);
  }

  if (loading) {
    return (
      <div style={{ padding: "4rem", textAlign: "center", color: "var(--muted)" }}>
        Loading...
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ padding: "4rem", textAlign: "center" }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "2rem", color: "var(--dark)", marginBottom: "1rem" }}>
          Product Not Found
        </h1>
        <Link href="/shop" style={{ color: "var(--burg)" }}>
          ← Back to Shop
        </Link>
      </div>
    );
  }

  const waNum = (settings.whatsapp || "91XXXXXXXXXX").replace(/\D/g, "");
  const waMsg = encodeURIComponent(`Hi! I want to buy ${product.name} (${formatPrice(product.price)}). Can you help me with this?`);

  return (
    <section style={{ padding: "2rem 5% 4rem", maxWidth: 1100, margin: "0 auto" }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "1.5rem" }}>
        <Link href="/shop" style={{ color: "var(--burg)" }}>Shop</Link>
        <span style={{ margin: "0 0.5rem" }}>/</span>
        {product.category && (
          <>
            <span>{product.category.name}</span>
            <span style={{ margin: "0 0.5rem" }}>/</span>
          </>
        )}
        <span style={{ color: "var(--text)" }}>{product.name}</span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "3rem",
          alignItems: "start",
        }}
      >
        {/* Left: Images */}
        <div>
          {/* Main Image */}
          <div
            style={{
              width: "100%",
              aspectRatio: "3/4",
              background: "var(--warm)",
              border: "1px solid var(--border-dk)",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1rem",
            }}
          >
            {product.images?.[selectedImg] ? (
              <img
                src={product.images[selectedImg]}
                alt={product.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div style={{ textAlign: "center", color: "var(--muted)", fontSize: "0.8rem" }}>
                <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>📷</div>
                <span>Product Image</span>
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {product.images && product.images.length > 1 && (
            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
              {product.images.map((img, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedImg(i)}
                  style={{
                    width: 70,
                    height: 70,
                    border: i === selectedImg ? "2px solid var(--burg)" : "1px solid var(--border-dk)",
                    overflow: "hidden",
                    cursor: "pointer",
                    opacity: i === selectedImg ? 1 : 0.6,
                    transition: "opacity 0.2s",
                  }}
                >
                  <img
                    src={img}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Details */}
        <div>
          {/* Badge */}
          {product.badge && (
            <div
              style={{
                display: "inline-block",
                background: product.badge === "Bestseller" ? "var(--gold)" : "var(--burg)",
                color: "white",
                fontSize: "0.58rem",
                fontWeight: 600,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                padding: "0.3rem 0.8rem",
                marginBottom: "1rem",
              }}
            >
              {product.badge}
            </div>
          )}

          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "clamp(1.8rem, 3vw, 2.8rem)",
              fontWeight: 300,
              color: "var(--dark)",
              marginBottom: "0.3rem",
            }}
          >
            {product.name}
          </h1>

          <div
            style={{
              fontSize: "0.72rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--muted)",
              marginBottom: "1.5rem",
            }}
          >
            {product.category?.name}
            {product.subcategory ? ` · ${product.subcategory}` : ""}
          </div>

          {/* Price */}
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.8rem", marginBottom: "0.8rem" }}>
            <span
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "2rem",
                fontWeight: 400,
                color: "var(--burg)",
              }}
            >
              {formatPrice(product.price)}
            </span>
            {product.compare_price && product.compare_price > product.price && (
              <>
                <span
                  style={{
                    fontSize: "1.1rem",
                    color: "var(--muted)",
                    textDecoration: "line-through",
                  }}
                >
                  {formatPrice(product.compare_price)}
                </span>
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    color: "var(--green-wa)",
                    background: "rgba(37,211,102,0.1)",
                    padding: "0.2rem 0.6rem",
                  }}
                >
                  {Math.round(((product.compare_price - product.price) / product.compare_price) * 100)}% OFF
                </span>
              </>
            )}
          </div>

          {/* Stock */}
          <div
            style={{
              fontSize: "0.78rem",
              color: product.stock > 0 ? "var(--green-wa)" : "#e53935",
              marginBottom: "1.5rem",
              padding: "0.5rem 0.8rem",
              background: product.stock > 0 ? "rgba(37,211,102,0.06)" : "rgba(229,57,53,0.06)",
              border: "1px solid",
              borderColor: product.stock > 0 ? "rgba(37,211,102,0.2)" : "rgba(229,57,53,0.2)",
            }}
          >
            {product.stock > 0 ? `✓ ${product.stock} in stock — Ready to ship` : "✗ Out of stock"}
          </div>

          {/* Description */}
          {product.description && (
            <p
              style={{
                fontSize: "0.88rem",
                color: "var(--muted)",
                lineHeight: 1.8,
                marginBottom: "2rem",
              }}
            >
              {product.description}
            </p>
          )}

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
            <div style={{ display: "flex", gap: "0.8rem" }}>
              <a
                href={waLink(waNum, waMsg)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1,
                  textAlign: "center",
                  background: "var(--green-wa)",
                  color: "white",
                  border: "none",
                  padding: "0.9rem 1.5rem",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  textDecoration: "none",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#128c57"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "var(--green-wa)"; }}
              >
                Buy Now via WhatsApp
              </a>
              <button
                onClick={addToCart}
                disabled={product.stock === 0}
                style={{
                  flex: 1,
                  background: "var(--burg)",
                  color: "white",
                  border: "none",
                  padding: "0.9rem 1.5rem",
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  cursor: product.stock === 0 ? "not-allowed" : "pointer",
                  opacity: product.stock === 0 ? 0.5 : 1,
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => { if (product.stock > 0) { (e.currentTarget as HTMLElement).style.backgroundColor = "var(--burg-dk)"; } }}
                onMouseLeave={(e) => { if (product.stock > 0) { (e.currentTarget as HTMLElement).style.backgroundColor = ""; } }}
              >
                {cartMsg || "Add to Cart"}
              </button>
            </div>

            <button
              onClick={toggleWishlist}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                background: "transparent",
                color: inWishlist ? "var(--burg)" : "var(--muted)",
                border: "1.5px solid",
                borderColor: inWishlist ? "var(--burg)" : "var(--border-dk)",
                padding: "0.7rem",
                fontSize: "0.72rem",
                fontWeight: 500,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {inWishlist ? "❤️ Saved to Wishlist" : "🤍 Add to Wishlist"}
            </button>
          </div>

          {/* Share */}
          <div
            style={{
              marginTop: "2rem",
              paddingTop: "1.5rem",
              borderTop: "1px solid var(--border)",
              fontSize: "0.72rem",
              color: "var(--muted)",
              display: "flex",
              gap: "1rem",
              alignItems: "center",
            }}
          >
            <span>Share:</span>
            <a
              href={`https://wa.me/${waNum}?text=${encodeURIComponent(`Check out ${product.name} at My Creation!`)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--green-wa)", fontSize: "0.8rem" }}
            >
              WhatsApp
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
