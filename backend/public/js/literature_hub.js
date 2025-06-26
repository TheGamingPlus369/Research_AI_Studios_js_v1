

// public/js/literature_hub.js (Complete, Corrected File)

document.addEventListener('DOMContentLoaded', () => {
    const literatureHubContainer = document.getElementById('literature-hub-container');
    if (!literatureHubContainer) return;

    // --- Selectors ---
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const urlInput = document.getElementById('url-input');
    const scrapeBtn = document.getElementById('scrape-url-btn');
    const sourcesContainer = document.getElementById('sources-container');
    const emptyPlaceholder = document.querySelector('.empty-sources-placeholder');
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


    const getIconForFileType = (fileName) => {
        const extension = fileName.split('.').pop().toLowerCase();
        const iconMap = {
            'pdf': 'pdf.png',
            'doc': 'doc.png',
            'docx': 'doc.png',
            'ppt': 'ppt.png',
            'pptx': 'ppt.png',
            'xls': 'xls.png',
            'xlsx': 'xls.png',
            'png': 'image.png',
            'jpg': 'image.png',
            'jpeg': 'image.png',
            'mp4': 'video.png',
            'mov': 'video.png',
            'mp3': 'audio.png',
            'wav': 'audio.png',
            'js': 'code.png',
            'py': 'code.png',
            'html': 'code.png',
            'css': 'code.png',
        };
        return `/images/icons/${iconMap[extension] || 'default.png'}`;
    };


    const checkTopicAndToggleControls = () => {
        const projectQ = getProjectQuestion();
        const isDisabled = !projectQ;
        const infoMessageContainer = document.getElementById('hub-info-message-container');
        const mainControls = document.getElementById('hub-main-controls');

        // Show an info message if topic isn't locked
        if (infoMessageContainer) {
            infoMessageContainer.innerHTML = isDisabled ?
                `<div class="alert alert-info text-center"><i class="bi bi-info-circle-fill me-2"></i>Please lock in a research topic in the <strong>Idea Lab</strong> to enable the Literature Hub.</div>` :
                '';
        }
        
        // Disable/enable all controls
        if(mainControls) {
            mainControls.style.opacity = isDisabled ? 0.5 : 1;
            mainControls.style.pointerEvents = isDisabled ? 'none' : 'auto';
        }
    };

    // --- UI Rendering Functions ---
    const createSourceCardHTML = (id, fileName, fileSize, sourceIdentifier) => {
        const iconPath = getIconForFileType(fileName);
        const extension = fileName.split('.').pop().toUpperCase();
        const formattedSize = fileSize > 0 ? (fileSize > 1024*1024 ? `${(fileSize / (1024 * 1024)).toFixed(2)} MB` : `${(fileSize / 1024).toFixed(0)} KB`) : '';

        // The data-file-type needs to be consistent (lowercase) for the filter to work
        const fileType = extension.toLowerCase();

        return `
        <div class="col" id="source-card-${id}" data-source-identifier="${sourceIdentifier}" data-file-type="${fileType}" data-file-size="${fileSize}">
            <div class="card source-card">
                <div class="card-body">
                    <div class="source-card-header">
                        <img src="${iconPath}" alt="${extension} icon" class="source-card-icon">
                        <div class="source-card-details">
                            <h6 class="source-card-title" title="${fileName}">${fileName}</h6>
                            <div class="source-card-meta">
                                <span class="badge bg-secondary-subtle text-secondary-emphasis">${extension}</span>
                                ${formattedSize ? `<span class="badge bg-secondary-subtle text-secondary-emphasis">${formattedSize}</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <p class="source-card-summary">Generating summary...</p>
                </div>
                <div class="card-footer source-card-status">
                    <div class="loader-dots">
                        <div class="dot"></div>
                        <div class="dot"></div>
                        <div class="dot"></div>
                    </div>
                </div>
            </div>
        </div>`;
    };

    const updateCardWithAnalysis = (id, analysis) => {
        const card = document.getElementById(`source-card-${id}`);
        if (!card) return;
        sourceDataCache[id] = analysis;

        // Update the summary text
        const summaryEl = card.querySelector('.source-card-summary');
        if (summaryEl && analysis.summary) {
            summaryEl.textContent = analysis.summary;
        } else if (summaryEl) {
            summaryEl.textContent = "No summary could be generated for this source.";
        }

        // Update the footer with the button
        const footer = card.querySelector('.source-card-status');
        const sourceUrl = card.dataset.sourceIdentifier;
        if (footer) footer.innerHTML = `<button class="btn btn-primary btn-sm w-100 view-report-btn" data-source-id="${id}" data-source-url="${sourceUrl}">View Report</button>`;
    };
    
    const updateCardWithError = (id, message) => {
        const card = document.getElementById(`source-card-${id}`);
        if (!card) return;
        const actionsContainer = card.querySelector('.source-card-actions');
        if(actionsContainer) actionsContainer.innerHTML = `<span class="text-danger small" title="${message}"><i class="bi bi-exclamation-triangle-fill"></i> Error</span>`;
    };

    // THIS FUNCTION IS NOW COMPLETE AND CORRECT
    const populateSourceReportModal = (analysisData, cardTitle, sourceUrl) => {
        if (!analysisData) { console.error("populateSourceReportModal called with no data"); return; }
        const { summary, authorThesis, academicContext, keyArguments, directQuotes, methodology, evidence, limitations, targetAudience, keyDefinitions, scorecard } = analysisData;
        
        if (reportFileNameEl) reportFileNameEl.textContent = cardTitle;
        
        const scorecardContainer = document.getElementById('report-scorecard');
        if (scorecardContainer && scorecard) {
            scorecardContainer.innerHTML = Object.entries(scorecard).map(([key, val]) => {
                const label = key.charAt(0).toUpperCase() + key.slice(1);
                return `<div class="score-bar-item" data-bs-toggle="tooltip" title="${val.justification}"><div class="score-bar-header"><span class="score-bar-label">${label}</span><span class="score-bar-value">${val.score}/10</span></div><div class="score-bar-progress"><div class="score-bar-fill" style="width: ${val.score * 10}%;"></div></div></div>`;
            }).join('');
        }
        
        document.getElementById('report-summary').textContent = summary || 'No summary available.';
        document.getElementById('report-thesis').textContent = authorThesis || 'No thesis identified.';
        document.getElementById('report-context').textContent = academicContext || 'No academic context provided.';
        document.getElementById('report-methodology').innerHTML = `<div class="card bg-body"><div class="card-body"><h6 class="card-title text-primary">${methodology?.type || 'N/A'}</h6><p class="card-text small text-muted mb-0">${methodology?.details || 'No details provided.'}</p></div></div>`;
        document.getElementById('report-audience').textContent = targetAudience || 'Not specified.';
        document.getElementById('report-direct-quotes').innerHTML = (directQuotes || []).map(q => `<figure class="mb-3"><blockquote class="blockquote">"${q.quote}"</blockquote><figcaption class="blockquote-footer mb-0">${q.analysis}</figcaption></figure>`).join('') || '<p class="text-muted">No relevant quotes found for your topic.</p>';
        document.getElementById('report-key-arguments').innerHTML = (keyArguments || []).map(arg => `<div class="card bg-body-tertiary border-0 mb-2"><div class="card-body py-2 px-3">${arg}</div></div>`).join('');
        document.getElementById('report-evidence').innerHTML = (evidence || []).map(ev => `<span class="badge bg-info-subtle text-info-emphasis me-1 mb-1 p-2">${ev}</span>`).join('');
        document.getElementById('report-limitations').textContent = limitations || 'No limitations were identified.';
        document.getElementById('report-key-definitions').innerHTML = (keyDefinitions || []).map(def => `<div class="mb-2"><strong class="d-block">${def.term}</strong><small class="text-muted">${def.definition}</small></div>`).join('');

        const iframe = document.getElementById('source-iframe');
        const sourceViewTab = document.querySelector('button[data-bs-target="#source-view-pane"]');
        const iframeLink = document.getElementById('source-iframe-link');

        if (iframe && sourceViewTab && iframeLink) { // <-- Add iframeLink to the check
            if (sourceUrl) {
                iframe.src = sourceUrl;
                iframeLink.href = sourceUrl; // <-- Set the href for the link
                sourceViewTab.parentElement.classList.remove('d-none'); // Show the tab li
            } else {
                iframe.src = 'about:blank';
                iframeLink.href = '#'; // Clear href
                sourceViewTab.parentElement.classList.add('d-none'); // Hide the tab li
            }
        }
        
        if (sourceReportModal) sourceReportModal.show();
    };
    
    const renderFoundSources = (sources, container) => {
        container.innerHTML = '';
        if (!sources || sources.length === 0) { container.innerHTML = `<div class="text-center text-muted p-5"><p>No new relevant sources found.</p></div>`; return; }
        
        sources.forEach(source => {
            const sourceId = `found-${foundSourcesCache.size}`;
            foundSourcesCache.set(sourceId, source);
            const relevanceScore = source.analysis?.scorecard?.relevance?.score || 0;
            const scoreColor = relevanceScore >= 8 ? 'success' : relevanceScore >= 5 ? 'warning' : 'secondary';
            const html = `<div class="finder-item" data-source-id="${sourceId}"><div class="finder-item-header"><span class="finder-item-title">${source.fileName}</span><span class="badge text-bg-${scoreColor}">Relevance: ${relevanceScore}/10</span></div><p class="finder-item-summary">${source.analysis?.summary || 'No summary available.'}</p><a href="${source.url}" target="_blank" rel="noopener noreferrer" class="finder-item-url d-block">${source.url}</a><div class="finder-item-actions text-end"><button class="btn btn-outline-secondary btn-sm view-full-report-btn" data-source-id="${sourceId}"><i class="bi bi-file-text me-1"></i> View Full Report</button></div></div>`;
            container.insertAdjacentHTML('beforeend', html);
        });
    };

    const updateSelectionCounter = () => { 
        
        const count = selectedFinderSources.size;
            if (selectionCounter) {
                selectionCounter.textContent = `${count} source${count !== 1 ? 's' : ''} selected`;
            }
            if (addSourcesToHubBtn) {
                addSourcesToHubBtn.disabled = count === 0;
            }
        };
    
    // --- API & WORKFLOW FUNCTIONS ---
    const findSources = async (btn) => {
        const projectQ = getProjectQuestion();
        if (!projectQ) return;
        const type = btn.dataset.type;
        const container = type === 'pdf' ? pdfResultsContainer : webResultsContainer;
        btn.disabled = true;
        const btnText = btn.querySelector('.btn-text');
        if (btnText) btnText.style.visibility = 'hidden';
        btn.classList.add('loading');
        container.innerHTML = `<div class="text-center p-5"><div class="loader-text-animated">Searching & Analyzing...</div><p class="text-muted mt-3">This may take a moment.</p></div>`;
        try {
            const response = await fetch('/api/literature/find-sources', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectQuestion: projectQ, sourceType: type, existingUrls: Array.from(existingSourceIdentifiers) }) });
            if (!response.ok) { const errData = await response.json().catch(() => ({})); throw new Error(errData.details || errData.error || response.statusText); }
            const result = await response.json();
            renderFoundSources(result.sources, container);
        } catch(err) {
            console.error("Find sources error", err);
            container.innerHTML = `<div class="alert alert-danger mx-3">${err.message}</div>`;
        } finally {
            btn.disabled = false;
            btn.classList.remove('loading');
            if (btnText) btnText.style.visibility = 'visible';
        }
    };
    
    const addSourceToHub = (sourceData) => {
        const { fileName, fileSize, analysis, url } = sourceData;
        if (existingSourceIdentifiers.has(url)) {
            alert(`Source from "${url}" already exists in the hub.`);
            return;
        }
        if (emptyPlaceholder) emptyPlaceholder.style.display = 'none';
        
        const newCardId = ++sourceIdCounter;
        existingSourceIdentifiers.add(url);
        
        const cardHTML = createSourceCardHTML(newCardId, fileName, fileSize, url);
        sourcesContainer.insertAdjacentHTML('beforeend', cardHTML);
        updateCardWithAnalysis(newCardId, analysis);
    };
    
    // THIS FUNCTION IS NOW FULLY IMPLEMENTED
    const processAndUploadFile = async (file, forceAction = null) => {
        const projectQ = getProjectQuestion();
        if (!projectQ) return;

        const existingCard = document.querySelector(`[data-source-identifier="${file.name}"]`);

        // --- Duplicate Handling Logic ---
        if (existingCard && !forceAction) {
            const modalEl = document.getElementById('duplicateSourceModal');
            const duplicateModal = new bootstrap.Modal(modalEl);
            document.getElementById('duplicateFileName').textContent = file.name;

            // One-time event listeners for the modal buttons
            document.getElementById('duplicate-action-update').onclick = () => {
                duplicateModal.hide();
                processAndUploadFile(file, 'update'); // Re-call with the 'update' action
            };
            document.getElementById('duplicate-action-keep-both').onclick = () => {
                duplicateModal.hide();
                processAndUploadFile(file, 'keep'); // Re-call with the 'keep' action
            };
            duplicateModal.show();
            return; // Stop the original execution
        }

        let fileName = file.name;
        let cardToUpdate;

        if (forceAction === 'update') {
            cardToUpdate = existingCard;
            // Set the card to a loading state again
            const footer = cardToUpdate.querySelector('.source-card-status');
            if (footer) footer.innerHTML = `<div class="loader-dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>`;
        } else {
            if (forceAction === 'keep') {
                // Find a new name, e.g., "report (1).pdf"
                const nameParts = fileName.split('.');
                const ext = nameParts.pop();
                const baseName = nameParts.join('.');
                let i = 1;
                while (document.querySelector(`[data-source-identifier="${fileName}"]`)) {
                    fileName = `${baseName} (${i}).${ext}`;
                    i++;
                }
            }
            if (emptyPlaceholder) emptyPlaceholder.style.display = 'none';
            const newCardId = `card-${++sourceIdCounter}`;
            const cardHTML = createSourceCardHTML(newCardId, fileName, file.size, fileName);
            sourcesContainer.insertAdjacentHTML('beforeend', cardHTML);
            cardToUpdate = document.getElementById(newCardId);
        }

        const formData = new FormData();
        formData.append('sourceFile', file);
        formData.append('projectQuestion', projectQ);

        try {
            const response = await fetch('/api/literature/upload-file', { method: 'POST', body: formData });
            const result = await response.json();
            if (!response.ok) throw new Error(result.details || 'Upload failed');
            
            // Use the ID from the card element itself
            updateCardWithAnalysis(cardToUpdate.id, result.analysis);

        } catch (error) {
            console.error('File processing error:', error);
            updateCardWithError(cardToUpdate.id, error.message);
        }
    };
    
    // THIS FUNCTION IS NOW FULLY IMPLEMENTED
    const scrapeAndUpload = async () => {
        const url = urlInput.value.trim();
        const projectQ = getProjectQuestion();
        if (!url || !projectQ) return alert('URL and a locked project topic are required.');
        if (!url.startsWith('http')) return alert('Please enter a valid URL (e.g., https://...)');

        scrapeBtn.disabled = true;
        scrapeBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span>`;

        if (emptyPlaceholder) emptyPlaceholder.style.display = 'none';
        const tempId = `temp-${++sourceIdCounter}`;
        const cardHTML = createSourceCardHTML(tempId, `Scraping: ${url.substring(0, 40)}...`, 0, url);
        sourcesContainer.insertAdjacentHTML('beforeend', cardHTML);

        try {
            const response = await fetch('/api/literature/upload-from-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, projectQuestion: projectQ }) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.details || 'Scraping failed');

            const cardEl = document.getElementById(`source-card-${tempId}`);
            if (cardEl) {
                // Update the card with the real file name and size
                cardEl.querySelector('.source-card-title').textContent = result.fileName;
                const formattedSize = `${(result.fileSize / (1024*1024)).toFixed(2)} MB`;
                const metaContainer = cardEl.querySelector('.source-card-meta');
                metaContainer.insertAdjacentHTML('beforeend', `<span class="badge bg-secondary-subtle text-secondary-emphasis">${formattedSize}</span>`);
            }

            updateCardWithAnalysis(tempId, result.analysis);
        } catch (error) {
            console.error('URL processing error:', error);
            updateCardWithError(tempId, error.message);
        } finally {
            scrapeBtn.disabled = false;
            scrapeBtn.innerHTML = 'Scrape';
            urlInput.value = '';
        }
    };
    
    // --- EVENT LISTENERS ---
    if(fileInput) fileInput.addEventListener('change', () => { if (fileInput.files.length) { Array.from(fileInput.files).forEach(processAndUploadFile); fileInput.value = ''; } });
    if(dropZone) {
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
        dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('drag-over'); const files = e.dataTransfer.files; if (files.length) Array.from(files).forEach(processAndUploadFile); });
    }
    if(scrapeBtn) scrapeBtn.addEventListener('click', scrapeAndUpload);
    
    if(sourcesContainer) {
       sourcesContainer.addEventListener('click', (e) => {
            const viewBtn = e.target.closest('.view-report-btn');
            if (viewBtn) {
                const sourceId = viewBtn.dataset.sourceId;
                const sourceUrl = viewBtn.dataset.sourceUrl; // Get the URL from the button
                const data = sourceDataCache[sourceId];
                const cardTitle = document.querySelector(`#source-card-${sourceId} .source-card-title`)?.textContent;
                if (data) {
                    // Pass the URL to the modal function
                    populateSourceReportModal(data, cardTitle, sourceUrl);
                }
            }
        });
    }

    document.querySelector('#literature-hub-container').addEventListener('click', (e) => {
        const filterLink = e.target.closest('.dropdown-item[data-filter-type]');
        if (!filterLink) return;

        e.preventDefault();
        const filterType = filterLink.dataset.filterType;
        const filterValue = filterLink.dataset.filterValue;
        const allCards = sourcesContainer.querySelectorAll('.col');

        allCards.forEach(card => {
            let show = true;

            if (filterType === 'type' && filterValue !== 'all') {
                if (card.dataset.fileType.toLowerCase() !== filterValue.toLowerCase()) {
                    show = false;
                }
            } else if (filterType === 'size' && filterValue !== 'all') {
                const size = parseInt(card.dataset.fileSize, 10);
                const oneMB = 1024 * 1024;
                if (filterValue === 'large' && size < oneMB) {
                    show = false;
                }
                if (filterValue === 'small' && size >= oneMB) {
                    show = false;
                }
            }

            card.style.display = show ? 'block' : 'none';
        });
    });
    
    if(openSourceFinderBtn) openSourceFinderBtn.addEventListener('click', () => sourceFinderModal?.show());
    if(findPdfsBtn) findPdfsBtn.addEventListener('click', (e) => findSources(e.currentTarget));
    if(findWebBtn) findWebBtn.addEventListener('click', (e) => findSources(e.currentTarget));
    
    if(sourceFinderModalEl) {
        sourceFinderModalEl.addEventListener('click', (e) => {
            const item = e.target.closest('.finder-item');
            const reportBtn = e.target.closest('.view-full-report-btn');
            if (reportBtn) {
                e.stopPropagation();
                const sourceId = reportBtn.dataset.sourceId;
                const sourceData = foundSourcesCache.get(sourceId);
                if (sourceData && sourceData.analysis) {
                    populateSourceReportModal(sourceData.analysis, sourceData.fileName, sourceData.url);
                } else {
                    console.error("Could not find analysis data for this source.", sourceData);
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
                if (foundSource) addSourceToHub(foundSource);
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