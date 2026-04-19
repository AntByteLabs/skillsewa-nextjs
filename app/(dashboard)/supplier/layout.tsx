import { headers } from "next/headers";
import { redirect } from "next/navigation";

const ALLOWED = ["SUPPLIER", "ADMIN"];

export default async function SupplierLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const role = headersList.get("x-user-role");

  if (!role) redirect("/login");
  if (!ALLOWED.includes(role)) redirect("/");

  return <>{children}</>;
}
