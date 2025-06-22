// Renders the homepage
exports.renderHome = (req, res) => {
    res.render('home', {
        title: 'AI Research Studio',
        page: 'home'
    });
};

// Renders the pricing page
exports.renderPricing = (req, res) => {
    res.render('pricing', {
        title: 'Pricing Plans',
        page: 'pricing'
    });
};

// Renders the login page
exports.renderLogin = (req, res) => {
    res.render('login', {
        title: 'Login',
        page: 'login'
    });
};

// Renders the signup page
exports.renderSignup = (req, res) => {
    res.render('signup', {
        title: 'Sign Up',
        page: 'signup'
    });
};

// Renders the dashboard page
exports.renderDashboard = (req, res) => {
    const fakeProjects = [
        { id: 1, title: "The Impact of Remote Work on Urban Economies", lastModified: "2 days ago", step: 4, totalPages: 6 },
        { id: 2, title: "AI in Predictive Medicine: A Literature Review", lastModified: "5 hours ago", step: 2, totalPages: 6 },
        { id: 3, title: "Quantum Computing's Threat to Cryptography", lastModified: "1 week ago", step: 6, totalPages: 6 }
    ];
    res.render('dashboard', {
        title: 'Your Projects',
        projects: fakeProjects,
        page: 'dashboard'
    });
};

// Renders the main project workspace
exports.renderWorkspace = (req, res) => {
    const projectId = parseInt(req.params.id, 10);
    const fakeProjects = [
        { id: 1, title: "The Impact of Remote Work on Urban Economies", step: 1, totalPages: 6 },
        { id: 2, title: "AI in Predictive Medicine: A Literature Review", step: 2, totalPages: 6 },
        { id: 3, title: "Quantum Computing's Threat to Cryptography", step: 6, totalPages: 6 }
    ];
    const project = fakeProjects.find(p => p.id === projectId);

    if (!project) {
        return res.redirect('/app/dashboard');
    }

    const researchSteps = [
        { id: 'ai', name: 'AI Chat', icon: 'bi-stars' },
        { id: 1, name: 'Idea Lab', icon: 'bi-lightbulb' },
        { id: 2, name: 'Literature Hub', icon: 'bi-journal-bookmark' },
        { id: 3, name: 'Methodology', icon: 'bi-diagram-3' },
        { id: 4, name: 'Data Workspace', icon: 'bi-table' },
        { id: 5, name: 'Writing Desk', icon: 'bi-pencil-square' },
        { id: 6, name: 'Finalize & Export', icon: 'bi-send-check' }
    ];

    res.render('app_workspace', {
        title: project.title,
        project: project,
        steps: researchSteps,
        page: 'workspace'
    });
};