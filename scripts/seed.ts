/* Seed users + orders: npm run seed */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/amta-erp";

const STAGES = ["created", "ky_thuat", "in", "ep", "gia_cong", "dong_goi", "da_giao"] as const;

const UserSchema = new mongoose.Schema(
  { username: String, passwordHash: String, name: String, role: String },
  { timestamps: true }
);
const OrderSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
const User = mongoose.model("User", UserSchema);
const Order = mongoose.model("Order", OrderSchema);

const PRODUCTS = [
  "Áo thun in hình mèo - size L", "Ly sứ in ảnh gia đình", "Ốp lưng iPhone 15 in tên",
  "Áo hoodie in logo công ty", "Bình giữ nhiệt khắc tên", "Túi tote canvas in hoa",
  "Áo thun couple - set 2 áo", "Gối ôm in hình chibi", "Móc khoá mica in ảnh",
  "Áo polo thêu logo - size M", "Khung ảnh gỗ in UV", "Sổ tay da in tên",
  "Áo thun trẻ em in khủng long", "Chuột pad in anime", "Bình nước thể thao in số áo",
  "Áo khoác gió in lưng", "Tranh canvas treo tường 40x60", "Đồng hồ gỗ khắc laser",
  "Áo thun đồng phục lớp 12A3", "Cốc thuỷ tinh in chữ ký",
];
const CUSTOMERS = [
  "Nguyễn Văn An", "Trần Thị Bích", "Lê Minh Châu", "Phạm Quốc Dũng", "Hoàng Thu Em",
  "Vũ Gia Hân", "Đặng Khôi", "Bùi Thanh Lan", "Đỗ Mạnh", "Ngô Như Ngọc",
];

function rand<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected:", MONGODB_URI);

  await Promise.all([User.deleteMany({}), Order.deleteMany({})]);

  const hash = (pw: string) => bcrypt.hashSync(pw, 10);
  const users = await User.insertMany([
    { username: "admin", passwordHash: hash("admin123"), name: "Quản trị viên", role: "admin" },
    { username: "kythuat", passwordHash: hash("123456"), name: "NV Kỹ thuật", role: "staff" },
    { username: "in", passwordHash: hash("123456"), name: "NV In", role: "staff" },
    { username: "ep", passwordHash: hash("123456"), name: "NV Ép", role: "staff" },
    { username: "giacong", passwordHash: hash("123456"), name: "NV Gia công", role: "staff" },
    { username: "donggoi", passwordHash: hash("123456"), name: "NV Đóng gói", role: "staff" },
    { username: "giaohang", passwordHash: hash("123456"), name: "NV Giao hàng", role: "staff" },
  ]);
  const admin = users[0];
  const staffByStage: Record<string, (typeof users)[number]> = {
    ky_thuat: users[1], in: users[2], ep: users[3], gia_cong: users[4], dong_goi: users[5], da_giao: users[6],
  };
  console.log(`Seeded ${users.length} users`);

  const orders = [];
  const now = Date.now();
  for (let i = 0; i < 40; i++) {
    const source = Math.random() < 0.5 ? "tiktok" : "shopee";
    const cancelled = Math.random() < 0.1;
    // random progress: index into STAGES
    const progress = cancelled ? randInt(0, 3) : randInt(0, STAGES.length - 1);
    const createdAt = new Date(now - randInt(10, 60 * 24 * 5) * 60000); // within ~5 days
    const d = createdAt;
    const ymd = d.toISOString().slice(2, 10).replace(/-/g, "");
    const code = `AMTA-${ymd}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const history: object[] = [];
    let t = createdAt.getTime();
    for (let s = 0; s <= progress; s++) {
      const stage = STAGES[s];
      const by = s === 0 ? admin : staffByStage[stage] || admin;
      history.push({ status: stage, at: new Date(t), byName: by.name, byId: by._id });
      t += randInt(15, 50) * 60000;
    }
    let status: string = STAGES[progress];
    let statusChangedAt = new Date(t - randInt(15, 50) * 60000);
    if (cancelled) {
      status = "cancelled";
      statusChangedAt = new Date(t);
      history.push({ status: "cancelled", at: statusChangedAt, byName: admin.name, byId: admin._id, note: "Khách huỷ đơn" });
    }

    orders.push({
      code,
      source,
      sourceOrderId:
        source === "tiktok"
          ? `576${randInt(100000000000, 999999999999)}`
          : `2508${Math.random().toString(36).slice(2, 12).toUpperCase()}`,
      name: rand(PRODUCTS),
      price: randInt(8, 60) * 5000,
      quantity: randInt(1, 5),
      customerName: rand(CUSTOMERS),
      note: Math.random() < 0.3 ? "Giao trước cuối tuần" : undefined,
      status,
      statusChangedAt,
      history,
      cancelReason: cancelled ? "Khách huỷ đơn" : undefined,
      createdBy: admin._id,
      createdByName: admin.name,
      createdAt,
      updatedAt: statusChangedAt,
    });
  }
  await Order.insertMany(orders);
  console.log(`Seeded ${orders.length} orders`);
  console.log("\nTài khoản đăng nhập:");
  console.log("  admin / admin123  (admin)");
  console.log("  kythuat, in, ep, giacong, donggoi, giaohang / 123456  (staff)");
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
