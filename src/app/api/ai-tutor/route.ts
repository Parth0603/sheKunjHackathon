import { NextResponse } from "next/server";
import { geminiModel } from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    const { message, subject } = await req.json();

    if (!message || !subject) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const prompt = `You are "Aether", an elite, highly intelligent AI study companion for competitive exams (JEE, NEET, UPSC, GATE). 
The student is currently studying: ${subject}.
Respond directly, concisely, and accurately to the following query from the student. Do not use excessive pleasantries. If they ask a conceptual question, give a clear explanation, maybe an example, and keep it high-yield.

Student Query: "${message}"`;

    const result = await geminiModel.generateContent(prompt);
    const text = result.response.text();

    return NextResponse.json({ reply: text });
  } catch (error: any) {
    console.error("Error in AI Tutor:", error.message || error);
    return NextResponse.json({ error: error.message || "Failed to process query" }, { status: 500 });
  }
}
