import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/admin-supabase";

export async function GET() {
  const supabase = await createAdminClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (!orders) return NextResponse.json([]);

  const orderIds = orders.map(o => o.id);
  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .in("order_id", orderIds);

  const itemsByOrder = new Map<string, typeof items>();
  for (const item of items ?? []) {
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push(item);
    itemsByOrder.set(item.order_id, list);
  }

  return NextResponse.json(orders.map(o => ({
    ...o,
    items: itemsByOrder.get(o.id) ?? [],
  })));
}

export async function PUT(req: NextRequest) {
  const { id, status } = await req.json();
  if (!id || !status) {
    return NextResponse.json({ error: "Missing id or status" }, { status: 400 });
  }
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
