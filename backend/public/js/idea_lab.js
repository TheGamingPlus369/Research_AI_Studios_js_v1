document.addEventListener('DOMContentLoaded', () => {
    // === SELECTORS ===
    const generatorView = document.getElementById('idea-lab-generator');
    const lockedView = document.getElementById('idea-lab-locked-state');
    const generateIdeasBtn = document.getElementById('generate-ideas-btn');
    const ideaKeywordsInput = document.getElementById('idea-keywords-input');
    const ideaCardsContainer = document.getElementById('idea-cards-container');
    const ideaActions = document.getElementById('idea-actions');
    const deepDiveBtn = document.getElementById('deep-dive-btn');
    const generateMoreBtn = document.getElementById('generate-more-btn');
    const reviewSection = document.getElementById('idea-lab-review-section');
    const deepDiveLoader = document.getElementById('deep-dive-loader');
    const deepDiveReport = document.getElementById('deep-dive-report');
    const deepDiveQuestionTitle = document.getElementById('deep-dive-question-title');
    const finalConfirmBtn = document.getElementById('final-confirm-btn');
    const goToNextStepBtn = document.getElementById('go-to-next-step-btn');
    const lockedTopicQuestionEl = document.getElementById('locked-topic-question');
    const viewLockedReportBtn = document.getElementById('view-locked-report-btn');
    const changeTopicBtn = document.getElementById('change-topic-btn');
    const finalChangeTopicBtn = document.getElementById('final-change-topic-btn');
    
    // Advanced Options
    const subjectSelect = document.getElementById('subject-select');
    const timeCommitmentSelect = document.getElementById('time-commitment-select');
    const researchScopeSelect = document.getElementById('research-scope-select');
    const skillsInput = document.getElementById('skills-input');
    const outputFormatSelect = document.getElementById('output-format-select');
    const toneSelect = document.getElementById('tone-select');

    // === STATE ===
    let activeQuestion = null;
    let reportBeingViewed = null;
    let isGenerating = false;
    let isDiving = false;
    let isTopicLocked = false;
    let lockedTopicData = null;
    const reportCache = {};

    // --- WORKFLOW & VIEW MANAGEMENT ---
    const showGeneratorView = () => {
        lockedView.classList.add('d-none');
        generatorView.classList.remove('d-none');
        reviewSection.classList.add('d-none');
    };

    const showLockedView = () => {
        generatorView.classList.add('d-none');
        reviewSection.classList.add('d-none');
        lockedTopicQuestionEl.textContent = `"${lockedTopicData.question}"`;
        lockedView.classList.remove('d-none');
    };
    
    // --- UI POPULATION & HELPERS ---
    const generateIdeaCardHTML = (idea) => {
        const questionId = btoa(idea.question);
        return `
            <div class="card idea-card mb-2" id="card-${questionId}" data-question-id="${questionId}" data-idea-text="${idea.question}" data-idea-desc="${idea.description}">
                <div class="card-body">
                    <p class="mb-1 fw-bold">${idea.question}</p>
                    <small class="text-muted">${idea.description}</small>
                </div>
            </div>`;
    };
    
    const setButtonLoading = (btn, isLoading, text = 'Generating...') => {
        const btnTextEl = btn.querySelector('.btn-text');
        if (isLoading) {
            btn.classList.add('loading');
            if (btnTextEl) btnTextEl.textContent = text;
        } else {
            btn.classList.remove('loading');
            if (btnTextEl) btnTextEl.textContent = btn.id === 'generate-more-btn' ? 'Generate More' : 'Generate Ideas';
        }
    };

    // --- API & DATA HANDLING ---
    const generateIdeas = async (isAppending = false) => {
        if (isGenerating) return;
        const keywords = ideaKeywordsInput.value.trim();
        if (keywords === '') { return alert('Please enter keywords to generate ideas.'); }

        isGenerating = true;
        setButtonLoading(generateIdeasBtn, true);
        setButtonLoading(generateMoreBtn, true);
        
        if (!isAppending) {
            ideaCardsContainer.innerHTML = '';
            reviewSection.classList.add('d-none');
        }

        try {
            const response = await fetch('/api/generate-ideas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    keywords, subject: subjectSelect.value, timeCommitment: timeCommitmentSelect.value,
                    scope: researchScopeSelect.value, skills: skillsInput.value.trim(),
                    outputFormat: outputFormatSelect.value, tone: toneSelect.value
                }),
            });
            if (!response.ok) throw new Error((await response.json()).error || 'Request failed');
            const data = await response.json();
            
            let newHtml = data.ideas?.map(idea => generateIdeaCardHTML(idea)).join('') || '';

            if (isAppending) {
                ideaCardsContainer.insertAdjacentHTML('beforeend', newHtml);
            } else {
                let preservedCardHtml = '';
                if(lockedTopicData) {
                    preservedCardHtml = `<div class="locked-topic-reminder">${generateIdeaCardHTML(lockedTopicData)}<hr class="my-4"></div>`;
                }
                ideaCardsContainer.innerHTML = preservedCardHtml + newHtml;
            }
            ideaActions.classList.remove('d-none');

        } catch (error) {
            console.error('Error fetching ideas:', error);
            alert(`Error: ${error.message}`);
        } finally {
            isGenerating = false;
            setButtonLoading(generateIdeasBtn, false);
            setButtonLoading(generateMoreBtn, false);
        }
    };

    const performDeepDive = async (question) => {
        if (isDiving) return;
        isDiving = true;
        deepDiveBtn.disabled = true;
        deepDiveBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Diving...`;

        deepDiveReport.classList.add('d-none');
        deepDiveLoader.classList.remove('d-none');
        reviewSection.classList.remove('d-none');
        reviewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        try {
            // ... API call logic remains the same
            const response = await fetch('/api/deep-dive', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question, timeCommitment: timeCommitmentSelect.value,
                    skills: skillsInput.value.trim(), scope: researchScopeSelect.value
                }),
            });
            if (!response.ok) throw new Error((await response.json()).error || 'Request failed');
            const data = await response.json();
            const cardEl = document.querySelector(`[data-idea-text="${question}"]`);
            
            reportCache[btoa(question)] = { 
                question: question,
                description: cardEl?.dataset.ideaDesc || 'N/A', 
                report: data 
            };
            populateDeepDiveReport(question, data);
            
            deepDiveLoader.classList.add('d-none');
            deepDiveReport.classList.remove('d-none');
        } catch (error) {
            console.error('Error during deep dive:', error);
            deepDiveLoader.innerHTML = `<div class="alert alert-danger"><strong>Deep Dive Failed:</strong> ${error.message} <button class="btn btn-sm btn-outline-danger retry-btn ms-2">Retry</button></div>`;
        } finally {
            isDiving = false;
            updateDeepDiveButton();
        }
    };
    
    const updateDeepDiveButton = () => {
        // ... (This function remains unchanged)
        deepDiveBtn.disabled = activeQuestion === null || isDiving;
        if (!activeQuestion) {
            deepDiveBtn.innerHTML = `<i class="bi bi-search-heart me-2"></i> Deep Dive & Validate`;
            return;
        }
        
        const hasReport = !!reportCache[btoa(activeQuestion)];
        if (hasReport) {
            deepDiveBtn.innerHTML = `<i class="bi bi-file-text-fill me-2"></i> View Report`;
        } else {
            deepDiveBtn.innerHTML = `<i class="bi bi-search-heart me-2"></i> Deep Dive & Validate`;
        }
    };

    const populateDeepDiveReport = (question, data) => {
        // ... (This function remains unchanged)
        reportBeingViewed = question;
        const { analysis, forensics } = data;
        const { viabilityScorecard, feasibility, stateOfTheField, readingList } = analysis;
        deepDiveQuestionTitle.textContent = `"${question}"`;
        document.getElementById('overview-insight').textContent = feasibility.researchGap;
        document.getElementById('overview-scorecard').innerHTML = Object.entries(viabilityScorecard).map(([key, val]) => {
            if (typeof val !== 'object') return '';
            const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            return `<div class="d-flex justify-content-between align-items-center border-bottom py-2"><span data-bs-toggle="tooltip" title="${val.justification}">${label} <i class="bi bi-info-circle small"></i></span><span class="fw-bold fs-5 text-primary">${val.score}/10</span></div>`;
        }).join('');
        new bootstrap.Tooltip(document.body, { selector: "[data-bs-toggle='tooltip']", trigger: 'hover', container: 'body' });
        document.getElementById('feasibility-methods').innerHTML = feasibility.methodologies.map(m => `<div class="card bg-body-secondary border-0 mb-2"><div class="card-body"><h6 class="card-title">${m.name}</h6><p class="card-text small text-muted">${m.description}</p></div></div>`).join('');
        document.getElementById('feasibility-requirements').innerHTML = feasibility.requirements.map(r => `<div class="card bg-body-secondary border-0 mb-2"><div class="card-body"><h6 class="card-title">${r.name}</h6><p class="card-text small text-muted">${r.details}</p></div></div>`).join('');
        document.getElementById('feasibility-challenges').textContent = "The biggest potential challenge lies in " + feasibility.methodologies.map(m => m.name.toLowerCase()).join(', ') + ".";
        document.getElementById('feasibility-ethics').innerHTML = `<i class="bi bi-shield-exclamation me-2"></i> ${feasibility.ethicalConsiderations}`;
        document.getElementById('feasibility-timeline').innerHTML = `<i class="bi bi-calendar3 me-2"></i> ${feasibility.estimatedTimeline}`;
        document.getElementById('field-themes').innerHTML = stateOfTheField.keyThemes.map(theme => `<li class="list-group-item">${theme}</li>`).join('');
        document.getElementById('field-players').innerHTML = stateOfTheField.keyPlayers.map(player => `<span class="badge bg-secondary-subtle text-secondary-emphasis me-2 mb-2 p-2 fs-6">${player}</span>`).join('');
        document.getElementById('reading-list-container').innerHTML = readingList.map(item => `<div class="card mb-3"><div class="card-body"><h5 class="card-title"><a href="${item.url}" target="_blank" rel="noopener noreferrer">${item.title}</a></h5><p class="card-text">${item.aiSummary}</p><span class="badge bg-info-subtle text-info-emphasis">${item.type}</span></div></div>`).join('');
        document.getElementById('forensics-queries').innerHTML = forensics.webSearchQueries.map(q => `<span class="badge bg-dark-subtle text-light-emphasis border border-secondary me-2 mb-2 p-2">"${q}"</span>`).join('');
        document.getElementById('forensics-sources').innerHTML = forensics.groundingChunks.map(chunk => `<li class="list-group-item bg-transparent text-body border-secondary"><a href="${chunk.web.uri}" target="_blank" rel="noopener noreferrer">${chunk.web.title || 'Untitled Source'}</a></li>`).join('');
    };

    // === EVENT LISTENERS ===
    generateIdeasBtn.addEventListener('click', () => generateIdeas(false));
    generateMoreBtn.addEventListener('click', () => generateIdeas(true));

    deepDiveBtn.addEventListener('click', () => {
        if (activeQuestion) {
            const questionId = btoa(activeQuestion);
            if (reportCache[questionId]) {
                populateDeepDiveReport(activeQuestion, reportCache[questionId].report);
                reviewSection.classList.remove('d-none');
            } else {
                performDeepDive(activeQuestion);
            }
        }
    });

    deepDiveLoader.addEventListener('click', e => {
        if (e.target.matches('.retry-btn')) {
            performDeepDive(activeQuestion);
        }
    });

    ideaCardsContainer.addEventListener('click', (e) => {
        const card = e.target.closest('.idea-card');
        if (!card) return;
        activeQuestion = card.dataset.ideaText;
        ideaCardsContainer.querySelectorAll('.idea-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        updateDeepDiveButton();
    });

    finalConfirmBtn.addEventListener('click', () => {
        if (!reportBeingViewed) return;
        isTopicLocked = true;
        lockedTopicData = reportCache[btoa(reportBeingViewed)];
        const confirmModal = bootstrap.Modal.getInstance(document.getElementById('confirmTopicModal'));
        confirmModal.hide();
        reviewSection.classList.add('d-none');
        generatorView.classList.add('d-none');
        const congratsModal = new bootstrap.Modal(document.getElementById('congratsModal'));
        congratsModal.show();
    });

    changeTopicBtn.addEventListener('click', () => {
        const changeModal = new bootstrap.Modal(document.getElementById('changeTopicConfirmModal'));
        changeModal.show();
    });

    finalChangeTopicBtn.addEventListener('click', () => {
        isTopicLocked = false;
        const changeModal = bootstrap.Modal.getInstance(document.getElementById('changeTopicConfirmModal'));
        changeModal.hide();
        showGeneratorView();
        ideaActions.classList.add('d-none');
        ideaCardsContainer.innerHTML = `<div class="locked-topic-reminder">${generateIdeaCardHTML(lockedTopicData)}<hr class="my-4"></div>`;
    });

    viewLockedReportBtn.addEventListener('click', () => {
        if (lockedTopicData) {
            populateDeepDiveReport(lockedTopicData.question, lockedTopicData.report);
            reviewSection.classList.remove('d-none');
        }
    });

    goToNextStepBtn.addEventListener('click', () => {
        const congratsModal = bootstrap.Modal.getInstance(document.getElementById('congratsModal'));
        congratsModal.hide();
        showLockedView();
    });
    
    document.body.addEventListener('click', (e) => {
        if (isTopicLocked && !e.target.closest('#idea-lab-container') && !e.target.closest('.modal')) {
            showLockedView();
        }
    }, true);
});