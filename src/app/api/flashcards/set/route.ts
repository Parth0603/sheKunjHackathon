import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import FlashcardSet from "@/models/FlashcardSet";
import FlashcardProgress from "@/models/FlashcardProgress";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const setId = searchParams.get("setId");
    const mode = (searchParams.get("mode") || "all").toLowerCase();

    if (!setId) return NextResponse.json({ error: "setId is required" }, { status: 400 });

    await connectDB();

    const set = await FlashcardSet.findOne({ _id: setId, userId: session.user.email }).lean();
    if (!set) return NextResponse.json({ error: "Set not found" }, { status: 404 });

    const progressRows = await FlashcardProgress.find({ userId: session.user.email, setId }).lean();
    const progressMap = new Map(progressRows.map((p) => [p.cardId, p]));

    let cards = (set.cards as Array<{
      cardId: string;
      question: string;
      answer: string;
      explanation?: string;
      example?: string;
      subject?: string;
      topic?: string;
      difficulty: "easy" | "medium" | "hard";
      tip?: string;
    }>).map((card) => ({
      ...card,
      progress: progressMap.get(card.cardId) || null,
    }));

    if (mode === "weak") {
      cards = cards.filter((c) => c.progress?.status === "revise");
    } else if (mode === "new") {
      cards = cards.filter((c) => !c.progress || c.progress.status === "new");
    }

    return NextResponse.json({
      set: {
        id: String(set._id),
        exam: set.exam,
        subject: set.subject,
        chapter: set.chapter,
        topic: set.topic,
      },
      cards,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch flashcard set";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
