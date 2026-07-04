"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import { formatPrice } from "@/lib/utils";

type Tab = "products" | "categories" | "promos" | "orders" | "settings";

interface Product {
  id: string; name: string; slug: string; category_id: string; subcategory: string;
  description: string; price: number; compare_price: number | null;
  images: string[]; stock: number; is_active: boolean; badge: string | null;
  category?: { id: string; name: string; slug: string };
}
interface Category { id: string; name: string; slug: string; description: string; image_url: string | null; sort_order: number; }
interface Promo { id: string; code: string; description?: string; discount_percent: number | null; discount_amount: number | null; min_order_amount: number; max_uses: number | null; current_uses: number; is_active: boolean; expires_at: string | null; }
interface Order { id: string; customer_name: string; customer_phone: string; subtotal: number; discount: number; total: number; status: string; created_at: string; items?: OrderItem[]; }
interface OrderItem { id: string; product_name: string; quantity: number; unit_price: number; }

const WA_SVG = `<svg viewBox="0 0 24 24" fill="var(--green)" width="16" height="16"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.121 1.531 5.856L.057 23.25a.75.75 0 0 0 .921.919l5.487-1.472A11.953 11.953 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.693-.498-5.24-1.37l-.375-.214-3.888 1.042 1.059-3.766-.232-.39A9.953 9.953 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>`;

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("products");
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [passwordModal, setPasswordModal] = useState<{ action: string; id: string; type: string } | null>(null);
  const [confirmPass, setConfirmPass] = useState("");
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});

  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);
  const [editingPromo, setEditingPromo] = useState<Partial<Promo> | null>(null);
  const [editingSettings, setEditingSettings] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push("/admin/login"); return; }
      setUserEmail(data.user.email ?? "");
      setLoading(false);
      fetchAll();
    });
  }, [router]);

  async function fetchAll() {
    fetchProducts();
    fetchCategories();
    fetchPromos();
    fetchOrders();
    fetchSettings();
  }

  async function fetchProducts() {
    const res = await fetch("/api/admin/products"); if (res.ok) setProducts(await res.json());
  }
  async function fetchCategories() {
    const res = await fetch("/api/admin/categories"); if (res.ok) setCategories(await res.json());
  }
  async function fetchPromos() {
    const res = await fetch("/api/admin/promos"); if (res.ok) setPromos(await res.json());
  }
  async function fetchOrders() {
    const res = await fetch("/api/admin/orders"); if (res.ok) setOrders(await res.json());
  }
  async function fetchSettings() {
    const res = await fetch("/api/admin/settings"); if (res.ok) { const s = await res.json(); setSettings(s); setEditingSettings(s); }
  }

  async function saveProduct() {
    if (!editingProduct) return;
    const method = editingProduct.id ? "PUT" : "POST";
    const res = await fetch("/api/admin/products", {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingProduct),
    });
    if (res.ok) { showToast("✓ Product saved"); setEditingProduct(null); fetchProducts(); }
    else { const e = await res.json(); showToast("✗ " + e.error); }
  }

  async function deleteWithConfirm(type: string, id: string) {
    setPasswordModal({ action: "delete", id, type });
  }

  async function confirmDelete() {
    if (!passwordModal) return;
    const res = await fetch(`/api/admin/${passwordModal.type}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: passwordModal.id, password: confirmPass }),
    });
    setPasswordModal(null); setConfirmPass("");
    if (res.ok) { showToast("✓ Deleted"); fetchAll(); }
    else { const e = await res.json(); showToast("✗ " + e.error); }
  }

  async function saveCategory() {
    if (!editingCategory) return;
    const method = editingCategory.id ? "PUT" : "POST";
    const res = await fetch("/api/admin/categories", {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingCategory),
    });
    if (res.ok) { showToast("✓ Category saved"); setEditingCategory(null); fetchCategories(); }
    else { const e = await res.json(); showToast("✗ " + e.error); }
  }

  async function savePromo() {
    if (!editingPromo) return;
    const method = editingPromo.id ? "PUT" : "POST";
    const res = await fetch("/api/admin/promos", {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingPromo),
    });
    if (res.ok) { showToast("✓ Promo code saved"); setEditingPromo(null); fetchPromos(); }
    else { const e = await res.json(); showToast("✗ " + e.error); }
  }

  async function updateOrderStatus(id: string, status: string) {
    const res = await fetch("/api/admin/orders", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) { showToast("✓ Status updated"); fetchOrders(); }
    else { const e = await res.json(); showToast("✗ " + e.error); }
  }

  async function saveSettings() {
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingSettings),
    });
    if (res.ok) { showToast("✓ Settings saved"); fetchSettings(); }
    else { const e = await res.json(); showToast("✗ " + e.error); }
  }

  function imgFallback(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    const parent = img.parentElement;
    if (!parent || parent.dataset.fallback) return;
    parent.dataset.fallback = "1";
    img.style.display = "none";
    const fb = document.createElement("span");
    fb.textContent = "📷";
    Object.assign(fb.style, {
      display: "flex", alignItems: "center", justifyContent: "center",
      width: "100%", height: "100%", fontSize: "1.5rem", opacity: "0.4",
    });
    parent.insertBefore(fb, img.nextSibling);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      if (res.ok) {
        const { url } = await res.json();
        setEditingProduct(prev => prev ? { ...prev, images: [...(prev.images ?? []), url] } : prev);
      } else {
        const e = await res.json();
        showToast("✗ Upload failed: " + (e.error || "Unknown error"));
      }
    }
    setUploading(false);
    e.target.value = "";
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--dark)" }}>
      <p style={{ color: "white", fontFamily: "'Jost', sans-serif", fontSize: "0.85rem" }}>Loading...</p>
    </div>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Jost', sans-serif", background: "#f4edf0" }}>
      {/* Sidebar */}
      <div style={{
        width: 240, flexShrink: 0, background: "var(--dark)",
        display: "flex", flexDirection: "column", position: "fixed",
        top: 0, left: 0, bottom: 0, zIndex: 100, overflowY: "auto",
      }}>
        <div style={{ padding: "1.4rem 1.2rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <img src="/logo.png" alt="My Creation" style={{ height: 52, mixBlendMode: "screen", marginBottom: "0.3rem" }} />
          <span style={{ fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", display: "block" }}>
            Admin Dashboard
          </span>
        </div>
        <nav style={{ flex: 1, padding: "1rem 0" }}>
          <div style={{ fontSize: "0.55rem", fontWeight: 600, letterSpacing: "0.25em", textTransform: "uppercase", color: "var(--gold-sheen)", padding: "0.8rem 1.2rem 0.4rem" }}>
            Manage
          </div>
          {(["products", "categories", "promos", "orders", "settings"] as Tab[]).map((t) => (
            <div key={t} onClick={() => setTab(t)} style={{
              display: "flex", alignItems: "center", gap: "0.75rem",
              padding: "0.7rem 1.2rem", cursor: "pointer",
              fontSize: "0.8rem", color: tab === t ? "white" : "rgba(255,255,255,0.5)",
              background: tab === t ? "rgba(156,38,69,0.25)" : "transparent",
              borderLeft: tab === t ? "2px solid var(--burg-lt)" : "2px solid transparent",
              transition: "background 0.2s, color 0.2s",
            }}>
              {t === "products" && "📦"} {t === "categories" && "📂"}
              {t === "promos" && "🏷️"} {t === "orders" && "📋"} {t === "settings" && "⚙️"}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </div>
          ))}
        </nav>
        <div style={{ padding: "1rem 1.2rem", borderTop: "1px solid rgba(255,255,255,0.07)", fontSize: "0.7rem", color: "rgba(255,255,255,0.3)" }}>
          <div onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: "0.5rem 0", transition: "color 0.2s" }}>
            Sign Out
          </div>
          <div style={{ marginTop: "0.5rem" }}>{userEmail}</div>
        </div>
      </div>

      {/* Main */}
      <div style={{ marginLeft: 240, flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <div style={{ background: "var(--white)", padding: "0.9rem 2rem", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.4rem", fontWeight: 300, color: "var(--dark)" }}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", background: "var(--warm)", color: "var(--burg)", border: "1px solid var(--border-dk)", padding: "0.3rem 0.8rem" }}>
              🔒 Secure
            </span>
            <button onClick={() => router.push("/shop")} style={{ background: "transparent", color: "var(--burg)", fontSize: "0.72rem", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", padding: "0.52rem 1.2rem", border: "1.5px solid var(--burg)", cursor: "pointer" }}>
              ↗ View Shop
            </button>
          </div>
        </div>

        <div style={{ padding: "2rem", flex: 1 }}>
          {/* Products Tab */}
          {tab === "products" && (
            <div>
              <div style={{ background: "var(--white)", border: "1px solid var(--border)", marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.5rem", borderBottom: "1px solid var(--border)", background: "var(--warm)" }}>
                  <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem", fontWeight: 400, color: "var(--dark)" }}>Products</h3>
                  <span style={{ fontSize: "0.65rem", color: "var(--muted)" }}>{products.length} items</span>
                </div>
                <div style={{ padding: "1.5rem" }}>
                  <button onClick={() => setEditingProduct({ name: "", slug: "", price: 0, stock: 0, is_active: true, images: [] })}
                    style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "transparent", color: "var(--burg)", border: "1.5px dashed var(--burg)", padding: "0.6rem 1.2rem", fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", marginBottom: "1rem", justifyContent: "center", width: "100%" }}>
                    + Add Product
                  </button>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                    {products.map((p) => (
                      <div key={p.id} style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr 100px 100px 90px", gap: "1rem", alignItems: "center", padding: "0.8rem 1rem", background: "var(--cream)", border: "1px solid var(--border)", borderLeft: "3px solid var(--burg)" }}>
                        <div style={{ width: 60, height: 60, background: "var(--warm)", border: "1px solid var(--border-dk)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", color: "var(--muted)", overflow: "hidden" }}>
                          {p.images?.[0] ? <img src={p.images[0]} onError={imgFallback} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "📷"}
                        </div>
                        <div>
                          <div style={{ fontSize: "0.82rem", fontWeight: 500, color: "var(--dark)" }}>{p.name}</div>
                          <div style={{ fontSize: "0.65rem", color: "var(--muted)" }}>{p.category?.name} · {p.subcategory}</div>
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "var(--burg)" }}>{formatPrice(p.price)}</div>
                        <div style={{ fontSize: "0.72rem", color: p.stock > 0 ? "var(--green-wa)" : "#e53935" }}>{p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}</div>
                        <div>
                          {p.badge && <span style={{ fontSize: "0.58rem", fontWeight: 600, letterSpacing: "0.12em", background: "var(--burg)", color: "white", padding: "0.2rem 0.5rem" }}>{p.badge}</span>}
                        </div>
                        <div style={{ display: "flex", gap: "0.4rem" }}>
                          <button onClick={() => setEditingProduct(p)} style={{ width: 30, height: 30, border: "1px solid var(--border-dk)", background: "var(--white)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>✏️</button>
                          <button onClick={() => deleteWithConfirm("products", p.id)} style={{ width: 30, height: 30, border: "1px solid var(--border-dk)", background: "var(--white)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>🗑️</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Product Edit Modal */}
              {editingProduct && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
                  <div style={{ background: "var(--white)", padding: "2rem", width: 500, maxHeight: "90vh", overflow: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>
                    <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.3rem", fontWeight: 400, color: "var(--dark)", marginBottom: "1.5rem" }}>
                      {editingProduct.id ? "Edit Product" : "New Product"}
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      {[
                        ["name", "Product Name"], ["slug", "Slug (URL-friendly)"],
                        ["subcategory", "Subcategory"],
                        ["description", "Description"],
                      ].map(([key, label]) => (
                        <div key={key}>
                          <label style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>{label}</label>
                          {key === "description" ? (
                            <textarea value={editingProduct[key as keyof typeof editingProduct] as string ?? ""}
                              onChange={(e) => setEditingProduct({ ...editingProduct, [key]: e.target.value })}
                              style={{ width: "100%", border: "1px solid var(--border-dk)", padding: "0.6rem 0.9rem", fontFamily: "'Jost', sans-serif", fontSize: "0.83rem", background: "var(--cream)", outline: "none", minHeight: 80, resize: "vertical" }}
                            />
                          ) : (
                            <input value={editingProduct[key as keyof typeof editingProduct] as string ?? ""}
                              onChange={(e) => setEditingProduct({ ...editingProduct, [key]: e.target.value })}
                              style={{ width: "100%", border: "1px solid var(--border-dk)", padding: "0.6rem 0.9rem", fontFamily: "'Jost', sans-serif", fontSize: "0.83rem", background: "var(--cream)", outline: "none" }}
                            />
                          )}
                        </div>
                      ))}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                        {[
                          ["price", "Price (₹)"], ["compare_price", "Compare Price"],
                          ["stock", "Stock"],
                        ].map(([key, label]) => (
                          <div key={key}>
                            <label style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>{label}</label>
                            <input type="number" value={editingProduct[key as keyof typeof editingProduct] as number ?? ""}
                              onChange={(e) => setEditingProduct({ ...editingProduct, [key]: parseFloat(e.target.value) || 0 })}
                              style={{ width: "100%", border: "1px solid var(--border-dk)", padding: "0.6rem 0.9rem", fontFamily: "'Jost', sans-serif", fontSize: "0.83rem", background: "var(--cream)", outline: "none" }}
                            />
                          </div>
                        ))}
                      </div>
                      <div>
                        <label style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>Category</label>
                        <select value={editingProduct.category_id ?? ""}
                          onChange={(e) => setEditingProduct({ ...editingProduct, category_id: e.target.value })}
                          style={{ width: "100%", border: "1px solid var(--border-dk)", padding: "0.6rem 0.9rem", fontFamily: "'Jost', sans-serif", fontSize: "0.83rem", background: "var(--cream)", outline: "none" }}
                        >
                          <option value="">Select category</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>Badge</label>
                        <select value={editingProduct.badge ?? ""}
                          onChange={(e) => setEditingProduct({ ...editingProduct, badge: e.target.value || null })}
                          style={{ width: "100%", border: "1px solid var(--border-dk)", padding: "0.6rem 0.9rem", fontFamily: "'Jost', sans-serif", fontSize: "0.83rem", background: "var(--cream)", outline: "none" }}
                        >
                          <option value="">No Badge</option>
                          <option value="New">New</option>
                          <option value="Bestseller">Bestseller</option>
                          <option value="Sale">Sale</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: "0.5rem" }}>Product Images</label>
                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                          {(editingProduct.images ?? []).map((url, i) => (
                            <div key={i} style={{ position: "relative", width: 80, height: 80, border: "1px solid var(--border-dk)", overflow: "hidden", background: "var(--warm)" }}>
                              <img src={url} alt="" onError={imgFallback} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              <button type="button" onClick={() => {
                                const updated = [...(editingProduct.images ?? [])];
                                updated.splice(i, 1);
                                setEditingProduct({ ...editingProduct, images: updated });
                              }} style={{ position: "absolute", top: 2, right: 2, width: 20, height: 20, border: "none", background: "rgba(0,0,0,0.6)", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", lineHeight: 1 }}>✕</button>
                            </div>
                          ))}
                          <label style={{ width: 80, height: 80, border: "1px dashed var(--border-dk)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: uploading ? "not-allowed" : "pointer", background: "var(--cream)", fontSize: "0.6rem", color: "var(--muted)", opacity: uploading ? 0.5 : 1 }}>
                            {uploading ? "..." : "+ Upload"}
                            <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleImageUpload} disabled={uploading} />
                          </label>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "0.8rem", marginTop: "1.5rem" }}>
                      <button onClick={saveProduct} style={{ flex: 1, background: "var(--burg)", color: "white", border: "none", padding: "0.75rem", fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer" }}>
                        Save
                      </button>
                      <button onClick={() => setEditingProduct(null)} style={{ flex: 1, background: "transparent", color: "var(--burg)", border: "1.5px solid var(--burg)", padding: "0.75rem", fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer" }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Categories Tab */}
          {tab === "categories" && (
            <div style={{ background: "var(--white)", border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.5rem", borderBottom: "1px solid var(--border)", background: "var(--warm)" }}>
                <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem", fontWeight: 400, color: "var(--dark)" }}>Categories</h3>
                <span style={{ fontSize: "0.65rem", color: "var(--muted)" }}>{categories.length} items</span>
              </div>
              <div style={{ padding: "1.5rem" }}>
                <button onClick={() => setEditingCategory({ name: "", slug: "" })}
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "transparent", color: "var(--burg)", border: "1.5px dashed var(--burg)", padding: "0.6rem 1.2rem", fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", marginBottom: "1rem", justifyContent: "center", width: "100%" }}>
                  + Add Category
                </button>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                  {categories.map((c) => (
                    <div key={c.id} style={{ display: "grid", gridTemplateColumns: "1fr 100px 80px", gap: "1rem", alignItems: "center", padding: "0.8rem 1rem", background: "var(--cream)", border: "1px solid var(--border)", borderLeft: "3px solid var(--gold)" }}>
                      <div>
                        <div style={{ fontSize: "0.82rem", fontWeight: 500, color: "var(--dark)" }}>{c.name}</div>
                        <div style={{ fontSize: "0.65rem", color: "var(--muted)" }}>/{c.slug}</div>
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>Order: {c.sort_order}</div>
                      <div style={{ display: "flex", gap: "0.4rem" }}>
                        <button onClick={() => setEditingCategory(c)} style={{ width: 30, height: 30, border: "1px solid var(--border-dk)", background: "var(--white)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>✏️</button>
                        <button onClick={() => deleteWithConfirm("categories", c.id)} style={{ width: 30, height: 30, border: "1px solid var(--border-dk)", background: "var(--white)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {editingCategory && (
                <div style={{ borderTop: "1px solid var(--border)", padding: "1.5rem" }}>
                  <h4 style={{ fontSize: "0.9rem", fontWeight: 500, color: "var(--dark)", marginBottom: "1rem" }}>{editingCategory.id ? "Edit" : "New"} Category</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                    {[["name","Name"],["slug","Slug"],["description","Description"],["sort_order","Sort Order"]].map(([key,label]) => (
                      <div key={key}>
                        <label style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)" }}>{label}</label>
                        {key === "description" ? (
                          <textarea value={editingCategory[key as keyof typeof editingCategory] as string ?? ""}
                            onChange={(e) => setEditingCategory({...editingCategory, [key]: e.target.value})}
                            style={{ width: "100%", border: "1px solid var(--border-dk)", padding: "0.6rem 0.9rem", fontSize: "0.83rem", background: "var(--cream)", outline: "none", minHeight: 60, resize: "vertical", fontFamily: "'Jost', sans-serif" }}
                          />
                        ) : (
                          <input value={editingCategory[key as keyof typeof editingCategory] as string ?? ""}
                            onChange={(e) => setEditingCategory({...editingCategory, [key]: key === "sort_order" ? parseInt(e.target.value) || 0 : e.target.value})}
                            style={{ width: "100%", border: "1px solid var(--border-dk)", padding: "0.6rem 0.9rem", fontSize: "0.83rem", background: "var(--cream)", outline: "none", fontFamily: "'Jost', sans-serif" }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: "0.8rem" }}>
                    <button onClick={saveCategory} style={{ background: "var(--burg)", color: "white", border: "none", padding: "0.6rem 1.5rem", fontSize: "0.72rem", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer" }}>Save</button>
                    <button onClick={() => setEditingCategory(null)} style={{ background: "transparent", color: "var(--burg)", border: "1.5px solid var(--burg)", padding: "0.6rem 1.5rem", fontSize: "0.72rem", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer" }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Promos Tab */}
          {tab === "promos" && (
            <div style={{ background: "var(--white)", border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.5rem", borderBottom: "1px solid var(--border)", background: "var(--warm)" }}>
                <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem", fontWeight: 400, color: "var(--dark)" }}>Promo Codes</h3>
                <span style={{ fontSize: "0.65rem", color: "var(--muted)" }}>{promos.length} codes</span>
              </div>
              <div style={{ padding: "1.5rem" }}>
                <button onClick={() => setEditingPromo({ code: "", is_active: true, min_order_amount: 0 })}
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "transparent", color: "var(--burg)", border: "1.5px dashed var(--burg)", padding: "0.6rem 1.2rem", fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", marginBottom: "1rem", justifyContent: "center", width: "100%" }}>
                  + Add Promo Code
                </button>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                  {promos.map((p) => (
                    <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1fr 120px 100px 80px 80px", gap: "1rem", alignItems: "center", padding: "0.8rem 1rem", background: "var(--cream)", border: "1px solid var(--border)", borderLeft: "3px solid var(--burg)" }}>
                      <div>
                        <div style={{ fontSize: "0.82rem", fontWeight: 500, color: "var(--burg)", fontFamily: "'Cinzel', serif", letterSpacing: "0.15em" }}>{p.code}</div>
                        <div style={{ fontSize: "0.65rem", color: "var(--muted)" }}>
                          {p.discount_percent ? `${p.discount_percent}% off` : p.discount_amount ? `₹${p.discount_amount} off` : ""} · Min: ₹{p.min_order_amount}
                        </div>
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                        {p.current_uses}/{p.max_uses ?? "∞"} used
                      </div>
                      <div>
                        <span style={{ fontSize: "0.58rem", fontWeight: 600, padding: "0.2rem 0.5rem", background: p.is_active ? "#e8f5e9" : "#ffebee", color: p.is_active ? "#2e7d32" : "#e53935" }}>
                          {p.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "0.4rem" }}>
                        <button onClick={() => setEditingPromo(p)} style={{ width: 30, height: 30, border: "1px solid var(--border-dk)", background: "var(--white)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>✏️</button>
                        <button onClick={() => deleteWithConfirm("promos", p.id)} style={{ width: 30, height: 30, border: "1px solid var(--border-dk)", background: "var(--white)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {editingPromo && (
                <div style={{ borderTop: "1px solid var(--border)", padding: "1.5rem" }}>
                  <h4 style={{ fontSize: "0.9rem", fontWeight: 500, color: "var(--dark)", marginBottom: "1rem" }}>{editingPromo.id ? "Edit" : "New"} Promo Code</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                    <div>
                      <label style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)" }}>Code</label>
                      <input value={editingPromo.code ?? ""} onChange={(e) => setEditingPromo({...editingPromo, code: e.target.value.toUpperCase()})}
                        style={{ width: "100%", border: "1px solid var(--border-dk)", padding: "0.6rem 0.9rem", fontSize: "0.83rem", fontFamily: "'Jost', sans-serif", background: "var(--cream)", outline: "none" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)" }}>Description</label>
                      <input value={editingPromo.description ?? ""} onChange={(e) => setEditingPromo({...editingPromo, description: e.target.value})}
                        style={{ width: "100%", border: "1px solid var(--border-dk)", padding: "0.6rem 0.9rem", fontSize: "0.83rem", fontFamily: "'Jost', sans-serif", background: "var(--cream)", outline: "none" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)" }}>Discount %</label>
                      <input type="number" value={editingPromo.discount_percent ?? ""} onChange={(e) => setEditingPromo({...editingPromo, discount_percent: parseFloat(e.target.value) || null})}
                        style={{ width: "100%", border: "1px solid var(--border-dk)", padding: "0.6rem 0.9rem", fontSize: "0.83rem", fontFamily: "'Jost', sans-serif", background: "var(--cream)", outline: "none" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)" }}>Discount Amount (₹)</label>
                      <input type="number" value={editingPromo.discount_amount ?? ""} onChange={(e) => setEditingPromo({...editingPromo, discount_amount: parseFloat(e.target.value) || null})}
                        style={{ width: "100%", border: "1px solid var(--border-dk)", padding: "0.6rem 0.9rem", fontSize: "0.83rem", fontFamily: "'Jost', sans-serif", background: "var(--cream)", outline: "none" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)" }}>Min Order Amount (₹)</label>
                      <input type="number" value={editingPromo.min_order_amount ?? 0} onChange={(e) => setEditingPromo({...editingPromo, min_order_amount: parseFloat(e.target.value) || 0})}
                        style={{ width: "100%", border: "1px solid var(--border-dk)", padding: "0.6rem 0.9rem", fontSize: "0.83rem", fontFamily: "'Jost', sans-serif", background: "var(--cream)", outline: "none" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)" }}>Max Uses (blank = unlimited)</label>
                      <input type="number" value={editingPromo.max_uses ?? ""} onChange={(e) => setEditingPromo({...editingPromo, max_uses: parseInt(e.target.value) || null})}
                        style={{ width: "100%", border: "1px solid var(--border-dk)", padding: "0.6rem 0.9rem", fontSize: "0.83rem", fontFamily: "'Jost', sans-serif", background: "var(--cream)", outline: "none" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)" }}>Expires At</label>
                      <input type="datetime-local" value={editingPromo.expires_at ? editingPromo.expires_at.slice(0, 16) : ""} onChange={(e) => setEditingPromo({...editingPromo, expires_at: e.target.value ? new Date(e.target.value).toISOString() : null})}
                        style={{ width: "100%", border: "1px solid var(--border-dk)", padding: "0.6rem 0.9rem", fontSize: "0.83rem", fontFamily: "'Jost', sans-serif", background: "var(--cream)", outline: "none" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>Active</label>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", cursor: "pointer" }}>
                        <input type="checkbox" checked={editingPromo.is_active ?? true} onChange={(e) => setEditingPromo({...editingPromo, is_active: e.target.checked})} />
                        {editingPromo.is_active ? "Active" : "Inactive"}
                      </label>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.8rem" }}>
                    <button onClick={savePromo} style={{ background: "var(--burg)", color: "white", border: "none", padding: "0.6rem 1.5rem", fontSize: "0.72rem", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer" }}>Save</button>
                    <button onClick={() => setEditingPromo(null)} style={{ background: "transparent", color: "var(--burg)", border: "1.5px solid var(--burg)", padding: "0.6rem 1.5rem", fontSize: "0.72rem", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer" }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Orders Tab */}
          {tab === "orders" && (
            <div style={{ background: "var(--white)", border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.5rem", borderBottom: "1px solid var(--border)", background: "var(--warm)" }}>
                <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem", fontWeight: 400, color: "var(--dark)" }}>Orders</h3>
                <span style={{ fontSize: "0.65rem", color: "var(--muted)" }}>{orders.length} orders</span>
              </div>
              <div style={{ padding: "1.5rem", overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 650 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", fontSize: "0.62rem", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)", padding: "0.7rem 1rem", background: "var(--warm)", borderBottom: "1px solid var(--border-dk)" }}>Customer</th>
                      <th style={{ textAlign: "left", fontSize: "0.62rem", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)", padding: "0.7rem 1rem", background: "var(--warm)", borderBottom: "1px solid var(--border-dk)" }}>Items</th>
                      <th style={{ textAlign: "left", fontSize: "0.62rem", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)", padding: "0.7rem 1rem", background: "var(--warm)", borderBottom: "1px solid var(--border-dk)" }}>Total</th>
                      <th style={{ textAlign: "left", fontSize: "0.62rem", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)", padding: "0.7rem 1rem", background: "var(--warm)", borderBottom: "1px solid var(--border-dk)" }}>Status</th>
                      <th style={{ textAlign: "left", fontSize: "0.62rem", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)", padding: "0.7rem 1rem", background: "var(--warm)", borderBottom: "1px solid var(--border-dk)" }}>WA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length === 0 && (
                      <tr><td colSpan={5} style={{ padding: "1rem", textAlign: "center", fontSize: "0.8rem", color: "var(--muted)" }}>No orders yet.</td></tr>
                    )}
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td style={{ padding: "0.85rem 1rem", fontSize: "0.8rem", borderBottom: "1px solid var(--border)" }}>
                          <div style={{ fontWeight: 500 }}>{o.customer_name}</div>
                          <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>{o.customer_phone}</div>
                        </td>
                        <td style={{ padding: "0.85rem 1rem", fontSize: "0.75rem", borderBottom: "1px solid var(--border)", color: "var(--muted)" }}>
                          {o.items?.slice(0, 2).map((i) => i.product_name).join(", ")}
                          {(o.items?.length ?? 0) > 2 ? ` +${(o.items?.length ?? 0) - 2} more` : ""}
                        </td>
                        <td style={{ padding: "0.85rem 1rem", fontSize: "0.8rem", borderBottom: "1px solid var(--border)", color: "var(--burg)" }}>
                          {formatPrice(o.total)}
                          {o.discount > 0 && <span style={{ fontSize: "0.65rem", color: "var(--green-wa)", display: "block" }}>-{formatPrice(o.discount)}</span>}
                        </td>
                        <td style={{ padding: "0.85rem 1rem", fontSize: "0.8rem", borderBottom: "1px solid var(--border)" }}>
                          <select value={o.status} onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                            style={{ border: "1px solid var(--border-dk)", padding: "0.4rem 0.5rem", fontSize: "0.72rem", background: "var(--white)", outline: "none" }}>
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="in-progress">In Progress</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td style={{ padding: "0.85rem 1rem", fontSize: "0.8rem", borderBottom: "1px solid var(--border)" }}>
                          <div dangerouslySetInnerHTML={{ __html: WA_SVG }} style={{ cursor: "pointer", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center" }}
                            onClick={() => window.open(`https://wa.me/${o.customer_phone.replace(/\D/g, "")}?text=Hi!%20Regarding%20your%20My%20Creation%20order%20${o.id.slice(0, 8)}`, "_blank")}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {tab === "settings" && (
            <div style={{ background: "var(--white)", border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.5rem", borderBottom: "1px solid var(--border)", background: "var(--warm)" }}>
                <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem", fontWeight: 400, color: "var(--dark)" }}>Site Settings</h3>
              </div>
              <div style={{ padding: "1.5rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.2rem" }}>
                  {[
                    ["whatsapp", "WhatsApp Number"],
                    ["email", "Email Address"],
                    ["phone", "Phone Number"],
                    ["city", "Business Location"],
                    ["instagram", "Instagram URL"],
                    ["facebook", "Facebook URL"],
                  ].map(([key, label]) => (
                    <div key={key}>
                      <label style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>{label}</label>
                      <input value={editingSettings[key] ?? ""} onChange={(e) => setEditingSettings({...editingSettings, [key]: e.target.value})}
                        style={{ width: "100%", border: "1px solid var(--border-dk)", padding: "0.6rem 0.9rem", fontSize: "0.83rem", fontFamily: "'Jost', sans-serif", background: "var(--cream)", outline: "none" }} />
                    </div>
                  ))}
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>Footer Tagline</label>
                    <textarea value={editingSettings["footer_tag"] ?? ""} onChange={(e) => setEditingSettings({...editingSettings, footer_tag: e.target.value})}
                      style={{ width: "100%", border: "1px solid var(--border-dk)", padding: "0.6rem 0.9rem", fontSize: "0.83rem", fontFamily: "'Jost', sans-serif", background: "var(--cream)", outline: "none", minHeight: 80, resize: "vertical" }} />
                  </div>
                </div>
                <button onClick={saveSettings} style={{ marginTop: "1.5rem", background: "var(--burg)", color: "white", border: "none", padding: "0.75rem 2rem", fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer" }}>
                  Save Settings
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Password Confirmation Modal */}
      {passwordModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999 }}>
          <div style={{ background: "var(--white)", padding: "2rem", width: 380, boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.2rem", fontWeight: 400, color: "var(--dark)", marginBottom: "0.5rem" }}>Confirm Deletion</h3>
            <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "1.5rem" }}>Enter your password to confirm deletion.</p>
            <input type="password" placeholder="Your password" value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmDelete()}
              style={{ width: "100%", border: "1px solid var(--border-dk)", padding: "0.75rem 1rem", fontSize: "0.85rem", fontFamily: "'Jost', sans-serif", background: "var(--cream)", outline: "none", marginBottom: "1rem" }}
            />
            <div style={{ display: "flex", gap: "0.8rem" }}>
              <button onClick={confirmDelete} style={{ flex: 1, background: "#e53935", color: "white", border: "none", padding: "0.7rem", fontSize: "0.72rem", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer" }}>Delete</button>
              <button onClick={() => { setPasswordModal(null); setConfirmPass(""); }} style={{ flex: 1, background: "transparent", color: "var(--burg)", border: "1.5px solid var(--burg)", padding: "0.7rem", fontSize: "0.72rem", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: "2rem", right: "2rem", background: "var(--burg-dk)", color: "white", padding: "0.8rem 1.5rem", fontSize: "0.78rem", zIndex: 99999 }}>
          {toast}
        </div>
      )}
    </div>
  );
}
