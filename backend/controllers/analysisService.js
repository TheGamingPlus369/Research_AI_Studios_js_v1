const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const analyzeSourceText = async (text, projectQuestion) => {
    if (!text || text.trim().length < 100) {
        throw new Error("Source text is too short or empty for a meaningful analysis.");
    }
    
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const analysisSchema = {
        type: "OBJECT",
        properties: {
            summary: { type: "STRING", description: "A very brief, one-sentence summary (5-15 words) of the source's main content, suitable for a card preview." },
            authorThesis: { type: "STRING", description: "A single sentence that clearly states the author's central argument or main thesis." },
            academicContext: { type: "STRING", description: "A paragraph explaining how this source contributes to the broader academic field. Does it support, refute, or extend existing theories? Mention the key conversation it's a part of." },
            keyArguments: { type: "ARRAY", items: {type: "STRING"}, description: "A list of the 3-5 most important supporting arguments or findings from the text."},
            directQuotes: { 
                type: "ARRAY", 
                items: {
                    type: "OBJECT",
                    properties: {
                        quote: { type: "STRING", description: "An exact, verbatim quote from the text that is highly relevant to the user's project question." },
                        analysis: { type: "STRING", description: "A 1-2 sentence analysis of WHY this specific quote is important and how it relates to the project question." }
                    }
                },
                description: "A list of 3-4 of the most powerful and relevant direct quotes from the source, each with a corresponding analysis."
            },
            methodology: { type: "OBJECT", properties: {
                type: {type: "STRING", description: "The primary research methodology used (e.g., 'Qualitative Case Study', 'Quantitative Survey', 'Literature Review')."},
                details: {type: "STRING", description: "A brief explanation of how the methodology was applied in this source."}
            }},
            evidence: { type: "ARRAY", items: {type: "STRING"}, description: "A list of the primary data or evidence the source relies on (e.g., 'Interview transcripts', 'Performance benchmarks', 'Survey data')." },
            limitations: { type: "STRING", description: "A critical analysis of the source's potential weaknesses, unaddressed questions, or authorial biases."},
            targetAudience: { type: "STRING", description: "Identify the intended audience for this source (e.g., 'Academic Specialists', 'Industry Practitioners', 'General Public')." },
            keyDefinitions: { type: "ARRAY", items: {type: "OBJECT", properties: {
                term: {type: "STRING"},
                definition: {type: "STRING"}
            }}, description: "A glossary of 2-4 important terms or concepts defined in the source."},
            scorecard: { type: "OBJECT", properties: {
                relevance: { type: "OBJECT", properties: { score: { type: "INTEGER", description: "Score 1-10. How directly relevant is this source to the specific project question?" }, justification: { type: "STRING" }}},
                credibility: { type: "OBJECT", properties: { score: { type: "INTEGER", description: "Score 1-10. Is the source from a reputable author/journal? Is it well-cited?" }, justification: { type: "STRING" }}},
                depth: { type: "OBJECT", properties: { score: { type: "INTEGER", description: "Score 1-10. How deeply does the source explore the topic?" }, justification: { type: "STRING" }}},
                novelty: { type: "OBJECT", properties: { score: { type: "INTEGER", description: "Score 1-10. Does this source introduce new ideas or primarily review existing ones?" }, justification: { type: "STRING" }}}
            }}
        }
    };

    const prompt = `
        You are a PhD-level research analyst. Your task is to perform a deep, critical analysis of the following source text in the context of a larger research project.

        **CRITICAL INSTRUCTION:** If the provided text is a security check page (e.g., contains "Just a moment...", "Checking your browser...", "DDoS protection"), you MUST treat it as empty. For any field in the JSON schema where you cannot find a specific answer in the source text, you MUST explicitly state "Information not available in the source text." Do not leave any fields blank or null.

        --- MAIN PROJECT RESEARCH QUESTION ---
        ${projectQuestion}
        ------------------------------------

        --- SOURCE TEXT (first 20,000 characters) ---
        ${text.substring(0, 20000)}
        ----------------------------------------------

        Based *only* on the provided source text, generate a structured analysis. Be critical and objective.
        - **directQuotes**: You MUST find verbatim quotes highly relevant to the project question. If none, the array should contain an object stating so.
        - **scorecard**: You MUST provide a score (1-10) AND a concise justification for each item.
        - **academicContext**: Think like a literature review expert.
        
        Your entire output must be a single, valid JSON object that conforms to the required schema. Do not include any markdown like \`\`\`json.
    `;

    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: analysisSchema,
        },
    });

    try {
        return JSON.parse(result.response.text());
    } catch (e) {
        console.error("CRITICAL: Failed to parse AI JSON response in analyzeSourceText.");
        console.error("Raw AI Text:", result.response.text());
        throw new Error("The AI returned an invalid JSON object, which can happen with complex source text. Please try again or with a different source.");
    }
};

module.exports = { analyzeSourceText };