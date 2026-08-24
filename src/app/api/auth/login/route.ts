import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";
import { signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  if (!username || !password) {
    return NextResponse.json({ error: "Thiếu tài khoản hoặc mật khẩu" }, { status: 400 });
  }
  await dbConnect();
  const user = await User.findOne({ username: String(username).toLowerCase().trim() });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json({ error: "Sai tài khoản hoặc mật khẩu" }, { status: 401 });
  }
  const token = await signToken({
    id: user._id.toString(),
    username: user.username,
    name: user.name,
    role: user.role,
  });
  const res = NextResponse.json({
    user: { id: user._id, username: user.username, name: user.name, role: user.role },
  });
  res.cookies.set("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return res;
}
