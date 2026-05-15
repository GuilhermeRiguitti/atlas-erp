import { Dashboard } from "@/components/dashboard";
import { LoginPanel } from "@/components/login-panel";
import { getSession } from "@/lib/require-session";

export default async function Home() {
  const session = await getSession();

  if (!session.user) {
    return <LoginPanel />;
  }

  return <Dashboard sessionUser={session.user} />;
}
