import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import FlashcardProgress from "@/models/FlashcardProgress";

function nextReviewFor(status: string): Date {
  const now = new Date();
  if (status === "known") {
    now.setDate(now.getDate() + 3);
  } else if (status === "revise") {
    now.setDate(now.getDate() + 1);
  } else {
    now.setDate(now.getDate() + 2);
  }
  return now;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const setId = String(body?.setId || "");
    const cardId = String(body?.cardId || "");
    const status = String(body?.status || "new");

    if (!setId || !cardId || !["new", "known", "revise"].includes(status)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    await connectDB();

    const row = await FlashcardProgress.findOne({ userId: session.user.email, setId, cardId });
    if (row) {
      row.status = status as "new" | "known" | "revise";
      row.reviewCount = (row.reviewCount || 0) + 1;
      row.lastReviewedAt = new Date();
      row.nextReviewDate = nextReviewFor(status);
      await row.save();
      return NextResponse.json({ success: true });
    }

    await FlashcardProgress.create({
      userId: session.user.email,
      setId,
      cardId,
      status,
      reviewCount: 1,
      lastReviewedAt: new Date(),
      nextReviewDate: nextReviewFor(status),
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update flashcard progress";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
