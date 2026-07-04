"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { generateSessionId } from "@/lib/utils";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [cartCount, setCartCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    generateSessionId();
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    async function fetchCount() {
      const sid = sessionStorage.getItem("mc_session_id");
      if (!sid) return;
      try {
        const res = await fetch(`/api/cart?session_id=${sid}`);
        const data = await res.json();
        setCartCount(data.items?.length ?? 0);
      } catch {}
    }
    fetchCount();
    const interval = setInterval(fetchCount, 5000);
    window.addEventListener("focus", fetchCount);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", fetchCount);
    };
  }, [pathname]);

  const navLinks = [
    { href: "/shop", label: "Shop" },
    { href: "/wishlist", label: "Wishlist" },
    { href: "/cart", label: `Cart${cartCount > 0 ? ` (${cartCount})` : ""}` },
  ];

  const linkStyle: React.CSSProperties = {
    fontSize: "0.75rem",
    fontWeight: 400,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "var(--text)",
    transition: "color 0.2s",
    position: "relative",
    cursor: "pointer",
  };

  return (
    <>
      <nav
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 999,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0.6rem 4%",
          background: "rgba(253,245,247,.97)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center" }}>
          <img
            src="/logo.png"
            alt="My Creation"
            style={{ height: 60, width: "auto", objectFit: "contain", mixBlendMode: "multiply" }}
          />
        </Link>

        {/* Desktop Nav */}
        {!isMobile && (
          <ul style={{ display: "flex", gap: "2rem", alignItems: "center", listStyle: "none" }}>
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  style={{
                    ...linkStyle,
                    color: pathname.startsWith(link.href) ? "var(--burg)" : "var(--text)",
                  }}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/#custom-order"
                style={{
                  background: "var(--burg)",
                  color: "var(--white)",
                  padding: "0.5rem 1.4rem",
                  fontSize: "0.7rem",
                  fontWeight: 500,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                }}
              >
                ✦ Custom Order
              </Link>
            </li>
          </ul>
        )}

        {/* Hamburger (mobile) */}
        {isMobile && (
          <div
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ display: "flex", flexDirection: "column", gap: "5px", cursor: "pointer" }}
          >
            <span style={{ width: 24, height: "1.5px", background: "var(--dark)" }} />
            <span style={{ width: 24, height: "1.5px", background: "var(--dark)" }} />
            <span style={{ width: 24, height: "1.5px", background: "var(--dark)" }} />
          </div>
        )}
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobile && menuOpen && (
        <div
          style={{
            position: "fixed", top: "76px", left: 0, right: 0, bottom: 0,
            background: "var(--cream)", zIndex: 998,
            display: "flex", flexDirection: "column",
            padding: "2rem", borderTop: "1px solid var(--border-dk)",
          }}
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              style={{
                padding: "1rem 0",
                fontSize: "1rem",
                borderBottom: "1px solid var(--border)",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: pathname.startsWith(link.href) ? "var(--burg)" : "var(--text)",
              }}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/#custom-order"
            onClick={() => setMenuOpen(false)}
            style={{
              marginTop: "1rem",
              display: "block",
              textAlign: "center",
              background: "var(--burg)",
              color: "white",
              padding: "0.8rem 1.4rem",
              fontSize: "0.75rem",
              fontWeight: 500,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            ✦ Custom Order
          </Link>
        </div>
      )}

      <main style={{ paddingTop: "76px", minHeight: "100vh" }}>{children}</main>

      {/* Footer */}
      <footer
        style={{
          background: "var(--dark)",
          padding: "2.5rem 5% 1.5rem",
          color: "rgba(255,255,255,.5)",
          textAlign: "center",
        }}
      >
        <img
          src="/logo.png"
          alt="My Creation"
          style={{ height: 60, mixBlendMode: "screen", margin: "0 auto 0.8rem" }}
        />
        <p style={{ fontSize: "0.75rem", lineHeight: 1.7, color: "rgba(255,255,255,.4)", maxWidth: 400, margin: "0 auto 1rem" }}>
          Handcrafted jewellery by Smitarani Mishra — where art, tradition, and love come together in every single piece.
        </p>
        <div style={{ fontSize: "0.68rem" }}>
          <Link href="/" style={{ color: "var(--burg-soft)" }}>Home</Link>
          <span style={{ margin: "0 0.8rem", color: "rgba(255,255,255,.2)" }}>·</span>
          <Link href="/shop" style={{ color: "var(--burg-soft)" }}>Shop</Link>
          <span style={{ margin: "0 0.8rem", color: "rgba(255,255,255,.2)" }}>·</span>
          <Link href="/wishlist" style={{ color: "var(--burg-soft)" }}>Wishlist</Link>
          <span style={{ margin: "0 0.8rem", color: "rgba(255,255,255,.2)" }}>·</span>
          <Link href="/cart" style={{ color: "var(--burg-soft)" }}>Cart</Link>
        </div>
        <p style={{ fontSize: "0.65rem", marginTop: "1rem", color: "rgba(255,255,255,.3)" }}>
          © 2025 My Creation by Smitarani Mishra. All rights reserved.
        </p>
      </footer>

      {/* Floating WA */}
      <a
        id="floatWaBtn"
        href="#"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: "fixed",
          bottom: "1.5rem",
          right: "1.5rem",
          zIndex: 998,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "var(--green-wa)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 20px rgba(37,211,102,.45)",
        }}
      >
        <svg viewBox="0 0 24 24" style={{ width: 28, height: 28, fill: "white" }}>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.121 1.531 5.856L.057 23.25a.75.75 0 0 0 .921.919l5.487-1.472A11.953 11.953 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.693-.498-5.24-1.37l-.375-.214-3.888 1.042 1.059-3.766-.232-.39A9.953 9.953 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
        </svg>
      </a>
    </>
  );
}
