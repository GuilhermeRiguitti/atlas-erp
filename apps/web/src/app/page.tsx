import { getSession } from "@/lib/require-session";
import { LoginPanel } from "@/modules/auth/components/login-panel";
import { Dashboard } from "@/modules/erp/components/dashboard";

export default async function Home() {
  const session = await getSession();

  if (!session.user) {
    return <LoginPanel />;
  }

  return <Dashboard sessionUser={session.user} />;
}
