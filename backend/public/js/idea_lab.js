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

    // === GLOBAL & LOCAL STATE ===
    window.isTopicLocked = false;
    window.lockedTopicData = null;
    let activeQuestion = null;
    let reportBeingViewed = null;
    let isGenerating = false;
    let isDiving = false;
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
            document.dispatchEvent(new CustomEvent('topicUpdated', { 
                detail: { isTopicLocked: window.isTopicLocked, lockedTopicData: window.lockedTopicData } 
            }));
            showLockedView();
        } else {
            alert("Test data 'testIdeaLabReport' not found.");
        }
        setTimeout(() => {
            devSetTopicBtn.disabled = false;
            devSetTopicBtn.innerHTML = `<i class="bi bi-robot me-1"></i> DEV: Set Test Topic`;
        }, 1500);
    };
    
    // --- UI & VIEW MANAGEMENT ---
    const showGeneratorView = () => { generatorView.classList.remove('d-none'); lockedView.classList.add('d-none'); reviewSection.classList.add('d-none'); };
    const showLockedView = () => { lockedView.classList.remove('d-none'); generatorView.classList.add('d-none'); reviewSection.classList.add('d-none'); if(window.lockedTopicData) lockedTopicQuestionEl.textContent = `"${window.lockedTopicData.question}"`; };
    const generateIdeaCardHTML = (idea) => { const questionId = btoa(idea.question); return `<div class="card idea-card mb-2" id="card-${questionId}" data-question-id="${questionId}" data-idea-text="${idea.question}" data-idea-desc="${idea.description}"><div class="card-body"><p class="mb-1 fw-bold">${idea.question}</p><small class="text-muted">${idea.description}</small></div></div>`; };
    const setButtonLoading = (btn, isLoading, loadingText = 'Generating...') => {
        if (!btn) return;
        const btnTextEl = btn.querySelector('.btn-text');
        if (!btn.dataset.originalText && btnTextEl) {
            btn.dataset.originalText = btnTextEl.textContent;
        }
        btn.disabled = isLoading;
        if (isLoading) {
            btn.classList.add('loading');
            if(btnTextEl) btnTextEl.textContent = loadingText;
        } else {
            btn.classList.remove('loading');
            if(btnTextEl) btnTextEl.textContent = btn.dataset.originalText;
        }
    };

    // --- API & DATA HANDLING ---
    const generateIdeas = async (isAppending = false) => {
        if (isGenerating) return;
        const keywords = ideaKeywordsInput.value.trim();
        if (keywords === '') return alert('Please enter keywords to generate ideas.');
        isGenerating = true;
        setButtonLoading(generateIdeasBtn, true);
        setButtonLoading(generateMoreBtn, true, 'More...');
        if (!isAppending) {
            ideaCardsContainer.innerHTML = '';
            reviewSection.classList.add('d-none');
        }
        try {
            const response = await fetch('/api/generate-ideas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keywords, subject: subjectSelect.value, timeCommitment: timeCommitmentSelect.value, scope: researchScopeSelect.value, skills: skillsInput.value.trim(), outputFormat: outputFormatSelect.value, tone: toneSelect.value }) });
            if (!response.ok) throw new Error((await response.json()).details || 'Request failed');
            const data = await response.json();
            ideaCardsContainer.insertAdjacentHTML('beforeend', data.ideas?.map(generateIdeaCardHTML).join('') || '');
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
        reviewSection.style.minHeight = '400px'; // FIX: Prevent layout jump
        reviewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        try {
            const response = await fetch('/api/deep-dive', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question }) });
            if (!response.ok) throw new Error((await response.json()).details || 'Deep dive request failed');
            const data = await response.json();
            const questionId = btoa(question);
            const cardEl = document.getElementById(`card-${questionId}`);
            reportCache[questionId] = { question, description: cardEl?.dataset.ideaDesc || 'N/A', report: data };
            if (cardEl) {
                const existingAction = cardEl.querySelector('.idea-card-actions');
                if (existingAction) existingAction.remove();
                const actionDiv = document.createElement('div');
                actionDiv.className = 'text-end idea-card-actions mt-2 pt-2 border-top';
                actionDiv.innerHTML = `<button class="btn btn-sm btn-primary view-report-from-card-btn">View Report</button>`;
                cardEl.querySelector('.card-body').appendChild(actionDiv);
            }
            populateDeepDiveReport(question, data);
            deepDiveLoader.classList.add('d-none');
            deepDiveReport.classList.remove('d-none');
        } catch (error) {
            console.error('Error during deep dive:', error);
            deepDiveLoader.innerHTML = `<div class="alert alert-danger"><strong>Deep Dive Failed:</strong> ${error.message} <button class="btn btn-sm btn-outline-danger retry-btn ms-2">Retry</button></div>`;
        } finally {
            isDiving = false;
            updateDeepDiveButton();
            reviewSection.style.minHeight = ''; // Reset height after loading
        }
    };
    
    const updateDeepDiveButton = () => {
        ideaActions.classList.remove('d-none');
        deepDiveBtn.disabled = activeQuestion === null || isDiving;
        if (!activeQuestion) {
            deepDiveBtn.innerHTML = `<i class="bi bi-search-heart me-2"></i> Deep Dive & Validate`;
            return;
        }
        const hasReport = !!reportCache[btoa(activeQuestion)];
        deepDiveBtn.innerHTML = hasReport ? `<i class="bi bi-file-text-fill me-2"></i> View Report` : `<i class="bi bi-search-heart me-2"></i> Deep Dive & Validate`;
    };

    // FIX: This function is now fully robust against missing/undefined data from the API.
    const populateDeepDiveReport = (question, data) => {
        reportBeingViewed = question;
        const analysis = data.analysis || {};
        const forensics = data.forensics || {};
        const scorecardIcons = { novelty: 'bi-lightbulb', sourceAvailability: 'bi-stack', impactPotential: 'bi-graph-up-arrow', researchComplexity: 'bi-gear-wide-connected', discussionVolume: 'bi-megaphone' };
        
        deepDiveQuestionTitle.textContent = `"${question}"`;
        document.getElementById('overview-synopsis').textContent = analysis.synopsis || 'No synopsis provided.';
        document.getElementById('overview-insight').textContent = analysis.feasibility?.researchGap || 'No research gap identified.';
        document.getElementById('potential-angles-container').innerHTML = `<div class="row g-3">${(analysis.potentialAngles || []).map(angle => `<div class="col-lg-6"><div class="card bg-body-tertiary h-100 border-0"><div class="card-body d-flex align-items-start"><i class="bi bi-compass fs-4 text-primary me-3"></i><div>${angle}</div></div></div></div>`).join('') || '<p class="text-muted">No potential angles were generated.</p>'}</div>`;
        
        document.getElementById('overview-scorecard').innerHTML = Object.entries(analysis.viabilityScorecard || {}).map(([key, val]) => {
            const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            return `<div class="score-bar-item" data-bs-toggle="tooltip" title="${val?.justification || ''}"><div class="score-bar-header"><i class="bi ${scorecardIcons[key] || 'bi-question-circle'} score-bar-icon"></i><span class="score-bar-label">${label}</span><span class="score-bar-value">${val?.score || 0}/10</span></div><div class="score-bar-progress"><div class="score-bar-fill" style="width: ${(val?.score || 0) * 10}%;"></div></div></div>`;
        }).join('');
        
        document.getElementById('battleground-consensus').innerHTML = `<div class="battleground-card h-100"><div class="card-body p-3"><h5 class="card-title gradient-text"><i class="bi bi-check-circle-fill me-2 consensus-icon"></i>Current Consensus</h5><p class="text-muted">${analysis.academicBattleground?.currentConsensus || 'N/A'}</p></div></div>`;
        document.getElementById('battleground-contention').innerHTML = `<div class="battleground-card h-100"><div class="card-body p-3"><h5 class="card-title gradient-text"><i class="bi bi-lightning-fill me-2 contention-icon"></i>Points of Contention</h5><ul class="list-unstyled mb-0">${(analysis.academicBattleground?.pointsOfContention || []).map(point => `<li><i class="bi bi-caret-right-fill text-danger me-2"></i>${point}</li>`).join('') || '<p class="text-muted">No points of contention identified.</p>'}</ul></div></div>`;
        document.getElementById('battleground-contributors').innerHTML = `<h5 class="gradient-text fw-bold">Key Contributors</h5><div class="row g-3 mt-2">${(analysis.academicBattleground?.keyContributors || []).map(c => `<div class="col-md-6"><div class="card bg-body-tertiary h-100 border-0"><div class="card-body"><h6 class="card-title">${c.name}</h6><p class="card-text small text-muted">${c.contribution}</p></div></div></div>`).join('') || '<p class="text-muted">No key contributors listed.</p>'}</div>`;
        
        document.getElementById('feasibility-requirements').innerHTML = (analysis.feasibility?.requirements || []).map(r => `<div class="card bg-body-secondary border-0 mb-2"><div class="card-body"><h6 class="card-title">${r.name}</h6><p class="card-text small text-muted">${r.details}</p></div></div>`).join('') || '<p class="text-muted">No specific requirements identified.</p>';
        document.getElementById('feasibility-methods').innerHTML = (analysis.feasibility?.methodologies || []).slice(0, 5).map(m => `<div class="card bg-body-secondary border-0 mb-2"><div class="card-body"><h6 class="card-title">${m.name}</h6><p class="card-text small text-muted">${m.description}</p></div></div>`).join('') || '<p class="text-muted">No specific methodologies suggested.</p>';
        document.getElementById('feasibility-ethics').innerHTML = `<i class="bi bi-shield-exclamation me-2"></i> ${analysis.feasibility?.ethicalConsiderations || 'No specific considerations noted.'}`;
        
        document.querySelector('.roadmap-container').innerHTML = (analysis.projectRoadmap || []).map((phase, index) => `<div class="roadmap-phase"><div class="roadmap-icon-wrapper"><i class="bi bi-${index + 1}-circle-fill"></i></div><div class="roadmap-content"><div class="card shadow-sm"><div class="card-body"><span class="badge bg-primary-subtle text-primary-emphasis mb-2">${phase.duration}</span><h5 class="card-title">${phase.phase}</h5><ul class="list-group list-group-flush">${(phase.tasks || []).map(task => `<li class="list-group-item bg-transparent"><i class="bi bi-check-lg me-2"></i>${task}</li>`).join('')}</ul></div></div></div></div>`).join('') || '<p class="text-muted">No project roadmap was generated.</p>';
        
        const readingListContainer = document.getElementById('reading-list-container');
        if (analysis.readingList && analysis.readingList.length > 0) { readingListContainer.innerHTML = analysis.readingList.map(item => `<div class="card reading-list-item mb-3 shadow-sm"><div class="card-body"><h5 class="card-title mb-1"><a href="${item.url}" target="_blank" rel="noopener noreferrer">${item.title}</a></h5><p class="card-text small text-muted mb-2">${item.aiSummary}</p><a href="${item.url}" target="_blank" rel="noopener noreferrer" class="d-block small text-truncate text-info">${item.url}</a></div></div>`).join(''); } else { readingListContainer.innerHTML = '<div class="alert alert-secondary text-center"><i class="bi bi-search me-2"></i>The AI did not cite specific web sources for this report.</div>'; }
        
        document.getElementById('forensics-queries').innerHTML = (forensics.webSearchQueries || []).map(q => `<span class="badge bg-dark-subtle text-light-emphasis border border-secondary me-2 mb-2 p-2">"${q}"</span>`).join('') || '<p class="text-muted">No search queries were recorded.</p>';
        const forensicsSourcesContainer = document.getElementById('forensics-sources');
        if (forensics.groundingChunks && forensics.groundingChunks.length > 0) { forensicsSourcesContainer.innerHTML = forensics.groundingChunks.map(chunk => `<li class="list-group-item bg-transparent text-body border-secondary"><a href="${chunk.web.uri}" target="_blank" rel="noopener noreferrer" class="fw-bold">${chunk.web.title || 'Untitled Source'}</a><div class="small text-truncate text-muted">${chunk.web.uri}</div></li>`).join(''); } else { forensicsSourcesContainer.innerHTML = '<li class="list-group-item bg-transparent text-body border-secondary text-muted text-center">No raw grounding sources were returned by the API.</li>'; }
        
        new bootstrap.Tooltip(document.body, { selector: "[data-bs-toggle='tooltip']", trigger: 'hover', container: 'body' });
    };

    // --- EVENT LISTENERS ---
    if (devSetTopicBtn) devSetTopicBtn.addEventListener('click', loadTestData);
    if (generateIdeasBtn) generateIdeasBtn.addEventListener('click', () => generateIdeas(false));
    if (generateMoreBtn) generateMoreBtn.addEventListener('click', () => generateIdeas(true));
    if (deepDiveBtn) deepDiveBtn.addEventListener('click', () => { if (activeQuestion) { const questionId = btoa(activeQuestion); if (reportCache[questionId]) { populateDeepDiveReport(activeQuestion, reportCache[questionId].report); reviewSection.classList.remove('d-none'); reviewSection.scrollIntoView({ behavior: 'smooth' }); } else { performDeepDive(activeQuestion); } } });
    if (deepDiveLoader) deepDiveLoader.addEventListener('click', e => { if (e.target.matches('.retry-btn')) { performDeepDive(activeQuestion); } });

    ideaCardsContainer.addEventListener('click', (e) => {
        const viewReportBtn = e.target.closest('.view-report-from-card-btn');
        const card = e.target.closest('.idea-card');
        if (viewReportBtn) {
            e.stopPropagation();
            const questionId = card.dataset.questionId;
            const reportData = reportCache[questionId];
            if (reportData) {
                populateDeepDiveReport(reportData.question, reportData.report);
                reviewSection.classList.remove('d-none');
                reviewSection.scrollIntoView({ behavior: 'smooth' });
            }
        } else if (card) {
            activeQuestion = card.dataset.ideaText;
            ideaCardsContainer.querySelectorAll('.idea-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            updateDeepDiveButton();
        }
    });
    
    if (finalConfirmBtn) finalConfirmBtn.addEventListener('click', () => { 
        if (!reportBeingViewed) return; 
        const topicData = reportCache[btoa(reportBeingViewed)]; 
        if (topicData) { 
            window.lockedTopicData = topicData; 
            window.isTopicLocked = true; 
            document.dispatchEvent(new CustomEvent('topicUpdated', { detail: { isTopicLocked: window.isTopicLocked, lockedTopicData: window.lockedTopicData } }));
        } 
        const confirmModal = bootstrap.Modal.getInstance(document.getElementById('confirmTopicModal')); 
        if(confirmModal) confirmModal.hide(); 
        const congratsModal = new bootstrap.Modal(document.getElementById('congratsModal'));
        congratsModal.show();
    });

    if (changeTopicBtn) changeTopicBtn.addEventListener('click', () => { const changeModal = new bootstrap.Modal(document.getElementById('changeTopicConfirmModal')); changeModal.show(); });
    
    if (finalChangeTopicBtn) finalChangeTopicBtn.addEventListener('click', () => { 
        window.isTopicLocked = false; 
        window.lockedTopicData = null;
        const changeModal = bootstrap.Modal.getInstance(document.getElementById('changeTopicConfirmModal')); 
        if(changeModal) changeModal.hide(); 
        showGeneratorView();
        document.dispatchEvent(new CustomEvent('topicUpdated', { detail: { isTopicLocked: false, lockedTopicData: null } }));
    });

    if (viewLockedReportBtn) viewLockedReportBtn.addEventListener('click', () => { if (window.lockedTopicData) { populateDeepDiveReport(window.lockedTopicData.question, window.lockedTopicData.report); reviewSection.classList.remove('d-none'); reviewSection.scrollIntoView({ behavior: 'smooth' }); } });
    
    if (goToNextStepBtn) goToNextStepBtn.addEventListener('click', () => { 
        const congratsModal = bootstrap.Modal.getInstance(document.getElementById('congratsModal')); 
        if(congratsModal) congratsModal.hide(); 
        showLockedView();
        const literatureHubLink = document.getElementById('stepper-link-2');
        if (literatureHubLink) literatureHubLink.click();
    });

    document.addEventListener('topicUpdated', (event) => {
        const { isTopicLocked, lockedTopicData } = event.detail;
        window.isTopicLocked = isTopicLocked;
        window.lockedTopicData = lockedTopicData;
        if (isTopicLocked) {
            showLockedView();
        } else {
            showGeneratorView();
        }
    });
});