document.addEventListener('DOMContentLoaded', () => {
    // Selectors for Idea Lab components
    const ideaLabContainer = document.getElementById('idea-lab-container');
    if (!ideaLabContainer) return; // Exit if not on the right page

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
    const subjectSelect = document.getElementById('subject-select');
    const timeCommitmentSelect = document.getElementById('time-commitment-select');
    const researchScopeSelect = document.getElementById('research-scope-select');
    const skillsInput = document.getElementById('skills-input');
    const outputFormatSelect = document.getElementById('output-format-select');
    const toneSelect = document.getElementById('tone-select');
    const devSetTopicBtn = document.getElementById('dev-set-topic-btn');

    // === GLOBAL STATE ===
    window.isTopicLocked = false;
    window.lockedTopicData = null;

    // === LOCAL STATE ===
    let activeQuestion = null;
    let reportBeingViewed = null;
    let isGenerating = false;
    let isDiving = false;
    let previouslyLockedTopic = null; // Holds the data for the unlocked topic
    const reportCache = {};

    // --- DEV & TEST DATA LOADER ---
    const loadTestData = () => {
        console.log("--- DEV BUTTON: Setting test topic ---");
        devSetTopicBtn.disabled = true;
        devSetTopicBtn.innerHTML = `<i class="bi bi-check-lg me-1"></i> Topic Set!`;
        if (typeof testIdeaLabReport !== 'undefined') {
            window.lockedTopicData = testIdeaLabReport;
            window.isTopicLocked = true;
            reportCache[btoa(testIdeaLabReport.question)] = testIdeaLabReport;
            
            console.log("Dispatching topicUpdated event with data:", window.lockedTopicData);
            document.dispatchEvent(new CustomEvent('topicUpdated', {
                detail: { isTopicLocked: true, lockedTopicData: window.lockedTopicData }
            }));
            showLockedView();
        } else {
            const msg = "Test data 'testIdeaLabReport' not found. Make sure _test_data.js is loaded.";
            console.error(msg);
            alert(msg);
        }
        setTimeout(() => {
            devSetTopicBtn.disabled = false;
            devSetTopicBtn.innerHTML = `<i class="bi bi-robot me-1"></i> DEV: Set Test Topic`;
        }, 1500);
        
    };

    // --- WORKFLOW & VIEW MANAGEMENT ---
    const showGeneratorView = () => { generatorView.classList.remove('d-none'); lockedView.classList.add('d-none'); reviewSection.classList.add('d-none'); };
    const showLockedView = () => { lockedView.classList.remove('d-none'); generatorView.classList.add('d-none'); reviewSection.classList.add('d-none'); if(window.lockedTopicData) lockedTopicQuestionEl.textContent = `"${window.lockedTopicData.question}"`; };
    const generateIdeaCardHTML = (idea) => { const ideaId = btoa(idea.title); return `<div class="card idea-card mb-2" id="card-${ideaId}" data-idea-id="${ideaId}" data-idea-title="${idea.title}" data-idea-desc="${idea.description}"><div class="card-body"><div><p class="mb-1 fw-bold">${idea.title}</p><small class="text-muted">${idea.description}</small></div><div class="idea-card-actions"></div></div></div>`; };
    const setButtonLoading = (btn, isLoading, text = 'Generating...') => { if (!btn) return; const btnTextEl = btn.querySelector('.btn-text'); if (!btnTextEl) return; const originalText = btn.dataset.originalText || btnTextEl.innerHTML; if (!btn.dataset.originalText) { btn.dataset.originalText = originalText; } if (isLoading) { btn.disabled = true; btn.classList.add('loading'); btnTextEl.innerHTML = text; } else { btn.disabled = false; btn.classList.remove('loading'); btnTextEl.innerHTML = originalText; } };

    // --- API & DATA HANDLING ---
    const generateIdeas = async (isAppending = false) => {
        if (isGenerating) return;
        const keywords = ideaKeywordsInput.value.trim();
        if (keywords === '') return alert('Please enter keywords.');
        
        isGenerating = true;
        setButtonLoading(generateIdeasBtn, true);
        setButtonLoading(generateMoreBtn, true, 'More...');
        
        if (!isAppending) {
            // We still want to hide the previous topic container if the user
            // decides to generate new ideas from a blank slate,
            // but we DO NOT clear the previouslyLockedTopic variable itself.
            // It will be cleared naturally if the user re-locks a topic.
            const prevTopicContainer = document.getElementById('previous-topic-container');
            if (prevTopicContainer) {
                prevTopicContainer.classList.add('d-none');
            }
            
            // The problematic line `previouslyLockedTopic = null;` is REMOVED.
            
            ideaCardsContainer.innerHTML = '';
            reviewSection.classList.add('d-none');
        }

        try {
            const response = await fetch('/api/generate-ideas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keywords, subject: subjectSelect.value, timeCommitment: timeCommitmentSelect.value, scope: researchScopeSelect.value, skills: skillsInput.value.trim(), outputFormat: outputFormatSelect.value, tone: toneSelect.value }), });
            if (!response.ok) throw new Error((await response.json()).details || 'Request failed');
            const data = await response.json();
            let newHtml = data.ideas?.map(idea => generateIdeaCardHTML(idea)).join('') || '';
            if (isAppending) ideaCardsContainer.insertAdjacentHTML('beforeend', newHtml);
            else ideaCardsContainer.innerHTML = newHtml;
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

    const updateIdeaCardWithReportButton = (title) => {
        const cardId = btoa(title);
        const card = document.getElementById(`card-${cardId}`);
        if (!card) return;
        const actionsContainer = card.querySelector('.idea-card-actions');
        if (actionsContainer) actionsContainer.innerHTML = `<button class="btn btn-sm btn-primary view-card-report-btn">View Report</button>`;
    };
    
    const performDeepDive = async (title) => {
        if (isDiving) return;
        isDiving = true;
        setButtonLoading(deepDiveBtn, true, 'Diving...');
        deepDiveReport.classList.add('d-none');
        deepDiveLoader.classList.remove('d-none');
        reviewSection.classList.remove('d-none');
        reviewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        try {
            const response = await fetch('/api/deep-dive', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: title, timeCommitment: timeCommitmentSelect.value, skills: skillsInput.value.trim(), scope: researchScopeSelect.value }), });
            if (!response.ok) { const errData = await response.json().catch(() => ({})); throw new Error(errData.details || errData.error || 'The server returned an error.'); }
            const data = await response.json();
            const cardEl = document.querySelector(`[data-idea-title="${title}"]`);
            reportCache[btoa(title)] = { question: title, description: cardEl?.dataset.ideaDesc || 'N/A', report: data };
            populateDeepDiveReport(title, data);
            updateIdeaCardWithReportButton(title);
            deepDiveLoader.classList.add('d-none');
            deepDiveReport.classList.remove('d-none');
        } catch (error) {
            console.error('Error during deep dive:', error);
            deepDiveLoader.innerHTML = `<div class="text-center p-5"><div class="alert alert-danger"><strong>Deep Dive Failed:</strong> ${error.message} <button class="btn btn-sm btn-outline-danger retry-btn ms-2">Retry</button></div></div>`;
        } finally {
            isDiving = false;
            updateDeepDiveButton();
        }
    };

    const updateDeepDiveButton = () => {
        ideaActions.classList.remove('d-none');
        if (isDiving) { setButtonLoading(deepDiveBtn, true, 'Diving...'); deepDiveBtn.disabled = true; return; }
        setButtonLoading(deepDiveBtn, false);
        deepDiveBtn.disabled = activeQuestion === null;
        const btnTextEl = deepDiveBtn.querySelector('.btn-text');
        if (!btnTextEl) return;
        if (!activeQuestion) {
            btnTextEl.innerHTML = `<i class="bi bi-search-heart me-2"></i> Deep Dive & Validate`;
        } else {
            const hasReport = !!reportCache[btoa(activeQuestion)];
            if (hasReport) btnTextEl.innerHTML = `<i class="bi bi-file-text-fill me-2"></i> View Report`;
            else btnTextEl.innerHTML = `<i class="bi bi-search-heart me-2"></i> Deep Dive & Validate`;
        }
        deepDiveBtn.dataset.originalText = btnTextEl.innerHTML;
    };

    const populateDeepDiveReport = (question, data) => {
        // This function populates the report UI. It's long but mostly straightforward data mapping.
        reportBeingViewed = question;
        const analysis = data.analysis || {};
        const { synopsis, potentialAngles, viabilityScorecard, feasibility, academicBattleground, projectRoadmap } = analysis;
        deepDiveQuestionTitle.textContent = `"${question}"`;
        document.getElementById('overview-synopsis').textContent = synopsis || 'No synopsis provided.';
        document.getElementById('overview-insight').textContent = feasibility?.researchGap || 'No research gap identified.';
        document.getElementById('potential-angles-container').innerHTML = `<div class="row g-3">${(potentialAngles || []).map(angle => `<div class="col-lg-6"><div class="card bg-body-tertiary h-100 border-0"><div class="card-body d-flex align-items-start"><i class="bi bi-compass fs-4 text-primary me-3"></i><div>${angle}</div></div></div></div>`).join('')}</div>`;
        const scorecardIcons = { novelty: 'bi-lightbulb', sourceAvailability: 'bi-stack', impactPotential: 'bi-graph-up-arrow', researchComplexity: 'bi-gear-wide-connected', discussionVolume: 'bi-megaphone' };
        document.getElementById('overview-scorecard').innerHTML = Object.entries(viabilityScorecard || {}).map(([key, val]) => { const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()); const score = val?.score || 0; const justification = val?.justification || 'No justification provided.'; return `<div class="score-bar-item" data-bs-toggle="tooltip" title="${justification}"><div class="score-bar-header"><i class="bi ${scorecardIcons[key] || 'bi-question-circle'} score-bar-icon"></i><span class="score-bar-label">${label}</span><span class="score-bar-value">${score}/10</span></div><div class="score-bar-progress"><div class="score-bar-fill" style="width: ${score * 10}%;"></div></div></div>`; }).join('');
        document.getElementById('battleground-consensus').innerHTML = `<div class="battleground-card h-100"><div class="card-body p-3"><h5 class="card-title gradient-text"><i class="bi bi-check-circle-fill me-2 consensus-icon"></i>Current Consensus</h5><p class="text-muted">${academicBattleground?.currentConsensus || 'N/A'}</p></div></div>`;
        document.getElementById('battleground-contention').innerHTML = `<div class="battleground-card h-100"><div class="card-body p-3"><h5 class="card-title gradient-text"><i class="bi bi-lightning-fill me-2 contention-icon"></i>Points of Contention</h5><ul class="list-unstyled mb-0">${(academicBattleground?.pointsOfContention || []).map(point => `<li><i class="bi bi-caret-right-fill text-danger me-2"></i>${point}</li>`).join('')}</ul></div></div>`;
        document.getElementById('battleground-contributors').innerHTML = `<h5 class="gradient-text fw-bold">Key Contributors</h5><div class="row g-3 mt-2">${(academicBattleground?.keyContributors || []).map(c => `<div class="col-md-6"><div class="card bg-body-tertiary h-100 border-0"><div class="card-body"><h6 class="card-title">${c.name}</h6><p class="card-text small text-muted">${c.contribution}</p></div></div></div>`).join('')}</div>`;
        document.getElementById('feasibility-requirements').innerHTML = (feasibility?.requirements || []).map(r => `<div class="card bg-body-secondary border-0 mb-2"><div class="card-body"><h6 class="card-title">${r.name}</h6><p class="card-text small text-muted">${r.details}</p></div></div>`).join('');
        document.getElementById('feasibility-methods').innerHTML = (feasibility?.methodologies || []).slice(0, 5).map(m => `<div class="card bg-body-secondary border-0 mb-2"><div class="card-body"><h6 class="card-title">${m.name}</h6><p class="card-text small text-muted">${m.description}</p></div></div>`).join('');
        document.getElementById('feasibility-ethics').innerHTML = `<i class="bi bi-shield-exclamation me-2"></i> ${feasibility?.ethicalConsiderations || 'No specific considerations noted.'}`;
        document.querySelector('.roadmap-container').innerHTML = (projectRoadmap || []).map((phase, index) => `<div class="roadmap-phase"><div class="roadmap-icon-wrapper"><i class="bi bi-${index + 1}-circle-fill"></i></div><div class="roadmap-content"><div class="card shadow-sm"><div class="card-body"><span class="badge bg-primary-subtle text-primary-emphasis mb-2">${phase.duration}</span><h5 class="card-title">${phase.phase}</h5><ul class="list-group list-group-flush">${(phase.tasks || []).map(task => `<li class="list-group-item bg-transparent"><i class="bi bi-check-lg me-2"></i>${task}</li>`).join('')}</ul></div></div></div></div>`).join('');
        const readingListContainer = document.getElementById('reading-list-container'); if (readingListContainer) { const readingList = analysis.readingList || []; if (readingList.length > 0) { readingListContainer.innerHTML = readingList.map(item => `<a href="${item.url}" target="_blank" rel="noopener noreferrer" class="report-list-item text-decoration-none d-block"><span class="report-list-item-title">${item.title}</span><span class="report-list-item-source">${item.sourceName || 'Source'}</span><p class="card-text small text-muted mb-0 mt-2">${item.aiSummary}</p></a>`).join(''); } else { readingListContainer.innerHTML = '<p class="text-muted">No reading list was generated.</p>'; } }
        const forensicsSourcesContainer = document.getElementById('forensics-sources'); if (forensicsSourcesContainer) { const groundingChunks = data.forensics?.groundingChunks || []; if (groundingChunks.length > 0) { const uniqueUrls = new Map(); groundingChunks.forEach(chunk => { if (chunk.web && chunk.web.uri) uniqueUrls.set(chunk.web.uri, chunk.web.title || 'Untitled'); }); forensicsSourcesContainer.innerHTML = Array.from(uniqueUrls.entries()).map(([url, title]) => `<div class="report-list-item"><p class="fw-bold mb-1">${title}</p><a href="${url}" target="_blank" rel="noopener noreferrer" class="report-list-item-url">${url}</a></div>`).join(''); } else { forensicsSourcesContainer.innerHTML = '<div class="report-list-item text-muted">The AI did not cite specific web sources.</div>'; } }
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]')); tooltipTriggerList.map(function (tooltipTriggerEl) { return new bootstrap.Tooltip(tooltipTriggerEl); });
    };

    const displayPreviousTopicCard = () => {
        const container = document.getElementById('previous-topic-container');
        const cardWrapper = document.getElementById('previous-topic-card-wrapper');
        if (!container || !cardWrapper || !previouslyLockedTopic) return;
        const ideaId = btoa(previouslyLockedTopic.question);
        cardWrapper.innerHTML = `<div class="card idea-card mb-2 bg-body-secondary border-secondary" id="card-${ideaId}" data-idea-id="${ideaId}" data-idea-title="${previouslyLockedTopic.question}" data-idea-desc="${previouslyLockedTopic.description}"><div class="card-body"><div><p class="mb-1 fw-bold">${previouslyLockedTopic.question}</p><small class="text-muted">${previouslyLockedTopic.description}</small></div><div class="idea-card-actions"><button class="btn btn-sm btn-outline-primary reselect-topic-btn">Reselect</button></div></div></div>`;
        container.classList.remove('d-none');
        const reselectBtn = cardWrapper.querySelector('.reselect-topic-btn');
        if(reselectBtn) {
            reselectBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                window.lockedTopicData = previouslyLockedTopic;
                window.isTopicLocked = true;
                previouslyLockedTopic = null;
                container.classList.add('d-none');
                document.dispatchEvent(new CustomEvent('topicUpdated', { detail: { isTopicLocked: true, lockedTopicData: window.lockedTopicData } }));
            });
        }
    };

    // --- EVENT LISTENERS ---
    if (devSetTopicBtn) devSetTopicBtn.addEventListener('click', loadTestData);
    generateIdeasBtn.addEventListener('click', () => generateIdeas(false));
    generateMoreBtn.addEventListener('click', () => generateIdeas(true));
    deepDiveBtn.addEventListener('click', () => { if (activeQuestion) { const questionId = btoa(activeQuestion); if (reportCache[questionId]) { populateDeepDiveReport(activeQuestion, reportCache[questionId].report); reviewSection.classList.remove('d-none'); reviewSection.scrollIntoView({ behavior: 'smooth' }); } else { performDeepDive(activeQuestion); } } });
    deepDiveLoader.addEventListener('click', e => { if (e.target.matches('.retry-btn')) performDeepDive(activeQuestion); });

    ideaCardsContainer.addEventListener('click', (e) => {
        const card = e.target.closest('.idea-card');
        if (!card) return;
        const reportBtn = e.target.closest('.view-card-report-btn');
        const title = card.dataset.ideaTitle;
        if (reportBtn) {
            e.stopPropagation();
            const reportData = reportCache[btoa(title)];
            if (reportData) { populateDeepDiveReport(title, reportData.report); reviewSection.classList.remove('d-none'); reviewSection.scrollIntoView({ behavior: 'smooth' }); }
        } else {
            activeQuestion = title;
            ideaCardsContainer.querySelectorAll('.idea-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            updateDeepDiveButton();
        }
    });
    
    finalConfirmBtn.addEventListener('click', () => {
        if (!reportBeingViewed) return;
        const topicData = reportCache[btoa(reportBeingViewed)];
        if (topicData) { window.lockedTopicData = topicData; window.isTopicLocked = true; document.dispatchEvent(new CustomEvent('topicUpdated', { detail: { isTopicLocked: true, lockedTopicData: window.lockedTopicData } })); }
        const confirmModal = bootstrap.Modal.getInstance(document.getElementById('confirmTopicModal'));
        if(confirmModal) confirmModal.hide();
        const congratsModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('congratsModal'));
        congratsModal.show();
    });

    changeTopicBtn.addEventListener('click', () => { new bootstrap.Modal(document.getElementById('changeTopicConfirmModal')).show(); });

    finalChangeTopicBtn.addEventListener('click', () => {
        if (window.lockedTopicData) previouslyLockedTopic = window.lockedTopicData;
        window.isTopicLocked = false;
        window.lockedTopicData = null;
        const changeModal = bootstrap.Modal.getInstance(document.getElementById('changeTopicConfirmModal'));
        if(changeModal) changeModal.hide();
        
        // **THIS IS THE CRITICAL FIX**
        // Clear out old results and show the generator view with the previous topic.
        ideaCardsContainer.innerHTML = '';
        ideaActions.classList.add('d-none');
        showGeneratorView();
        displayPreviousTopicCard();
        
        document.dispatchEvent(new CustomEvent('topicUpdated', { detail: { isTopicLocked: false, lockedTopicData: null } }));
    });

    // **THIS IS THE OTHER CRITICAL FIX**
    goToNextStepBtn.addEventListener('click', () => {
        const congratsModal = bootstrap.Modal.getInstance(document.getElementById('congratsModal'));
        if (congratsModal) congratsModal.hide();
        // DO NOT call showLockedView(). The user stays on the report they just generated.
        // The view will update naturally when they navigate back to the Idea Lab tab.
        const literatureHubLink = document.getElementById('stepper-link-2');
        if (literatureHubLink) literatureHubLink.click();
        else console.error("Could not find Literature Hub link to navigate.");
    });

    viewLockedReportBtn.addEventListener('click', () => { if (window.lockedTopicData) { populateDeepDiveReport(window.lockedTopicData.question, window.lockedTopicData.report); reviewSection.classList.remove('d-none'); reviewSection.scrollIntoView({ behavior: 'smooth' }); } });


});