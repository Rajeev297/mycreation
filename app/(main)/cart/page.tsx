"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { formatPrice, generateSessionId, waLink } from "@/lib/utils";

interface Product {
  id: string; name: string; slug: string;
  category: { name: string; slug: string } | null;
  price: number; compare_price: number | null;
  images: string[]; stock: number;
}

interface CartItem {
  id: string;
  quantity: number;
  product: Product;
}

interface PromoResult {
  valid: boolean;
  promo_id?: string;
  code?: string;
  discount_percent?: number;
  discount_amount?: number;
  error?: string;
}

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [promoCode, setPromoCode] = useState("");
  const [promoResult, setPromoResult] = useState<PromoResult | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    generateSessionId();
    fetchCart();
    fetchSettings();
  }, []);

  async function fetchCart() {
    const sid = sessionStorage.getItem("mc_session_id");
    if (!sid) return;
    try {
      const res = await fetch(`/api/cart?session_id=${sid}`);
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

  async function updateQuantity(id: string, quantity: number) {
    if (quantity < 1) return;
    await fetch("/api/cart", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, quantity }),
    });
    fetchCart();
  }

  async function removeItem(id: string) {
    await fetch("/api/cart", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchCart();
  }

  async function validatePromo() {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    setPromoResult(null);
    try {
      const res = await fetch("/api/promos/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCode.trim(), subtotal }),
      });
      const data = await res.json();
      setPromoResult(data);
    } catch {
      setPromoResult({ valid: false, error: "Server error" });
    }
    setPromoLoading(false);
  }

  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  const discountAmount = promoResult?.valid
    ? promoResult.discount_amount ?? (promoResult.discount_percent ? Math.round((subtotal * promoResult.discount_percent) / 100) : 0)
    : 0;

  const total = Math.max(0, subtotal - discountAmount);

  const waNum = (settings.whatsapp || "91XXXXXXXXXX").replace(/\D/g, "");

  function buildWaMessage(): string {
    let msg = "Hi! I want to order the following from My Creation:\n\n";
    items.forEach((i) => {
      msg += `• ${i.product.name} x${i.quantity} = ${formatPrice(i.product.price * i.quantity)}\n`;
    });
    msg += `\nSubtotal: ${formatPrice(subtotal)}`;
    if (discountAmount > 0) {
      msg += `\nDiscount (${promoResult?.code}): -${formatPrice(discountAmount)}`;
    }
    msg += `\nTotal: ${formatPrice(total)}`;
    msg += "\n\nPlease confirm availability and share payment details.";
    return encodeURIComponent(msg);
  }

  return (
    <section style={{ padding: "3rem 5% 4rem", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: "2rem" }}>
        <div className="section-label">Your Selection</div>
        <h1 className="section-title">Shopping Cart</h1>
      </div>

      {message && (
        <div style={{
          padding: "0.6rem 1rem", background: "var(--green-wa)", color: "white",
          fontSize: "0.8rem", marginBottom: "1rem",
        }}>
          {message}
        </div>
      )}

      {items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 0" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🛒</div>
          <p style={{ color: "var(--muted)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
            Your cart is empty. Start shopping to add items!
          </p>
          <Link href="/shop" className="btn-primary">
            Browse Shop
          </Link>
        </div>
      ) : (
        <>
          {/* Cart Items */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2rem" }}>
            {items.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "80px 1fr auto",
                  gap: "1.2rem",
                  padding: "1rem 1.2rem",
                  background: "var(--white)",
                  border: "1px solid var(--border-dk)",
                  alignItems: "center",
                }}
                className="max-sm:grid-cols-[60px_1fr]"
              >
                {/* Image */}
                <Link href={`/shop/${item.product.slug}`}>
                  <div style={{
                    width: "100%", aspectRatio: "1", background: "var(--warm)",
                    border: "1px solid var(--border)", overflow: "hidden",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {item.product.images?.[0] ? (
                      <img src={item.product.images[0]} alt={item.product.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: "0.6rem", color: "var(--muted)" }}>📷</span>
                    )}
                  </div>
                </Link>

                {/* Details */}
                <div>
                  <Link href={`/shop/${item.product.slug}`} style={{ textDecoration: "none" }}>
                    <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1rem", fontWeight: 400, color: "var(--dark)", marginBottom: "0.2rem" }}>
                      {item.product.name}
                    </h3>
                  </Link>
                  <div style={{ fontSize: "0.62rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.4rem" }}>
                    {item.product.category?.name}
                  </div>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1rem", color: "var(--burg)" }}>
                    {formatPrice(item.product.price)}
                  </div>
                </div>

                {/* Quantity + Remove */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.6rem" }}
                  className="max-sm:col-span-2 max-sm:flex-row max-sm:justify-between max-sm:pt-3 max-sm:border-t max-sm:border-[var(--border)]"
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      style={{
                        width: 30, height: 30, border: "1px solid var(--border-dk)",
                        background: "var(--cream)", cursor: item.quantity <= 1 ? "not-allowed" : "pointer",
                        fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center",
                        opacity: item.quantity <= 1 ? 0.4 : 1,
                      }}
                    >
                      −
                    </button>
                    <span style={{ fontSize: "0.9rem", fontWeight: 500, color: "var(--dark)", width: 30, textAlign: "center" }}>
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      style={{
                        width: 30, height: 30, border: "1px solid var(--border-dk)",
                        background: "var(--cream)", cursor: "pointer",
                        fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      +
                    </button>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                    <span style={{ fontSize: "0.85rem", color: "var(--burg)", fontWeight: 500 }}>
                      {formatPrice(item.product.price * item.quantity)}
                    </span>
                    <button
                      onClick={() => removeItem(item.id)}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        fontSize: "0.8rem", color: "var(--muted)",
                      }}
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Promo Code + Summary */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "start" }}
            className="max-md:grid-cols-1"
          >
            {/* Promo Code */}
            <div style={{ background: "var(--white)", border: "1px solid var(--border-dk)", padding: "1.5rem" }}>
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem", fontWeight: 400, color: "var(--dark)", marginBottom: "0.5rem" }}>
                Have a Promo Code?
              </h3>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="Enter code"
                  onKeyDown={(e) => e.key === "Enter" && validatePromo()}
                  style={{
                    flex: 1, border: "1px solid var(--border-dk)", padding: "0.65rem 0.9rem",
                    fontFamily: "'Jost', sans-serif", fontSize: "0.8rem",
                    background: "var(--cream)", outline: "none", textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                />
                <button
                  onClick={validatePromo}
                  disabled={promoLoading || !promoCode.trim()}
                  style={{
                    background: promoLoading ? "var(--muted)" : "var(--burg)",
                    color: "white", border: "none", padding: "0 1.5rem",
                    fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.12em",
                    textTransform: "uppercase", cursor: promoLoading ? "not-allowed" : "pointer",
                  }}
                >
                  {promoLoading ? "..." : "Apply"}
                </button>
              </div>
              {promoResult && (
                <div style={{ marginTop: "0.8rem", fontSize: "0.78rem" }}>
                  {promoResult.valid ? (
                    <div style={{ color: "var(--green-wa)" }}>
                      ✓ Code <strong>{promoResult.code}</strong> applied!
                      {promoResult.discount_percent
                        ? ` You save ${promoResult.discount_percent}%!`
                        : promoResult.discount_amount
                          ? ` You save ${formatPrice(promoResult.discount_amount)}!`
                          : ""}
                    </div>
                  ) : (
                    <div style={{ color: "#e53935" }}>✗ {promoResult.error}</div>
                  )}
                </div>
              )}
            </div>

            {/* Order Summary */}
            <div style={{ background: "var(--white)", border: "1px solid var(--border-dk)", padding: "1.5rem" }}>
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem", fontWeight: 400, color: "var(--dark)", marginBottom: "1rem" }}>
                Order Summary
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "var(--text)" }}>
                  <span>Subtotal ({items.length} item{items.length > 1 ? "s" : ""})</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "var(--green-wa)" }}>
                    <span>Discount ({promoResult?.code})</span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  fontSize: "1rem", fontWeight: 600, color: "var(--burg)",
                  paddingTop: "0.8rem", borderTop: "1px solid var(--border)",
                }}>
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>

              <a
                href={waLink(waNum, buildWaMessage())}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block", textAlign: "center", marginTop: "1.5rem",
                  background: "var(--green-wa)", color: "white",
                  padding: "0.85rem", fontSize: "0.75rem", fontWeight: 600,
                  letterSpacing: "0.15em", textTransform: "uppercase",
                  textDecoration: "none", transition: "background 0.2s",
                }}
                className="hover:bg-[#128c57]"
              >
                Buy All via WhatsApp
              </a>
              <p style={{ fontSize: "0.65rem", color: "var(--muted)", textAlign: "center", marginTop: "0.5rem" }}>
                After clicking, we&apos;ll share a complete order summary on WhatsApp.
              </p>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
