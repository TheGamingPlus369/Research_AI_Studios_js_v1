const { GoogleGenerativeAI } = require('@google/generative-ai');
const pdf = require('pdf-parse');
const puppeteer = require('puppeteer');
const { analyzeSourceText } = require('./analysisService'); // Import the shared function

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

exports.findSources = async (req, res) => {
    const { projectQuestion, sourceType, existingUrls } = req.body;
    if (!projectQuestion || !sourceType) {
        return res.status(400).json({ error: "Project question and source type are required." });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
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

        const analysisPromises = groundingMetadata.groundingChunks.map(async (chunk) => {
            if (!chunk.web || !chunk.web.uri) return null;

            let browser;
            try {
                browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
                const page = await browser.newPage();
                
                await page.goto(chunk.web.uri, { waitUntil: 'networkidle2', timeout: 20000 });
                const pageTitle = await page.title() || 'Untitled Page';
                
                const bodyText = await page.evaluate(() => document.body.innerText);

                if (!bodyText || bodyText.trim().length < 100) {
                    console.log(`Skipping source (not enough content): ${chunk.web.uri}`);
                    await browser.close();
                    return null;
                }
                
                const analysis = await analyzeSourceText(bodyText, projectQuestion);

                await browser.close();

                return {
                    fileName: `${pageTitle.substring(0, 60)}.pdf`, 
                    fileSize: bodyText.length, 
                    url: chunk.web.uri,
                    analysis: analysis, 
                };
            } catch (err) {
                if (browser) await browser.close();
                console.error(`Failed to process and analyze URL ${chunk.web.uri}:`, err.message);
                return null;
            }
        });

        const settledSources = await Promise.all(analysisPromises);
        const successfulSources = settledSources.filter(source => source !== null);

        res.status(200).json({ sources: successfulSources });

    } catch (error) {
        console.error('Find Sources API Error:', error);
        res.status(500).json({ error: 'Failed to find sources due to a server error.', details: error.message });
    }
};