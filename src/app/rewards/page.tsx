import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getRewardsDashboardData } from "@/lib/rewards";
import RewardsClient from "./RewardsClient";

export default async function RewardsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  const data = await getRewardsDashboardData(session.user.email);

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1380, margin: "0 auto" }}>
      <RewardsClient
        initialCredits={data.credits}
        initialBadges={data.badges}
        rewards={data.rewards}
        history={data.history}
      />
    </div>
  );
}

