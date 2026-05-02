import { NextResponse } from "next/server";
import { geminiModel } from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    const { exam, subject } = await req.json();

    if (!exam || !subject) {
      return NextResponse.json({ error: "Missing exam or subject" }, { status: 400 });
    }

    const prompt = `
      Generate a list of 8 to 10 important chapters for the subject "${subject}" in the exam "${exam}".
      
      Return ONLY a JSON array of objects, where each object has:
      - id (string, lowercase, kebab-case)
      - name (string, readable title)
      
      Example:
      [
        { "id": "data-structures", "name": "Data Structures" },
        { "id": "algorithms", "name": "Algorithms" }
      ]
      
      No markdown, no explanation, just raw JSON.
    `;

    const result = await geminiModel.generateContent(prompt);
    const text = await result.response.text();
    
    // Clean potential markdown blocks
    const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    const chapters = JSON.parse(cleanedText);

    return NextResponse.json({ chapters });
  } catch (error: any) {
    console.error("Error generating chapters:", error.message || error);
    return NextResponse.json({ error: error.message || "Failed to generate chapters" }, { status: 500 });
  }
}
