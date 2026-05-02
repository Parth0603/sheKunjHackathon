import { NextResponse } from "next/server";
import { geminiModel } from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    const { exam, subject, chapter } = await req.json();

    if (!exam || !subject || !chapter) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const prompt = `Generate a 5-question multiple choice quiz for a student preparing for the ${exam} exam. 
The subject is ${subject} and the chapter is ${chapter}. 
Return ONLY a valid JSON object with the following structure, no markdown formatting or backticks around it:
{
  "questions": [
    {
      "question": "Question text here",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "The exact text of the correct option"
    }
  ]
}`;

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean up potential markdown formatting from Gemini
    const cleanedText = text.replace(/```json\n?|```\n?/g, "").trim();
    
    const data = JSON.parse(cleanedText);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error generating quiz:", error.message || error);
    return NextResponse.json({ error: error.message || "Failed to generate quiz" }, { status: 500 });
  }
}
