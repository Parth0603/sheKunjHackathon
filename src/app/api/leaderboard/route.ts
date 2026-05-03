import { NextResponse } from "next/server";
import { getLeaderboardData } from "@/lib/leaderboard";

export async function GET() {
  try {
    const leaderboard = await getLeaderboardData();
    return NextResponse.json({ users: leaderboard, totalUsers: leaderboard.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch leaderboard";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

