(function() {
  'use strict';

  // Function info content - updated structure per design spec
  var functionInfoContent = {
    'reading': {
      name: 'Reading',
      intro: 'Tools for users who have trouble reading, including dyslexia, not understanding the meanings of new or unknown words, idioms, eye tracking while reading, or any other reason a person struggles to read text.',
      featureGroups: [
        {
          label: 'Read text aloud',
          features: [
            'Text-to-speech for any content',
            'Highlighting words as they are read aloud'
          ]
        },
        {
          label: 'Visual reading aids',
          features: [
            'Highlighters and moving rulers',
            'Focus on line you are reading',
            'Removing distracting text',
            'Help finding the start of the next line'
          ]
        },
        {
          label: 'Text customization',
          features: [
            'Changing fonts, text size, boldness',
            'Colors and contrast of text',
            'Full-page color overlays',
            'Spacing of characters and lines',
            'Breaking words into syllables',
            'Dyslexia-friendly fonts'
          ]
        },
        {
          label: 'Language support',
          features: [
            'Dictionaries and translators',
            'Providing pronunciations',
            'Assistance with reading math'
          ]
        },
        {
          label: 'Document conversion',
          features: [
            'Transform pictures or scans into accessible formats',
            'Converting between digital document formats'
          ]
        }
      ],
      relatedCategories: [
        { name: 'Vision', reason: 'Includes features that make text larger or clearer, which can also make reading easier.' }
      ]
    },
    'writing': {
      name: 'Writing',
      intro: 'Tools for users who have any problems with writing, organizing thoughts, getting started, knowing the right words, spelling, grammar, or any other barrier to writing.',
      featureGroups: [
        {
          label: 'Organization',
          features: [
            'Structuring thoughts and ideas',
            'Outlining and mind mapping'
          ]
        },
        {
          label: 'Spelling and grammar',
          features: [
            'Context-aware spell checking',
            'Phonetic spell checking for dyslexia',
            'Grammar and punctuation checking',
            'Style and clarity suggestions'
          ]
        },
        {
          label: 'Writing assistance',
          features: [
            'Word predictors to speed typing',
            'Suggesting words and better phrasing',
            'Translation dictionaries',
            'Reading text aloud to catch errors'
          ]
        },
        {
          label: 'Specialized writing',
          features: [
            'Writing math equations',
            'Note-takers that turn recordings into text and summaries'
          ]
        }
      ],
      relatedCategories: [
        { name: 'Physical', reason: 'Physical tools include speech-to-text and keyboard alternatives for people who use alternatives to a standard keyboard.' }
      ]
    },
    'focus': {
      name: 'Attention and planning',
      intro: 'Tools for users who have any problems with executive functions including planning, focusing, staying on task, or finishing.',
      featureGroups: [
        {
          label: 'Focus aids',
          features: [
            'Gentle background sounds to block distracting noise',
            'Supporting calm focus',
            'Dimming or masking everything except the working area'
          ]
        },
        {
          label: 'Distraction control',
          features: [
            'Locking the device to a single app',
            'Blocking certain buttons or touch areas',
            'Hiding ads, menus, and other clutter',
            'Do Not Disturb function'
          ]
        },
        {
          label: 'Planning and organization',
          features: [
            'Help organizing your day, ideas, and tasks',
            'Visual schedules and reminders',
            'Simple goal-setting tools'
          ]
        },
        {
          label: 'Time management',
          features: [
            'Focus timers with planned breaks',
            'Quick ways to turn on helpful modes'
          ]
        }
      ],
      relatedCategories: [
        { name: 'Cognitive', reason: 'Includes features like simplifying language, breaking down complex information, and memory aids that can support focus and planning.' }
      ]
    },
    'cognitive': {
      name: 'Cognitive',
      intro: 'Tools for users who have any problems with thinking, remembering, or complex language or concepts.',
      featureGroups: [
        {
          label: 'Simplification',
          features: [
            'Language simplification',
            'Breaking complex sentences into simpler chunks',
            'Simplified screen layouts'
          ]
        },
        {
          label: 'Learning aids',
          features: [
            'Extra time to read pop-ups',
            'Automatic extraction of key ideas',
            'Vocabulary lists and study questions'
          ]
        },
        {
          label: 'Memory support',
          features: [
            'Memory aids and shortcuts',
            'Toolbars to make things easier to find',
            'Presenting information visually and auditorily'
          ]
        },
        {
          label: 'Distraction management',
          features: [
            'Distraction masking and removal',
            'Animation control'
          ]
        }
      ],
      relatedCategories: [
        { name: 'Vision', reason: 'For features that make things larger.' },
        { name: 'Attention and planning', reason: 'For features to help with distraction, focus, or executive functions.' },
        { name: 'Reading', reason: 'For features that read text aloud and other reading aids.' },
        { name: 'Writing', reason: 'Includes features for writing support.' },
        { name: 'Speech and communication', reason: 'If person has trouble with communication.' }
      ]
    },
    'vision': {
      name: 'Vision',
      intro: 'Tools for users who have any type of visual problem including color blindness, blurry vision, tunnel vision, central loss, contrast issues, or light sensitivity.',
      featureGroups: [
        {
          label: 'Magnification',
          features: [
            'Enlarging text, images, and cursors',
            'Changing text size'
          ]
        },
        {
          label: 'Color and contrast',
          features: [
            'Inverting screen colors',
            'Color filters for color blindness',
            'Enhancing text contrast',
            'High-contrast themes'
          ]
        },
        {
          label: 'Screen reading',
          features: [
            'Text-to-speech',
            'Simplified screen layouts'
          ]
        },
        {
          label: 'Format conversion',
          features: [
            'Image or text to e-book conversion',
            'Audio conversions'
          ]
        }
      ],
      relatedCategories: [
        { name: 'Reading', reason: 'For ebooks, read-aloud features, and other reading aids.' }
      ]
    },
    'braille': {
      name: 'Braille',
      intro: 'Tools for people who use braille to access computers.',
      featureGroups: [
        {
          label: 'Braille input and output',
          features: [
            'Support of braille displays and braille keyboards',
            'Using touchscreen as a six-dot braille keyboard'
          ]
        },
        {
          label: 'Conversion',
          features: [
            'Converting text and documents into electronic braille',
            'Support for multiple languages, math, and music notation'
          ]
        },
        {
          label: 'Multi-modal use',
          features: [
            'Using braille with speech output',
            'Using braille with enlarged text or screen'
          ]
        }
      ],
      relatedCategories: [
        { name: 'Speech and communication', reason: 'Includes tools that many Braille users use.' }
      ]
    },
    'hearing': {
      name: 'Hearing',
      intro: 'Tools for people who have trouble hearing computers or hearing them well enough, including when computers talk to them.',
      featureGroups: [
        {
          label: 'Audio enhancement',
          features: [
            'Amplification and filtering',
            'Frequency shifting',
            'Reducing background sounds'
          ]
        },
        {
          label: 'Visual alternatives',
          features: [
            'Visual indication of sounds',
            'Captions shown automatically',
            'Real-time text alongside spoken conversations'
          ]
        },
        {
          label: 'Speech-to-text',
          features: [
            'Transform spoken words into text',
            'Recording and summarizing meetings'
          ]
        },
        {
          label: 'Connections',
          features: [
            'Direct audio connection to hearing aids',
            'Tactile indications for alerts',
            'Translation to sign language'
          ]
        }
      ],
      relatedCategories: [
        { name: 'Writing', reason: 'For people whose native language is sign-language and would benefit from writing aids.' }
      ]
    },
    'physical': {
      name: 'Physical',
      intro: 'Tools for people who have trouble physically using, or using efficiently, computer keyboards, mice, or onscreen controls.',
      featureGroups: [
        {
          label: 'Keyboard alternatives',
          features: [
            'Using keyboard with one hand, one finger, or mouth-stick',
            'Easier use with tremor or athetotic movements',
            'Larger and smaller keyboards'
          ]
        },
        {
          label: 'Input methods',
          features: [
            'Speech control',
            'Eye-gaze and head movement',
            'Scanning with switches',
            'Morse or other codes'
          ]
        },
        {
          label: 'Input devices',
          features: [
            'Switches and joysticks',
            'Sip and puff',
            'Eye-blink or EMG signals'
          ]
        },
        {
          label: 'Efficiency',
          features: [
            'Word prediction and completion',
            'Macros and shortcuts',
            'Alternate mouse pointer control'
          ]
        }
      ],
      relatedCategories: [
        { name: 'Writing', reason: 'For techniques to speed up and help correct input.' },
        { name: 'Speech and communication', reason: 'For those who cannot speak or speak clearly.' }
      ]
    },
    'speech': {
      name: 'Speech and communication',
      intro: 'Tools for people who have trouble speaking or speaking clearly, or communicating spoken or written language.',
      featureGroups: [
        {
          label: 'Speech enhancement',
          features: [
            'Clarifying people\'s speech',
            'Recognizing difficult speech and re-speaking it clearly'
          ]
        },
        {
          label: 'Alternative communication',
          features: [
            'Communicate in text, sign language, pictures, or symbols',
            'Voice of your choosing including original voice',
            'Accelerating communication with non-speech input'
          ]
        },
        {
          label: 'Device control',
          features: [
            'Operating computers via speech input',
            'Controlling artificial agents'
          ]
        }
      ],
      relatedCategories: [
        { name: 'Physical', reason: 'For special interfaces for those who cannot use a keyboard well.' },
        { name: 'Writing', reason: 'For tools for faster and better written expression.' }
      ]
    }
  };

  var functionOrder = ['reading', 'writing', 'focus', 'cognitive', 'vision', 'braille', 'hearing', 'physical', 'speech'];

  // Mapping from category display names to accordion IDs
  var categoryNameToId = {
    'Reading': 'accordion-reading',
    'Writing': 'accordion-writing',
    'Attention and planning': 'accordion-attention',
    'Cognitive': 'accordion-cognitive',
    'Vision': 'accordion-vision',
    'Braille': 'accordion-braille',
    'Hearing': 'accordion-hearing',
    'Physical': 'accordion-physical',
    'Speech and communication': 'accordion-speech'
  };

  // Mapping from function keys to accordion IDs
  var functionKeyToAccordionId = {
    'reading': 'accordion-reading',
    'writing': 'accordion-writing',
    'focus': 'accordion-attention',
    'cognitive': 'accordion-cognitive',
    'vision': 'accordion-vision',
    'braille': 'accordion-braille',
    'hearing': 'accordion-hearing',
    'physical': 'accordion-physical',
    'speech': 'accordion-speech'
  };

  function createChevronSVG(isExpanded) {
    return '<svg class="learn-first__chevron' + (isExpanded ? ' is-expanded' : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  }

  function renderFunctions() {
    var container = document.getElementById('learn-first-functions');
    if (!container) return;

    var html = '';
    
    functionOrder.forEach(function(key) {
      var func = functionInfoContent[key];
      if (!func) return;

      var accordionId = functionKeyToAccordionId[key];
      html += '<div class="learn-first__function" data-function="' + key + '" id="' + accordionId + '">';
      html += '<button class="learn-first__function-toggle" aria-expanded="false" aria-controls="panel-' + key + '">';
      html += createChevronSVG(false);
      html += '<span class="learn-first__function-name">' + func.name + '</span>';
      html += '</button>';
      html += '<div class="learn-first__function-content" id="panel-' + key + '" style="display: none;">';
      
      // Intro content
      html += '<p class="learn-first__intro-text">' + func.intro + '</p>';
      
      // Feature groups - two-column layout at group level
      html += '<div class="learn-first__groups-grid">';
      html += '<div class="learn-first__groups-column learn-first__groups-column--left">';
      func.featureGroups.forEach(function(group, index) {
        // Odd-indexed groups (0, 2, 4...) go to left column
        if (index % 2 === 0) {
          html += '<div class="learn-first__subsection">';
          html += '<h4 class="learn-first__subsection-title">' + group.label + '</h4>';
          html += '<ul class="learn-first__feature-list">';
          group.features.forEach(function(feature) {
            html += '<li>' + feature + '</li>';
          });
          html += '</ul>';
          html += '</div>';
        }
      });
      html += '</div>';
      html += '<div class="learn-first__groups-column learn-first__groups-column--right">';
      func.featureGroups.forEach(function(group, index) {
        // Even-indexed groups (1, 3, 5...) go to right column
        if (index % 2 === 1) {
          html += '<div class="learn-first__subsection">';
          html += '<h4 class="learn-first__subsection-title">' + group.label + '</h4>';
          html += '<ul class="learn-first__feature-list">';
          group.features.forEach(function(feature) {
            html += '<li>' + feature + '</li>';
          });
          html += '</ul>';
          html += '</div>';
        }
      });
      html += '</div>';
      html += '</div>';
      
      // Related categories - inline text format with p elements
      if (func.relatedCategories && func.relatedCategories.length > 0) {
        html += '<hr class="learn-first__related-divider">';
        html += '<div class="learn-first__subsection learn-first__subsection--related">';
        html += '<h4 class="learn-first__subsection-title">Other categories that may also help</h4>';
        html += '<div class="learn-first__related-list">';
        func.relatedCategories.forEach(function(cat) {
          html += '<p class="learn-first__related-item">';
          html += '<span class="learn-first__related-name">' + cat.name + '</span>';
          html += '<span class="learn-first__related-sep"> — </span>';
          html += '<span class="learn-first__related-desc">' + cat.reason + '</span>';
          html += '</p>';
        });
        html += '</div>';
        html += '</div>';
      }
      
      html += '</div>'; // function-content
      html += '</div>'; // function
    });

    container.innerHTML = html;
  }

  function setupEventListeners() {
    var container = document.getElementById('learn-first-functions');
    if (!container) return;

    container.addEventListener('click', function(e) {
      // Handle accordion toggle clicks
      var functionToggle = e.target.closest('.learn-first__function-toggle');

      if (functionToggle) {
        var functionDiv = functionToggle.closest('.learn-first__function');
        var content = functionDiv.querySelector('.learn-first__function-content');
        var chevron = functionToggle.querySelector('.learn-first__chevron');
        var isExpanded = functionToggle.getAttribute('aria-expanded') === 'true';
        
        functionToggle.setAttribute('aria-expanded', !isExpanded);
        content.style.display = isExpanded ? 'none' : 'block';
        chevron.classList.toggle('is-expanded', !isExpanded);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function() {
    renderFunctions();
    setupEventListeners();
  });
})();
