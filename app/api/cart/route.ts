import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ items: [] });
  }
  const supabase = await createServerSupabase();
  const { data: items } = await supabase
    .from("cart_items")
    .select("id, quantity, product_id")
    .eq("session_id", sessionId);

  const result: { id: string; quantity: number; product: unknown }[] = [];
  if (items) {
    const productIds = [...new Set(items.map(i => i.product_id).filter(Boolean))];
    let productMap = new Map<string, unknown>();
    if (productIds.length > 0) {
      const { data: products } = await supabase
        .from("products")
        .select("*")
        .in("id", productIds);
      productMap = new Map(products?.map(p => [p.id, p]) ?? []);
    }
    for (const item of items) {
      result.push({ id: item.id, quantity: item.quantity, product: productMap.get(item.product_id) ?? null });
    }
  }
  return NextResponse.json({ items: result });
}

export async function POST(req: NextRequest) {
  const { session_id, product_id, quantity = 1 } = await req.json();
  if (!session_id || !product_id) {
    return NextResponse.json({ error: "Missing session_id or product_id" }, { status: 400 });
  }
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("cart_items").upsert(
    { session_id, product_id, quantity },
    { onConflict: "session_id, product_id", ignoreDuplicates: false }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function PUT(req: NextRequest) {
  const { id, quantity } = await req.json();
  if (!id || quantity == null) {
    return NextResponse.json({ error: "Missing id or quantity" }, { status: 400 });
  }
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("cart_items")
    .update({ quantity, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("cart_items").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
