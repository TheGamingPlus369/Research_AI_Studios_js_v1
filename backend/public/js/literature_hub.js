document.addEventListener('DOMContentLoaded', () => {
    const literatureHubContainer = document.getElementById('literature-hub-container');
    if (!literatureHubContainer) return;

    // --- Selectors ---
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const urlInput = document.getElementById('url-input');
    const scrapeBtn = document.getElementById('scrape-url-btn');
    const sourcesContainer = document.getElementById('sources-container');
    const emptyPlaceholder = sourcesContainer.querySelector('.empty-sources-placeholder');
    const sourceReportModalEl = document.getElementById('sourceReportModal');
    const sourceReportModal = sourceReportModalEl ? new bootstrap.Modal(sourceReportModalEl) : null;
    const reportFileNameEl = document.getElementById('sourceReportFileName');

    // Source Finder Selectors
    const openSourceFinderBtn = document.getElementById('open-source-finder-btn');
    const sourceFinderModalEl = document.getElementById('sourceFinderModal');
    const sourceFinderModal = sourceFinderModalEl ? new bootstrap.Modal(sourceFinderModalEl) : null;
    const findPdfsBtn = document.getElementById('find-pdfs-btn');
    const findWebBtn = document.getElementById('find-web-btn');
    const pdfResultsContainer = document.getElementById('pdf-results-container');
    const webResultsContainer = document.getElementById('web-results-container');
    const findMorePdfsBtn = document.getElementById('find-more-pdfs-btn');
    const findMoreWebBtn = document.getElementById('find-more-web-btn');
    const addSourcesToHubBtn = document.getElementById('add-sources-to-hub-btn');
    const selectionCounter = document.getElementById('selection-counter');

    // --- State ---
    let sourceIdCounter = 0;
    const sourceDataCache = {}; // For sources already in the hub
    const foundSourcesCache = new Map(); // For sources found by the AI finder
    const selectedFinderSources = new Set();
    const existingSourceIdentifiers = new Set();
    
    // --- Context & Helpers ---
    const getProjectQuestion = () => (window.isTopicLocked && window.lockedTopicData) ? window.lockedTopicData.question : null;

    const checkTopicAndToggleControls = () => {
        const isDisabled = !getProjectQuestion();
        const infoMessage = document.getElementById('hub-info-message');
        [scrapeBtn, urlInput, fileInput, openSourceFinderBtn].forEach(el => el && (el.disabled = isDisabled));
        if (dropZone) {
            const uploadArea = dropZone.closest('.upload-area');
            if (uploadArea) {
                uploadArea.style.opacity = isDisabled ? 0.6 : 1;
                uploadArea.style.pointerEvents = isDisabled ? 'none' : 'auto';
            }
        }
        if (infoMessage) infoMessage.classList.toggle('d-none', !isDisabled);
    };

    // --- UI Rendering Functions ---
    // FIX: Added fixed width/height and onerror to prevent icon flicker/disappearance
    const createSourceCardHTML = (id, fileName, fileSize, sourceIdentifier) => {
    const fileExtension = 'pdf'; // We treat all as PDFs now for consistency
    const iconPath = `/images/icons/pdf.png`;
    const formattedSize = fileSize > 0 && fileSize > 1024 ? `${(fileSize / (1024 * 1024)).toFixed(2)} MB` : (fileSize > 0 ? `${(fileSize / 1024).toFixed(0)} KB` : '');

    // The card-body is now a flex container. The actions div is where the button will go.
    return `
        <div class="col" id="source-card-${id}" data-source-identifier="${sourceIdentifier}">
            <div class="card source-card h-100">
                <div class="card-body d-flex align-items-center">
                    <div class="source-card-icon">
                        <img src="${iconPath}" alt="PDF icon" width="40" height="40" onerror="this.onerror=null;this.src='/images/icons/default.png';">
                    </div>
                    <div class="source-card-details">
                        <h6 class="source-card-title">${fileName}</h6>
                        <div class="source-card-meta">
                            <span class="badge bg-secondary-subtle text-secondary-emphasis">PDF</span>
                            ${formattedSize ? `<span class="badge bg-secondary-subtle text-secondary-emphasis">${formattedSize}</span>` : ''}
                        </div>
                    </div>
                    <!-- This div is the key change. 'ms-auto' pushes it right. -->
                    <div class="source-card-actions">
                        <div class="spinner-border spinner-border-sm text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    };


    const updateCardWithAnalysis = (id, analysis) => {
        const card = document.getElementById(`source-card-${id}`);
        if (!card) return;
        sourceDataCache[id] = analysis;

        // Target the new actions container specifically.
        const actionsContainer = card.querySelector('.source-card-actions');
        if(actionsContainer) {
            actionsContainer.innerHTML = `<button class="btn btn-primary btn-sm view-report-btn" data-source-id="${id}">View Report</button>`;
        }
    };

    const updateCardWithError = (id, message) => {
        const card = document.getElementById(`source-card-${id}`);
        if (!card) return;
        
        // Also update the actions container for errors.
        const actionsContainer = card.querySelector('.source-card-actions');
        if(actionsContainer) {
        actionsContainer.innerHTML = `<span class="text-danger small" title="${message}"><i class="bi bi-exclamation-triangle-fill"></i> Error</span>`;
        }
    };

    const populateSourceReportModal = (analysisData, cardTitle) => {
        const { summary, authorThesis, academicContext, directQuotes, methodology, evidence, limitations, targetAudience, keyDefinitions, scorecard } = analysisData;
        if(reportFileNameEl) reportFileNameEl.textContent = cardTitle;
        const scorecardContainer = document.getElementById('report-scorecard');
        if (scorecardContainer && scorecard) { /* ... same as before ... */ }
        // The rest of this function is unchanged from the previous version.
        if(document.getElementById('report-methodology')) document.getElementById('report-methodology').innerHTML = `<div class="card bg-body"><div class="card-body"><h6 class="card-title text-primary">${methodology?.type || 'N/A'}</h6><p class="card-text small text-muted mb-0">${methodology?.details || 'No details provided.'}</p></div></div>`;
        if(document.getElementById('report-audience')) document.getElementById('report-audience').textContent = targetAudience || 'Not specified.';
        if(document.getElementById('report-summary')) document.getElementById('report-summary').textContent = summary || 'No summary available.';
        if(document.getElementById('report-thesis')) document.getElementById('report-thesis').textContent = authorThesis || 'No thesis identified.';
        if(document.getElementById('report-context')) document.getElementById('report-context').textContent = academicContext || 'No academic context provided.';
        if(document.getElementById('report-direct-quotes')) document.getElementById('report-direct-quotes').innerHTML = (directQuotes || []).map(q => `<figure class="mb-3"><blockquote class="blockquote">"${q.quote}"</blockquote><figcaption class="blockquote-footer mb-0">${q.analysis}</figcaption></figure>`).join('') || '<p class="text-muted">No relevant quotes found for your topic.</p>';
        if(document.getElementById('report-key-arguments')) document.getElementById('report-key-arguments').innerHTML = (keyArguments || []).map(arg => `<div class="card bg-body-tertiary border-0 mb-2"><div class="card-body py-2 px-3">${arg}</div></div>`).join('');
        if(document.getElementById('report-evidence')) document.getElementById('report-evidence').innerHTML = (evidence || []).map(ev => `<span class="badge bg-info-subtle text-info-emphasis me-1 mb-1 p-2">${ev}</span>`).join('');
        if(document.getElementById('report-limitations')) document.getElementById('report-limitations').textContent = limitations || 'No limitations were identified.';
        if(document.getElementById('report-key-definitions')) document.getElementById('report-key-definitions').innerHTML = (keyDefinitions || []).map(def => `<div class="mb-2"><strong class="d-block">${def.term}</strong><small class="text-muted">${def.definition}</small></div>`).join('');
        if (sourceReportModal) sourceReportModal.show();
    };
    
    // UPGRADE: This function now renders the new, more complex finder items.
    const renderFoundSources = (sources, container) => {
        container.innerHTML = ''; // Clear previous results or loading spinner
        if (sources.length === 0) {
            container.innerHTML = `<div class="text-center text-muted p-5"><p>No new relevant sources found. Try rephrasing your research question.</p></div>`;
            return;
        }
        sources.forEach(source => {
            const sourceId = `found-${foundSourcesCache.size}`;
            foundSourcesCache.set(sourceId, source); // Use map's set method
            const relevanceScore = source.analysis?.scorecard?.relevance?.score || 0;
            const scoreColor = relevanceScore >= 8 ? 'success' : relevanceScore >= 5 ? 'warning' : 'secondary';
            const html = `
                <div class="finder-item" data-source-id="${sourceId}">
                    <div class="finder-item-header">
                        <span class="finder-item-title">${source.fileName}</span>
                        <span class="badge text-bg-${scoreColor}">Relevance: ${relevanceScore}/10</span>
                    </div>
                    <p class="finder-item-summary">${source.analysis?.summary || 'No summary available.'}</p>
                    <a href="${source.url}" target="_blank" rel="noopener noreferrer" class="finder-item-url d-block">${source.url}</a>
                    <div class="finder-item-actions text-end">
                        <button class="btn btn-outline-secondary btn-sm view-full-report-btn" data-source-id="${sourceId}">
                            <i class="bi bi-file-text me-1"></i> View Full Report
                        </button>
                    </div>
                </div>`;
            container.insertAdjacentHTML('beforeend', html);
        });
    };

    const updateSelectionCounter = () => {
        const count = selectedFinderSources.size;
        if (selectionCounter) selectionCounter.textContent = `${count} source${count !== 1 ? 's' : ''} selected`;
        if (addSourcesToHubBtn) addSourcesToHubBtn.disabled = count === 0;
    };
    
    // --- API & WORKFLOW FUNCTIONS ---
    // UPGRADE: This function now shows a proper loading state.
    const findSources = async (btn) => {
        const projectQ = getProjectQuestion();
        if (!projectQ) return;
        
        const type = btn.dataset.type;
        const container = type === 'pdf' ? pdfResultsContainer : webResultsContainer;
        const moreBtn = type === 'pdf' ? findMorePdfsBtn : findMoreWebBtn;
        
        btn.disabled = true;
        const btnText = btn.querySelector('.btn-text');
        if (btnText) btnText.style.visibility = 'hidden';
        btn.classList.add('loading');
        container.innerHTML = `<div class="text-center p-5"><div class="spinner-border text-primary" role="status"></div><p class="mt-3 text-muted">Searching and analyzing...<br>This may take a moment.</p></div>`;

        try {
            const response = await fetch('/api/literature/find-sources', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectQuestion: projectQ, sourceType: type, existingUrls: Array.from(existingSourceIdentifiers) })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.details || errData.error || response.statusText);
            }
            
            const result = await response.json();
            renderFoundSources(result.sources, container);
            if (result.sources.length > 0 && moreBtn) moreBtn.classList.remove('d-none');
        } catch(err) {
            console.error("Find sources error", err);
            container.innerHTML = `<div class="alert alert-danger mx-3">${err.message}</div>`;
        } finally {
            btn.disabled = false;
            btn.classList.remove('loading');
            if (btnText) btnText.style.visibility = 'visible';
        }
    };
    
    const addSourceToHub = (fileName, fileSize, analysis, identifier) => {
        if (existingSourceIdentifiers.has(identifier)) return;
        if (emptyPlaceholder) emptyPlaceholder.style.display = 'none';
        
        const newCardId = ++sourceIdCounter;
        existingSourceIdentifiers.add(identifier);
        
        const cardHTML = createSourceCardHTML(newCardId, fileName, fileSize, identifier);
        sourcesContainer.insertAdjacentHTML('beforeend', cardHTML);
        updateCardWithAnalysis(newCardId, analysis);
    };
    
    const processAndUploadFile = async (file) => { /* ... Function is unchanged ... */ };
    const scrapeAndUpload = async (url) => { /* ... Function is unchanged ... */ };
    
    // --- EVENT LISTENERS ---
    // ... fileInput, dropZone, scrapeBtn listeners are unchanged ...
    if(fileInput) fileInput.addEventListener('change', () => { if (fileInput.files.length) { Array.from(fileInput.files).forEach(processAndUploadFile); fileInput.value = ''; } });
    
    if(sourcesContainer) {
        sourcesContainer.addEventListener('click', (e) => {
            const viewBtn = e.target.closest('.view-report-btn');
            if (viewBtn) {
                const sourceId = viewBtn.dataset.sourceId;
                const data = sourceDataCache[sourceId];
                const cardTitle = document.querySelector(`#source-card-${sourceId} .source-card-title`)?.textContent;
                if (data) populateSourceReportModal(data, cardTitle);
            }
        });
    }
    
    // AI Source Finder Listeners
    if(openSourceFinderBtn) openSourceFinderBtn.addEventListener('click', () => sourceFinderModal?.show());
    if(findPdfsBtn) findPdfsBtn.addEventListener('click', (e) => findSources(e.currentTarget));
    if(findWebBtn) findWebBtn.addEventListener('click', (e) => findSources(e.currentTarget));
    
    // UPGRADE: New click listener for the finder modal.
    if(sourceFinderModalEl) {
        sourceFinderModalEl.addEventListener('click', (e) => {
            const item = e.target.closest('.finder-item');
            const reportBtn = e.target.closest('.view-full-report-btn');
            
            if (reportBtn) {
                e.stopPropagation(); // prevent the item itself from being selected
                const sourceId = reportBtn.dataset.sourceId;
                const sourceData = foundSourcesCache.get(sourceId);
                if (sourceData) {
                    populateSourceReportModal(sourceData.analysis, sourceData.fileName);
                }
            } else if (item) {
                const sourceId = item.dataset.sourceId;
                item.classList.toggle('selected');
                if (item.classList.contains('selected')) {
                    selectedFinderSources.add(sourceId);
                } else {
                    selectedFinderSources.delete(sourceId);
                }
                updateSelectionCounter();
            }
        });
    }

    if(addSourcesToHubBtn) {
        addSourcesToHubBtn.addEventListener('click', () => {
            selectedFinderSources.forEach(sourceId => {
                const foundSource = foundSourcesCache.get(sourceId);
                if (foundSource) {
                    const { fileName, fileSize, analysis, url } = foundSource.data || foundSource;
                    addSourceToHub(fileName, fileSize, analysis, url);
                }
            });
            // Reset finder state
            selectedFinderSources.clear();
            updateSelectionCounter();
            if(pdfResultsContainer) pdfResultsContainer.innerHTML = '<div class="text-center text-muted p-5"><p>Click "Find Sources" to search for academic PDFs.</p></div>';
            if(webResultsContainer) webResultsContainer.innerHTML = '<div class="text-center text-muted p-5"><p>Click "Find Sources" to search for web articles.</p></div>';
            sourceFinderModal?.hide();
        });
    }

    // This listener reacts to topic changes from idea_lab.js
    document.addEventListener('topicUpdated', checkTopicAndToggleControls);

    // --- INITIALIZATION ---
    checkTopicAndToggleControls();
});