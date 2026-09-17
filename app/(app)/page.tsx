import { WelcomeHome } from "@/components/chat/WelcomeHome";
import { getLoginBranding } from "@/lib/rc/publicSettings";

export default async function Home() {
  const branding = await getLoginBranding();
  return <WelcomeHome siteName={branding.siteName} />;
}
