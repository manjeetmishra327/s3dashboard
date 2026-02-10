document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu toggle
    const menuToggle = document.createElement('button');
    menuToggle.className = 'menu-toggle';
    menuToggle.innerHTML = '☰';
    document.body.appendChild(menuToggle);
    
    const sidebar = document.querySelector('.sidebar');
    
    // Toggle sidebar on menu button click
    menuToggle.addEventListener('click', function() {
        sidebar.classList.toggle('active');
        menuToggle.style.left = sidebar.classList.contains('active') ? '240px' : '1rem';
    });
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                // Close mobile menu if open
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('active');
                    menuToggle.style.left = '1rem';
                }
                
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
                
                // Update active nav item
                document.querySelectorAll('.nav-links li').forEach(li => {
                    li.classList.remove('active');
                });
                this.parentElement.classList.add('active');
            }
        });
    });
    
    // Update active nav item on scroll
    const sections = document.querySelectorAll('section');
    
    function updateActiveNav() {
        let current = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            
            if (window.scrollY >= sectionTop - 200) {
                current = '#' + section.getAttribute('id');
            }
        });
        
        document.querySelectorAll('.nav-links li').forEach(li => {
            li.classList.remove('active');
            if (li.querySelector('a').getAttribute('href') === current) {
                li.classList.add('active');
            }
        });
    }
    
    window.addEventListener('scroll', updateActiveNav);
    
    // Close menu when clicking outside on mobile
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768 && !sidebar.contains(e.target) && e.target !== menuToggle) {
            sidebar.classList.remove('active');
            menuToggle.style.left = '1rem';
        }
    });
    
    // Initialize animations
    const animateOnScroll = function() {
        const elements = document.querySelectorAll('.service-card');
        
        elements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            const windowHeight = window.innerHeight;
            
            if (elementTop < windowHeight - 100) {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }
        });
    };
    
    // Initial check for elements in viewport
    animateOnScroll();
    
    // Check for elements in viewport on scroll
    window.addEventListener('scroll', animateOnScroll);
    
    // Add hover effect to CTA button
    const ctaButton = document.querySelector('.cta-button');
    if (ctaButton) {
        ctaButton.addEventListener('mouseenter', function() {
            this.style.background = 'linear-gradient(45deg, #3a56ff, #5a4fff)';
        });
        
        ctaButton.addEventListener('mouseleave', function() {
            this.style.background = 'linear-gradient(45deg, var(--primary-color), var(--secondary-color))';
        });
    }
});
