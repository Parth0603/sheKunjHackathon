import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Note from "@/models/Note";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const notes = await Note.find({ userId: session.user.email })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ notes });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch notes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
