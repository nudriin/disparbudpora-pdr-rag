import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import AuthedClientLayout from "./AuthedClientLayout";

/**
 * Server Wrapper Layout terautentikasi.
 * Mengambil sesi server lalu merender AuthedClientLayout untuk responsivitas UI.
 */
export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const adminDisplayName = session.fullName || session.email.split("@")[0];

  return (
    <AuthedClientLayout adminDisplayName={adminDisplayName}>
      {children}
    </AuthedClientLayout>
  );
}
