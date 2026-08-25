import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function ScanLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (user?.role === "cskh") redirect("/orders");
  return <>{children}</>;
}
