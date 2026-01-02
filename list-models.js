
import { GoogleGenAI } from "@google/genai";
import { getGeminiApiKey } from './services/aiSettingsService.js';

// This is a node script to list models
async function listModels() {
    const key = process.env.VITE_GEMINI_API_KEY;
    if (!key) {
        console.error("VITE_GEMINI_API_KEY not found in environment");
        return;
    }

    const genAI = new GoogleGenAI(key);
    try {
        console.log("Fetching models...");
        // Use the listModels method if available or a direct fetch
        // In @google/genai, we usually fetch from the endpoint
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const data = await response.json();
        console.log("Available Models:");
        data.models.forEach(m => {
            console.log(`- ${m.name} (Methods: ${m.supportedGenerationMethods.join(', ')})`);
        });
    } catch (e) {
        console.error("Error fetching models:", e);
    }
}

listModels();
