import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Order } from "@/models/Order";
import { getSession } from "@/lib/auth";
import { classifyIssues, type IssueOrder } from "@/lib/issueCalc";

// Các filter theo lịch sử lỗi/trễ (nhảy từ dashboard "Lỗi & trễ" sang):
// đếm bằng cùng logic classifyIssues nên số luôn khớp dashboard
const ISSUE_FILTERS = new Set(["reported_all", "reported_fixed", "late_all", "late_fixed"]);

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

  // filter chung (tìm kiếm + khoảng ngày) — dùng cho cả list lẫn đếm theo stage
  const common: Record<string, unknown> = {};
  const filter: Record<string, unknown> = {};
  if (status === "reported") {
    // đơn đang bị báo lỗi = entry cuối trong lịch sử là báo lỗi
    filter.status = { $nin: ["cancelled", "da_giao"] };
    filter.$expr = {
      $regexMatch: {
        input: {
          $ifNull: [{ $let: { vars: { l: { $arrayElemAt: ["$history", -1] } }, in: "$$l.note" } }, ""],
        },
        regex: "^Báo lỗi",
      },
    };
  } else if (status === "overdue") {
    // đơn trễ: đang trong sản xuất, đứng yên quá 30 phút (Chờ giao không tính trễ)
    filter.status = { $nin: ["cancelled", "da_giao", "dong_goi"] };
    filter.statusChangedAt = { $lt: new Date(Date.now() - 30 * 60 * 1000) };
  } else if (status && ISSUE_FILTERS.has(status)) {
    // khoảng sự kiện (efrom/eto) — khác with from/to là khoảng NGÀY TẠO đơn
    let eFrom = new Date(0);
    let eTo = new Date(8640000000000000);
    const efStr = sp.get("efrom");
    const etStr = sp.get("eto");
    if (efStr && etStr) {
      const f = new Date(`${efStr}T00:00:00`);
      const t = new Date(`${etStr}T00:00:00`);
      t.setDate(t.getDate() + 1);
      if (!isNaN(f.getTime()) && !isNaN(t.getTime()) && f < t) {
        eFrom = f;
        eTo = t;
      }
    }
    const all = await Order.find({}, "_id status statusChangedAt history").lean<
      ({ _id: unknown } & IssueOrder)[]
    >();
    const now = Date.now();
    const ids = all
      .filter((o) => {
        const fl = classifyIssues(o, eFrom, eTo, now);
        if (status === "reported_all") return fl.reported;
        if (status === "reported_fixed") return fl.reported && !fl.reportedOpen;
        if (status === "late_all") return fl.wasLate;
        return fl.wasLate && !fl.currentlyOverdue; // late_fixed
      })
      .map((o) => o._id);
    filter._id = { $in: ids };
  } else if (status) filter.status = status;
  else if (user.role !== "admin") filter.status = { $ne: "cancelled" }; // staff không thấy đơn huỷ
  if (source) filter.source = source;
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    common.$or = [{ code: rx }, { name: rx }, { sourceOrderId: rx }, { customerName: rx }];
  }

  // Lọc theo ngày tạo: ?from=YYYY-MM-DD&to=YYYY-MM-DD (inclusive hết ngày to)
  const fromStr = sp.get("from");
  const toStr = sp.get("to");
  if (fromStr && toStr) {
    const from = new Date(`${fromStr}T00:00:00`);
    const to = new Date(`${toStr}T00:00:00`);
    to.setDate(to.getDate() + 1);
    if (!isNaN(from.getTime()) && !isNaN(to.getTime()) && from < to)
      common.createdAt = { $gte: from, $lt: to };
  }
  Object.assign(filter, common);

  // ?sort=oldest → cũ nhất trước; mặc định mới nhất trước.
  // Sort theo statusChangedAt (thời gian hiển thị trên card = hoạt động gần nhất),
  // _id làm tiebreaker để thứ tự ổn định
  const sortDir: 1 | -1 = sp.get("sort") === "oldest" ? 1 : -1;

  const [items, total, byStatus] = await Promise.all([
    Order.find(filter).sort({ statusChangedAt: sortDir, _id: sortDir }).skip((page - 1) * limit).limit(limit).lean(),
    Order.countDocuments(filter),
    // đếm theo stage (theo cùng filter tìm kiếm + ngày) cho các chip lọc
    Order.aggregate([{ $match: common }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);
  const counts: Record<string, number> = {};
  let all = 0;
  for (const s of byStatus) {
    counts[s._id] = s.count;
    all += s.count;
  }
  // "Tất cả" của staff không gồm đơn huỷ (khớp danh sách họ thấy)
  counts[""] = user.role === "admin" ? all : all - (counts["cancelled"] || 0);
  return NextResponse.json({ items, total, page, pages: Math.ceil(total / limit), counts });
}

// POST /api/orders — admin only
export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (user.role !== "admin" && user.role !== "cskh")
    return NextResponse.json({ error: "Chỉ admin hoặc CSKH được tạo đơn" }, { status: 403 });

  const body = await req.json();
  const { source, sourceOrderId, name, price, quantity, customerName, note, imageUrl } = body;
  if (!source || !sourceOrderId || !name) {
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
    price: Number(price) || 0,
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
