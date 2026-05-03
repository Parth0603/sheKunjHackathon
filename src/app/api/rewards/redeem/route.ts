import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redeemReward } from "@/lib/rewards";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let rewardKey = "";
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await req.json();
      rewardKey = body?.rewardKey;
    } else {
      const form = await req.formData();
      rewardKey = String(form.get("rewardKey") || "");
    }
    if (!rewardKey || typeof rewardKey !== "string") {
      return NextResponse.json({ error: "Invalid reward key" }, { status: 400 });
    }

    const result = await redeemReward(session.user.email, rewardKey);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      reward: result.reward,
      credits: result.user.credits,
      ownedRewards: result.user.ownedRewards,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to redeem reward";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

