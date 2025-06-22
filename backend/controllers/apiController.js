const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- Controller function for generating ideas ---
exports.generateIdeas = async (req, res) => {
    try {
        const { keywords, subject, timeCommitment, scope, skills, outputFormat, tone } = req.body;
        if (!keywords) {
            return res.status(400).json({ error: "Keywords are required to generate ideas." });
        }
        
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite-preview-06-17" });

        const prompt = `You are a creative academic research assistant. Brainstorm research questions based on these parameters: Primary Keywords: "${keywords}", Subject: ${subject}, Time Commitment: ${timeCommitment}, Desired Scope: ${scope}, Required Skills: ${skills || 'Not specified'}, Desired Output Format: ${outputFormat}, Tone: ${tone}. Generate exactly 10 distinct and compelling research questions. For each, provide a brief, one-sentence description. Your entire response must be a single, valid JSON array of objects, where each object has a "question" key and a "description" key. Do not include any other text or markdown.`;

        const result = await model.generateContent(prompt);
        const rawText = result.response.text();
        if (!rawText) throw new Error("The AI returned an empty response.");
        const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const ideas = JSON.parse(cleanedText);
        res.status(200).json({ ideas: ideas });

    } catch (error) {
        console.error('Gemini API Error in generateIdeas:', error);
        res.status(500).json({ error: error.message || 'An unknown error occurred on the server.' });
    }
};


// --- Controller function for Deep Dive (V6 - Corrected stateOfTheField Prompt) ---
exports.deepDive = async (req, res) => {
    try {
        const { question, timeCommitment, skills, scope } = req.body;
        if (!question) {
            return res.status(400).json({ error: "A research question is required for a deep dive." });
        }

        const groundingTool = { googleSearch: {} };
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", tools: [groundingTool] });

        const prompt = `
            You are a skeptical, critical research committee chair. Your task is to be brutally honest and perform a "deep dive" on the following research question to determine its true viability.
            Research Question: "${question}"
            User Constraints: Time Commitment: ${timeCommitment}, Skills: ${skills || 'Not specified'}, Scope: ${scope}
            Perform a comprehensive Google Search to ground your analysis. Your entire output MUST be a single, valid JSON object with NO other text or markdown.
            The JSON object must have these top-level keys: "synopsis", "viabilityScorecard", "feasibility", "stateOfTheField", "readingList".
            1.  "synopsis": A grounded, 3-4 sentence summary of the topic.
            2.  "viabilityScorecard": An object containing five analysis objects. For each object, provide an integer "score" from 1-10 and a brief, one-sentence "justification" for that score. Be realistic and critical.
                - "novelty": { "score": <1-10>, "justification": "..." }
                - "sourceAvailability": { "score": <1-10>, "justification": "..." }
                - "impactPotential": { "score": <1-10>, "justification": "..." }
                - "researchComplexity": { "score": <1-10>, "justification": "..." }
                - "discussionVolume": { "score": <1-10>, "justification": "..." }
            3.  "feasibility": An object analyzing practical aspects.
                - "researchGap": A single, compelling sentence identifying the specific research gap.
                - "methodologies": Array of 2-3 objects, each with "name" and "description".
                - "requirements": Array of 2-3 objects, each with "name" and "details".
                - "ethicalConsiderations": A 1-2 sentence summary of key ethical issues.
                - "estimatedTimeline": A brief string describing a realistic timeline.
            4.  "stateOfTheField": An object with two keys.
                - "keyThemes": An array of 3-5 strings, where each string is a major theme or argument found in your search.
                - "keyPlayers": An array of 3-5 strings, where each string is a prominent researcher, university, or organization.
            5.  "readingList": An array of exactly 5 objects. Each represents a key source and MUST have "title", "url" (the direct URL), "aiSummary", and "type".
            Your response MUST be only the JSON object.
        `;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const groundingMetadata = response.candidates[0]?.groundingMetadata;

        const rawText = response.text();
        if (!rawText) throw new Error("The AI returned an empty response for the deep dive.");
        
        const analysisData = JSON.parse(rawText.replace(/```json/g, '').replace(/```/g, '').trim());

        const finalResponse = {
            analysis: analysisData,
            forensics: {
                webSearchQueries: groundingMetadata?.webSearchQueries || [],
                groundingChunks: groundingMetadata?.groundingChunks || []
            }
        };

        res.status(200).json(finalResponse);

    } catch (error) {
        console.error('Deep Dive API Error:', error);
        res.status(500).json({ error: error.message || 'An unknown error occurred on the server.' });
    }
};