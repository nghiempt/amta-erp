import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  // role lấy từ DB — token JWT sống 7 ngày có thể còn ghi role cũ
  await dbConnect();
  const dbUser = await User.findById(user.id).select("role").lean<{ role?: string }>();
  return NextResponse.json({ user: { ...user, role: dbUser?.role || user.role } });
}
