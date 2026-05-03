import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import FlashcardSet from "@/models/FlashcardSet";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const sets = await FlashcardSet.find({ userId: session.user.email })
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({
      sets: sets.map((s) => ({
        id: String(s._id),
        exam: s.exam,
        subject: s.subject,
        chapter: s.chapter,
        topic: s.topic,
        count: s.count,
        updatedAt: s.updatedAt,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch flashcard sets";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const setId = String(searchParams.get("setId") || "").trim();
    if (!setId) return NextResponse.json({ error: "setId is required" }, { status: 400 });

    await connectDB();
    const deleted = await FlashcardSet.deleteOne({ _id: setId, userId: session.user.email });
    if (!deleted.deletedCount) return NextResponse.json({ error: "Set not found" }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to remove flashcard set";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
