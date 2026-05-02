
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function run() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Hello");
    console.log(result.response.text());
  } catch (e) {
    console.error("Error with gemini-1.5-flash:", e.message);
    
    try {
      console.log("Trying gemini-pro...");
      const model2 = genAI.getGenerativeModel({ model: "gemini-pro" });
      const result2 = await model2.generateContent("Hello");
      console.log(result2.response.text());
    } catch (e2) {
       console.error("Error with gemini-pro:", e2.message);
    }
  }
}
run();
