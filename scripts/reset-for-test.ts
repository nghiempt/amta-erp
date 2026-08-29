/* Xoá TOÀN BỘ đơn hàng + tài khoản, tạo lại 1 tài khoản Quản lý duy nhất.
   Chạy: MONGODB_URI=... npx tsx scripts/reset-for-test.ts */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.MONGODB_URI!;

const UserSchema = new mongoose.Schema(
  { username: String, passwordHash: String, name: String, role: String },
  { timestamps: true }
);
const User = mongoose.model("User", UserSchema);
const Order = mongoose.model("Order", new mongoose.Schema({}, { strict: false }));

async function main() {
  await mongoose.connect(MONGODB_URI);
  const [u, o] = await Promise.all([User.deleteMany({}), Order.deleteMany({})]);
  console.log(`Đã xoá ${u.deletedCount} tài khoản, ${o.deletedCount} đơn hàng`);
  await User.create({
    name: "Thức Phạm",
    username: "thucpham",
    passwordHash: bcrypt.hashSync("Thucpham@123", 10),
    role: "admin",
  });
  console.log("Đã tạo tài khoản Quản lý: thucpham / Thucpham@123");
  await mongoose.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
