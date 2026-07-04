import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/admin-supabase";

export async function GET() {
  const supabase = await createAdminClient();
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (!products) return NextResponse.json([]);

  const categoryIds = [...new Set(products.map(p => p.category_id).filter(Boolean))];
  if (categoryIds.length > 0) {
    const { data: categories } = await supabase
      .from("categories")
      .select("*")
      .in("id", categoryIds);
    const categoryMap = new Map(categories?.map(c => [c.id, c]) ?? []);
    return NextResponse.json(products.map(p => ({
      ...p,
      category: p.category_id ? (categoryMap.get(p.category_id) ?? null) : null,
    })));
  }

  return NextResponse.json(products.map(p => ({ ...p, category: null })));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("products")
    .insert({
      name: body.name,
      slug: body.slug,
      category_id: body.category_id,
      subcategory: body.subcategory,
      description: body.description,
      price: body.price,
      compare_price: body.compare_price,
      images: body.images ?? [],
      stock: body.stock ?? 0,
      is_active: body.is_active ?? true,
      badge: body.badge || null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, category, images, ...rest } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("products")
    .update({ ...rest, images: images ?? [], updated_at: new Date().toISOString() })
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
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
