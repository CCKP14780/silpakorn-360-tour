// Add these functions to your index.js file for better responsive behavior

// ===== RESPONSIVE UTILITIES =====

// Debounce function for resize events
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Detect screen size
function getScreenSize() {
  const width = window.innerWidth;
  if (width <= 480) return 'mobile';
  if (width <= 768) return 'tablet';
  if (width <= 1024) return 'tablet-landscape';
  return 'desktop';
}

// Adjust scenes per page based on screen size
function getScenesPerPage() {
  const screenSize = getScreenSize();
  switch (screenSize) {
    case 'mobile':
      return window.innerWidth <= 320 ? 1 : 2;
    case 'tablet':
      return 3;
    case 'tablet-landscape':
      return 4;
    default:
      return window.innerWidth >= 1441 ? 6 : 5;
  }
}

// ===== RESPONSIVE VIEWER ADJUSTMENTS =====

// Adjust Marzipano viewer controls based on device
function adjustViewerControls() {
  const isMobile = window.innerWidth <= 768;
  const controls = viewer.controls();
  
  if (isMobile) {
    // More sensitive controls on mobile
    controls.registerMethod('upElement', 
      new Marzipano.ElementPressControlMethod(viewUpElement, 'y', -0.5, 2), true);
    controls.registerMethod('downElement', 
      new Marzipano.ElementPressControlMethod(viewDownElement, 'y', 0.5, 2), true);
    controls.registerMethod('leftElement', 
      new Marzipano.ElementPressControlMethod(viewLeftElement, 'x', -0.5, 2), true);
    controls.registerMethod('rightElement', 
      new Marzipano.ElementPressControlMethod(viewRightElement, 'x', 0.5, 2), true);
  } else {
    // Original desktop sensitivity
    controls.registerMethod('upElement', 
      new Marzipano.ElementPressControlMethod(viewUpElement, 'y', -0.7, 3), true);
    controls.registerMethod('downElement', 
      new Marzipano.ElementPressControlMethod(viewDownElement, 'y', 0.7, 3), true);
    controls.registerMethod('leftElement', 
      new Marzipano.ElementPressControlMethod(viewLeftElement, 'x', -0.7, 3), true);
    controls.registerMethod('rightElement', 
      new Marzipano.ElementPressControlMethod(viewRightElement, 'x', 0.7, 3), true);
  }
}

// ===== RESPONSIVE SCENE LIST MODAL =====

// Update scenes per page and recalculate pagination
function updateScenesPerPageResponsive() {
  const newScenesPerPage = getScenesPerPage();
  
  if (newScenesPerPage !== SCENES_PER_PAGE) {
    SCENES_PER_PAGE = newScenesPerPage;
    
    // Recalculate current page to maintain current scene visibility
    currentPage = Math.floor(currentSceneIndex / SCENES_PER_PAGE);
    
    // If modal is open, refresh it
    const modal = document.getElementById('sceneListModal');
    if (modal && modal.classList.contains('visible')) {
      populateSceneListModal();
      updatePaginationButtons();
    }
  }
}

// ===== TOUCH GESTURE IMPROVEMENTS =====

// Add swipe support for scene navigation
let touchStartX = 0;
let touchEndX = 0;

function handleSwipe() {
  const swipeThreshold = 50;
  const diff = touchStartX - touchEndX;
  
  if (Math.abs(diff) > swipeThreshold) {
    if (diff > 0) {
      // Swipe left - next scene
      goToNextScene();
    } else {
      // Swipe right - previous scene
      goToPrevScene();
    }
  }
}

// Add to panoElement
const panoElement = document.getElementById('pano');

if (panoElement) {
  panoElement.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  panoElement.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, { passive: true });
}

// ===== ORIENTATION CHANGE HANDLING =====

function handleOrientationChange() {
  // Adjust viewer on orientation change
  setTimeout(() => {
    viewer.updateSize();
    adjustViewerControls();
    updateScenesPerPageResponsive();
  }, 200);
}

// Listen for orientation changes
window.addEventListener('orientationchange', handleOrientationChange);

// Also handle resize for desktop
const handleResize = debounce(() => {
  viewer.updateSize();
  adjustViewerControls();
  updateScenesPerPageResponsive();
  updateTabUnderline();
}, 250);

window.addEventListener('resize', handleResize);

// ===== PREVENT OVERSCROLL ON MOBILE =====

function preventOverscroll() {
  document.body.addEventListener('touchmove', function(e) {
    // Only prevent if we're not in a scrollable element
    const target = e.target;
    const scrollableParent = target.closest('.scene-list-content, .info-hotspot-text');
    
    if (!scrollableParent) {
      e.preventDefault();
    }
  }, { passive: false });
}

// Call on load
if (window.innerWidth <= 768) {
  preventOverscroll();
}

// ===== IMPROVED MODAL SCROLLING =====

// Prevent body scroll when modal is open
function lockBodyScroll() {
  document.body.style.overflow = 'hidden';
  document.body.style.position = 'fixed';
  document.body.style.width = '100%';
}

function unlockBodyScroll() {
  document.body.style.overflow = '';
  document.body.style.position = '';
  document.body.style.width = '';
}

// Update modal open/close to use scroll lock
const originalSceneListToggle = sceneListToggleElement.onclick;
sceneListToggleElement.addEventListener('click', function() {
  lockBodyScroll();
});

document.getElementById('sceneListClose').addEventListener('click', function() {
  unlockBodyScroll();
});

// ===== VIEWPORT HEIGHT FIX FOR MOBILE BROWSERS =====

function setVH() {
  // First we get the viewport height and multiply it by 1% to get a value for a vh unit
  let vh = window.innerHeight * 0.01;
  // Then we set the value in the --vh custom property to the root of the document
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

// Set on load
setVH();

// Re-calculate on resize
window.addEventListener('resize', debounce(setVH, 100));

// ===== INITIALIZE RESPONSIVE FEATURES =====

function initResponsiveFeatures() {
  adjustViewerControls();
  updateScenesPerPageResponsive();
  
  // Add responsive class to body
  document.body.classList.add('responsive-enabled');
  
  // Log current screen size for debugging
  console.log('Screen size:', getScreenSize());
  console.log('Scenes per page:', SCENES_PER_PAGE);
}

// Call on DOMContentLoaded
document.addEventListener('DOMContentLoaded', initResponsiveFeatures);

// ===== KEYBOARD NAVIGATION IMPROVEMENTS =====

// Add more keyboard shortcuts
document.addEventListener('keydown', function(e) {
  const tag = document.activeElement.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  
  switch(e.key) {
    case 'ArrowLeft':
      e.preventDefault();
      goToPrevScene();
      break;
    case 'ArrowRight':
      e.preventDefault();
      goToNextScene();
      break;
    case 'Escape':
      const modal = document.getElementById('sceneListModal');
      if (modal.classList.contains('visible')) {
        modal.classList.remove('visible');
        sceneListToggleElement.classList.remove('enabled');
        unlockBodyScroll();
      }
      break;
    case ' ':
      e.preventDefault();
      toggleAutorotate();
      break;
    case 'f':
      if (screenfull.enabled) {
        screenfull.toggle();
      }
      break;
  }
});

// ===== PERFORMANCE OPTIMIZATION =====

// Lazy load images in scene cards
function lazyLoadSceneImages() {
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          observer.unobserve(img);
        }
      }
    });
  });
  
  document.querySelectorAll('.scene-card img[data-src]').forEach(img => {
    imageObserver.observe(img);
  });
}

// Call after populating scene list
const originalPopulateSceneListModal = populateSceneListModal;
populateSceneListModal = function(...args) {
  originalPopulateSceneListModal.apply(this, args);
  // Lazy load images if on mobile
  if (window.innerWidth <= 768) {
    lazyLoadSceneImages();
  }
};