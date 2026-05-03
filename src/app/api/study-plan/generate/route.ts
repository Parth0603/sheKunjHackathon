import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import StudyPlan from "@/models/StudyPlan";
import { generateAdaptiveWeeklyPlan } from "@/lib/studyPlan";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const generated = await generateAdaptiveWeeklyPlan(session.user.email);

    const saved = await StudyPlan.findOneAndUpdate(
      { userId: session.user.email },
      {
        userId: session.user.email,
        weeklyPlan: generated.weeklyPlan,
        insights: generated.insights,
        lastUpdated: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    return NextResponse.json({
      weeklyPlan: saved?.weeklyPlan || generated.weeklyPlan,
      insights: saved?.insights || generated.insights,
      lastUpdated: saved?.lastUpdated || new Date(),
      metrics: generated.metrics,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to generate study plan";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
