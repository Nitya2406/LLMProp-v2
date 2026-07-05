// Main Application JavaScript
document.addEventListener('DOMContentLoaded', () => {
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Add parallax effect to cards
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe mode cards and property cards
    document.querySelectorAll('.mode-card, .property-card, .application-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });
    
    // Enhanced button hover effects
    document.querySelectorAll('.mode-btn, .predict-btn, .action-btn').forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-3px) scale(1.05)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
    
    // Form validation enhancement
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        const inputs = form.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            input.addEventListener('blur', function() {
                if (this.hasAttribute('required') && !this.value) {
                    this.style.borderColor = '#ff4444';
                    this.style.boxShadow = '0 0 10px rgba(255, 68, 68, 0.3)';
                } else if (this.value) {
                    this.style.borderColor = '#00ffff';
                    this.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.4)';
                }
            });
            
            input.addEventListener('focus', function() {
                this.style.borderColor = '#00ffff';
                this.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.4)';
            });
        });
    });
    
    // Add ripple effect to buttons
    document.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.classList.add('ripple');
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
    
    // Add floating animation to mode cards
    const modeCards = document.querySelectorAll('.mode-card');
    modeCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.2}s`;
    });
    
    // Enhanced textarea auto-resize
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(textarea => {
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.max(this.scrollHeight, 200) + 'px';
        });
    });
    
    // Add keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // Clear any active forms or modals
            const activeElement = document.activeElement;
            if (activeElement && activeElement.tagName === 'INPUT') {
                activeElement.blur();
            }
        }
    });
    
    // Add page transition effects
    const links = document.querySelectorAll('a[href]');
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            if (this.hostname === window.location.hostname) {
                e.preventDefault();
                document.body.style.opacity = '0';
                document.body.style.transition = 'opacity 0.3s ease';
                
                setTimeout(() => {
                    window.location.href = this.href;
                }, 300);
            }
        });
    });
    
    // Initialize page with fade-in effect
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.opacity = '1';
        document.body.style.transition = 'opacity 0.5s ease';
    }, 100);
});

// Utility functions
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? 'linear-gradient(135deg, #00ff64, #00cc50)' : 
                     type === 'error' ? 'linear-gradient(135deg, #ff4444, #cc0000)' : 
                     'linear-gradient(135deg, #00ffff, #0080ff)'};
        color: #0b0f2a;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        font-weight: 600;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        transform: scale(0);
        animation: ripple-animation 0.6s ease-out;
        pointer-events: none;
    }
    
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    button {
        position: relative;
        overflow: hidden;
    }
`;
document.head.appendChild(style);

// Export functionality for results page
window.exportResults = function() {
    const materialData = JSON.parse(localStorage.getItem('materialData'));
    if (!materialData) {
        showNotification('No prediction data found. Please run a prediction first.', 'error');
        return;
    }
    
    // Create CSV format for easy spreadsheet import
    const csvContent = `Material Property Prediction Results
Generated: ${new Date().toLocaleString()}

Mode: ${materialData.mode || 'unknown'}

Material Information:
${materialData.materialName ? `Name,${materialData.materialName}` : ''}
${materialData.elements ? `Elements,"${materialData.elements}"` : ''}
${materialData.crystalSystem ? `Crystal System,${materialData.crystalSystem}` : ''}
${materialData.coordinationNumber ? `Coordination Number,${materialData.coordinationNumber}` : ''}
${materialData.crystalStructure ? `Crystal Structure,"${materialData.crystalStructure.substring(0, 100)}..."` : ''}

Predicted Properties:
Property,Value,Unit
Bandgap,${document.getElementById('bandgap-value')?.textContent || 'N/A'},eV
Formation Energy,${document.getElementById('formation-energy-value')?.textContent || 'N/A'},eV/atom
Energy per Atom,${document.getElementById('energy-per-atom-value')?.textContent || 'N/A'},eV
Ehull,${document.getElementById('ehull-value')?.textContent || 'N/A'},eV/atom
Volume,${document.getElementById('volume-value')?.textContent || 'N/A'},Å³
Band Type,${document.getElementById('band-type-value')?.textContent || 'N/A'},Type`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `material_prediction_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showNotification('Results exported successfully!', 'success');
};

// Clear form utility
window.clearForm = function(formId) {
    const form = formId ? document.getElementById(formId) : document.querySelector('form');
    if (form) {
        form.reset();
        showNotification('Form cleared', 'info');
    }
};

// Load example utility for researcher mode
window.loadExample = function() {
    const textarea = document.getElementById('crystal-structure');
    if (textarea) {
        textarea.value = `Si 0.0 0.0 0.0
Si 0.25 0.25 0.25
Si 0.5 0.5 0.0
Si 0.75 0.75 0.25

Diamond cubic structure
Lattice parameter: 5.43 Å
Space group: Fd-3m`;
        showNotification('Example loaded', 'success');
    }
};

// Validate form utility
window.validateForm = function(formId) {
    const form = document.getElementById(formId);
    if (!form) return false;
    
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            field.style.borderColor = '#ff4444';
            field.style.boxShadow = '0 0 10px rgba(255, 68, 68, 0.3)';
            isValid = false;
        } else {
            field.style.borderColor = '#00ffff';
            field.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.4)';
        }
    });
    
    if (!isValid) {
        showNotification('Please fill in all required fields', 'error');
    }
    
    return isValid;
};

// Add smooth number counting animation
function animateNumber(element, target, duration = 1000) {
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        element.textContent = current.toFixed(2);
    }, 16);
}

// Add particle effect on page load
function createParticles() {
    const particlesContainer = document.createElement('div');
    particlesContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: -1;
    `;
    
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: absolute;
            width: 2px;
            height: 2px;
            background: radial-gradient(circle, rgba(0, 255, 255, 0.8) 0%, transparent 70%);
            border-radius: 50%;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation: floatParticle ${10 + Math.random() * 20}s linear infinite;
            animation-delay: ${Math.random() * 10}s;
        `;
        particlesContainer.appendChild(particle);
    }
    
    document.body.appendChild(particlesContainer);
}

// Add floating particle animation
const particleStyle = document.createElement('style');
particleStyle.textContent = `
    @keyframes floatParticle {
        from {
            transform: translateY(100vh) translateX(0);
            opacity: 0;
        }
        10% {
            opacity: 1;
        }
        90% {
            opacity: 1;
        }
        to {
            transform: translateY(-100vh) translateX(100px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(particleStyle);

// Initialize particles on page load
document.addEventListener('DOMContentLoaded', () => {
    createParticles();
});
