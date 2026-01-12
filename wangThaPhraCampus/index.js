/*
 * Copyright 2016 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

(function () {
  var Marzipano = window.Marzipano;
  var bowser = window.bowser;
  var screenfull = window.screenfull;
  var data = window.APP_DATA;

  // Grab elements from DOM.
  var panoElement = document.querySelector('#pano');
  var sceneNameElement = document.querySelector('#sceneTitle');
  var sceneListElement = document.querySelector('#sceneList');
  var sceneElements = document.querySelectorAll('#sceneList .scene');
  var sceneListToggleElement = document.querySelector('#sceneListToggle');
  var autorotateToggleElement = document.querySelector('#autorotateToggle');
  var fullscreenToggleElement = document.querySelector('#fullscreenToggle');
  var prevSceneBtn = document.querySelector('#prevScene');
  var nextSceneBtn = document.querySelector('#nextScene');


  // Detect desktop or mobile mode.
  if (window.matchMedia) {
    var mql = matchMedia("(max-width: 500px), (max-height: 500px)");
    var setMode = function () {
      if (mql.matches) {
        document.body.classList.remove('desktop');
        document.body.classList.add('mobile');
      } else {
        document.body.classList.remove('mobile');
        document.body.classList.add('desktop');
      }
    };

    setMode();
    mql.addListener(setMode);
  } else {
    document.body.classList.add('desktop');
  }

  // Detect whether we are on a touch device.
  document.body.classList.add('no-touch');
  window.addEventListener('touchstart', function () {
    document.body.classList.remove('no-touch');
    document.body.classList.add('touch');
  });

  // Use tooltip fallback mode on IE < 11.
  if (bowser.msie && parseFloat(bowser.version) < 11) {
    document.body.classList.add('tooltip-fallback');
  }

  // Viewer options.
  var viewerOpts = {
    controls: {
      mouseViewMode: data.settings.mouseViewMode
    }
  };

  // Initialize viewer.
  var viewer = new Marzipano.Viewer(panoElement, viewerOpts);

  // Collapsed scene navigation (prev / next buttons)
  if (prevSceneBtn && nextSceneBtn) {
    prevSceneBtn.addEventListener('click', goToPrevScene);
    nextSceneBtn.addEventListener('click', goToNextScene);
  }

  // Scene List Modal pagination buttons
  var scenePrevBtn = document.getElementById('scenePrevBtn');
  var sceneNextBtn = document.getElementById('sceneNextBtn');

  if (scenePrevBtn && sceneNextBtn) {
    scenePrevBtn.addEventListener('click', prevScenePage);
    sceneNextBtn.addEventListener('click', nextScenePage);
  }

  // Create scenes.
  var scenes = data.scenes.map(function (data) {
    var urlPrefix = "tiles";
    var source = Marzipano.ImageUrlSource.fromString(
      urlPrefix + "/" + data.id + "/{z}/{f}/{y}/{x}.jpg",
      { cubeMapPreviewUrl: urlPrefix + "/" + data.id + "/preview.jpg" });
    var geometry = new Marzipano.CubeGeometry(data.levels);

    var limiter = Marzipano.RectilinearView.limit.traditional(data.faceSize, 100 * Math.PI / 180, 120 * Math.PI / 180);
    var view = new Marzipano.RectilinearView(data.initialViewParameters, limiter);

    var scene = viewer.createScene({
      source: source,
      geometry: geometry,
      view: view,
      pinFirstLevel: true
    });

    // Create link hotspots.
    data.linkHotspots.forEach(function (hotspot) {
      var element = createLinkHotspotElement(hotspot);
      scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    });

    // Create info hotspots.
    data.infoHotspots.forEach(function (hotspot) {
      var element = createInfoHotspotElement(hotspot);
      scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    });

    return {
      data: data,
      scene: scene,
      view: view
    };
  });

  // Track which scene is currently active (by index)
  var currentSceneIndex = 0;
  var SCENES_PER_PAGE = 5;
  var currentPage = 0;

  // Get the scene title element for the collapsed navigator
  // var collapsedSceneTitle = document.getElementById('sceneTitle');

  // Set up autorotate, if enabled.
  var autorotate = Marzipano.autorotate({
    yawSpeed: 0.03,
    targetPitch: 0,
    targetFov: Math.PI / 2
  });
  if (data.settings.autorotateEnabled) {
    autorotateToggleElement.classList.add('enabled');
  }

  // Set handler for autorotate toggle.
  autorotateToggleElement.addEventListener('click', toggleAutorotate);

  // Set up fullscreen mode, if supported.
  if (screenfull.enabled && data.settings.fullscreenButton) {
    document.body.classList.add('fullscreen-enabled');
    fullscreenToggleElement.addEventListener('click', function () {
      screenfull.toggle();
    });
    screenfull.on('change', function () {
      if (screenfull.isFullscreen) {
        fullscreenToggleElement.classList.add('enabled');
      } else {
        fullscreenToggleElement.classList.remove('enabled');
      }
    });
  } else {
    document.body.classList.add('fullscreen-disabled');
  }

  // Set handler for scene list toggle.
  // OLD: sceneListToggleElement.addEventListener('click', toggleSceneList);
  sceneListToggleElement.addEventListener('click', function () {
    currentPage = Math.floor(currentSceneIndex / SCENES_PER_PAGE);
    document.getElementById('sceneListModal').classList.add('visible');
    sceneListToggleElement.classList.add('enabled');
    populateSceneListModal();
    updatePaginationButtons();
  });

  document.getElementById('sceneListClose').addEventListener('click', function () {
    document.getElementById('sceneListModal').classList.remove('visible');
    sceneListToggleElement.classList.remove('enabled');
  });

  // PUKAN: Hide old Scene List code
  // // Start with the scene list open on desktop.
  // if (!document.body.classList.contains('mobile')) {
  //   showSceneList();
  // }

  // // Set handler for scene switch.
  // scenes.forEach(function(scene) {
  //   var el = document.querySelector('#sceneList .scene[data-id="' + scene.data.id + '"]');
  //   el.addEventListener('click', function() {
  //     switchScene(scene);
  //     // On mobile, hide scene list after selecting a scene.
  //     if (document.body.classList.contains('mobile')) {
  //       hideSceneList();
  //     }
  //   });
  // });

  // DOM elements for view controls.
  var viewUpElement = document.querySelector('#viewUp');
  var viewDownElement = document.querySelector('#viewDown');
  var viewLeftElement = document.querySelector('#viewLeft');
  var viewRightElement = document.querySelector('#viewRight');
  var viewInElement = document.querySelector('#viewIn');
  var viewOutElement = document.querySelector('#viewOut');

  // Dynamic parameters for controls.
  var velocity = 0.7;
  var friction = 3;

  // Associate view controls with elements.
  var controls = viewer.controls();
  controls.registerMethod('upElement', new Marzipano.ElementPressControlMethod(viewUpElement, 'y', -velocity, friction), true);
  controls.registerMethod('downElement', new Marzipano.ElementPressControlMethod(viewDownElement, 'y', velocity, friction), true);
  controls.registerMethod('leftElement', new Marzipano.ElementPressControlMethod(viewLeftElement, 'x', -velocity, friction), true);
  controls.registerMethod('rightElement', new Marzipano.ElementPressControlMethod(viewRightElement, 'x', velocity, friction), true);
  controls.registerMethod('inElement', new Marzipano.ElementPressControlMethod(viewInElement, 'zoom', -velocity, friction), true);
  controls.registerMethod('outElement', new Marzipano.ElementPressControlMethod(viewOutElement, 'zoom', velocity, friction), true);

  function sanitize(s) {
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;');
  }

  function switchScene(scene) {
    stopAutorotate();

    // Update current scene index (ONLY ONCE)
    currentSceneIndex = scenes.findIndex(function (s) {
      return s.data.id === scene.data.id;
    });

    scene.view.setParameters(scene.data.initialViewParameters);
    scene.scene.switchTo();

    startAutorotate();
    updateSceneName(scene);
    updateSceneList(scene);

    // Update collapsed navigator title
    // if (collapsedSceneTitle) {
    //   collapsedSceneTitle.textContent = scene.data.name;
    // }

    // Update modal UI
    updateActiveSceneCard();
    updateScenePagination();
  }


  function goToNextScene() {
    var nextIndex = currentSceneIndex + 1;

    if (nextIndex >= scenes.length) {
      nextIndex = 0; // loop to first
    }

    switchScene(scenes[nextIndex]);
  }

  function goToPrevScene() {
    var prevIndex = currentSceneIndex - 1;

    if (prevIndex < 0) {
      prevIndex = scenes.length - 1; // loop to last
    }

    switchScene(scenes[prevIndex]);
  }

  // keyboard navigation
  document.addEventListener('keydown', function (e) {
    // Ignore keyboard when typing in inputs (future-proof)
    const tag = document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    switch (e.key) {
      case 'ArrowLeft':
        goToPrevScene();
        break;

      case 'ArrowRight':
        goToNextScene();
        break;

      case 'Escape':
        const modal = document.getElementById('sceneListModal');
        if (modal.classList.contains('visible')) {
          modal.classList.remove('visible');
        }
        break;
    }
  });

  function updateSceneName(scene) {
    sceneNameElement.innerHTML = sanitize(scene.data.name);
  }

  function updateSceneList(scene) {
    for (var i = 0; i < sceneElements.length; i++) {
      var el = sceneElements[i];
      if (el.getAttribute('data-id') === scene.data.id) {
        el.classList.add('current');
      } else {
        el.classList.remove('current');
      }
    }
  }

  function showSceneList() {
    sceneListElement.classList.add('enabled');
    sceneListToggleElement.classList.add('enabled');
  }

  function hideSceneList() {
    sceneListElement.classList.remove('enabled');
    sceneListToggleElement.classList.remove('enabled');
  }

  function toggleSceneList() {
    sceneListElement.classList.toggle('enabled');
    sceneListToggleElement.classList.toggle('enabled');
  }

  function startAutorotate() {
    if (!autorotateToggleElement.classList.contains('enabled')) {
      return;
    }
    viewer.startMovement(autorotate);
    viewer.setIdleMovement(3000, autorotate);
  }

  function stopAutorotate() {
    viewer.stopMovement();
    viewer.setIdleMovement(Infinity);
  }

  function toggleAutorotate() {
    if (autorotateToggleElement.classList.contains('enabled')) {
      autorotateToggleElement.classList.remove('enabled');
      stopAutorotate();
    } else {
      autorotateToggleElement.classList.add('enabled');
      startAutorotate();
    }
  }

  function createLinkHotspotElement(hotspot) {
    var wrapper = document.createElement('div');
    wrapper.classList.add('hotspot', 'link-hotspot', 'link-hotspot-static');

    var iconWrapper = document.createElement('div');
    iconWrapper.classList.add('link-hotspot-icon-wrapper');

    var icon = document.createElement('i');
    icon.classList.add('fa-solid', 'fa-circle-chevron-up', 'link-hotspot-fa');

    var transformProperties = ['-ms-transform', '-webkit-transform', 'transform'];
    for (var i = 0; i < transformProperties.length; i++) {
      var property = transformProperties[i];
      iconWrapper.style[property] = 'rotate(' + hotspot.rotation + 'rad)';
    }

    iconWrapper.appendChild(icon);
    wrapper.appendChild(iconWrapper);

    var tooltip = document.createElement('div');
    tooltip.classList.add('hotspot-tooltip', 'link-hotspot-tooltip');
    tooltip.innerHTML = findSceneDataById(hotspot.target).name;
    wrapper.appendChild(tooltip);

    wrapper.addEventListener('click', function () {
      switchScene(findSceneById(hotspot.target));
    });
    stopTouchAndScrollEventPropagation(wrapper);

    return wrapper;
  }

  function createInfoHotspotElement(hotspot) {
    var wrapper = document.createElement('div');
    wrapper.classList.add('hotspot', 'info-hotspot-static');

    var header = document.createElement('div');
    header.classList.add('info-hotspot-trigger');

    // 1. The Icon Wrapper
    var iconWrapper = document.createElement('div');
    iconWrapper.classList.add('info-hotspot-icon-wrapper');
    var icon = document.createElement('i');
    icon.classList.add('fa-solid', 'fa-circle-info', 'info-hotspot-fa');
    iconWrapper.appendChild(icon);
    header.appendChild(iconWrapper);

    // 3. Click Handler for the Modal
    header.addEventListener('click', function () {
      document.getElementById('infoHotspotTitle').innerText = hotspot.title;
      document.getElementById('infoHotspotText').innerText = hotspot.text;
      var modalImg = document.getElementById('infoHotspotImage');
      if (hotspot.image) {
        modalImg.src = hotspot.image;
        modalImg.style.display = 'block';
      } else {
        modalImg.style.display = 'none';
      }
      var modalElement = document.getElementById('infoHotspotModal');
      var myModal = bootstrap.Modal.getOrCreateInstance(modalElement);
      myModal.show();
    });

    wrapper.appendChild(header);
    stopTouchAndScrollEventPropagation(wrapper);
    return wrapper;
  }

  // Prevent touch and scroll events from reaching the parent element.
  function stopTouchAndScrollEventPropagation(element, eventList) {
    var eventList = ['touchstart', 'touchmove', 'touchend', 'touchcancel',
      'wheel', 'mousewheel'];
    for (var i = 0; i < eventList.length; i++) {
      element.addEventListener(eventList[i], function (event) {
        event.stopPropagation();
      });
    }
  }

  function findSceneById(id) {
    for (var i = 0; i < scenes.length; i++) {
      if (scenes[i].data.id === id) {
        return scenes[i];
      }
    }
    return null;
  }

  function findSceneDataById(id) {
    for (var i = 0; i < data.scenes.length; i++) {
      if (data.scenes[i].id === id) {
        return data.scenes[i];
      }
    }
    return null;
  }

  // Scene List Modal population
  function populateSceneListModal(direction) {
    var container = document.getElementById('sceneListModalContent');

    var oldRow = container.querySelector('.scene-list-row');

    if (oldRow) {
      oldRow.classList.add(
        direction === 'next' ? 'slide-out-left' : 'slide-out-right'
      );

      setTimeout(function () {
        renderNewScenePage(container, direction);
      }, 300);
    } else {
      renderNewScenePage(container, direction);
    }
  }

  function renderNewScenePage(container, direction) {
    container.innerHTML = '';

    var row = document.createElement('div');
    row.className = 'scene-list-row';

    // Start slightly offset for slide-in
    row.style.transform =
      direction === 'next' ? 'translateX(40px)' : 'translateX(-40px)';
    row.style.opacity = '0';

    var start = currentPage * SCENES_PER_PAGE;
    var end = start + SCENES_PER_PAGE;

    scenes.slice(start, end).forEach(function (sceneObj) {
      var data = sceneObj.data;

      var card = document.createElement('div');
      card.className = 'scene-card';
      card.dataset.sceneId = data.id;

      var img = document.createElement('img');
      // CHANGE THIS LINE:
      // From: img.src = 'tiles/' + data.id + '/preview.jpg';
      // To: 
      img.src = data.card_image;

      var title = document.createElement('div');
      title.className = 'scene-card-title';
      title.textContent = data.name;

      card.addEventListener('click', function () {
        switchScene(sceneObj);
        document.getElementById('sceneListModal').classList.remove('visible');
      });

      card.appendChild(img);
      card.appendChild(title);
      row.appendChild(card);
    });

    container.appendChild(row);

    requestAnimationFrame(function () {
      row.classList.add('slide-in');
      row.style.transform = 'translateX(0)';
      row.style.opacity = '1';
    });

    updateScenePagination();
    updateActiveSceneCard();
    updatePaginationButtons();
  }


  function nextScenePage() {
    var maxPage = Math.ceil(scenes.length / SCENES_PER_PAGE) - 1;

    if (currentPage < maxPage) {
      currentPage++;
      populateSceneListModal('next');
    }

    updatePaginationButtons();
  }


  function prevScenePage() {
    if (currentPage > 0) {
      currentPage--;
      populateSceneListModal('prev');
    }

    updatePaginationButtons();
  }



  function updateActiveSceneCard() {
    var cards = document.querySelectorAll('.scene-card');

    cards.forEach(function (card) {
      if (card.dataset.sceneId === scenes[currentSceneIndex].data.id) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });
  }

  function updateScenePagination() {
    var indicator = document.getElementById('scenePageIndicator');

    if (!indicator) return;

    var totalPages = Math.ceil(scenes.length / SCENES_PER_PAGE);
    indicator.textContent = (currentPage + 1) + ' / ' + totalPages;
  }

  function updatePaginationButtons() {
    var prevBtn = document.getElementById('scenePrevBtn');
    var nextBtn = document.getElementById('sceneNextBtn');

    if (!prevBtn || !nextBtn) return;

    var totalPages = Math.ceil(scenes.length / SCENES_PER_PAGE);

    // FIRST PAGE (1 / X)
    prevBtn.disabled = currentPage === 0;

    // LAST PAGE (X / X)
    nextBtn.disabled = currentPage === totalPages - 1;

    // Visual feedback
    prevBtn.style.opacity = prevBtn.disabled ? '0.4' : '1';
    prevBtn.style.pointerEvents = prevBtn.disabled ? 'none' : 'auto';

    nextBtn.style.opacity = nextBtn.disabled ? '0.4' : '1';
    nextBtn.style.pointerEvents = nextBtn.disabled ? 'none' : 'auto';
  }



  // Display the initial scene.
  switchScene(scenes[0]);
  populateSceneListModal();

})();
