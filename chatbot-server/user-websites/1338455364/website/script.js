document.addEventListener('DOMContentLoaded', function() {
    const buttons = document.querySelectorAll('.read-more');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            const postContent = this.nextElementSibling;
            if (postContent.style.display === 'none') {
                postContent.style.display = 'block';
                this.textContent = 'Read Less';
            } else {
                postContent.style.display = 'none';
                this.textContent = 'Read More';
            }
        });
    });
    const form = document.getElementById('contact-form');
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        alert('Thank you for your message!');
        form.reset();
    });
});