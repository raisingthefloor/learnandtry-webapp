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

// Normalize a path to its directory section so that:
//   /index.html          -> /
//   /finder/index.html   -> /finder
//   /browse/index.html   -> /browse
// Trailing "index.html" and trailing slashes are stripped.
function normalizeNavPath(path) {
  try {
    // Resolve relative/absolute hrefs against the current origin
    var resolved = new URL(path, window.location.origin).pathname;
    resolved = resolved.replace(/index\.html$/, '');
    resolved = resolved.replace(/\/+$/, '');
    return resolved === '' ? '/' : resolved;
  } catch (e) {
    return path;
  }
}

function setActiveNavLink() {
  const currentPath = normalizeNavPath(window.location.pathname);
  
  function applyActiveState(links, activeClass) {
    links.forEach(function(link) {
      const href = link.getAttribute('href');
      link.classList.remove(activeClass);
      link.removeAttribute('aria-current');
      
      // Skip external links (e.g. About Us opens in a new tab on another domain)
      if (link.target === '_blank' || /^https?:\/\//.test(href)) {
        return;
      }
      
      if (normalizeNavPath(href) === currentPath) {
        link.classList.add(activeClass);
        link.setAttribute('aria-current', 'page');
      }
    });
  }
  
  applyActiveState(document.querySelectorAll('.header__nav-link'), 'header__nav-link--active');
  applyActiveState(document.querySelectorAll('.header__mobile-nav-link'), 'header__mobile-nav-link--active');
}

// =============================================
// Home Page Inline Video Embed
// =============================================

function initHomeVideoEmbed() {
  var playBtn = document.getElementById('play-walkthrough-btn');
  var embedContainer = document.getElementById('video-embed-container');
  
  // Fetch video ID from JSON file on GitHub
  var videoIdJsonUrl = 'https://raw.githubusercontent.com/raisingthefloor/learnandtry-webapp/data/public/data/lnt_video_youtube_id.json';
  var fallbackUrl = 'https://raisingthefloor.org/lnt-walkthrough';
  
  if (!playBtn || !embedContainer) return;
  
  function embedVideo() {
    fetch(videoIdJsonUrl)
      .then(function(response) {
        return response.json();
      })
      .then(function(data) {
        var videoId = data.videoId || data.video_id || data.id;
        
        if (videoId) {
          // Remove the play button and replace with iframe
          var iframe = document.createElement('iframe');
          iframe.setAttribute('src', 'https://www.youtube.com/embed/' + videoId + '?autoplay=1');
          iframe.setAttribute('title', 'Website Walkthrough Video');
          iframe.setAttribute('allowfullscreen', '');
          iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
          
          embedContainer.innerHTML = '';
          embedContainer.appendChild(iframe);
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
  
  playBtn.addEventListener('click', embedVideo);
}

// =============================================
// Initialize on DOM Ready
// =============================================

document.addEventListener('DOMContentLoaded', function() {
  initMobileMenu();
  setActiveNavLink();
  initHomeVideoEmbed();
});
