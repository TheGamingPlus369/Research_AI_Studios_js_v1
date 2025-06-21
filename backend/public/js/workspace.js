document.addEventListener('DOMContentLoaded', () => {
    // === SELECTORS ===
    const chatInput = document.getElementById('chat-input');
    if (!chatInput) return;

    const stepperLinks = document.querySelectorAll('.stepper-nav .nav-link');
    const contentPanels = document.querySelectorAll('.step-content');
    const sendBtn = document.getElementById('send-btn');
    const chatLog = document.getElementById('chat-log');
    const chatHeadline = document.getElementById('ai-chat-headline');
    const modelDropdownButton = document.getElementById('modelDropdown');
    const selectedModelNameSpan = document.getElementById('selected-model-name');
    const modelInfoPopup = document.getElementById('model-info-popup');
    const popupModelName = document.getElementById('popup-model-name');
    const popupBestFor = document.getElementById('popup-best-for');
    const popupUseCase = document.getElementById('popup-use-case');
    const popupRateLimitText = document.getElementById('popup-rate-limit-text');
    const rateLimitBar = modelInfoPopup.querySelector('.rate-limit-bar');
    const dropdownItems = document.querySelectorAll('.dropdown-menu .dropdown-item');
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));


    // === DATA & STATE ===
    const modelsData = {
        'gemini-2.5-pro': { name: 'Gemini 2.5 Pro', bestFor: ['Coding', 'Reasoning', 'Multimodal understanding'], useCase: ['Reason over complex problems', 'Tackle difficult code, math and STEM problems', 'Use the long context for analyzing large datasets'], rateLimit: { total: 150, unit: 'RPM', current: 50, freeTier: null } },
        'gemini-2.5-flash': { name: 'Gemini 2.5 Flash', bestFor: ['Large scale processing', 'Low latency, high volume tasks', 'Agentic use cases'], useCase: ['Reason over complex problems', 'Show the thinking process', 'Call tools natively'], rateLimit: { total: 1000, unit: 'RPM', current: 250, freeTier: { value: 10, unit: 'RPM', daily: 500 } } },
        'gemini-2.5-flash-lite-preview': { name: 'Gemini 2.5 Flash Lite Preview', bestFor: ['Large scale processing', 'Low latency, high volume tasks', 'Lower cost'], useCase: ['Data transformation', 'Translation', 'Summarization'], rateLimit: { total: 4000, unit: 'RPM', current: 1000, freeTier: { value: 15, unit: 'RPM', daily: 500 } } }
    };
    let selectedModelId = 'gemini-2.5-flash';
    let popupTimeout;

    // === FUNCTIONS ===
    const showContentPanel = (targetStepId) => {
        stepperLinks.forEach(link => link.classList.toggle('active', link.dataset.stepId === targetStepId));
        contentPanels.forEach(panel => panel.classList.toggle('d-none', panel.id !== `step-content-${targetStepId}`));
    };

    const showModelInfo = (element) => {
        clearTimeout(popupTimeout);
        const modelId = element.dataset.modelId;
        if (!modelId) return;
        const model = modelsData[modelId];
        if (!model) return;
        popupModelName.textContent = model.name;
        const populateList = (ul, items) => { ul.innerHTML = ''; items.forEach(item => { const li = document.createElement('li'); li.textContent = item; ul.appendChild(li); }); };
        populateList(popupBestFor, model.bestFor);
        populateList(popupUseCase, model.useCase);
        const { current, total, unit, freeTier } = model.rateLimit;
        const percentageUsed = (current / total) * 100;
        popupRateLimitText.innerHTML = `${current} / ${total} ${unit}${freeTier ? ` (Free: ${freeTier.value} ${freeTier.unit})` : ''}`;
        rateLimitBar.style.width = `${percentageUsed}%`;
        const dropdownMenu = element.closest('.dropdown-menu');
        if (dropdownMenu) {
            const menuRect = dropdownMenu.getBoundingClientRect();
            modelInfoPopup.style.left = `${menuRect.left - modelInfoPopup.offsetWidth - 15}px`;
            modelInfoPopup.style.top = `${menuRect.top}px`;
        }
        modelInfoPopup.classList.add('show');
    };

    const hideModelInfo = () => { popupTimeout = setTimeout(() => modelInfoPopup.classList.remove('show'), 100); };

    const sendMessage = () => {
        const messageText = chatInput.value.trim();
        if (messageText === '') return;
        if (chatHeadline && !chatHeadline.classList.contains('d-none')) {
            chatHeadline.style.transition = 'opacity 0.3s ease-out';
            chatHeadline.style.opacity = '0';
            setTimeout(() => chatHeadline.classList.add('d-none'), 300);
        }
        const userMessageDiv = document.createElement('div');
        userMessageDiv.className = 'user-message';
        userMessageDiv.textContent = messageText;
        chatLog.appendChild(userMessageDiv);
        chatInput.value = '';
        chatInput.style.height = 'auto';
        chatLog.scrollTop = chatLog.scrollHeight;
        const modelUsed = modelsData[selectedModelId].name;
        const fakeResponse = `(Using ${modelUsed}): This is a simulated real-time response demonstrating how text can be generated token by token, providing a more dynamic and engaging user experience.`;
        const aiMessageDiv = document.createElement('div');
        aiMessageDiv.className = 'ai-message';
        chatLog.appendChild(aiMessageDiv);
        simulateTyping(aiMessageDiv, fakeResponse);
    };

    const simulateTyping = (element, text) => {
        const words = text.split(' '); let i = 0; element.textContent = '';
        chatLog.scrollTop = chatLog.scrollHeight;
        const typingInterval = setInterval(() => {
            if (i < words.length) { element.textContent += words[i] + ' '; chatLog.scrollTop = chatLog.scrollHeight; i++; } 
            else { clearInterval(typingInterval); }
        }, 200);
    };

    // === EVENT LISTENERS ===
    stepperLinks.forEach(link => { link.addEventListener('click', (e) => { e.preventDefault(); showContentPanel(link.dataset.stepId); }); });
    dropdownItems.forEach(item => {
        item.addEventListener('click', function(e) { e.preventDefault(); selectedModelId = this.dataset.modelId; selectedModelNameSpan.textContent = modelsData[selectedModelId].name; const bsDropdown = bootstrap.Dropdown.getInstance(modelDropdownButton); bsDropdown.hide(); });
        item.addEventListener('mouseover', function() { showModelInfo(this); });
        item.addEventListener('mouseout', hideModelInfo);
    });
    modelInfoPopup.addEventListener('mouseover', () => clearTimeout(popupTimeout));
    modelInfoPopup.addEventListener('mouseout', hideModelInfo);
    
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = `${chatInput.scrollHeight}px`;
    });
    // Send button and Enter key (CORRECTED)
    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', (e) => {
    // This condition now correctly checks for Ctrl+Enter or Cmd+Enter
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault(); // Prevent new line
            sendMessage();
        }
    });

    // === INITIALIZATION ===
    selectedModelNameSpan.textContent = modelsData[selectedModelId].name;
    showContentPanel('ai');
});