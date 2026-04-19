import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const role = headersList.get("x-user-role");

  if (!role) redirect("/login");
  if (role !== "ADMIN") redirect("/");

  return <>{children}</>;
}
