function showPage(pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach((page) => {
        page.style.display = 'none';
    });
    document.getElementById(pageId).style.display = 'block';
}

document.getElementById('contactForm').addEventListener('submit', function (event) {
    event.preventDefault();
    alert('Thank you for your message!');
    this.reset();
});

// Show home page by default
showPage('home');