
import { GoogleGenAI } from "@google/genai";

// Use process.env.API_KEY directly as specified in the guidelines
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeSystemHealth = async (stats: any) => {
  const ai = getAI();
  try {
    // Basic Text Tasks (e.g., summarization and advice): 'gemini-3-flash-preview'
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze this system state and provide 3 concise recommendations for a Mac user. Stats: ${JSON.stringify(stats)}`,
      config: {
        systemInstruction: "You are a macOS system optimization expert. Provide brief, actionable, and friendly advice.",
      }
    });
    // response.text is a property, not a method
    return response.text;
  } catch (error) {
    console.error("AI Analysis failed", error);
    return "Optimize your disk space by removing large unused files and clearing system cache.";
  }
};

export const explainProcess = async (processName: string) => {
  const ai = getAI();
  try {
    // Basic Text Tasks: 'gemini-3-flash-preview'
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `What is the background process '${processName}' in macOS? Explain its purpose in 2 sentences.`,
      config: {
        systemInstruction: "Briefly explain technical macOS processes to non-technical users.",
      }
    });
    // response.text is a property, not a method
    return response.text;
  } catch (error) {
    return "Standard macOS system process related to background services.";
  }
};
