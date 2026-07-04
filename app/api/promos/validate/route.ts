import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const { code, subtotal } = await req.json();
    if (!code || typeof code !== "string") {
      return NextResponse.json({ valid: false, error: "Invalid promo code" });
    }

    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("promo_codes")
      .select("*")
      .ilike("code", code.trim())
      .single();

    if (error || !data) {
      return NextResponse.json({ valid: false, error: "Promo code not found" });
    }

    if (!data.is_active) {
      return NextResponse.json({ valid: false, error: "This promo code is no longer active" });
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, error: "This promo code has expired" });
    }

    if (data.max_uses && data.current_uses >= data.max_uses) {
      return NextResponse.json({ valid: false, error: "This promo code has reached its usage limit" });
    }

    const orderAmount = subtotal ?? 0;
    if (orderAmount < data.min_order_amount) {
      return NextResponse.json({
        valid: false,
        error: `Minimum order amount of ₹${data.min_order_amount} required`,
      });
    }

    let discountPercent = 0;
    let discountAmount = 0;

    if (data.discount_percent) {
      discountPercent = Number(data.discount_percent);
      discountAmount = Math.round((orderAmount * discountPercent) / 100);
    } else if (data.discount_amount) {
      discountAmount = Number(data.discount_amount);
    }

    return NextResponse.json({
      valid: true,
      promo_id: data.id,
      code: data.code,
      discount_percent: discountPercent,
      discount_amount: discountAmount,
    });
  } catch {
    return NextResponse.json({ valid: false, error: "Server error" }, { status: 500 });
  }
}
