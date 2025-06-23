const { GoogleGenerativeAI } = require('@google/generative-ai');
const pdf = require('pdf-parse');
const puppeteer = require('puppeteer');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// =========== UPGRADED: LITERATURE HUB CONTROLLERS (V2) ===========

const analyzeSourceText = async (text, projectQuestion) => {
    // FIX: Add a check for minimum text length to avoid empty/useless API calls.
    if (!text || text.trim().length < 100) {
        throw new Error("Source text is too short or empty for a meaningful analysis.");
    }
    
    // Using flash model for speed and cost-effectiveness in analysis.
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    // **MASSIVELY UPGRADED SCHEMA for a Graduate-Level Report**
    const analysisSchema = {
        type: "OBJECT",
        properties: {
            summary: { type: "STRING", description: "A concise, 3-4 sentence summary of the source's main content." },
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
        You are a PhD-level research analyst. Your task is to perform a deep, critical analysis of the following source text, specifically in the context of a larger research project. Your output must be academically rigorous.

        --- MAIN PROJECT RESEARCH QUESTION ---
        ${projectQuestion}
        ------------------------------------

        --- SOURCE TEXT (first 20,000 characters) ---
        ${text.substring(0, 20000)}
        ----------------------------------------------

        Based *only* on the provided source text, generate a structured analysis. Be critical and objective.
        - For 'directQuotes', you MUST find verbatim quotes that are highly relevant to the project question and analyze their significance.
        - For 'scorecard', you MUST provide a score AND a concise justification for each item. The 'relevance' score is the most important.
        - For 'academicContext', think like a literature review expert.
        
        Your entire output must be a single, valid JSON object that conforms to the required schema. Do not include any markdown like \`\`\`json.
    `;

    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: analysisSchema,
        },
    });

    // FIX: The "Unterminated string in JSON" error happens here. We add a try/catch
    // block to gracefully handle cases where the AI returns a malformed response.
    try {
        return JSON.parse(result.response.text());
    } catch (e) {
        console.error("CRITICAL: Failed to parse AI JSON response in analyzeSourceText.");
        console.error("Raw AI Text:", result.response.text()); // Log the bad text for debugging
        throw new Error("The AI returned an invalid JSON object, which can happen with complex source text. Please try again or with a different source.");
    }
};

exports.handleFileUpload = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded.' });
        }
        
        const { projectQuestion } = req.body;
        if (!projectQuestion) {
            return res.status(400).json({ error: 'Project research question is required for analysis.' });
        }
        
        const dataBuffer = req.file.buffer;
        const data = await pdf(dataBuffer);
        const sourceText = data.text;

        const analysis = await analyzeSourceText(sourceText, projectQuestion);

        res.status(200).json({
            fileName: req.file.originalname,
            fileType: req.file.mimetype,
            fileSize: req.file.size,
            analysis: analysis
        });

    } catch (error) {
        console.error("File Upload Error:", error);
        res.status(500).json({ error: 'Failed to process file.', details: error.message });
    }
};

exports.handleUrlUpload = async (req, res) => {
    const { url, projectQuestion } = req.body;
    if (!url || !projectQuestion) {
        return res.status(400).json({ error: 'URL and project question are required.' });
    }

    let browser;
    try {
        browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle2' });
        
        const pageTitle = await page.title();
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        
        await browser.close();
        browser = null; // Important: nullify browser after closing

        const data = await pdf(pdfBuffer);
        const sourceText = data.text;

        const analysis = await analyzeSourceText(sourceText, projectQuestion);

        res.status(200).json({
            fileName: `${pageTitle || 'Scraped Article'}.pdf`,
            fileType: 'application/pdf',
            fileSize: pdfBuffer.length,
            analysis: analysis
        });

    } catch (error) {
        if (browser) await browser.close(); // Ensure browser is closed on error
        console.error("URL Upload Error:", error);
        res.status(500).json({ error: 'Failed to process URL.', details: error.message });
    }
};

// --- Controller function for generating ideas ---
exports.generateIdeas = async (req, res) => {
    try {
        const { keywords, subject, timeCommitment, scope, skills, outputFormat, tone } = req.body;
        if (!keywords) {
            return res.status(400).json({ error: "Keywords are required to generate ideas." });
        }
        
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

        const prompt = `You are a creative academic research assistant. Brainstorm research ideas based on these parameters: Primary Keywords: "${keywords}", Subject: ${subject}, Time Commitment: ${timeCommitment}, Desired Scope: ${scope}, Required Skills: ${skills || 'Not specified'}, Desired Output Format: ${outputFormat}, Tone: ${tone}. Generate exactly 10 distinct and compelling research ideas. For each, provide a brief, one-sentence description. Your entire response must be a single, valid JSON array of objects, where each object has a "question" key (the research idea) and a "description" key. Do not include any other text or markdown like \`\`\`json.`;

        const result = await model.generateContent(prompt);
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

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" }); // Use Pro for higher quality deep dives

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

        // FIX: This is where the "Cannot convert undefined or null" error happens.
        // We add robust checks to ensure the API response is valid before proceeding.
        const groundingResponse = groundingResult.response;
        if (!groundingResponse || !groundingResponse.text) {
             throw new Error("The AI failed to generate a summary for the topic. Please try again or rephrase your topic.");
        }
        const synthesizedText = groundingResponse.text();
        const groundingMetadata = groundingResponse?.candidates?.[0]?.groundingMetadata;

        if (!groundingMetadata || !groundingMetadata.groundingChunks || groundingMetadata.groundingChunks.length === 0) {
            throw new Error("Could not find sufficient web sources to perform a deep dive. The topic may be too niche or new.");
        }
        
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

        // =========== STEP 2: STRUCTURING CALL ===========
        const deepDiveSchema = { type: "OBJECT",
            properties: {
                synopsis: { type: "STRING" },
                potentialAngles: { type: "ARRAY", items: {type: "STRING"}},
                viabilityScorecard: { type: "OBJECT", properties: { novelty: { type: "OBJECT", properties: { score: { type: "INTEGER" }, justification: { type: "STRING" }}}, sourceAvailability: { type: "OBJECT", properties: { score: { type: "INTEGER" }, justification: { type: "STRING" }}}, impactPotential: { type: "OBJECT", properties: { score: { type: "INTEGER" }, justification: { type: "STRING" }}}, researchComplexity: { type: "OBJECT", properties: { score: { type: "INTEGER" }, justification: { type: "STRING" }}}, discussionVolume: { type: "OBJECT", properties: { score: { type: "INTEGER" }, justification: { type: "STRING" }}}}},
                feasibility: { type: "OBJECT", properties: { researchGap: { type: "STRING" }, methodologies: { type: "ARRAY", items: { type: "OBJECT", properties: { name: { type: "STRING" }, description: { type: "STRING" } } } }, requirements: { type: "ARRAY", items: { type: "OBJECT", properties: { name: { type: "STRING" }, details: { type: "STRING" } } } }, ethicalConsiderations: { type: "STRING" }}},
                academicBattleground: { type: "OBJECT", properties: { currentConsensus: {type: "STRING"}, pointsOfContention: {type: "ARRAY", items: {type: "STRING"}}, keyContributors: {type: "ARRAY", items: { type: "OBJECT", properties: {name: {type: "STRING"}, contribution: {type: "STRING"}}}}}},
                projectRoadmap: { type: "ARRAY", items: { type: "OBJECT", properties: { phase: {type: "STRING"}, duration: {type: "STRING"}, tasks: {type: "ARRAY", items: {type: "STRING"}}}}},
                readingList: { type: "ARRAY", items: { type: "OBJECT", properties: { title: { type: "STRING" }, url: { type: "STRING" }, aiSummary: { type: "STRING" }}}}
            } };

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
            - Your response must be a single, valid JSON object. Do not add any markdown.
        `;

        const structuringResult = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: structuringPrompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: deepDiveSchema,
            },
        });

        const analysisData = JSON.parse(structuringResult.response.text());

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


// =========== UPGRADED: AI SOURCE FINDER CONTROLLER ===========
exports.findSources = async (req, res) => {
    const { projectQuestion, sourceType, existingUrls } = req.body;
    if (!projectQuestion || !sourceType) {
        return res.status(400).json({ error: "Project question and source type are required." });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const tools = [{ googleSearch: {} }];

    let searchQuery;
    if (sourceType === 'pdf') {
        searchQuery = `Find 5 scholarly articles or research papers in PDF format relevant to the research question: "${projectQuestion}" filetype:pdf`;
    } else { // 'web'
        searchQuery = `Find 5 insightful web articles, blog posts, or news reports relevant to the research question: "${projectQuestion}"`;
    }

    if (existingUrls && existingUrls.length > 0) {
        searchQuery += ` Exclude any results from these domains/URLs if possible: ${existingUrls.join(', ')}`;
    }

    try {
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: searchQuery }] }],
            tools: tools
        });

        const groundingMetadata = result.response?.candidates?.[0]?.groundingMetadata;
        if (!groundingMetadata || !groundingMetadata.groundingChunks || groundingMetadata.groundingChunks.length === 0) {
            return res.status(200).json({ sources: [] });
        }

        // MAJOR UPGRADE: We now process each promise individually and perform a full analysis.
        const analysisPromises = groundingMetadata.groundingChunks.map(async (chunk) => {
            if (!chunk.web || !chunk.web.uri) return null;

            let browser;
            try {
                // Launch a new browser for each URL to ensure isolation
                browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
                const page = await browser.newPage();
                
                await page.goto(chunk.web.uri, { waitUntil: 'networkidle2', timeout: 20000 });
                const pageTitle = await page.title() || 'Untitled Page';
                
                // We convert the page to text for analysis
                const bodyText = await page.evaluate(() => document.body.innerText);

                if (!bodyText || bodyText.trim().length < 100) {
                    console.log(`Skipping source (not enough content): ${chunk.web.uri}`);
                    await browser.close();
                    return null;
                }
                
                // Now, we analyze the text *before* sending it to the client
                const analysis = await analyzeSourceText(bodyText, projectQuestion);

                await browser.close();

                // Return the full analysis object
                return {
                    fileName: `${pageTitle.substring(0, 60)}.pdf`, // Keep .pdf for icon consistency
                    fileSize: bodyText.length, // Use text length as a proxy for size
                    url: chunk.web.uri,
                    analysis: analysis, // The full analysis payload
                };
            } catch (err) {
                if (browser) await browser.close();
                console.error(`Failed to process and analyze URL ${chunk.web.uri}:`, err.message);
                // Return null on failure so Promise.all doesn't reject the whole batch
                return null;
            }
        });

        // Wait for all promises to settle (either resolve or reject)
        const settledSources = await Promise.all(analysisPromises);
        // Filter out any nulls that resulted from failed scrapes/analyses
        const successfulSources = settledSources.filter(source => source !== null);

        res.status(200).json({ sources: successfulSources });

    } catch (error) {
        console.error('Find Sources API Error:', error);
        res.status(500).json({ error: 'Failed to find sources due to a server error.', details: error.message });
    }
};