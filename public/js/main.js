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
// Home Page Video Modal
// =============================================

function initHomeVideoModal() {
  var playBtn = document.getElementById('play-walkthrough-btn');
  var modal = document.getElementById('home-video-modal');
  var closeBtn = document.getElementById('home-video-modal-close');
  var iframe = document.getElementById('home-video-iframe');
  
  // Fetch video ID from JSON file on GitHub
  var videoIdJsonUrl = 'https://raw.githubusercontent.com/raisingthefloor/learnandtry-webapp/data/public/data/lnt_video_youtube_id.json';
  var fallbackUrl = 'https://raisingthefloor.org/lnt-walkthrough';
  
  if (!playBtn || !modal || !iframe) return;

  // Add dialog role for screen readers
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Website walkthrough video');
  
  function openModal() {
    fetch(videoIdJsonUrl)
      .then(function(response) {
        return response.json();
      })
      .then(function(data) {
        var videoId = data.videoId || data.video_id || data.id;
        
        if (videoId) {
          iframe.setAttribute('src', 'https://www.youtube.com/embed/' + videoId + '?autoplay=1');
          modal.classList.add('is-open');
          document.body.style.overflow = 'hidden';
          // Move focus to close button
          if (closeBtn) closeBtn.focus();
        } else {
          // Fallback: open in new tab
          window.open(fallbackUrl, '_blank');
        }
      })
      .catch(function() {
        // Fallback: open in new tab
        window.open(fallbackUrl, '_blank');
      });
  }
  
  function closeModal() {
    modal.classList.remove('is-open');
    iframe.setAttribute('src', '');
    document.body.style.overflow = '';
    // Return focus to trigger button
    playBtn.focus();
  }
  
  playBtn.addEventListener('click', openModal);
  
  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }
  
  // Close on backdrop click
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      closeModal();
    }
  });
  
  // Close on Escape key & trap focus inside modal
  document.addEventListener('keydown', function(e) {
    if (!modal.classList.contains('is-open')) return;
    
    if (e.key === 'Escape') {
      closeModal();
      return;
    }
    
    // Focus trap
    if (e.key === 'Tab') {
      var focusable = modal.querySelectorAll('button, iframe, [tabindex]:not([tabindex="-1"])');
      if (focusable.length === 0) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  });
}

// =============================================
// Initialize on DOM Ready
// =============================================

document.addEventListener('DOMContentLoaded', function() {
  initMobileMenu();
  setActiveNavLink();
  initHomeVideoModal();
});
