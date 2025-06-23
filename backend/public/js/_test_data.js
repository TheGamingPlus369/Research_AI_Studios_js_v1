// This file contains static test data to avoid making API calls during UI development.

// Sample Deep Dive report object to simulate a locked-in topic in the Idea Lab
const testIdeaLabReport = {
  question: "What is the impact of long-term remote work on employee productivity and mental well-being?",
  description: "An analysis of post-pandemic studies on how remote work affects company output, employee burnout, and work-life balance.",
  report: {
    analysis: {
      synopsis: "The widespread adoption of remote work, accelerated by the COVID-19 pandemic, has fundamentally altered the corporate landscape. Initial studies indicated productivity gains due to fewer interruptions and no commute time. However, long-term research reveals a more nuanced picture. While some employees thrive in autonomous environments, many report increased feelings of isolation, 'Zoom fatigue', and a blurring of boundaries between work and home life. The key challenge for organizations is to develop hybrid models and support systems that capture the benefits of flexibility while mitigating the negative impacts on collaboration, innovation, and employee mental health.",
      potentialAngles: [
        "A comparative study of productivity metrics in fully remote vs. hybrid teams within the tech industry.",
        "Analyze the effectiveness of corporate wellness programs specifically designed for a remote workforce.",
        "Investigate the correlation between management style (e.g., trust-based vs. micromanagement) and remote employee attrition rates."
      ],
      viabilityScorecard: {
        novelty: { score: 6, justification: "While heavily researched, the long-term effects are still emerging, offering opportunities for novel insights." },
        sourceAvailability: { score: 10, justification: "Vast amounts of academic studies, business reports, and articles have been published since 2020." },
        impactPotential: { score: 9, justification: "Findings are highly relevant to almost every knowledge-based organization globally." },
        researchComplexity: { score: 7, justification: "Requires careful study design to isolate variables, but data is widely available through surveys and company metrics." },
        discussionVolume: { score: 10, justification: "Extremely high discussion volume across business, academic, and popular media." }
      },
      feasibility: {
        researchGap: "A significant gap exists in longitudinal studies comparing the career progression and promotion rates of remote versus in-office employees over a 5+ year period.",
        methodologies: [{ name: "Quantitative Survey Analysis", description: "Distributing and analyzing surveys like the Maslach Burnout Inventory and productivity self-reports to a large employee sample." }, { name: "Qualitative Interviews", description: "Conducting semi-structured interviews with managers and employees to gather nuanced data on experiences and perceptions." }],
        requirements: [{ name: "Data Analysis Software", details: "Proficiency in statistical software like R, Python (with pandas/statsmodels), or SPSS for survey data analysis." }, {name: "Survey Platform", details: "Access to a platform like Qualtrics, SurveyMonkey, or Google Forms to distribute surveys and collect data."}],
        ethicalConsiderations: "Ensuring employee anonymity and data privacy is paramount. Researchers must obtain informed consent and be sensitive when discussing topics like mental health and burnout."
      },
      academicBattleground: {
        currentConsensus: "There is broad agreement that a one-size-fits-all approach to remote work is ineffective and that hybrid models are the most likely future for many companies.",
        pointsOfContention: ["Whether proximity is essential for spontaneous innovation and building strong company culture.", "The best methods for accurately measuring knowledge worker productivity in a remote setting."],
        keyContributors: [{ name: "Nicholas Bloom (Stanford)", contribution: "Conducted influential studies, including the 2015 Ctrip study, providing foundational data on remote work productivity." }, {name: "Harvard Business Review", contribution: "Frequently publishes research and case studies on remote and hybrid work models from various academic and industry experts."}]
      },
      projectRoadmap: [
        { phase: "Phase 1: Literature Review", duration: "Months 1-2", tasks: ["Gather 50-100 relevant studies on remote work since 2020.", "Synthesize key themes and identify conflicting findings.", "Finalize specific variables for investigation (e.g., productivity metrics, well-being scales)."] },
        { phase: "Phase 2: Survey & Data Collection", duration: "Months 3-4", tasks: ["Design and pilot the survey instrument.", "Recruit participants from target companies.", "Distribute survey and conduct qualitative interviews."] },
        { phase: "Phase 3: Analysis & Writing", duration: "Months 5-6", tasks: ["Clean and analyze quantitative data.", "Transcribe and code qualitative interview data.", "Draft methodology, results, and discussion sections of the paper."] }
      ],
      readingList: []
    },
    forensics: { webSearchQueries: [], groundingChunks: [] }
  }
};