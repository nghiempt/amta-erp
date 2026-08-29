import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { User } from "@/models/User";
import { requireAdmin, VALID_ROLES } from "@/lib/adminUsers";

// PATCH: sửa tên / chức vụ / đặt lại mật khẩu (bỏ trống password = giữ nguyên)
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Chỉ Quản lý được sửa nhân viên" }, { status: 403 });

  const { id } = await ctx.params;
  if (!mongoose.isValidObjectId(id))
    return NextResponse.json({ error: "Không tìm thấy nhân viên" }, { status: 404 });
  const user = await User.findById(id);
  if (!user) return NextResponse.json({ error: "Không tìm thấy nhân viên" }, { status: 404 });

  const { name, role, password } = await req.json();
  if (name !== undefined) {
    if (!String(name).trim()) return NextResponse.json({ error: "Tên không được trống" }, { status: 400 });
    user.name = String(name).trim();
  }
  if (role !== undefined) {
    if (!VALID_ROLES.includes(role))
      return NextResponse.json({ error: "Chức vụ không hợp lệ" }, { status: 400 });
    // không cho tự hạ quyền chính mình — tránh khoá cửa quản lý
    if (String(user._id) === admin.id && role !== "admin")
      return NextResponse.json({ error: "Không thể tự đổi chức vụ của chính mình" }, { status: 400 });
    user.role = role;
  }
  if (password) {
    if (String(password).length < 6)
      return NextResponse.json({ error: "Mật khẩu tối thiểu 6 ký tự" }, { status: 400 });
    user.passwordHash = bcrypt.hashSync(String(password), 10);
  }
  await user.save();
  return NextResponse.json({
    user: { _id: user._id, name: user.name, username: user.username, role: user.role },
  });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Chỉ Quản lý được xoá nhân viên" }, { status: 403 });

  const { id } = await ctx.params;
  if (id === admin.id)
    return NextResponse.json({ error: "Không thể xoá chính tài khoản của bạn" }, { status: 400 });
  if (!mongoose.isValidObjectId(id))
    return NextResponse.json({ error: "Không tìm thấy nhân viên" }, { status: 404 });
  const deleted = await User.findByIdAndDelete(id);
  if (!deleted) return NextResponse.json({ error: "Không tìm thấy nhân viên" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
