function showPage(pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
}

// Form Submission Handling
const bookingForm = document.getElementById('bookingForm');
bookingForm.addEventListener('submit', function(event) {
    event.preventDefault();
    alert('Booking Successful!');
});

const contactForm = document.getElementById('contactForm');
contactForm.addEventListener('submit', function(event) {
    event.preventDefault();
    alert('Message Sent! We will get back to you shortly.');
});

// Image Slider Functionality
let currentIndex = 0;
const images = document.querySelectorAll('.hero-image');

// Initial setup to hide all images and show the first one
images.forEach(img => img.style.opacity = '0');
images[0].style.opacity = '1';

function showNextImage() {
    images[currentIndex].style.opacity = '0';
    currentIndex = (currentIndex + 1) % images.length;
    images[currentIndex].style.opacity = '1';
}

setInterval(showNextImage, 5000);