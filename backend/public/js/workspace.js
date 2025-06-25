// This function is now declared globally so other scripts can call it.
function showContentPanel(targetStepId) {
    const stepperLinks = document.querySelectorAll('.stepper-nav .nav-link');
    const contentPanels = document.querySelectorAll('.step-content');

    stepperLinks.forEach(link => {
        link.classList.toggle('active', link.dataset.stepId === targetStepId);
    });
    contentPanels.forEach(panel => {
        // This correctly toggles visibility for all panels.
        panel.classList.toggle('d-none', panel.id !== `step-content-${targetStepId}`);
    });
};


document.addEventListener('DOMContentLoaded', () => {
    // === SELECTORS ===
    const chatInput = document.getElementById('chat-input');
    const stepperLinks = document.querySelectorAll('.stepper-nav .nav-link');
    const sendBtn = document.getElementById('send-btn');
    const chatLog = document.getElementById('chat-log');
    const chatHeadline = document.getElementById('ai-chat-headline');
    const modelDropdownButton = document.getElementById('modelDropdown');
    const selectedModelNameSpan = document.getElementById('selected-model-name');
    const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
    const body = document.body;

    // === DATA & STATE ===
    const modelsData = {
        'gemini-1.5-pro-latest': { name: 'Gemini 1.5 Pro' },
        'gemini-1.5-flash-latest': { name: 'Gemini 1.5 Flash' },
    };
    let selectedModelId = 'gemini-1.5-flash-latest'; // Default model

    // === FUNCTIONS ===
    
    const sendMessage = () => {
        // This function requires the chatInput to exist.
        if (!chatInput) return; 
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
        }, 50);
    };

    // === EVENT LISTENERS ===
    if (sidebarToggleBtn) {
        const toggleIcon = sidebarToggleBtn.querySelector('i');
        sidebarToggleBtn.addEventListener('click', () => {
            body.classList.toggle('sidebar-collapsed');
            if (body.classList.contains('sidebar-collapsed')) {
                toggleIcon.classList.remove('bi-chevron-left');
                toggleIcon.classList.add('bi-chevron-right');
            } else {
                toggleIcon.classList.remove('bi-chevron-right');
                toggleIcon.classList.add('bi-chevron-left');
            }
        });
    }

     stepperLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetStepId = link.dataset.stepId;

            // THIS IS THE CRITICAL NEW LOGIC
            // Check if the topic is locked globally AND the user is trying to view the Idea Lab (step 1).
            if (window.isTopicLocked && targetStepId === '1') {
                // The topic is locked, so instead of showing the generator,
                // we ensure the 'locked view' is visible and the generator is hidden.
                const generatorView = document.getElementById('idea-lab-generator');
                const lockedView = document.getElementById('idea-lab-locked-state');
                const reviewSection = document.getElementById('idea-lab-review-section');

                if (generatorView && lockedView && reviewSection) {
                    generatorView.classList.add('d-none');
                    lockedView.classList.remove('d-none');
                    reviewSection.classList.add('d-none'); // Also hide the report section
                }
            }
            // END OF NEW LOGIC

            // This function handles switching the main content panels.
            showContentPanel(targetStepId);
        });
    });
    
    if (modelDropdownButton) {
        const dropdownItems = modelDropdownButton.parentElement.querySelectorAll('.dropdown-menu .dropdown-item');
        dropdownItems.forEach(item => {
            item.addEventListener('click', function(e) { 
                e.preventDefault(); 
                selectedModelId = this.dataset.modelId; 
                if(selectedModelNameSpan) {
                    selectedModelNameSpan.textContent = modelsData[selectedModelId].name;
                }
                const bsDropdown = bootstrap.Dropdown.getInstance(modelDropdownButton); 
                if (bsDropdown) bsDropdown.hide();
            });
        });
    }
    
    // Only add listeners if chat input exists
    if (chatInput) {
        chatInput.addEventListener('input', () => {
            chatInput.style.height = 'auto';
            chatInput.style.height = `${chatInput.scrollHeight}px`;
        });
        if (sendBtn) sendBtn.addEventListener('click', sendMessage);
        chatInput.addEventListener('keydown', (e) => { 
            if (e.key === 'Enter' && !e.shiftKey) { 
                e.preventDefault(); 
                sendMessage(); 
            } 
        });
    }

    // === INITIALIZATION ===
    if (selectedModelNameSpan && modelsData[selectedModelId]) {
        selectedModelNameSpan.textContent = modelsData[selectedModelId].name;
    }
    // Set the initial active tab. Let's default to the Idea Lab (step 1).
    showContentPanel('1'); 
});