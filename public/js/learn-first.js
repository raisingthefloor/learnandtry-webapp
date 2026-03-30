(function() {
  'use strict';

  // Function info content - same data as browse-tools.js
  var functionInfoContent = {
    'reading': {
      name: 'Reading',
      intro: '<strong>READING</strong> includes tools for users who have trouble reading, including dyslexia, not understanding the meanings of new/unknown words, idioms, eye tracking while reading, or any other reason a person struggles to read text.',
      features: [
        'features for reading text aloud',
        'highlighting words as you read - or as they are read aloud',
        'dictionaries, translators, dyslexia fonts',
        'highlighters and moving rulers or lines that put focus on line you are reading',
        'removing distracting text',
        'help finding the start of the next line of text when reading',
        'changing fonts, text size, boldness, colors and contrast of text',
        'full-page color overlays to reduce visual stress',
        'changing spacing of characters and lines',
        'breaking words into hyphenated syllables',
        'providing pronunciations',
        'transform pictures or scans of paper documents into other accessible documents including ebooks, text, WORD, etc',
        'transforming one digital document format into another more accessible format for the user',
        'assistance with reading math'
      ],
      seeAlso: '<p class="info-note">Some features in the following other categories might be useful:</p><ul class="info-list"><li><strong>Vision</strong> (some features for making text larger or clearer might make text easier to read)</li></ul>'
    },
    'writing': {
      name: 'Writing',
      intro: '<strong>WRITING</strong> includes tools for users who have any problems with writing, organizing thoughts, getting started, knowing the right words, spelling, grammar, fear of bad output or any other barrier to writing.',
      features: [
        'features for organizing and structuring thoughts and ideas',
        'spelling, grammar, and punctuation checking (including context-aware and phonetic spell checking for dyslexia) (done as you type or when you ask)',
        'helping with style, and clarity',
        'suggesting words and better phrasing',
        'word predictors (to speed typing)',
        'translation dictionaries',
        'reading text aloud to better catch errors',
        'assistance writing/typing math equations',
        'note-takers that turn recorded lectures, meetings, or videos into searchable text notes and summaries'
      ],
      seeAlso: '<p class="info-note">Some features in the following other categories might be useful:</p><ul class="info-list"><li><strong>Physical</strong> (for solutions like speech-to-text, alternatives to standard keyboard input, etc. if user has trouble with using keyboard)</li></ul>'
    },
    'focus': {
      name: 'Focus/Planning/Exec',
      intro: '<strong>FOCUS/PLANNING/EXEC</strong> includes tools for users who have any problems with executive functions including planning, focusing, staying on task, or finishing.',
      features: [
        'Features for playing gentle background sounds (such as rain or waves) to block distracting noise',
        'supporting calm focus',
        'locking the device to a single app',
        'blocking certain buttons or touch areas so a user doesn\'t accidentally leave the task they are working on',
        'hiding ads, menus, and other clutter',
        'dimming or masking everything on the screen except the line or area they are working on so their eyes stay on one place',
        'help organizing and structuring your day, your ideas, your tasks',
        'support for executive skills with visual schedules, reminders, and simple goal-setting tools',
        'providing focus timers with planned breaks',
        'controlling distractions',
        '"Do Not Disturb" function to cut down interruptions',
        'ways to quickly turn on these or other helpful modes or features'
      ],
      seeAlso: '<p class="info-note">Some features in the following other categories might be useful:</p><ul class="info-list"><li><strong>Cognitive</strong> (for other related cognitive processing tools that may be helpful)</li></ul>'
    },
    'cognitive': {
      name: 'Cognitive',
      intro: '<strong>COGNITIVE</strong> includes tools for users who have any problems with thinking, remembering, or complex language or concepts.',
      features: [
        'language simplification',
        'extra time to read pop-ups',
        'breaking complex sentences into simpler chunks/phrases for easier understanding',
        'automatic extraction of key ideas, vocabulary lists, or study questions from text',
        'memory aids, and shortcuts that do not involve memorization',
        'toolbars to make things easier to find and use',
        'simplified screen layouts',
        'distraction masking and removal',
        'animation control',
        'presentation of information both visually and auditorily'
      ],
      seeAlso: '<p class="info-note">Some features in the following other categories might be useful:</p><ul class="info-list"><li><strong>Vision</strong> (for additional features that make things larger)</li><li><strong>Focus/Planning/Exec</strong> (for features to help with distraction, focus, planning or other executive functions)</li><li><strong>Reading</strong> (for features that read text aloud and other reading aids)</li><li><strong>Writing</strong> (for things to help with writing)</li><li><strong>Speech/Comm</strong> (if person has trouble with communication)</li></ul>'
    },
    'vision': {
      name: 'Vision',
      intro: '<strong>VISION</strong> includes tools for users who have any type of visual problem (color blindness, blurry vision, tunnel vision, central loss, contrast, light sensitivity, etc.)',
      features: [
        'features for enlarging text, images, and cursors',
        'inverting screen colors',
        'applying color filters to shift colors to accommodate people with color blindness (who cannot see some colors)',
        'enhancing text contrast so text stands out more clearly',
        'increasing overall contrast and/or choose high-contrast themes so low-contrast text and controls are easier to see',
        'changing text size',
        'simplified screen layouts',
        'changing text-to-speech',
        'changing image or text to e-book and audio conversions'
      ],
      seeAlso: '<p class="info-note">Some features in the following other categories might be useful:</p><ul class="info-list"><li><strong>Reading</strong> (for ebooks, read-aloud features, and other reading aids)</li></ul>'
    },
    'braille': {
      name: 'Braille',
      intro: '<strong>BRAILLE</strong> tools are for people who use braille to access computers.',
      features: [
        'support of braille displays and braille keyboards to read screen content and interact with software',
        'converting printed or digital text, web pages, and scanned documents into electronic braille or braille-ready files (including support for multiple languages, mathematics, and music notation)',
        'using an on-screen touchscreen as a six-dot braille keyboard',
        '(for those with hearing) using braille in parallel with speech output',
        '(for those with some vision) using braille in parallel with enlarged text and/or screen'
      ],
      seeAlso: '<p class="info-note">Some features in the following other categories might be useful:</p><ul class="info-list"><li><strong>Vision</strong> (most braille users also will use the tools in the Vision category)</li></ul>'
    },
    'hearing': {
      name: 'Hearing',
      intro: '<strong>HEARING</strong> tools have computer-based features people who have trouble using computers if they cannot hear them or hear them well enough including when computers talk to them.',
      features: [
        'features for making it easier to hear and understand speech through amplification, filtering, and/or frequency shifting',
        'reducing background sounds',
        'providing visual indication of or identifying any sounds',
        'transform any spoken words and sounds (live or recorded) into text',
        'translate words into sign language',
        'show any captions automatically',
        'record, transform into text, and summarize meetings',
        'provide real-time text alongside spoken conversations',
        'connection of audio directly to hearing aids',
        'and provision of tactile indications for alerts'
      ],
      seeAlso: '<p class="info-note">Some features in the following other categories might be useful:</p><ul class="info-list"><li><strong>Writing</strong> (for people whose native language is sign-language and would benefit from writing aids since writing is done in a language different from sign)</li></ul>'
    },
    'physical': {
      name: 'Physical',
      intro: '<strong>PHYSICAL</strong> includes tools for people who have trouble physically using, or using efficiently, computers keyboards, mice, or onscreen controls.',
      features: [
        'features for making it easier to use keyboards or mice with one hand, one finger, a mouth-stick or head-stick',
        'making it easier to use keyboard or mice with tremor or athetotic movements (like Cerebral Palsy)',
        'typing and controlling the computer via a wide variety of alternate input techniques - including but not limited to speech, eye-gaze, head movement or pointing, scanning (one or two switch), morse or other codes',
        'providing input using a wide variety of input devices including larger and smaller keyboards, switches, joysticks, sip and puff, eye-blink or EMG (small electrical signals from muscles trying to move)',
        'speeding up input with word prediction, word completion, macros, and other techniques',
        'alternate ways to control a mouse pointer including using keys on a keyboard (or alternate keyboard)'
      ],
      seeAlso: '<p class="info-note">Some features in the following other categories might be useful:</p><ul class="info-list"><li><strong>Writing</strong> (for techniques to speed up and help correct input after using any of the above techniques)</li><li><strong>Speech/Communication</strong> (for those who cannot speak or speak clearly)</li></ul>'
    },
    'speech': {
      name: 'Speech/Communication',
      intro: '<strong>SPEECH/COMMUNICATION</strong> includes tools for people who have trouble speaking or speaking clearly or communicating spoken or written language.',
      features: [
        'features for clarifying people\'s speech',
        'recognizing some types of difficult to understand speech and re-speaking it clearly',
        'letting people communicate in text, sign language, pictures, symbols, or voice of their choosing (including original voice for those who have lost it)',
        'accelerating communication when using non-speech input methods',
        'allowing people to operate devices including computers and artificial agents via their or artificial speech input'
      ],
      seeAlso: '<p class="info-note">Some features in the following other categories might be useful:</p><ul class="info-list"><li><strong>Physical</strong> (for special interfaces for those who cannot use a keyboard or use it well)</li><li><strong>Writing</strong> (for tools for faster and better written expression)</li></ul>'
    }
  };

  var functionOrder = ['reading', 'writing', 'focus', 'cognitive', 'vision', 'braille', 'hearing', 'physical', 'speech'];

  function createChevronSVG(isExpanded) {
    return '<svg class="learn-first__chevron' + (isExpanded ? ' is-expanded' : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>';
  }

  function renderFunctions() {
    var container = document.getElementById('learn-first-functions');
    if (!container) return;

    var html = '';
    
    functionOrder.forEach(function(key) {
      var func = functionInfoContent[key];
      if (!func) return;

      html += '<div class="learn-first__function" data-function="' + key + '">';
      html += '<button class="learn-first__function-toggle" aria-expanded="false">';
      html += createChevronSVG(false);
      html += '<span class="learn-first__function-name">' + func.name + '</span>';
      html += '</button>';
      html += '<div class="learn-first__function-content" style="display: none;">';
      
      // Intro content (promoted from "Who these tools can help")
      html += '<p class="learn-first__intro-text">' + func.intro + '</p>';
      
      // Features these tools might provide
      html += '<div class="learn-first__subsection">';
      html += '<button class="learn-first__subsection-toggle" aria-expanded="false">';
      html += createChevronSVG(false);
      html += '<span>Features these tools might provide</span>';
      html += '</button>';
      html += '<div class="learn-first__subsection-content" style="display: none;">';
      html += '<ul class="learn-first__feature-list">';
      func.features.forEach(function(feature) {
        html += '<li>' + feature + '</li>';
      });
      html += '</ul>';
      html += '</div>';
      html += '</div>';
      
      // Other tool types that might also help
      html += '<div class="learn-first__subsection">';
      html += '<button class="learn-first__subsection-toggle" aria-expanded="false">';
      html += createChevronSVG(false);
      html += '<span>Other tool types that might also help</span>';
      html += '</button>';
      html += '<div class="learn-first__subsection-content" style="display: none;">';
      html += func.seeAlso;
      html += '</div>';
      html += '</div>';
      
      html += '</div>'; // function-content
      html += '</div>'; // function
    });

    container.innerHTML = html;
  }

  function setupEventListeners() {
    var container = document.getElementById('learn-first-functions');
    if (!container) return;

    container.addEventListener('click', function(e) {
      var functionToggle = e.target.closest('.learn-first__function-toggle');
      var subsectionToggle = e.target.closest('.learn-first__subsection-toggle');

      if (functionToggle) {
        var functionDiv = functionToggle.closest('.learn-first__function');
        var content = functionDiv.querySelector('.learn-first__function-content');
        var chevron = functionToggle.querySelector('.learn-first__chevron');
        var isExpanded = functionToggle.getAttribute('aria-expanded') === 'true';
        
        functionToggle.setAttribute('aria-expanded', !isExpanded);
        content.style.display = isExpanded ? 'none' : 'block';
        chevron.classList.toggle('is-expanded', !isExpanded);
      }

      if (subsectionToggle) {
        var subsection = subsectionToggle.closest('.learn-first__subsection');
        var content = subsection.querySelector('.learn-first__subsection-content');
        var chevron = subsectionToggle.querySelector('.learn-first__chevron');
        var isExpanded = subsectionToggle.getAttribute('aria-expanded') === 'true';
        
        subsectionToggle.setAttribute('aria-expanded', !isExpanded);
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
