
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { MessageRole } from "../types";

const getAIClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const chatWithGemini = async (
  prompt: string, 
  history: { role: MessageRole; parts: { text?: string; inlineData?: { mimeType: string; data: string } }[] }[] = [],
  mode: 'chat' | 'research' = 'chat',
  imagePart?: { mimeType: string; data: string }
): Promise<{ text: string; sources?: { title: string; uri: string }[] }> => {
  const ai = getAIClient();
  
  // System instruction to ensure the AI uses its search tool and cites sources
  const systemInstruction = `You are BOADI LISTOWEL AI, an advanced academic assistant tuned to the excellence of St. Peters SHS (Persco). 
  Always aim for high accuracy. Use the provided search tools to verify facts and provide real-time information. 
  When you use search results, the grounding metadata will be automatically displayed to the user as references. 
  Maintain a professional, encouraging, and highly intelligent persona.`;

  const config: any = {
    temperature: 0.7,
    topP: 0.95,
    systemInstruction,
    // Enable search grounding for all modes to ensure references are available for any answer
    tools: [{ googleSearch: {} }],
  };

  const parts: any[] = [{ text: prompt }];
  if (imagePart) {
    parts.push({
      inlineData: imagePart
    });
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      ...history.map(h => ({ role: h.role === MessageRole.USER ? 'user' : 'model', parts: h.parts })),
      { role: 'user', parts }
    ],
    config,
  });

  const text = response.text || "I'm sorry, I couldn't generate a response.";
  
  let sources;
  // Always extract grounding metadata if it exists
  if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
    sources = response.candidates[0].groundingMetadata.groundingChunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web.title || 'Source',
        uri: chunk.web.uri
      }));
  }

  return { text, sources };
};

export const generateImage = async (prompt: string): Promise<string> => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: prompt }]
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1"
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image data received from the AI.");
};
