

import { GoogleGenAI } from "@google/genai";
import type { Lead, Customer } from '../types';

// IMPORTANT: This check is for the browser environment.
// In a real application, the API key should be handled securely and not exposed on the client-side.
// We assume `process.env.API_KEY` is made available through a build process (e.g., Vite, Webpack).
if (!process.env.API_KEY) {
  console.warn("API_KEY environment variable not set. AI features will be disabled.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export const getLeadScore = async (lead: Lead): Promise<{ score: number; reasoning: string; }> => {
  if (!process.env.API_KEY) {
    return { score: Math.floor(Math.random() * 40) + 60, reasoning: "This is a mock score. Please set your API_KEY to use the AI feature." };
  }
  
  const prompt = `
    You are a lead scoring expert for "OneSkin", a company that sells high-end decorative wall panels.
    Score the following lead on a scale of 1 to 100, where 100 is the highest potential.
    Provide a brief reasoning for your score.

    Lead Details:
    - Name: ${lead.name}
    - Company: ${lead.company}
    - Country: ${lead.country}
    - Source: ${lead.source}
    - Current Status: ${lead.status}
    - Days since creation: ${Math.round((new Date().getTime() - new Date(lead.created_at).getTime()) / (1000 * 3600 * 24))} days

    Your response must be a valid JSON object with two keys: "score" (a number) and "reasoning" (a string).
    Example: {"score": 85, "reasoning": "Strong lead from a trade show, working for a relevant company."}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text.trim();
    // Simple check to see if it's a JSON string
    if (text.startsWith('{') && text.endsWith('}')) {
        const result = JSON.parse(text);
        if (typeof result.score === 'number' && typeof result.reasoning === 'string') {
          return result;
        }
    }
    throw new Error("Invalid JSON response from AI");

  } catch (error) {
    console.error("Error scoring lead with AI:", error);
    return { score: 0, reasoning: "Could not score lead due to an AI service error." };
  }
};

export const getCustomerInsights = async (customer: Customer): Promise<string> => {
  if (!process.env.API_KEY) {
    return "This is a mock insight. Set your API_KEY to generate real insights. Suggest offering a discount on their next order of decorative panels.";
  }

  const prompt = `
    You are a CRM analyst for "OneSkin", a decorative wall panel company.
    Analyze the following customer and provide a "Next Best Action" suggestion.
    Keep the suggestion concise and actionable (1-2 sentences).

    Customer Details:
    - Name: ${customer.name}
    - Company: ${customer.company}
    - Country: ${customer.country}
    // Fix: Replaced non-existent 'lifecycle' and 'total_spent' with existing properties 'status' and 'health_score'.
    - Status: ${customer.status}
    - Health Score: ${customer.health_score}
    - Last Contact: ${customer.last_contact}

    Example response: "High-value active customer. Propose a new premium panel collection to them."
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error getting customer insights:", error);
    return "Could not generate insights due to an AI service error.";
  }
};

export const scanBusinessCard = async (base64Image: string): Promise<Partial<Lead>> => {
  if (!process.env.API_KEY) {
    // Mock response for when API key is not set
    return {
      name: 'John Doe (Mock)',
      company: 'Mock Inc.',
      email: 'john.mock@example.co.uk',
      phone: '+44 123 456 7890',
      country: 'United Kingdom',
    };
  }

  const prompt = `
    You are an expert OCR system specialized in extracting structured data from business cards. 
    Analyze the provided image and extract the following fields: 'name', 'company', 'email', 'phone', and 'country'.

    To determine the 'country', use this priority order:
    1. Infer from the international dialing code in the phone number (e.g., +34 is Spain, +1 is United States).
    2. If no dialing code, look for the country name in the postal address.
    3. If neither is present, infer from the top-level domain of the email (e.g., '.kr' is South Korea, '.es' is Spain).

    Your response MUST be a valid JSON object with ONLY these keys. 
    If a field is not found, return an empty string for that key.
    Example: {"name": "Jane Smith", "company": "Creative Solutions", "email": "jane@creativesolutions.co.uk", "phone": "+44-555-123-4567", "country": "United Kingdom"}
  `;

  try {
    const imagePart = {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Image,
      },
    };

    const textPart = {
      text: prompt
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text.trim();
    if (text.startsWith('{') && text.endsWith('}')) {
      const result = JSON.parse(text);
      return {
        name: result.name || '',
        company: result.company || '',
        email: result.email || '',
        phone: result.phone || '',
        country: result.country || '',
      };
    }
    throw new Error("Invalid JSON response from AI");

  } catch (error) {
    console.error("Error scanning business card with AI:", error);
    throw new Error("Could not extract information from the business card due to an AI service error.");
  }
};