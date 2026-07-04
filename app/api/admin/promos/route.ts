import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/admin-supabase";
import { createServerSupabase } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("promo_codes")
    .select("*")
    .order("created_at", { ascending: false });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("promo_codes")
    .insert({
      code: body.code.toUpperCase(),
      description: body.description,
      discount_percent: body.discount_percent || null,
      discount_amount: body.discount_amount || null,
      min_order_amount: body.min_order_amount ?? 0,
      max_uses: body.max_uses ?? null,
      is_active: body.is_active ?? true,
      expires_at: body.expires_at || null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("promo_codes")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const { id, password } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  if (!password) {
    return NextResponse.json({ error: "Password required for deletion" }, { status: 403 });
  }
  const auth = await createServerSupabase();
  const { data: { user } } = await auth.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { error: signInError } = await auth.auth.signInWithPassword({
    email: user.email,
    password,
  });
  if (signInError) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 403 });
  }
  const supabase = await createAdminClient();
  const { error } = await supabase.from("promo_codes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
