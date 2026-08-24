import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Order } from "@/models/Order";
import { getSession } from "@/lib/auth";

// GET /api/orders?q=&status=&source=&page=&limit=
export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  await dbConnect();

  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim();
  const status = sp.get("status");
  const source = sp.get("source");
  const page = Math.max(1, parseInt(sp.get("page") || "1"));
  const limit = Math.min(100, parseInt(sp.get("limit") || "20"));

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  else if (user.role !== "admin") filter.status = { $ne: "cancelled" }; // staff không thấy đơn huỷ
  if (source) filter.source = source;
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ code: rx }, { name: rx }, { sourceOrderId: rx }, { customerName: rx }];
  }

  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Order.countDocuments(filter),
  ]);
  return NextResponse.json({ items, total, page, pages: Math.ceil(total / limit) });
}

// POST /api/orders — admin only
export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (user.role !== "admin")
    return NextResponse.json({ error: "Chỉ admin được tạo đơn" }, { status: 403 });

  const body = await req.json();
  const { source, sourceOrderId, name, price, quantity, customerName, note, imageUrl } = body;
  if (!source || !sourceOrderId || !name || price == null) {
    return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
  }
  await dbConnect();

  const dup = await Order.findOne({ sourceOrderId: String(sourceOrderId).trim(), source });
  if (dup) {
    return NextResponse.json(
      { error: `Mã đơn này đã tồn tại (${dup.code})`, existingCode: dup.code },
      { status: 409 }
    );
  }

  // sinh mã nội bộ AMTA-YYMMDD-XXXX
  const d = new Date();
  const ymd = d.toISOString().slice(2, 10).replace(/-/g, "");
  let code = "";
  for (let i = 0; i < 5; i++) {
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    code = `AMTA-${ymd}-${rand}`;
    if (!(await Order.exists({ code }))) break;
  }

  const order = await Order.create({
    code,
    source,
    sourceOrderId: String(sourceOrderId).trim(),
    name,
    price: Number(price),
    quantity: Number(quantity) || 1,
    customerName,
    note,
    imageUrl,
    status: "created",
    statusChangedAt: new Date(),
    history: [{ status: "created", at: new Date(), byName: user.name, byId: user.id }],
    createdBy: user.id,
    createdByName: user.name,
  });
  return NextResponse.json({ order }, { status: 201 });
}
