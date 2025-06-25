const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- Controller function for generating ideas ---
exports.generateIdeas = async (req, res) => {
    try {
        const { keywords, subject, timeCommitment, scope, skills, outputFormat, tone } = req.body;
        if (!keywords) {
            return res.status(400).json({ error: "Keywords are required to generate ideas." });
        }
        
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `You are a creative academic research assistant. Your task is to brainstorm research ideas based on a user's input.
        
        **USER PARAMETERS:**
        - Primary Keywords: "${keywords}"
        - Subject Area: ${subject}
        - Estimated Time Commitment: ${timeCommitment}
        - Desired Research Scope: ${scope}
        - Mentioned Skills: ${skills || 'Not specified'}
        - Target Output Format: ${outputFormat}
        - Desired Tone: ${tone}

        **TASK:**
        Generate exactly 10 distinct and compelling research **ideas**. Each idea must be a tangible project, not just a question.
        For each idea, provide a short, compelling **title** and a one-sentence **description** that summarizes the project's core concept.

        **OUTPUT FORMAT:**
        Your entire response must be a single, valid JSON array of objects. Each object must have a "title" key (the research idea's title) and a "description" key. Do not include any other text or markdown like \`\`\`json.
        Example: [{"title": "A good research idea", "description": "A summary of that idea."}]`;

        // The response schema tells the model what to output, this is more reliable than just the prompt.
        const ideaSchema = {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    title: { type: "STRING" },
                    description: { type: "STRING" }
                },
                required: ["title", "description"]
            }
        };

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: ideaSchema,
            },
        });
        const rawText = result.response.text();

        // A simple cleanup to handle potential markdown fences from the AI.
        const cleanedText = rawText.replace(/^```json\s*/, '').replace(/```$/, '').trim();
        const ideas = JSON.parse(cleanedText);
        res.status(200).json({ ideas: ideas });

    } catch (error) {
        console.error('Gemini API Error in generateIdeas:', error);
        res.status(500).json({ error: 'Failed to generate ideas.', details: error.message });
    }
};

// --- Controller function for Deep Dive ---
exports.deepDive = async (req, res) => {
    try {
        const { question, timeCommitment, skills, scope } = req.body;
        if (!question) {
            return res.status(400).json({ error: "A research topic is required for a deep dive." });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // =========== STEP 1: GROUNDING & SYNTHESIS CALL ===========
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
        if (!groundingResponse || !groundingResponse.text) {
             throw new Error("The AI failed to generate a summary for the topic. Please try again or rephrase your topic.");
        }
        const synthesizedText = groundingResponse.text();
        const groundingMetadata = groundingResponse?.candidates?.[0]?.groundingMetadata;

        if (!groundingMetadata || !groundingMetadata.groundingChunks || groundingMetadata.groundingChunks.length === 0) {
            throw new Error("Could not find sufficient web sources to perform a deep dive. The topic may be too niche or new.");
        }
        
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
        
            console.log("Found sources for prompt:", sourceListForPrompt);


        // =========== STEP 2: STRUCTURING CALL ===========
        const deepDiveSchema = { type: "OBJECT",
            properties: {
                synopsis: { type: "STRING" },
                potentialAngles: { type: "ARRAY", items: {type: "STRING"}},
                viabilityScorecard: { type: "OBJECT", properties: { novelty: { type: "OBJECT", properties: { score: { type: "INTEGER" }, justification: { type: "STRING" }}}, sourceAvailability: { type: "OBJECT", properties: { score: { type: "INTEGER" }, justification: { type: "STRING" }}}, impactPotential: { type: "OBJECT", properties: { score: { type: "INTEGER" }, justification: { type: "STRING" }}}, researchComplexity: { type: "OBJECT", properties: { score: { type: "INTEGER" }, justification: { type: "STRING" }}}, discussionVolume: { type: "OBJECT", properties: { score: { type: "INTEGER" }, justification: { type: "STRING" }}}}},
                feasibility: { type: "OBJECT", properties: { researchGap: { type: "STRING" }, methodologies: { type: "ARRAY", items: { type: "OBJECT", properties: { name: { type: "STRING" }, description: { type: "STRING" } } } }, requirements: { type: "ARRAY", items: { type: "OBJECT", properties: { name: { type: "STRING" }, details: { type: "STRING" } } } }, ethicalConsiderations: { type: "STRING" }}},
                academicBattleground: { type: "OBJECT", properties: { currentConsensus: {type: "STRING"}, pointsOfContention: {type: "ARRAY", items: {type: "STRING"}}, keyContributors: {type: "ARRAY", items: { type: "OBJECT", properties: {name: {type: "STRING"}, contribution: {type: "STRING"}}}}}},
                projectRoadmap: { type: "ARRAY", items: { type: "OBJECT", properties: { phase: {type: "STRING"}, duration: {type: "STRING"}, tasks: {type: "ARRAY", items: {type: "STRING"}}}}},
                readingList: { type: "ARRAY", items: { type: "OBJECT", properties: { title: { type: "STRING" }, url: { type: "STRING" },sourceName: { type: "STRING", description: "The name of the publication or website, e.g., 'Forbes', 'Nature'."}, aiSummary: { type: "STRING" }}}}
            } };

        const structuringPrompt = `
            You are an expert-level Research Analyst AI. Your primary directive is to populate a JSON object based on synthesized text about a research topic. You MUST adhere to all instructions. Failure to populate any field is not an option.

            **CONTEXT:**
            The user wants to evaluate the viability of the following research topic.
            <TOPIC>
            ${question}
            </TOPIC>

            You have been provided with a pre-synthesized summary of web search results about this topic.
            <SYNTHESIZED_TEXT>
            ${synthesizedText}
            </SYNTHESIZED_TEXT>

            You have also been given the list of source URLs that the summary was based on.
            <SOURCE_LIST>
            ${sourceListForPrompt.map(s => `- ${s.title}: ${s.url}`).join('\n')}
            </SOURCE_LIST>

            **MANDATORY TASK:**
            Analyze the provided text and source list to generate a complete and valid JSON output that strictly conforms to the provided schema. Every single field MUST be filled.

            **FIELD-BY-FIELD INSTRUCTIONS:**
            - **synopsis**: Provide a dense, academic paragraph that summarizes the <SYNTHESIZED_TEXT>.
            - **potentialAngles**: MUST generate 3 distinct, actionable, and specific research angles.
            - **viabilityScorecard**: MUST provide an integer score (1-10) AND a strong justification for EACH of the 5 scorecard items.
            - **feasibility.researchGap**: MUST identify and clearly articulate the most promising research gap found or inferred from the text.
            - **feasibility.methodologies**: MUST suggest 2-4 appropriate research methodologies with brief descriptions.
            - **feasibility.requirements**: MUST list 2 concrete requirements (e.g., 'Software', 'Data Access') with specific examples.
            - **feasibility.ethicalConsiderations**: MUST describe one or more potential ethical issues. If none seem apparent, state "Standard academic integrity protocols (plagiarism, data privacy) apply."
            - **academicBattleground.currentConsensus**: MUST state the primary point of agreement.
            - **academicBattleground.pointsOfContention**: MUST list at least 2 points of debate.
            - **academicBattleground.keyContributors**: MUST identify 2-3 key entities (people, universities, companies) from the text.
            - **projectRoadmap**: MUST generate a realistic 3-phase project roadmap with durations and 2-3 specific tasks per phase.
            - **readingList**: This is critical. For EACH source in the <SOURCE_LIST>, you will:
                1. Read its title and URL.
                2. Identify the publisher or source name (e.g., "Harvard Business Review", "TechCrunch", "Stanford University").
                3. Infer its likely content based on the overall <SYNTHESIZED_TEXT>.
                4. Write a unique, one-sentence summary for it.
                5. Create a JSON object for it: { "title": "...", "url": "...", "sourceName": "...", "aiSummary": "..." }.
               You MUST generate an entry for every source provided in the list.

            Your output must be only the raw, valid JSON object, with no other text, apologies, or markdown.
        `;

        const structuringResult = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: structuringPrompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: deepDiveSchema,
            },
        });
        
        let analysisData;
        try {
            analysisData = JSON.parse(structuringResult.response.text());
        } catch(e) {
            console.error("CRITICAL: Failed to parse AI JSON response in deepDive.");
            console.error("Raw AI Text:", structuringResult.response.text());
            throw new Error("The AI returned an invalid JSON object for the deep dive report. This can happen with very complex topics. Please try rephrasing your question.");
        }


        // =========== STEP 3: COMBINE AND RESPOND ===========
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