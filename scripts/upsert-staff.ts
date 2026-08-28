/* Upsert 2 tài khoản staff (Kỹ thuật, In) — KHÔNG xoá dữ liệu hiện có */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.MONGODB_URI!;

const UserSchema = new mongoose.Schema(
  { username: String, passwordHash: String, name: String, role: String },
  { timestamps: true }
);
const User = mongoose.model("User", UserSchema);

async function main() {
  await mongoose.connect(MONGODB_URI);
  const hash = bcrypt.hashSync("123456", 10);
  const accounts = [
    { username: "quanly", name: "Quản lý", role: "admin" },
    { username: "kythuat", name: "NV Kỹ thuật", role: "ky_thuat" },
    { username: "in", name: "NV In", role: "in" },
    { username: "ep", name: "NV Ép", role: "ep" },
    { username: "giacong", name: "NV Gia công", role: "gia_cong" },
    { username: "donggoi", name: "NV Đóng gói", role: "dong_goi" },
    { username: "giaohang", name: "NV Giao hàng", role: "da_giao" },
  ];
  for (const a of accounts) {
    const r = await User.updateOne(
      { username: a.username },
      { $set: { name: a.name, role: a.role, passwordHash: hash } },
      { upsert: true }
    );
    console.log(a.username, r.upsertedCount ? "created" : "updated (password reset to 123456)");
  }
  await mongoose.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
