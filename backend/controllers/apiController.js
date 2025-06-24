const { GoogleGenerativeAI } = require('@google/generative-ai');
const pdf = require('pdf-parse');
const puppeteer = require('puppeteer');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// A helper function for creating a delay
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const analyzeSourceText = async (text, projectQuestion) => {
    if (!text || text.trim().length < 100) {
        throw new Error("Source text is too short or empty for a meaningful analysis.");
    }
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

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
        You are a meticulous, PhD-level research analyst. Your sole task is to perform a deep, critical analysis of the provided source text and return the analysis as a perfectly formatted JSON object.
        --- CONTEXT ---
        Primary Research Question: "${projectQuestion}"
        This question provides the lens through which you must analyze the source. Your entire analysis, especially the 'relevance' score and 'directQuotes', must be framed by this question.
        --- END CONTEXT ---
        --- SOURCE TEXT (first 20,000 characters) ---
        ${text.substring(0, 20000)}
        --- END SOURCE TEXT ---
        --- INSTRUCTIONS ---
        1. Analyze the "SOURCE TEXT" strictly in the context of the "Primary Research Question".
        2. Populate every field in the provided JSON schema with accurate, concise, and academically rigorous information derived *only* from the source text.
        3. For 'directQuotes', you MUST find verbatim quotes that are highly relevant to the project question and analyze their significance.
        4. For 'scorecard', you MUST provide a score AND a concise justification for each item. The 'relevance' score is the most important.
        5. Your entire output MUST be a single, valid JSON object that conforms to the required schema. Do not include any markdown formatting like \`\`\`json or any other explanatory text, apologies, or introductions.
        Your final output must be only the JSON object itself.
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
        throw new Error("The AI returned an invalid JSON object.");
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
        browser = null;

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
        if (browser) await browser.close();
        console.error("URL Upload Error:", error);
        res.status(500).json({ error: 'Failed to process URL.', details: error.message });
    }
};

exports.generateIdeas = async (req, res) => {
    try {
        const { keywords, subject, timeCommitment, scope, skills, outputFormat, tone } = req.body;
        if (!keywords) {
            return res.status(400).json({ error: "Keywords are required to generate ideas." });
        }
        
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

        // ENHANCED PROMPT
        const prompt = `
            You are an expert academic advisor and creative research partner. Your task is to generate compelling research IDEAS based on a user's criteria and return them in a strict JSON format.

            --- USER CRITERIA ---
            - Primary Keywords: "${keywords}"
            - Subject: "${subject}"
            - Time Commitment: "${timeCommitment}"
            - Desired Scope: "${scope}"
            - Required Skills: "${skills || 'Not specified'}"
            - Desired Output Format: "${outputFormat}"
            - Tone: "${tone}"
            --- END CRITERIA ---

            --- INSTRUCTIONS ---
            1.  Brainstorm exactly 10 distinct and insightful research ideas, framed as questions.
            2.  For each idea, provide a brief, one-sentence description of the research direction.
            3.  Your output MUST be a single, valid JSON array of objects.
            4.  Each object in the array must have exactly two keys: "question" (string) and "description" (string).
            5.  Do not wrap the JSON in markdown backticks (\`\`\`json) or include any other text, explanations, or apologies. Your entire response must be only the JSON array.
        `;

        const result = await model.generateContent(prompt);
        const rawText = result.response.text();
        const cleanedText = rawText.replace(/^```json\s*/, '').replace(/```$/, '').trim();
        const ideas = JSON.parse(cleanedText);
        res.status(200).json({ ideas: ideas });
    } catch (error) {
        console.error('Gemini API Error in generateIdeas:', error);
        res.status(500).json({ error: 'Failed to generate ideas.', details: error.message });
    }
};

// =========== EXPORTS.DEEPDIVE (ENHANCED) ===========
// To update, copy the code below and replace the corresponding function in your apiController.js file.

exports.deepDive = async (req, res) => {
    try {
        const { question } = req.body;
        if (!question) {
            return res.status(400).json({ error: "A research topic is required for a deep dive." });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const groundingTools = [{ googleSearch: {} }];
        const groundingPrompt = `
            Your sole task is to perform a comprehensive Google search on the following research topic and synthesize the findings.
            Your synthesis should be a dense, informative summary covering the topic's relevance, key academic themes and theories, major points of debate or contention, potential research gaps, and common methodologies mentioned in the search results.
            Do not offer opinions or advice. Stick to summarizing the information you find.
            Research Topic: "${question}"
        `;
        const groundingResult = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: groundingPrompt }] }],
            tools: groundingTools,
        });

        const groundingResponse = groundingResult.response;
        if (!groundingResponse || !groundingResponse.text || groundingResponse.text().trim() === '') {
             throw new Error("The AI failed to generate a summary for the topic. This can happen with very niche topics. Please try again or rephrase your topic.");
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
                    if (displayTitle.toLowerCase() === hostname || displayTitle.includes('...')) {
                         const pathSegments = url.pathname.split('/').filter(seg => seg && isNaN(seg)).map(s => s.replace(/-/g, ' ')).map(s => s.charAt(0).toUpperCase() + s.slice(1)).slice(0, 3).join(': ');
                         displayTitle = pathSegments ? `${hostname}: ${pathSegments}` : hostname;
                    }
                } catch(e) {/* ignore URL parsing errors */}
                
                uniqueSources.set(chunk.web.uri, { title: displayTitle, url: chunk.web.uri });
            }
        });
        const sourceListForPrompt = Array.from(uniqueSources.values()).slice(0, 7);

        await delay(1000);

        const deepDiveSchema = { /* Unchanged */ };

        // FINAL ENHANCED STRUCTURING PROMPT
        const structuringPrompt = `
            You are a meticulous research analyst. Your ONLY task is to populate a JSON object based STRICTLY on the context provided below. Do not use outside knowledge.

            --- CONTEXT ---
            1. Research Topic: "${question}"
            2. Source List (for 'readingList' field):
            ${sourceListForPrompt.map(s => `- TITLE: ${s.title}, URL: ${s.url}`).join('\n')}
            3. AI-Generated Synthesis (for all other fields):
            ${synthesizedText}
            --- END CONTEXT ---

            --- INSTRUCTIONS & JSON SCHEMA ---
            Your task is to create a single, valid JSON object. Adhere strictly to the following schema and instructions for each field.

            - synopsis (string): MANDATORY. Summarize the "AI-Generated Synthesis" in your own words.
            - feasibility (object):
                - researchGap (string): Identify the most significant research gap mentioned in the synthesis.
                - requirements (array of objects): Detail any necessary skills or tools mentioned. **BE HYPER-SPECIFIC.** If software is needed, name it (e.g., 'Python with Pandas library', 'SPSS v28'). If hardware is needed, give specific examples (e.g., 'NVIDIA RTX 4080 GPU for model training', 'Access to a 100+ qubit quantum computer via cloud'). If lab equipment is needed, name the specific equipment (e.g., 'PCR machine', 'Centrifuge', 'Spectrometer'). Do not use vague terms.
            - readingList (array of objects): MANDATORY. You MUST populate this field. Create an entry for EACH source in the "Source List". Match 'title' and 'url' exactly. For 'aiSummary', write a new, unique, one-sentence summary for each source, inferring from its title and the synthesis content.
            - All other fields (potentialAngles, viabilityScorecard, academicBattleground, projectRoadmap) must also be populated by extracting and interpreting information *only* from the "AI-Generated Synthesis" text.

            --- FINAL COMMAND ---
            Generate the JSON object now. Your entire response must be only the JSON object, with no markdown, apologies, or extra text.
        `;

        const structuringResult = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: structuringPrompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: deepDiveSchema,
            },
        });

        const analysisData = JSON.parse(structuringResult.response.text());
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
    } else {
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
        const successfulSources = [];
        const foundUrls = groundingMetadata.groundingChunks;
        for (const chunk of foundUrls) {
            if (!chunk.web || !chunk.web.uri) continue;
            let browser;
            try {
                console.log(`Processing source: ${chunk.web.uri}`);
                browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
                const page = await browser.newPage();
                await page.goto(chunk.web.uri, { waitUntil: 'networkidle2', timeout: 20000 });
                const pageTitle = await page.title() || 'Untitled Page';
                const bodyText = await page.evaluate(() => document.body.innerText);
                await browser.close();
                if (!bodyText || bodyText.trim().length < 100) {
                    console.log(`Skipping source (not enough content): ${chunk.web.uri}`);
                    continue;
                }
                const analysis = await analyzeSourceText(bodyText, projectQuestion);
                successfulSources.push({
                    fileName: `${pageTitle.substring(0, 60)}.pdf`,
                    fileSize: bodyText.length,
                    url: chunk.web.uri,
                    analysis: analysis,
                });
            } catch (err) {
                if (browser) await browser.close();
                console.error(`Failed to process and analyze URL ${chunk.web.uri}:`, err.message);
            }
        }
        res.status(200).json({ sources: successfulSources });
    } catch (error) {
        console.error('Find Sources API Error:', error);
        res.status(500).json({ error: 'Failed to find sources due to a server error.', details: error.message });
    }
};