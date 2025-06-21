document.addEventListener('DOMContentLoaded', function() {

    // --- Dark Mode Toggle ---
    const darkModeToggle = document.getElementById('darkModeToggle');
    const htmlElement = document.documentElement;
    const moonIcon = 'bi-moon-stars-fill';
    const sunIcon = 'bi-sun-fill';

    // Apply saved theme on page load
    const savedTheme = localStorage.getItem('theme') || 'light';
    htmlElement.setAttribute('data-bs-theme', savedTheme);
    darkModeToggle.querySelector('i').className = (savedTheme === 'dark') ? sunIcon : moonIcon;
    
    darkModeToggle.addEventListener('click', () => {
        const currentTheme = htmlElement.getAttribute('data-bs-theme');
        if (currentTheme === 'dark') {
            htmlElement.setAttribute('data-bs-theme', 'light');
            localStorage.setItem('theme', 'light');
            darkModeToggle.querySelector('i').className = moonIcon;
        } else {
            htmlElement.setAttribute('data-bs-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            darkModeToggle.querySelector('i').className = sunIcon;
        }
    });


    // --- Scroll Animation ---
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
            }
        });
    }, {
        threshold: 0.1 // Trigger when 10% of the element is visible
    });

    const elementsToFadeIn = document.querySelectorAll('.fade-in-element');
    elementsToFadeIn.forEach(el => observer.observe(el));

});