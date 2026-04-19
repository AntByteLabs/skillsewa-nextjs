import { headers } from "next/headers";
import { redirect } from "next/navigation";

const ALLOWED = ["CUSTOMER", "ADMIN"];

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const role = headersList.get("x-user-role");

  if (!role) redirect("/login");
  if (!ALLOWED.includes(role)) redirect("/");

  return <>{children}</>;
}
