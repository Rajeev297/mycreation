import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/admin-supabase";
import { createServerSupabase } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order");
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("categories")
    .insert({
      name: body.name,
      slug: body.slug,
      description: body.description,
      image_url: body.image_url,
      sort_order: body.sort_order ?? 0,
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
    .from("categories")
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
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
