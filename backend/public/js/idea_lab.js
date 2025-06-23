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

    // Dev Button Selector
    const devSetTopicBtn = document.getElementById('dev-set-topic-btn');

    // === GLOBAL STATE for other scripts to access ===
    // We attach them to the window object to make them globally available.
    window.isTopicLocked = false;
    window.lockedTopicData = null;
    
    // Local state for this script
    let activeQuestion = null;
    let reportBeingViewed = null;
    let isGenerating = false;
    let isDiving = false;
    const reportCache = {};

    // --- DEV & TEST DATA LOADER ---
    const loadTestData = () => {
        console.log("--- DEV BUTTON: Setting test topic ---");
        // FIX: Added better user feedback for the button press
        devSetTopicBtn.disabled = true;
        devSetTopicBtn.innerHTML = `<i class="bi bi-check-lg me-1"></i> Topic Set!`;

        if (typeof testIdeaLabReport !== 'undefined') {
            window.lockedTopicData = testIdeaLabReport;
            window.isTopicLocked = true;
            reportCache[btoa(testIdeaLabReport.question)] = testIdeaLabReport;
            
            // Dispatch a custom event to notify other scripts (like literature_hub.js)
            // This is a much cleaner way to communicate between JS files.
            console.log("Dispatching topicUpdated event with data:", window.lockedTopicData);
            document.dispatchEvent(new CustomEvent('topicUpdated', { 
                detail: { 
                    isTopicLocked: window.isTopicLocked,
                    lockedTopicData: window.lockedTopicData 
                } 
            }));
            
            showLockedView();
        } else {
            const msg = "Test data 'testIdeaLabReport' not found. Make sure _test_data.js is loaded before idea_lab.js.";
            console.error(msg);
            alert(msg);
        }

        setTimeout(() => {
            devSetTopicBtn.disabled = false;
            devSetTopicBtn.innerHTML = `<i class="bi bi-robot me-1"></i> DEV: Set Test Topic`;
        }, 1500); // Re-enable after 1.5 seconds
    };
    
    // --- WORKFLOW & VIEW MANAGEMENT ---
    const showGeneratorView = () => { generatorView.classList.remove('d-none'); lockedView.classList.add('d-none'); reviewSection.classList.add('d-none'); };
    const showLockedView = () => { lockedView.classList.remove('d-none'); generatorView.classList.add('d-none'); reviewSection.classList.add('d-none'); if(window.lockedTopicData) lockedTopicQuestionEl.textContent = `"${window.lockedTopicData.question}"`; };
    const generateIdeaCardHTML = (idea) => { const questionId = btoa(idea.question); return `<div class="card idea-card mb-2" id="card-${questionId}" data-question-id="${questionId}" data-idea-text="${idea.question}" data-idea-desc="${idea.description}"><div class="card-body"><p class="mb-1 fw-bold">${idea.question}</p><small class="text-muted">${idea.description}</small></div></div>`; };
    const setButtonLoading = (btn, isLoading, text = 'Generating...') => { if(!btn) return; const btnTextEl = btn.querySelector('.btn-text'); const originalText = btn.dataset.originalText || (btnTextEl ? btnTextEl.textContent : ''); if (!btn.dataset.originalText) btn.dataset.originalText = originalText; if (isLoading) { btn.disabled = true; btn.classList.add('loading'); if (btnTextEl) btnTextEl.textContent = text; } else { btn.disabled = false; btn.classList.remove('loading'); if (btnTextEl) btnTextEl.textContent = btn.dataset.originalText; } };

    // --- API & DATA HANDLING ---
    const generateIdeas = async (isAppending = false) => { if (isGenerating) return; const keywords = ideaKeywordsInput.value.trim(); if (keywords === '') { return alert('Please enter keywords to generate ideas.'); } isGenerating = true; setButtonLoading(generateIdeasBtn, true); setButtonLoading(generateMoreBtn, true, 'More...'); if (!isAppending) { ideaCardsContainer.innerHTML = ''; reviewSection.classList.add('d-none'); } try { const response = await fetch('/api/generate-ideas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keywords, subject: subjectSelect.value, timeCommitment: timeCommitmentSelect.value, scope: researchScopeSelect.value, skills: skillsInput.value.trim(), outputFormat: outputFormatSelect.value, tone: toneSelect.value }), }); if (!response.ok) throw new Error((await response.json()).details || 'Request failed'); const data = await response.json(); let newHtml = data.ideas?.map(idea => generateIdeaCardHTML(idea)).join('') || ''; if (isAppending) { ideaCardsContainer.insertAdjacentHTML('beforeend', newHtml); } else { ideaCardsContainer.innerHTML = newHtml; } ideaActions.classList.remove('d-none'); } catch (error) { console.error('Error fetching ideas:', error); alert(`Error: ${error.message}`); } finally { isGenerating = false; setButtonLoading(generateIdeasBtn, false); setButtonLoading(generateMoreBtn, false); } };
    const performDeepDive = async (question) => { if (isDiving) return; isDiving = true; deepDiveBtn.disabled = true; deepDiveBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Diving...`; deepDiveReport.classList.add('d-none'); deepDiveLoader.classList.remove('d-none'); reviewSection.classList.remove('d-none'); reviewSection.scrollIntoView({ behavior: 'smooth', block: 'start' }); try { const response = await fetch('/api/deep-dive', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, timeCommitment: timeCommitmentSelect.value, skills: skillsInput.value.trim(), scope: researchScopeSelect.value }), }); if (!response.ok) throw new Error((await response.json()).details || 'Request failed'); const data = await response.json(); const cardEl = document.querySelector(`[data-idea-text="${question}"]`); reportCache[btoa(question)] = {  question: question, description: cardEl?.dataset.ideaDesc || 'N/A',  report: data  }; populateDeepDiveReport(question, data); deepDiveLoader.classList.add('d-none'); deepDiveReport.classList.remove('d-none'); } catch (error) { console.error('Error during deep dive:', error); deepDiveLoader.innerHTML = `<div class="alert alert-danger"><strong>Deep Dive Failed:</strong> ${error.message} <button class="btn btn-sm btn-outline-danger retry-btn ms-2">Retry</button></div>`; } finally { isDiving = false; updateDeepDiveButton(); } };
    
    const updateDeepDiveButton = () => {
        ideaActions.classList.remove('d-none'); // Ensure buttons are visible
        deepDiveBtn.disabled = activeQuestion === null || isDiving;
        if (!activeQuestion) { deepDiveBtn.innerHTML = `<i class="bi bi-search-heart me-2"></i> Deep Dive & Validate`; return; }
        const hasReport = !!reportCache[btoa(activeQuestion)];
        if (hasReport) { deepDiveBtn.innerHTML = `<i class="bi bi-file-text-fill me-2"></i> View Report`; }
        else { deepDiveBtn.innerHTML = `<i class="bi bi-search-heart me-2"></i> Deep Dive & Validate`; }
    };

    const populateDeepDiveReport = (question, data) => {
        reportBeingViewed = question;
        const { analysis } = data;
        const { synopsis, potentialAngles, viabilityScorecard, feasibility, academicBattleground, projectRoadmap, readingList } = analysis;
        deepDiveQuestionTitle.textContent = `"${question}"`;
        document.getElementById('overview-synopsis').textContent = synopsis || 'No synopsis provided.';
        document.getElementById('overview-insight').textContent = feasibility.researchGap || 'No research gap identified.';
        document.getElementById('potential-angles-container').innerHTML = `<div class="row g-3">${(potentialAngles || []).map(angle => `<div class="col-lg-6"><div class="card bg-body-tertiary h-100 border-0"><div class="card-body d-flex align-items-start"><i class="bi bi-compass fs-4 text-primary me-3"></i><div>${angle}</div></div></div></div>`).join('')}</div>`;
        const scorecardIcons = { novelty: 'bi-lightbulb', sourceAvailability: 'bi-stack', impactPotential: 'bi-graph-up-arrow', researchComplexity: 'bi-gear-wide-connected', discussionVolume: 'bi-megaphone' };
        document.getElementById('overview-scorecard').innerHTML = Object.entries(viabilityScorecard || {}).map(([key, val]) => { const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()); const score = val.score || 0; return `<div class="score-bar-item" data-bs-toggle="tooltip" title="${val.justification}"><div class="score-bar-header"><i class="bi ${scorecardIcons[key] || 'bi-question-circle'} score-bar-icon"></i><span class="score-bar-label">${label}</span><span class="score-bar-value">${score}/10</span></div><div class="score-bar-progress"><div class="score-bar-fill" style="width: ${ (score / 10) * 100 }%;"></div></div></div>`; }).join('');
        document.getElementById('battleground-consensus').innerHTML = `<div class="battleground-card h-100"><div class="card-body p-3"><h5 class="card-title gradient-text"><i class="bi bi-check-circle-fill me-2 consensus-icon"></i>Current Consensus</h5><p class="text-muted">${academicBattleground.currentConsensus || 'N/A'}</p></div></div>`;
        document.getElementById('battleground-contention').innerHTML = `<div class="battleground-card h-100"><div class="card-body p-3"><h5 class="card-title gradient-text"><i class="bi bi-lightning-fill me-2 contention-icon"></i>Points of Contention</h5><ul class="list-unstyled mb-0">${(academicBattleground.pointsOfContention || []).map(point => `<li><i class="bi bi-caret-right-fill text-danger me-2"></i>${point}</li>`).join('')}</ul></div></div>`;
        document.getElementById('battleground-contributors').innerHTML = `<h5 class="gradient-text fw-bold">Key Contributors</h5><div class="row g-3 mt-2">${(academicBattleground.keyContributors || []).map(c => `<div class="col-md-6"><div class="card bg-body-tertiary h-100 border-0"><div class="card-body"><h6 class="card-title">${c.name}</h6><p class="card-text small text-muted">${c.contribution}</p></div></div></div>`).join('')}</div>`;
        document.getElementById('feasibility-requirements').innerHTML = (feasibility.requirements || []).map(r => `<div class="card bg-body-secondary border-0 mb-2"><div class="card-body"><h6 class="card-title">${r.name}</h6><p class="card-text small text-muted">${r.details}</p></div></div>`).join('');
        document.getElementById('feasibility-methods').innerHTML = (feasibility.methodologies || []).slice(0, 5).map(m => `<div class="card bg-body-secondary border-0 mb-2"><div class="card-body"><h6 class="card-title">${m.name}</h6><p class="card-text small text-muted">${m.description}</p></div></div>`).join('');
        document.getElementById('feasibility-ethics').innerHTML = `<i class="bi bi-shield-exclamation me-2"></i> ${feasibility.ethicalConsiderations || 'No specific considerations noted.'}`;
        document.querySelector('.roadmap-container').innerHTML = (projectRoadmap || []).map((phase, index) => `<div class="roadmap-phase"><div class="roadmap-icon-wrapper"><i class="bi bi-${index + 1}-circle-fill"></i></div><div class="roadmap-content"><div class="card shadow-sm"><div class="card-body"><span class="badge bg-primary-subtle text-primary-emphasis mb-2">${phase.duration}</span><h5 class="card-title">${phase.phase}</h5><ul class="list-group list-group-flush">${(phase.tasks || []).map(task => `<li class="list-group-item bg-transparent"><i class="bi bi-check-lg me-2"></i>${task}</li>`).join('')}</ul></div></div></div></div>`).join('');
        
        // This is just a placeholder, the forensics tab is not populated by this function
        // but it's good practice to ensure it doesn't cause errors if forensics data is missing.
        const forensics = data.forensics || { webSearchQueries: [], groundingChunks: [] };
        document.getElementById('forensics-queries').innerHTML = forensics.webSearchQueries.map(q => `<span class="badge bg-dark-subtle text-light-emphasis border border-secondary me-2 mb-2 p-2">"${q}"</span>`).join('');
        
        // Tooltips need to be re-initialized every time new content with tooltips is added.
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
          return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    };

    // === EVENT LISTENERS ===
    if (devSetTopicBtn) devSetTopicBtn.addEventListener('click', loadTestData);
    generateIdeasBtn.addEventListener('click', () => generateIdeas(false));
    generateMoreBtn.addEventListener('click', () => generateIdeas(true));
    deepDiveBtn.addEventListener('click', () => { if (activeQuestion) { const questionId = btoa(activeQuestion); if (reportCache[questionId]) { populateDeepDiveReport(activeQuestion, reportCache[questionId].report); reviewSection.classList.remove('d-none'); reviewSection.scrollIntoView({ behavior: 'smooth' }); } else { performDeepDive(activeQuestion); } } });
    deepDiveLoader.addEventListener('click', e => { if (e.target.matches('.retry-btn')) { performDeepDive(activeQuestion); } });
    ideaCardsContainer.addEventListener('click', (e) => { const card = e.target.closest('.idea-card'); if (!card) return; activeQuestion = card.dataset.ideaText; ideaCardsContainer.querySelectorAll('.idea-card').forEach(c => c.classList.remove('active')); card.classList.add('active'); updateDeepDiveButton(); });
    
    finalConfirmBtn.addEventListener('click', () => { 
        if (!reportBeingViewed) return; 
        const topicData = reportCache[btoa(reportBeingViewed)]; 
        if (topicData) { 
            window.lockedTopicData = topicData; 
            window.isTopicLocked = true; 
            // Dispatch the event to notify other modules
            document.dispatchEvent(new CustomEvent('topicUpdated', { 
                detail: { 
                    isTopicLocked: window.isTopicLocked,
                    lockedTopicData: window.lockedTopicData 
                } 
            }));
        } 
        const confirmModal = bootstrap.Modal.getInstance(document.getElementById('confirmTopicModal')); 
        confirmModal.hide(); 
        
        // Show the success modal AFTER hiding the confirmation modal
        const congratsModalEl = document.getElementById('congratsModal');
        const congratsModal = bootstrap.Modal.getOrCreateInstance(congratsModalEl);
        congratsModal.show();
    });

    changeTopicBtn.addEventListener('click', () => { const changeModal = new bootstrap.Modal(document.getElementById('changeTopicConfirmModal')); changeModal.show(); });
    
    finalChangeTopicBtn.addEventListener('click', () => { 
        window.isTopicLocked = false; 
        window.lockedTopicData = null; // Clear the data
        const changeModal = bootstrap.Modal.getInstance(document.getElementById('changeTopicConfirmModal')); 
        changeModal.hide(); 
        showGeneratorView();
        // Notify other scripts that topic is now unlocked
        document.dispatchEvent(new CustomEvent('topicUpdated', { 
            detail: { 
                isTopicLocked: false,
                lockedTopicData: null 
            } 
        }));
    });

    viewLockedReportBtn.addEventListener('click', () => { if (window.lockedTopicData) { populateDeepDiveReport(window.lockedTopicData.question, window.lockedTopicData.report); reviewSection.classList.remove('d-none'); reviewSection.scrollIntoView({ behavior: 'smooth' }); } });
    
    // FIX: This button now correctly finds and clicks the Literature Hub nav link
    goToNextStepBtn.addEventListener('click', () => { 
        const congratsModal = bootstrap.Modal.getInstance(document.getElementById('congratsModal')); 
        congratsModal.hide(); 
        showLockedView();
        
        // Programmatically switch to the Literature Hub tab
        const literatureHubLink = document.getElementById('stepper-link-2');
        if (literatureHubLink) {
            literatureHubLink.click();
        } else {
            console.error("Could not find Literature Hub link to navigate.");
        }
    });

    // === GLOBAL EVENT LISTENER ===
    // This will listen for the 'topicUpdated' event from anywhere (e.g., the DEV button)
    // and update the UI accordingly.
    document.addEventListener('topicUpdated', (event) => {
        const { isTopicLocked, lockedTopicData } = event.detail;
        console.log("Idea Lab received topicUpdated event. Locked:", isTopicLocked);
        window.isTopicLocked = isTopicLocked;
        window.lockedTopicData = lockedTopicData;
        if (isTopicLocked) {
            showLockedView();
        } else {
            showGeneratorView();
        }
    });
});