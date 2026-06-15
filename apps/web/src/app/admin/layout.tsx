import { redirect } from "next/navigation";
import { getCurrentDbUser, ADMIN_ROLES } from "@/lib/auth";
import AdminShell from "./AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentDbUser();
  if (!user) redirect("/sign-in");
  if (!ADMIN_ROLES.includes(user.role)) redirect("/student");

  return <AdminShell userRole={user.role}>{children}</AdminShell>;
}
