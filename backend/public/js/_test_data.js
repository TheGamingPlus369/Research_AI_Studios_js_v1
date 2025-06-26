// This file contains static test data to avoid making API calls during UI development.

// Sample Deep Dive report object to simulate a locked-in topic in the Idea Lab
const testIdeaLabReport = {
  question: "How can Transformer-based models, like BERT and GPT, be fine-tuned for effective sentiment analysis on domain-specific texts such as financial news or product reviews?",
  description: "An investigation into the methodologies for adapting large language models (LLMs) to specialized vocabularies and contexts for nuanced sentiment classification.",
  report: {
    analysis: {
      synopsis: "The advent of large-scale Transformer models like BERT and GPT has revolutionized natural language processing. While these models excel at general language understanding, their performance can degrade on domain-specific texts with unique jargon and context, such as financial news or technical product reviews. This research area focuses on fine-tuning methodologies—techniques to further train these pre-trained models on smaller, specialized datasets. The central challenge lies in adapting the model to new vocabulary and sentiment expressions without losing its powerful, generalized language capabilities, a phenomenon known as 'catastrophic forgetting.' Effective fine-tuning can lead to state-of-the-art performance in targeted sentiment analysis tasks.",
      potentialAngles: [
        "A comparative analysis of fine-tuning strategies (e.g., full model vs. adapter-based) for sentiment analysis on cryptocurrency-related social media posts.",
        "Investigating the impact of domain-specific vocabulary augmentation on a BERT model's ability to classify sentiment in biomedical literature.",
        "Developing a few-shot learning approach to rapidly adapt a GPT model for sentiment analysis on a new, low-resource product review domain."
      ],
      viabilityScorecard: {
        novelty: { score: 7, justification: "While fine-tuning is established, new techniques and applications to novel domains offer room for original contributions." },
        sourceAvailability: { score: 10, justification: "A massive body of academic literature exists on Transformers, BERT, GPT, and fine-tuning, available on arXiv, ACL Anthology, etc." },
        impactPotential: { score: 9, justification: "High-accuracy, domain-specific sentiment analysis has significant commercial and academic applications." },
        researchComplexity: { score: 8, justification: "Requires strong Python skills, familiarity with frameworks like PyTorch/TensorFlow, and access to GPU resources for model training." },
        discussionVolume: { score: 10, justification: "This is a foundational topic in modern NLP with extremely high discussion volume in academic and practitioner communities." }
      },
      feasibility: {
        researchGap: "There is a research gap in quantifying the trade-off between the amount of domain-specific fine-tuning data and the model's susceptibility to adversarial attacks or out-of-domain performance degradation.",
        methodologies: [
            { name: "Empirical Analysis & Benchmarking", description: "Fine-tuning multiple models with different techniques and systematically evaluating their performance on a standardized, domain-specific test set." }, 
            { name: "Ablation Study", description: "Systematically removing components of the fine-tuning process (e.g., layers, specific data subsets) to understand their contribution to the final performance." }
        ],
        requirements: [
            { name: "Computational Resources", details: "Access to a machine with a modern NVIDIA GPU (e.g., RTX 30-series, A100) with at least 12GB of VRAM is highly recommended for efficient fine-tuning." }, 
            { name: "Programming & Frameworks", details: "Proficiency in Python and deep learning frameworks like PyTorch or TensorFlow, along with the Hugging Face Transformers library." }
        ],
        ethicalConsiderations: "Sentiment analysis models can inherit and amplify biases present in their training data. It's crucial to evaluate the model for fairness and bias, especially if used for decisions affecting individuals (e.g., analyzing customer feedback for loan applications)."
      },
      academicBattleground: {
        currentConsensus: "There is a strong consensus that fine-tuning a large pre-trained model on a target domain's data is significantly more effective than training a smaller model from scratch for that domain.",
        pointsOfContention: [
            "The most parameter-efficient fine-tuning (PEFT) method: Is it LoRA, QLoRA, Adapters, or another technique that provides the best balance of performance and computational cost?", 
            "Data Curation: How much 'general' data should be mixed with 'domain-specific' data during fine-tuning to prevent overfitting and maintain robustness?"
        ],
        keyContributors: [
            { name: "Google AI (BERT, T5)", contribution: "Developed the foundational Transformer-based models that are the subject of most fine-tuning research." }, 
            { name: "Hugging Face", contribution: "Created the 'Transformers' library, which democratized access to pre-trained models and standardized the fine-tuning workflow for the research community." }
        ]
      },
      projectRoadmap: [
        { phase: "Phase 1: Setup & Literature Review", duration: "Weeks 1-3", tasks: ["Set up a Python environment with PyTorch, Transformers, and datasets.", "Gather seminal papers on BERT, fine-tuning, and PEFT methods like LoRA.", "Select and preprocess a domain-specific dataset (e.g., the 'Financial PhraseBank')."] },
        { phase: "Phase 2: Model Fine-Tuning & Experimentation", duration: "Weeks 4-8", tasks: ["Implement a baseline fine-tuning script for a BERT-base model.", "Experiment with different hyperparameters (learning rate, batch size).", "Implement and compare at least one PEFT method against the baseline."] },
        { phase: "Phase 3: Analysis, Writing & Conclusion", duration: "Weeks 9-12", tasks: ["Analyze and plot the performance metrics (accuracy, F1-score) from all experiments.", "Write the methodology and results sections of the paper.", "Formulate conclusions and discuss limitations and future work."] }
      ],
      readingList: [
          {
              "title": "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding",
              "url": "https://arxiv.org/abs/1810.04805",
              "sourceName": "arXiv (Cornell University)",
              "aiSummary": "This is the foundational paper that introduces the BERT model, its architecture, and the pre-training/fine-tuning paradigm that has become standard practice in NLP."
          },
          {
              "title": "Language Models are Few-Shot Learners",
              "url": "https://arxiv.org/abs/2005.14165",
              "sourceName": "arXiv (Cornell University)",
              "aiSummary": "This paper introduces GPT-3 and demonstrates the power of large-scale models to perform tasks with minimal or no fine-tuning, presenting an alternative perspective to the heavy fine-tuning approach."
          }
      ]
    },
    forensics: { 
        webSearchQueries: [
            "fine-tuning BERT for sentiment analysis tutorial",
            "domain-specific sentiment analysis using transformers",
            "LoRA vs full fine-tuning performance"
        ], 
        groundingChunks: [] 
    }
  }
};