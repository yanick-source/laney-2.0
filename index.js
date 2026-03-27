// index.js
import { GoogleGenAI } from '@google/genai';
import 'dotenv/config'; // Automatically loads your .env file

// Initialize the client with the API key
const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY });

async function testSecureAPI() {
    console.log('🔄 Making secure API request from Node.js...');
    
    try {
        const response = await ai.models.generateContent({
            // Using the correct preview string for 3.1 Flash-Lite
            model: "gemini-3.1-flash-lite-preview",
            contents: "Respond with exactly: 'API working securely from Node.js!'"
        });
        
        console.log('✅ Success:', response.text);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Run the function
testSecureAPI();
