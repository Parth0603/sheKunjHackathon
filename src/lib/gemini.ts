import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "AIzaSyB6LCIWnSY2cn42nLlngTqhjJ4O5QZFm38";

if (!apiKey) {
  throw new Error("Missing GEMINI_API_KEY environment variable");
}

const genAI = new GoogleGenerativeAI(apiKey);

const MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL,
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
].filter((m): m is string => typeof m === "string" && m.trim().length > 0);

function isModelNotFoundError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.message.includes("404") || error.message.toLowerCase().includes("not found");
}

async function generateContentWithFallback(prompt: string) {
  let lastError: unknown;

  for (const modelName of MODEL_CANDIDATES) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      return await model.generateContent(prompt);
    } catch (error) {
      lastError = error;
      if (!isModelNotFoundError(error)) throw error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("No supported Gemini model is available for generateContent.");
}

export const geminiModel = {
  generateContent: generateContentWithFallback,
};
