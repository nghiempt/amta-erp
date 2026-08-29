import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { User } from "@/models/User";
import { requireAdmin, VALID_ROLES } from "@/lib/adminUsers";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Chỉ Quản lý được xem nhân viên" }, { status: 403 });
  const users = await User.find().select("-passwordHash").sort({ createdAt: 1 }).lean();
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Chỉ Quản lý được tạo nhân viên" }, { status: 403 });

  const { name, username, password, role } = await req.json();
  if (!name?.trim() || !username?.trim() || !password || !role)
    return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
  if (!VALID_ROLES.includes(role))
    return NextResponse.json({ error: "Chức vụ không hợp lệ" }, { status: 400 });
  if (String(password).length < 6)
    return NextResponse.json({ error: "Mật khẩu tối thiểu 6 ký tự" }, { status: 400 });

  const uname = String(username).toLowerCase().trim();
  if (await User.findOne({ username: uname }))
    return NextResponse.json({ error: `Tên tài khoản "${uname}" đã tồn tại` }, { status: 409 });

  const user = await User.create({
    name: String(name).trim(),
    username: uname,
    passwordHash: bcrypt.hashSync(String(password), 10),
    role,
  });
  return NextResponse.json({
    user: { _id: user._id, name: user.name, username: user.username, role: user.role },
  });
}
