import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";
import { getSession, type SessionUser } from "@/lib/auth";

export const VALID_ROLES = ["admin", "cskh", "ky_thuat", "in", "ep", "gia_cong", "dong_goi", "da_giao"];

// Chỉ Quản lý được đụng vào nhân viên — role check theo DB, không tin JWT cũ
export async function requireAdmin(): Promise<SessionUser | null> {
  const session = await getSession();
  if (!session) return null;
  await dbConnect();
  const me = await User.findById(session.id).select("role").lean<{ role?: string }>();
  return me?.role === "admin" ? session : null;
}
