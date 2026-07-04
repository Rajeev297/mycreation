import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/admin-supabase";

export async function GET() {
  const supabase = await createAdminClient();
  const { data } = await supabase.from("site_settings").select("*");
  const settings: Record<string, string> = {};
  (data ?? []).forEach((s: { key: string; value: string }) => {
    settings[s.key] = s.value;
  });
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const supabase = await createAdminClient();
  const errors: string[] = [];
  for (const [key, value] of Object.entries(body)) {
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key, value: String(value) }, { onConflict: "key" });
    if (error) errors.push(`${key}: ${error.message}`);
  }
  if (errors.length) {
    return NextResponse.json({ error: errors.join("; ") }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
