const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- Controller function for generating ideas (Unchanged) ---
exports.generateIdeas = async (req, res) => {
    try {
        const { keywords, subject, timeCommitment, scope, skills, outputFormat, tone } = req.body;
        if (!keywords) {
            return res.status(400).json({ error: "Keywords are required to generate ideas." });
        }
        
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite-preview-06-17" });

        const prompt = `You are a creative academic research assistant. Brainstorm research ideas based on these parameters: Primary Keywords: "${keywords}", Subject: ${subject}, Time Commitment: ${timeCommitment}, Desired Scope: ${scope}, Required Skills: ${skills || 'Not specified'}, Desired Output Format: ${outputFormat}, Tone: ${tone}. Generate exactly 10 distinct and compelling research ideas. For each, provide a brief, one-sentence description. Your entire response must be a single, valid JSON array of objects, where each object has a "question" key (this key should contain the research idea text) and a "description" key. Do not include any other text or markdown.`;

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


// --- Controller function for Deep Dive (V20 - SPECIFICITY & LAYOUT FIXES) ---
exports.deepDive = async (req, res) => {
    try {
        const { question, timeCommitment, skills, scope } = req.body;
        if (!question) {
            return res.status(400).json({ error: "A research topic is required for a deep dive." });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // =========== STEP 1: GROUNDING & SYNTHESIS CALL (Unchanged) ===========
        const groundingTools = [{ googleSearch: {} }];
        const groundingPrompt = `
            Perform a detailed analysis of the following research topic, grounded in Google Search results. 
            Provide a comprehensive summary covering its relevance, key academic themes, points of debate, potential research gaps, and common methodologies.
            Topic: "${question}"
        `;
        const groundingResult = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: groundingPrompt }] }],
            tools: groundingTools,
        });

        const groundingResponse = groundingResult.response;
        const synthesizedText = groundingResponse.text();
        const groundingMetadata = groundingResponse?.candidates?.[0]?.groundingMetadata;

        if (!synthesizedText) { throw new Error("The AI failed to generate a summary for the topic. Please try again."); }
        if (!groundingMetadata || !groundingMetadata.groundingChunks || groundingMetadata.groundingChunks.length === 0) { throw new Error("Could not find sufficient web sources to perform a deep dive. The topic may be too niche or new."); }
        
        const topSources = [];
        const uniqueSources = new Map();
        groundingMetadata.groundingChunks.forEach(chunk => {
            if (chunk.web && chunk.web.uri && !uniqueSources.has(chunk.web.uri)) {
                let displayTitle = chunk.web.title || 'Untitled Source';
                try {
                    const url = new URL(chunk.web.uri);
                    const hostname = url.hostname.replace('www.', '');
                    if (displayTitle.toLowerCase() === hostname || displayTitle === 'Untitled Source' || displayTitle === '') {
                        const pathSegments = url.pathname.split('/').filter(seg => seg && isNaN(seg)).slice(0, 2).join(' / ');
                        displayTitle = pathSegments ? `${hostname} / ${pathSegments}` : hostname;
                    }
                } catch (e) { console.error("URL parsing failed for:", chunk.web.uri); }
                uniqueSources.set(chunk.web.uri, { title: displayTitle, url: chunk.web.uri });
            }
        });
        const sourceListForPrompt = Array.from(uniqueSources.values()).slice(0, 5);

        // =========== STEP 2: STRUCTURING CALL (Prompt Updated for Specificity) ===========
        const deepDiveSchema = {
            type: "OBJECT",
            properties: {
                synopsis: { type: "STRING" },
                potentialAngles: { type: "ARRAY", items: {type: "STRING"}},
                viabilityScorecard: { type: "OBJECT", properties: { novelty: { type: "OBJECT", properties: { score: { type: "INTEGER" }, justification: { type: "STRING" }}}, sourceAvailability: { type: "OBJECT", properties: { score: { type: "INTEGER" }, justification: { type: "STRING" }}}, impactPotential: { type: "OBJECT", properties: { score: { type: "INTEGER" }, justification: { type: "STRING" }}}, researchComplexity: { type: "OBJECT", properties: { score: { type: "INTEGER" }, justification: { type: "STRING" }}}, discussionVolume: { type: "OBJECT", properties: { score: { type: "INTEGER" }, justification: { type: "STRING" }}}}},
                feasibility: { type: "OBJECT", properties: { researchGap: { type: "STRING" }, methodologies: { type: "ARRAY", items: { type: "OBJECT", properties: { name: { type: "STRING" }, description: { type: "STRING" } } } }, requirements: { type: "ARRAY", items: { type: "OBJECT", properties: { name: { type: "STRING" }, details: { type: "STRING" } } } }, ethicalConsiderations: { type: "STRING" }}},
                academicBattleground: { type: "OBJECT", properties: { currentConsensus: {type: "STRING"}, pointsOfContention: {type: "ARRAY", items: {type: "STRING"}}, keyContributors: {type: "ARRAY", items: { type: "OBJECT", properties: {name: {type: "STRING"}, contribution: {type: "STRING"}}}}}},
                projectRoadmap: { type: "ARRAY", items: { type: "OBJECT", properties: { phase: {type: "STRING"}, duration: {type: "STRING"}, tasks: {type: "ARRAY", items: {type: "STRING"}}}}},
                readingList: { type: "ARRAY", items: { type: "OBJECT", properties: { title: { type: "STRING" }, url: { type: "STRING" }, aiSummary: { type: "STRING" }}}}
            }
        };

        const structuringPrompt = `
            You are a research analysis expert. Based *only* on the text and source list below, analyze the research topic and structure your entire output as a single, valid JSON object that conforms to the provided schema.

            ---PROVIDED SOURCE LIST---
            ${sourceListForPrompt.map(s => `- ${s.title}: ${s.url}`).join('\n')}
            ---------------------------

            ---PROVIDED TEXT---
            ${synthesizedText}
            -------------------

            Research Topic being analyzed: "${question}"

            SPECIFIC INSTRUCTIONS FOR JSON FIELDS:
            - readingList: For EACH source in the provided list, write a unique, one-sentence summary of its content based on the provided text.
            - methodologies: Provide **no more than 5** of the most relevant methodologies.
            - requirements: Be extremely specific. If a requirement is 'Computational Power', the details MUST specify concrete examples like 'Minimum 16GB RAM, NVIDIA RTX 3080 GPU or equivalent'. If it's 'Lab Equipment', the details MUST specify the equipment needed, like 'e.g., Spectrometer, Centrifuge, PCR machine'.
            - potentialAngles: Suggest 2-3 specific, compelling, and unique angles a researcher could take.
            - academicBattleground: Clearly separate what is known (consensus) from what is debated (contention).
            - projectRoadmap: Create a realistic, multi-phase plan. Each phase should have a clear title, a duration, and a list of 2-4 concrete tasks.
        `;

        const structuringResult = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: structuringPrompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: deepDiveSchema,
            },
        });

        const analysisData = JSON.parse(structuringResult.response.text());

        // =========== STEP 3: COMBINE AND RESPOND (Unchanged) ===========
        const finalResponse = {
            analysis: analysisData,
            forensics: {
                webSearchQueries: groundingMetadata.webSearchQueries || [],
                groundingChunks: groundingMetadata.groundingChunks || []
            }
        };

        res.status(200).json(finalResponse);

    } catch (error) {
        console.error('Deep Dive API Error:', error);
        res.status(500).json({ 
            error: 'An error occurred during the deep dive.', 
            details: error.message 
        });
    }
};