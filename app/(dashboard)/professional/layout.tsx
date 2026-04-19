import { headers } from "next/headers";
import { redirect } from "next/navigation";

const ALLOWED = ["PROFESSIONAL", "ADMIN"];

export default async function ProfessionalLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const role = headersList.get("x-user-role");

  if (!role) redirect("/login");
  if (!ALLOWED.includes(role)) redirect("/");

  return <>{children}</>;
}
