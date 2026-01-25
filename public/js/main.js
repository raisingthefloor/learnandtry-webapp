/**
 * Learn and Try - Main JavaScript
 * Vanilla JS implementation
 */

// =============================================
// Mobile Menu Toggle
// =============================================

function initMobileMenu() {
  const toggle = document.getElementById('mobile-menu-toggle');
  const menu = document.getElementById('mobile-menu');
  
  if (!toggle || !menu) return;
  
  toggle.addEventListener('click', function() {
    const isOpen = menu.classList.contains('is-open');
    
    if (isOpen) {
      menu.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open navigation menu');
      toggle.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="4" x2="20" y1="12" y2="12"></line>
          <line x1="4" x2="20" y1="6" y2="6"></line>
          <line x1="4" x2="20" y1="18" y2="18"></line>
        </svg>
      `;
    } else {
      menu.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Close navigation menu');
      toggle.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6 6 18"></path>
          <path d="m6 6 12 12"></path>
        </svg>
      `;
    }
  });
  
  // Close menu when clicking on a link
  const links = menu.querySelectorAll('a');
  links.forEach(function(link) {
    link.addEventListener('click', function() {
      menu.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// =============================================
// Set Active Navigation Link
// =============================================

function setActiveNavLink() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  
  // Desktop nav
  const navLinks = document.querySelectorAll('.header__nav-link');
  navLinks.forEach(function(link) {
    const href = link.getAttribute('href');
    link.classList.remove('header__nav-link--active');
    link.removeAttribute('aria-current');
    
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('header__nav-link--active');
      link.setAttribute('aria-current', 'page');
    }
  });
  
  // Mobile nav
  const mobileNavLinks = document.querySelectorAll('.header__mobile-nav-link');
  mobileNavLinks.forEach(function(link) {
    const href = link.getAttribute('href');
    link.classList.remove('header__mobile-nav-link--active');
    link.removeAttribute('aria-current');
    
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('header__mobile-nav-link--active');
      link.setAttribute('aria-current', 'page');
    }
  });
}

// =============================================
// Initialize on DOM Ready
// =============================================

document.addEventListener('DOMContentLoaded', function() {
  initMobileMenu();
  setActiveNavLink();
});
