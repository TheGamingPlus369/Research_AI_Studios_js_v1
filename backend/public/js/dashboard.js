document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('projectSearch');
    if (!searchInput) return; // Don't run if we're not on the dashboard page

    const projectCards = document.querySelectorAll('.project-card-wrapper');

    searchInput.addEventListener('keyup', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();

        projectCards.forEach(cardWrapper => {
            const title = cardWrapper.querySelector('.project-card').dataset.projectTitle;
            if (title.includes(searchTerm)) {
                cardWrapper.style.display = 'block';
            } else {
                cardWrapper.style.display = 'none';
            }
        });
    });
});