import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) return NextResponse.json({ items: [] });
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("wishlist_items")
    .select("id, product:products(*)")
    .eq("session_id", sessionId);
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { session_id, product_id } = await req.json();
  if (!session_id || !product_id) {
    return NextResponse.json({ error: "Missing session_id or product_id" }, { status: 400 });
  }
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("wishlist_items").upsert(
    { session_id, product_id },
    { onConflict: "session_id, product_id", ignoreDuplicates: true }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("wishlist_items").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
