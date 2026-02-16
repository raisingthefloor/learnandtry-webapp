/**
 * Browse Tools - Vanilla JS Implementation
 * Matches the React/Tailwind version exactly
 */

(function() {
  'use strict';

  // ============================================
  // STATE
  // ============================================
  
  var allTools = [];
  var filteredTools = [];
  var currentPage = 1;
  var itemsPerPage = 20;
  var sortBy = 'name';
  var searchQuery = '';
  var expandedToolIds = new Set();
  var expandedFunctionInfoIds = new Set();
  var expandedSeeAlsoGroupIds = new Set();
  var seeAlsoInfoExpanded = true;
  var markedToolIds = new Set();
  var showMarkedOnly = false;
  var savedFiltersBeforeMarkedMode = null;
  var savedSearchBeforeMarkedMode = '';
  
  var filters = {
    functions: [],
    devices: [],
    installTypes: [],
    purchaseOptions: []
  };

  // ============================================
  // CONSTANTS
  // ============================================

  var FUNCTION_OPTIONS = [
    'Reading', 'Writing', 'Focus/Planning/Exec', 'Cognitive', 
    'Vision', 'Braille Tools', 'Hearing', 'Physical', 'Speech/Communication'
  ];
  
  var DEVICE_OPTIONS = [
    'PC (Windows)', 'Macintosh', 'Chromebook', 'iPad', 'iPhone', 'Android'
  ];
  
  var INSTALL_OPTIONS = [
    'Built-in (no install)', 'Web-Based (no install)', 'Need to install'
  ];
  
  var PURCHASE_OPTIONS = [
    'Free', 'Free Trial', 'Lifetime License', 'Subscription'
  ];

  var filterDescriptions = {
    'Reading': 'Tools to help individuals with reading disabilities (e.g. dyslexia, low vision).',
    'Writing': 'Tools to help individuals who have trouble writing.',
    'Focus/Planning/Exec': 'Tools to help reduce distractions, stay organized, plan, and manage time.',
    'Cognitive': 'Tools to help with memory, understanding and processing.',
    'Vision': 'Tools to help see more clearly, as well as alternatives to sight.',
    'Braille Tools': 'Tools for braille users.',
    'Hearing': 'Tools for hard-of-hearing or deaf individuals.',
    'Physical': 'Tools for those who have trouble with standard keyboards, mice.',
    'Speech/Communication': 'Tools for those with unclear or no speech.',
    'PC (Windows)': 'See each product description for Windows version compatibility.',
    'Macintosh': 'See each product description for macOS version compatibility.',
    'Chromebook': 'Most Chromebook products work with all Chromebooks though some may only work with the latest ChromeOS updates.',
    'iPad': 'Products work with iPads supporting the latest iOS.',
    'iPhone': 'Products work with iPhones supporting the latest iOS.',
    'Android': 'See each product description for Android version compatibility.',
    'Built-in (no install)': 'Solutions already part of the computer or browser.',
    'Web-Based (no install)': 'Solutions that work without installing software.',
    'Need to install': 'Solutions that need to be installed.',
    'Free': 'Products that are completely free.',
    'Free Trial': 'Products that have a free trial before you buy.',
    'Lifetime License': 'Products you pay for once.',
    'Subscription': 'Products you pay for monthly or yearly.'
  };

  // Function info content for expandable headers
  var functionInfoContent = {
    'reading': {
      name: 'READING',
      content: '<p class="info-intro"><strong>READING</strong> includes tools for users who have trouble reading, including dyslexia, not understanding the meanings of new/unknown words, idioms, eye tracking while reading, or any other reason a person struggles to read text.</p><p class="info-section-title">TYPICAL FEATURES FOUND IN THESE TOOLS:</p><ul class="info-list"><li>features for reading text aloud</li><li>highlighting words as you read - or as they are read aloud</li><li>dictionaries, translators, dyslexia fonts</li><li>highlighters and moving rulers or lines that put focus on line you are reading</li><li>removing distracting text</li><li>help finding the start of the next line of text when reading</li><li>changing fonts, text size, boldness, colors and contrast of text</li><li>full-page color overlays to reduce visual stress</li><li>changing spacing of characters and lines</li><li>breaking words into hyphenated syllables</li><li>providing pronunciations</li><li>transform pictures or scans of paper documents into other accessible documents including ebooks, text, WORD, etc</li><li>transforming one digital document format into another more accessible format for the user</li><li>assistance with reading math</li></ul><p class="info-section-title">SEE ALSO:</p><p class="info-note">Some features in the following other categories can be useful and are shown at the bottom below the list of your selected Functions:</p><ul class="info-list"><li><strong>Vision</strong> (some features for making text larger or clearer might make text easier to read)</li></ul>'
    },
    'writing': {
      name: 'WRITING',
      content: '<p class="info-intro"><strong>WRITING</strong> contains tools for users who have any problems with writing, organizing thoughts, getting started, knowing the right words, spelling, grammar, fear of bad output or any other barrier to writing.</p><p class="info-section-title">TYPICAL FEATURES FOUND IN THESE TOOLS:</p><ul class="info-list"><li>features for organizing and structuring thoughts and ideas</li><li>spelling, grammar, and punctuation checking (including context-aware and phonetic spell checking for dyslexia) (done as you type or when you ask)</li><li>helping with style, and clarity</li><li>suggesting words and better phrasing</li><li>word predictors (to speed typing)</li><li>translation dictionaries</li><li>reading text aloud to better catch errors</li><li>assistance writing/typing math equations</li><li>note-takers that turn recorded lectures, meetings, or videos into searchable text notes and summaries</li></ul><p class="info-section-title">SEE ALSO:</p><p class="info-note">Some features in the following other categories can be useful and are shown at the bottom below the list of your selected Functions:</p><ul class="info-list"><li><strong>Physical</strong> (for solutions like speech-to-text, alternatives to standard keyboard input, etc. if user has trouble with using keyboard)</li></ul>'
    },
    'focus/planning/exec': {
      name: 'FOCUS/PLANNING/EXEC',
      content: '<p class="info-intro"><strong>FOCUS/PLANNING/EXEC</strong> contains tools for users who have any problems with executive functions including planning, focusing, staying on task, or finishing.</p><p class="info-section-title">TYPICAL FEATURES FOUND IN THESE TOOLS:</p><ul class="info-list"><li>Features for playing gentle background sounds (such as rain or waves) to block distracting noise</li><li>supporting calm focus</li><li>locking the device to a single app</li><li>blocking certain buttons or touch areas so a user doesn\'t accidentally leave the task they are working on</li><li>hiding ads, menus, and other clutter</li><li>dimming or masking everything on the screen except the line or area they are working on so their eyes stay on one place</li><li>help organizing and structuring your day, your ideas, your tasks</li><li>support for executive skills with visual schedules, reminders, and simple goal-setting tools</li><li>providing focus timers with planned breaks</li><li>controlling distractions</li><li>"Do Not Disturb" function to cut down interruptions</li><li>ways to quickly turn on these or other helpful modes or features</li></ul><p class="info-section-title">SEE ALSO:</p><p class="info-note">Some features in the following other categories can be useful and are shown at the bottom below the list of your selected Functions:</p><ul class="info-list"><li><strong>Cognitive</strong> (for other related cognitive processing tools that may be helpful)</li></ul>'
    },
    'cognitive': {
      name: 'COGNITIVE',
      content: '<p class="info-intro"><strong>COGNITIVE</strong> contains tools for users who have any problems with thinking, remembering, or complex language or concepts.</p><p class="info-section-title">TYPICAL FEATURES FOUND IN THESE TOOLS:</p><ul class="info-list"><li>language simplification</li><li>extra time to read pop-ups</li><li>breaking complex sentences into simpler chunks/phrases for easier understanding</li><li>automatic extraction of key ideas, vocabulary lists, or study questions from text</li><li>memory aids, and shortcuts that do not involve memorization</li><li>toolbars to make things easier to find and use</li><li>simplified screen layouts</li><li>distraction masking and removal</li><li>animation control</li><li>presentation of information both visually and auditorily</li></ul><p class="info-section-title">SEE ALSO:</p><p class="info-note">Some features in the following other categories can be useful and are shown at the bottom below the list of your selected Functions:</p><ul class="info-list"><li><strong>Vision</strong> (for additional features that make things larger)</li><li><strong>Focus/Planning/Exec</strong> (for features to help with distraction, focus, planning or other executive functions)</li><li><strong>Reading</strong> (for features that read text aloud and other reading aids)</li><li><strong>Writing</strong> (for things to help with writing)</li><li><strong>Speech/Comm</strong> (if person has trouble with communication)</li></ul>'
    },
    'vision': {
      name: 'VISION',
      content: '<p class="info-intro"><strong>VISION</strong> contains tools for users who have any type of visual problem (color blindness, blurry vision, tunnel vision, central loss, contrast, light sensitivity, etc.)</p><p class="info-section-title">TYPICAL FEATURES FOUND IN THESE TOOLS:</p><ul class="info-list"><li>features for enlarging text, images, and cursors</li><li>inverting screen colors</li><li>applying color filters to shift colors to accommodate people with color blindness (who cannot see some colors)</li><li>enhancing text contrast so text stands out more clearly</li><li>increasing overall contrast and/or choose high-contrast themes so low-contrast text and controls are easier to see</li><li>changing text size</li><li>simplified screen layouts</li><li>changing text-to-speech</li><li>changing image or text to e-book and audio conversions</li></ul><p class="info-section-title">SEE ALSO:</p><p class="info-note">Some features in the following other categories can be useful and are shown at the bottom below the list of your selected Functions:</p><ul class="info-list"><li><strong>Reading</strong> (for ebooks, read-aloud features, and other reading aids)</li></ul>'
    },
    'braille tools': {
      name: 'BRAILLE TOOLS',
      content: '<p class="info-intro"><strong>BRAILLE</strong> tools are for people who use braille to access computers.</p><p class="info-section-title">TYPICAL FEATURES FOUND IN THESE TOOLS:</p><ul class="info-list"><li>support of braille displays and braille keyboards to read screen content and interact with software</li><li>converting printed or digital text, web pages, and scanned documents into electronic braille or braille-ready files (including support for multiple languages, mathematics, and music notation)</li><li>using an on-screen touchscreen as a six-dot braille keyboard</li><li>(for those with hearing) using braille in parallel with speech output</li><li>(for those with some vision) using braille in parallel with enlarged text and/or screen</li></ul><p class="info-section-title">SEE ALSO:</p><p class="info-note">Some features in the following other categories can be useful and are shown at the bottom below the list of your selected Functions:</p><ul class="info-list"><li><strong>Vision</strong> (most braille users also will use the tools in the Vision category)</li></ul>'
    },
    'hearing': {
      name: 'HEARING',
      content: '<p class="info-intro"><strong>HEARING</strong> tools have computer-based features people who have trouble using computers if they cannot hear them or hear them well enough including when computers talk to them.</p><p class="info-section-title">TYPICAL FEATURES FOUND IN THESE TOOLS:</p><ul class="info-list"><li>features for making it easier to hear and understand speech through amplification, filtering, and/or frequency shifting</li><li>reducing background sounds</li><li>providing visual indication of or identifying any sounds</li><li>transform any spoken words and sounds (live or recorded) into text</li><li>translate words into sign language</li><li>show any captions automatically</li><li>record, transform into text, and summarize meetings</li><li>provide real-time text alongside spoken conversations</li><li>connection of audio directly to hearing aids</li><li>and provision of tactile indications for alerts</li></ul><p class="info-section-title">SEE ALSO:</p><p class="info-note">Some features in the following other categories can be useful and are shown at the bottom below the list of your selected Functions:</p><ul class="info-list"><li><strong>Writing</strong> (for people whose native language is sign-language and would benefit from writing aids since writing is done in a language different from sign)</li></ul><p class="info-note"><strong>NOTE:</strong> The Learn & Try tool does not include hearing aids, medical or over-the-counter (ones you can get at a drug store or online). The Learn & Try tool does include features in computers and phones that can help with mild hearing problems. But hearing is so essential and invisible that it should be checked by a qualified person if there is any problem or doubt.</p>'
    },
    'physical': {
      name: 'PHYSICAL',
      content: '<p class="info-intro"><strong>PHYSICAL</strong> contains tools for people who have trouble physically using, or using efficiently, computers keyboards, mice, or onscreen controls.</p><p class="info-section-title">TYPICAL FEATURES FOUND IN THESE TOOLS:</p><ul class="info-list"><li>features for making it easier to use keyboards or mice with one hand, one finger, a mouth-stick or head-stick</li><li>making it easier to use keyboard or mice with tremor or athetotic movements (like Cerebral Palsy)</li><li>typing and controlling the computer via a wide variety of alternate input techniques - including but not limited to speech, eye-gaze, head movement or pointing, scanning (one or two switch), morse or other codes</li><li>providing input using a wide variety of input devices including larger and smaller keyboards, switches, joysticks, sip and puff, eye-blink or EMG (small electrical signals from muscles trying to move)</li><li>speeding up input with word prediction, word completion, macros, and other techniques</li><li>alternate ways to control a mouse pointer including using keys on a keyboard (or alternate keyboard)</li></ul><p class="info-section-title">SEE ALSO:</p><p class="info-note">Some features in the following other categories can be useful and are shown at the bottom below the list of your selected Functions:</p><ul class="info-list"><li><strong>Writing</strong> (for techniques to speed up and help correct input after using any of the above techniques)</li><li><strong>Speech/Communication</strong> (for those who cannot speak or speak clearly)</li></ul>'
    },
    'speech/communication': {
      name: 'SPEECH/COMMUNICATION',
      content: '<p class="info-intro"><strong>SPEECH/COMMUNICATION</strong> contains tools for people who have trouble speaking or speaking clearly or communicating spoken or written language.</p><p class="info-section-title">TYPICAL FEATURES FOUND IN THESE TOOLS:</p><ul class="info-list"><li>features for clarifying people\'s speech</li><li>recognizing some types of difficult to understand speech and re-speaking it clearly</li><li>letting people communicate in text, sign language, pictures, symbols, or voice of their choosing (including original voice for those who have lost it)</li><li>accelerating communication when using non-speech input methods</li><li>allowing people to operate devices including computers and artificial agents via their or artificial speech input</li></ul><p class="info-section-title">SEE ALSO:</p><p class="info-note">Some features in the following other categories can be useful and are shown at the bottom below the list of your selected Functions:</p><ul class="info-list"><li><strong>Physical</strong> (for special interfaces for those who cannot use a keyboard or use it well)</li><li><strong>Writing</strong> (for tools for faster and better written expression)</li></ul>'
    }
  };

  // See Also relationships
  var SEE_ALSO_RELATIONSHIPS = {
    reading: [{ func: 'Vision', reason: 'Some features for making text larger or clearer might make text easier to read.' }],
    writing: [{ func: 'Physical', reason: 'If users have trouble using a standard keyboard – other physical input devices might be helpful.' }],
    execfocus: [{ func: 'Cognitive', reason: 'People with focus or executive function problems might benefit from cognitive tools.' }],
    cognitive: [
      { func: 'Vision', reason: 'Making things larger can make things cognitively easier.' },
      { func: 'Focus/Planning/Exec', reason: 'People with cognitive disabilities often have problems with focus or planning.' },
      { func: 'Reading', reason: 'Reading tools might be helpful for a person with cognitive problems.' },
      { func: 'Writing', reason: 'Writing tools might help if the person has trouble writing clearly.' },
      { func: 'Speech/Communication', reason: 'If person has trouble with communication.' }
    ],
    vision: [{ func: 'Reading', reason: 'Those with limited or no vision might find reading tools helpful.' }],
    braille: [{ func: 'Vision', reason: 'Braille users might benefit from other vision tools.' }],
    hearing: [
      { func: 'Writing', reason: 'For people whose native language is sign-language, writing aids might help.' },
      { func: 'Speech/Communication', reason: 'If hearing causes trouble speaking, some tools might help.' }
    ],
    physical: [
      { func: 'Writing', reason: 'Writing tools might help speed up writing.' },
      { func: 'Speech/Communication', reason: 'If physical disabilities interfere with speech, some tools might help.' }
    ],
    speech: [
      { func: 'Physical', reason: 'Special interfaces for those who cannot use a keyboard well.' },
      { func: 'Writing', reason: 'Tools for faster and better written expression.' }
    ]
  };

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  function mapFunctionToLabel(func) {
    if (!func || func.trim() === '') return '';
    var lower = func.toLowerCase();
    if (lower === 'trainingtherapy' || lower === 'training therapy') return '';
    var map = {
      'reading': 'Reading', 'writing': 'Writing', 'execfocus': 'Focus/Planning/Exec',
      'cognitive': 'Cognitive', 'vision': 'Vision', 'braille': 'Braille',
      'hearing': 'Hearing', 'physical': 'Physical', 'speech': 'SpeechComm', 'communication': 'SpeechComm'
    };
    if (map[lower]) return map[lower];
    for (var key in map) { if (lower.includes(key)) return map[key]; }
    return func;
  }

  function mapDeviceToLabel(platform) {
    var map = { 'windows': 'PC', 'macos': 'Mac', 'mac': 'Mac', 'chromeos': 'Chromebook',
      'chrome': 'Chromebook', 'ipad': 'iPad', 'iphone': 'iPhone', 'ios': 'iPhone', 'android': 'Android' };
    var lower = platform.toLowerCase();
    if (map[lower]) return map[lower];
    for (var key in map) { if (lower.includes(key)) return map[key]; }
    return platform;
  }

  function mapInstallToLabel(install) {
    var map = { 'builtin': 'Built-in', 'built-in': 'Built-in', 'webbased': 'Web-based',
      'web-based': 'Web-based', 'web': 'Web-based', 'online': 'Web-based', 'browser': 'Web-based', 'install': 'Need to install', 'download': 'Need to install' };
    var lower = install.toLowerCase();
    if (map[lower]) return map[lower];
    for (var key in map) { if (lower.includes(key)) return map[key]; }
    return install;
  }
  
  function mapInstallToExpandedLabel(install) {
    var map = { 'builtin': 'Built-in (no install)', 'built-in': 'Built-in (no install)', 'webbased': 'Web-Based (no install)',
      'web-based': 'Web-Based (no install)', 'web': 'Web-Based (no install)', 'online': 'Web-Based (no install)', 'browser': 'Web-Based (no install)', 'install': 'Need to install', 'download': 'Need to install' };
    var lower = install.toLowerCase();
    if (map[lower]) return map[lower];
    for (var key in map) { if (lower.includes(key)) return map[key]; }
    return install;
  }

  function mapPurchaseToLabel(option) {
    var map = { 'free': 'Free', 'freetrial': 'Free Trial', 'free trial': 'Free Trial',
      'trial': 'Free Trial', 'subscription': 'Subscription', 'lifetime': 'Lifetime', 'lifetime license': 'Lifetime' };
    var lower = option.toLowerCase();
    if (map[lower]) return map[lower];
    for (var key in map) { if (lower.includes(key)) return map[key]; }
    return option;
  }

  function normalizeFilterToFunctionKey(filter) {
    var mapping = {
      'reading': 'reading', 'writing': 'writing', 'focus/planning/exec': 'focus/planning/exec',
      'cognitive': 'cognitive', 'vision': 'vision', 'braille tools': 'braille tools',
      'hearing': 'hearing', 'physical': 'physical', 'speech/communication': 'speech/communication'
    };
    return mapping[filter.toLowerCase()] || filter.toLowerCase();
  }

  function toTitleCase(str) {
    return str.toLowerCase().split(/[\s/]+/).map(function(word) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
  }

  function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function getBaseToolId(toolId) {
    if (!toolId) return toolId;
    // Remove 'see-also-' prefix if present
    var id = toolId.replace(/^see-also-/, '');
    // Remove '-repeat-N' suffix if present
    id = id.replace(/-repeat-\d+$/, '');
    return id;
  }

  // ============================================
  // MATCHING FUNCTIONS
  // ============================================

  function toolMatchesFunction(tool, filterFunc) {
    var normalizedFilter = normalizeFilterToFunctionKey(filterFunc);
    var filterToJsonMap = {
      'reading': ['reading'], 'writing': ['writing'],
      'focus/planning/exec': ['execfocus', 'execfunction', 'focus', 'planning', 'executive'],
      'cognitive': ['cognitive'], 'vision': ['vision'], 'braille tools': ['braille'],
      'hearing': ['hearing'], 'physical': ['physical'],
      'speech/communication': ['speech', 'communication', 'aac']
    };
    var matchingValues = filterToJsonMap[normalizedFilter] || [normalizedFilter];
    return tool.functions && tool.functions.some(function(toolFunc) {
      var lower = toolFunc.toLowerCase();
      return matchingValues.some(function(v) { return lower === v || lower.includes(v); });
    });
  }

  function toolMatchesDevice(tool, filterDevice) {
    var deviceMap = {
      'pc (windows)': ['windows', 'pc', 'win'],
      'macintosh': ['mac', 'macos', 'osx'],
      'chromebook': ['chrome', 'chromeos', 'cros'],
      'ipad': ['ipad'],
      'iphone': ['iphone', 'ios'],
      'android': ['android']
    };
    // Normalize filter: "PC (Windows)" -> "pc (windows)", "Macintosh" -> "macintosh"
    var normalizedFilter = filterDevice.toLowerCase().trim();
    var matchingValues = deviceMap[normalizedFilter] || [normalizedFilter.replace(/\s*\([^)]*\)/g, '').trim()];
    
    return tool.supportedPlatforms && tool.supportedPlatforms.some(function(platform) {
      var lower = platform.toLowerCase();
      return matchingValues.some(function(v) { return lower.includes(v) || v.includes(lower); });
    });
  }

  function toolMatchesInstall(tool, filterInstall) {
var installMap = {
    'built-in (no install)': ['builtin', 'built-in', 'built', 'native'],
    'web-based (no install)': ['webbased', 'web-based', 'web', 'browser', 'online'],
    'need to install': ['installable', 'install', 'download', 'app']
  };
    var normalizedFilter = filterInstall.toLowerCase().trim();
    var matchingValues = installMap[normalizedFilter] || [normalizedFilter];
    return tool.installTypes && tool.installTypes.some(function(install) {
      var lower = install.toLowerCase();
      return matchingValues.some(function(v) { return lower.includes(v) || lower === v; });
    });
  }

  function toolMatchesPurchase(tool, filterPurchase) {
    var purchaseMap = {
      'free': ['free'],
      'free trial': ['freetrial', 'free trial', 'trial'],
      'lifetime license': ['lifetime', 'lifetimelicense', 'perpetual', 'one-time', 'onetime'],
      'subscription': ['subscription', 'monthly', 'yearly', 'annual']
    };
    var normalizedFilter = filterPurchase.toLowerCase().trim();
    var matchingValues = purchaseMap[normalizedFilter] || [normalizedFilter];
    return tool.purchaseOptions && tool.purchaseOptions.some(function(option) {
      var lower = option.toLowerCase().replace(/[\s-_]/g, '').trim();
      // Exact match for "free" to avoid matching "freeTrial"
      if (normalizedFilter === 'free') return lower === 'free';
      // For free trial, must contain "trial" but not just be "free"
      if (normalizedFilter === 'free trial') return lower.includes('trial');
      // For others, check if data value matches any of the expected values
      return matchingValues.some(function(v) { 
        var normalizedV = v.replace(/[\s-_]/g, '');
        return lower === normalizedV || lower.includes(normalizedV); 
      });
    });
  }

  // ============================================
  // FILTERING
  // ============================================

  function applyFilters() {
  // Invalidate display list cache when filters change
  invalidateDisplayListCache();
  
  // If showMarkedOnly mode, only show marked tools
  if (showMarkedOnly) {
    filteredTools = allTools.filter(function(tool) {
      return markedToolIds.has(tool.id);
    });
    filteredTools.sort(function(a, b) {
      return a.name.localeCompare(b.name);
    });
    currentPage = 1;
    render();
    return;
  }
  
  filteredTools = allTools.filter(function(tool) {
      if (searchQuery) {
        var searchText = (tool.name + ' ' + tool.company + ' ' + (tool.description || '')).toLowerCase();
        
        // Parse search terms: quoted phrases stay together, other words are split
        var terms = [];
        var remaining = searchQuery.trim();
        var quoteRegex = /"([^"]+)"/g;
        var match;
        
        // Extract quoted phrases first
        while ((match = quoteRegex.exec(remaining)) !== null) {
          terms.push(match[1].toLowerCase());
        }
        
        // Remove quoted phrases from remaining and split rest into words
        var withoutQuotes = remaining.replace(/"[^"]+"/g, '').trim();
        if (withoutQuotes) {
          var words = withoutQuotes.split(/\s+/).filter(function(w) { return w.length > 0; });
          words.forEach(function(w) {
            terms.push(w.toLowerCase());
          });
        }
        
        // AND search: all terms must be found
        var allTermsFound = terms.every(function(term) {
          return searchText.includes(term);
        });
        
        if (!allTermsFound) return false;
      }
      if (filters.functions.length > 0) {
        if (!filters.functions.some(function(f) { return toolMatchesFunction(tool, f); })) return false;
      }
      if (filters.devices.length > 0) {
        if (!filters.devices.some(function(d) { return toolMatchesDevice(tool, d); })) return false;
      }
      if (filters.installTypes.length > 0) {
        if (!filters.installTypes.some(function(i) { return toolMatchesInstall(tool, i); })) return false;
      }
      if (filters.purchaseOptions.length > 0) {
        if (!filters.purchaseOptions.some(function(p) { return toolMatchesPurchase(tool, p); })) return false;
      }
      return true;
    });

    filteredTools.sort(function(a, b) {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'company') return a.company.localeCompare(b.company);
      return 0;
    });

    currentPage = 1;
    render();
  }

  // ============================================
  // RENDERING
  // ============================================

  function render() {
    renderFilterPanel();
    renderActiveFilters();
    renderResultsCount();
    renderTools();
    renderPagination();
  }

  function renderFilterPanel() {
    ['functions', 'devices', 'installTypes', 'purchaseOptions'].forEach(function(category) {
      var containerId = category === 'functions' ? 'functions-filters' :
        category === 'devices' ? 'devices-filters' :
        category === 'installTypes' ? 'install-filters' : 'purchase-filters';
      var container = document.getElementById(containerId);
      if (!container) return;

      var options = category === 'functions' ? FUNCTION_OPTIONS :
        category === 'devices' ? DEVICE_OPTIONS :
        category === 'installTypes' ? INSTALL_OPTIONS : PURCHASE_OPTIONS;

      container.innerHTML = options.map(function(opt) {
        var checked = filters[category].includes(opt) ? 'checked' : '';
        var desc = filterDescriptions[opt] || '';
        return '<label class="filter-panel__option">' +
          '<input type="checkbox" class="filter-panel__checkbox" ' + checked + 
          ' data-category="' + category + '" data-value="' + opt + '">' +
          '<span class="filter-panel__option-label">' + opt + '</span>' +
'<span class="tooltip" data-tooltip="' + escapeHtml(desc) + '" role="button" tabindex="0">' +
  '<svg class="filter-panel__help-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>' +
  '</span></label>';
      }).join('');
    });

    var totalActive = filters.functions.length + filters.devices.length + 
      filters.installTypes.length + filters.purchaseOptions.length;
    var countEl = document.getElementById('active-filter-count');
    var clearContainer = document.getElementById('clear-filters-container');
    if (countEl) {
      countEl.textContent = totalActive > 0 ? '(' + totalActive + ' active)' : '';
      countEl.style.display = totalActive > 0 ? '' : 'none';
    }
    if (clearContainer) clearContainer.style.display = totalActive > 0 ? '' : 'none';
  }

  function renderActiveFilters() {
    var container = document.getElementById('active-filters-container-top');
    var badgesContainer = document.getElementById('filter-badges-top');
    var countEl = document.getElementById('filter-count-top');
    var summaryEl = document.getElementById('filter-summary-top');

    var hasAnyFilter = filters.functions.length > 0 || filters.devices.length > 0 || 
      filters.installTypes.length > 0 || filters.purchaseOptions.length > 0 || 
      (searchQuery && searchQuery.trim() !== '');

    // Always show the container
    if (container) container.style.display = '';
    if (countEl) countEl.textContent = filteredTools.length;
    
    // Update the summary text based on whether filters are active
    if (summaryEl) {
      if (hasAnyFilter) {
        summaryEl.innerHTML = 'We found <strong class="browse__filter-count--large" id="filter-count-top">' + filteredTools.length + '</strong> tools that match your selections.';
      } else {
        summaryEl.innerHTML = 'There are <strong class="browse__filter-count--large" id="filter-count-top">' + filteredTools.length + '</strong> total items currently shown.';
      }
    }
    
    if (!hasAnyFilter) {
      if (badgesContainer) badgesContainer.innerHTML = '';
      return;
    }
    
    if (badgesContainer) {
      var html = '';
      
      // Search query group
      if (searchQuery && searchQuery.trim() !== '') {
        html += '<div class="filter-badges-group">';
        html += '<span class="filter-badges-group__label">Contains the words:</span>';
        html += '<div class="filter-badges-group__badges">';
        html += '<span class="filter-badge filter-badge--search" data-category="search" data-value="' + escapeHtml(searchQuery) + '">' +
          escapeHtml(searchQuery) +
          '<button class="filter-badge__remove" aria-label="Clear search">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>' +
          '</button></span>';
        html += '</div></div>';
      }
      
      // Functions group
      if (filters.functions.length > 0) {
        html += '<div class="filter-badges-group">';
        html += '<span class="filter-badges-group__label">Functions:</span>';
        html += '<div class="filter-badges-group__badges">';
        filters.functions.forEach(function(f) {
          html += '<span class="filter-badge filter-badge--function" data-category="functions" data-value="' + escapeHtml(f) + '">' +
            escapeHtml(f) +
            '<button class="filter-badge__remove" aria-label="Remove filter">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>' +
            '</button></span>';
        });
        html += '</div></div>';
      }
      
      // Devices group
      if (filters.devices.length > 0) {
        html += '<div class="filter-badges-group">';
        html += '<span class="filter-badges-group__label">Devices:</span>';
        html += '<div class="filter-badges-group__badges">';
        filters.devices.forEach(function(d) {
          html += '<span class="filter-badge filter-badge--device" data-category="devices" data-value="' + escapeHtml(d) + '">' +
            escapeHtml(d) +
            '<button class="filter-badge__remove" aria-label="Remove filter">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>' +
            '</button></span>';
        });
        html += '</div></div>';
      }
      
      // Install Types group
      if (filters.installTypes.length > 0) {
        html += '<div class="filter-badges-group">';
        html += '<span class="filter-badges-group__label">Install:</span>';
        html += '<div class="filter-badges-group__badges">';
        filters.installTypes.forEach(function(i) {
          html += '<span class="filter-badge filter-badge--install" data-category="installTypes" data-value="' + escapeHtml(i) + '">' +
            escapeHtml(i) +
            '<button class="filter-badge__remove" aria-label="Remove filter">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>' +
            '</button></span>';
        });
        html += '</div></div>';
      }
      
      // Purchase Options group
      if (filters.purchaseOptions.length > 0) {
        html += '<div class="filter-badges-group">';
        html += '<span class="filter-badges-group__label">Pricing:</span>';
        html += '<div class="filter-badges-group__badges">';
        filters.purchaseOptions.forEach(function(p) {
          html += '<span class="filter-badge filter-badge--purchase" data-category="purchaseOptions" data-value="' + escapeHtml(p) + '">' +
            escapeHtml(p) +
            '<button class="filter-badge__remove" aria-label="Remove filter">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>' +
            '</button></span>';
        });
        html += '</div></div>';
      }
      
badgesContainer.innerHTML = html;
    }
  }

  function renderResultsCount() {
  var total = filteredTools.length;
  var displayList = getDisplayList();
  var displayTotal = displayList.length;
  var start = displayTotal === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  var end = itemsPerPage === 0 ? total : Math.min(currentPage * itemsPerPage, total);
  // Ensure end doesn't exceed total tools
  if (end > total) end = total;
  
  var startEl = document.getElementById('showing-start');
  var endEl = document.getElementById('showing-end');
  var totalEl = document.getElementById('total-results');
  if (startEl) startEl.textContent = Math.min(start, total);
  if (endEl) endEl.textContent = end;
  if (totalEl) totalEl.textContent = total + ' tools';

    var loadingEl = document.getElementById('loading-state');
    var emptyEl = document.getElementById('empty-state');
    var gridEl = document.getElementById('tools-grid');

    if (loadingEl) loadingEl.style.display = 'none';
    if (total === 0) {
      if (emptyEl) emptyEl.style.display = '';
      if (gridEl) gridEl.style.display = 'none';
    } else {
      if (emptyEl) emptyEl.style.display = 'none';
      if (gridEl) gridEl.style.display = '';
    }
  }

  // Build the complete ordered display list, then paginate
  function buildDisplayList() {
    var displayItems = [];
    var shownToolIds = new Set();
    
    // In showMarkedOnly mode, just show marked tools in a simple list
    if (showMarkedOnly) {
      filteredTools.forEach(function(tool) {
        displayItems.push({
          type: 'tool',
          tool: tool,
          isRepeat: false,
          firstShownIn: '',
          groupIndex: 0,
          isSeeAlso: false
        });
      });
      return displayItems;
    }
    
    if (filters.functions.length > 0) {
      // Grouped by functions
      filters.functions.forEach(function(funcFilter, groupIndex) {
        var funcKey = normalizeFilterToFunctionKey(funcFilter);
        
        // Get all tools matching this function
        var groupTools = filteredTools.filter(function(tool) {
          return toolMatchesFunction(tool, funcFilter);
        });
        
        if (groupTools.length === 0) return;
        
        // Add function header as a display item
        displayItems.push({
          type: 'function-header',
          funcFilter: funcFilter,
          funcKey: funcKey,
          groupIndex: groupIndex
        });
        
        // Add each tool in this group
        groupTools.forEach(function(tool) {
          var isRepeat = shownToolIds.has(tool.id);
          var firstShownIn = '';
          if (isRepeat) {
            for (var i = 0; i < groupIndex; i++) {
              if (toolMatchesFunction(tool, filters.functions[i])) {
                firstShownIn = toTitleCase(filters.functions[i]);
                break;
              }
            }
          }
          shownToolIds.add(tool.id);
          
          displayItems.push({
            type: 'tool',
            tool: tool,
            isRepeat: isRepeat,
            firstShownIn: firstShownIn,
            groupIndex: groupIndex,
            isSeeAlso: false
          });
        });
      });
      
      // Add See Also section at the end
      var seeAlsoItems = buildSeeAlsoDisplayItems(shownToolIds);
      displayItems = displayItems.concat(seeAlsoItems);
    } else {
      // No function filter - just list tools
      filteredTools.forEach(function(tool) {
        displayItems.push({
          type: 'tool',
          tool: tool,
          isRepeat: false,
          firstShownIn: '',
          groupIndex: 0,
          isSeeAlso: false
        });
      });
    }
    
    return displayItems;
  }
  
  function buildSeeAlsoDisplayItems(shownToolIds) {
    var items = [];
    
    // Build See Also groups
    var seeAlsoGroups = [];
    filters.functions.forEach(function(selectedFunc) {
      var lower = selectedFunc.toLowerCase().trim();
      var normalizedKey;
      if (lower.includes('focus') || lower.includes('planning') || lower.includes('exec')) {
        normalizedKey = 'execfocus';
      } else if (lower.includes('speech') || lower.includes('communication')) {
        normalizedKey = 'speech';
      } else if (lower.includes('braille')) {
        normalizedKey = 'braille';
      } else {
        normalizedKey = lower.replace(' tools', '').replace(/[^a-z]/g, '');
      }
      
      var relationships = SEE_ALSO_RELATIONSHIPS[normalizedKey] || [];
      relationships.forEach(function(rel) {
        var isAlreadySelected = filters.functions.some(function(f) {
          return normalizeFilterToFunctionKey(f) === normalizeFilterToFunctionKey(rel.func);
        });
        
        if (!isAlreadySelected) {
          var existing = seeAlsoGroups.find(function(g) { return g.func === rel.func; });
          if (existing) {
            if (!existing.reasons.includes(rel.reason)) existing.reasons.push(rel.reason);
          } else {
            seeAlsoGroups.push({ func: rel.func, reasons: [rel.reason] });
          }
        }
      });
    });
    
    if (seeAlsoGroups.length === 0) return items;
    
    // Add see-also info header
    items.push({ type: 'see-also-info' });
    
    // Add each see-also group and its tools
    seeAlsoGroups.forEach(function(group) {
      var groupKey = normalizeFilterToFunctionKey(group.func).replace(/\s+/g, '').replace('/', '');
      
      // Count tools for this group (always calculate, even if not expanded)
      var groupToolCount = allTools.filter(function(tool) {
        if (!toolMatchesFunction(tool, group.func)) return false;
        if (filters.devices.length > 0) {
          if (!filters.devices.some(function(d) { return toolMatchesDevice(tool, d); })) return false;
        }
        if (filters.installTypes.length > 0) {
          if (!filters.installTypes.some(function(i) { return toolMatchesInstall(tool, i); })) return false;
        }
        if (filters.purchaseOptions.length > 0) {
          if (!filters.purchaseOptions.some(function(p) { return toolMatchesPurchase(tool, p); })) return false;
        }
        return true;
      }).length;
      
      items.push({
        type: 'see-also-group-header',
        group: group,
        groupKey: groupKey,
        itemCount: groupToolCount
      });
      
      // Only add tools if group is expanded
      if (expandedSeeAlsoGroupIds.has(groupKey)) {
        // Filter tools by this function AND any non-function filters the user selected
        // Show ALL matching tools, even if they were already shown in main results
        var seeAlsoTools = allTools.filter(function(tool) {
          // Must match this See Also function
          if (!toolMatchesFunction(tool, group.func)) return false;
          // Must match device filters (if any selected)
          if (filters.devices.length > 0) {
            if (!filters.devices.some(function(d) { return toolMatchesDevice(tool, d); })) return false;
          }
          // Must match install type filters (if any selected)
          if (filters.installTypes.length > 0) {
            if (!filters.installTypes.some(function(i) { return toolMatchesInstall(tool, i); })) return false;
          }
          // Must match purchase option filters (if any selected)
          if (filters.purchaseOptions.length > 0) {
            if (!filters.purchaseOptions.some(function(p) { return toolMatchesPurchase(tool, p); })) return false;
          }
          return true;
        });
        
        seeAlsoTools.forEach(function(tool) {
          // Check if this tool was already shown in main results
          var isRepeat = shownToolIds.has(tool.id);
          var firstShownIn = '';
          if (isRepeat) {
            // Find which function it was first shown under
            for (var i = 0; i < filters.functions.length; i++) {
              if (toolMatchesFunction(tool, filters.functions[i])) {
                firstShownIn = toTitleCase(filters.functions[i]);
                break;
              }
            }
          }
          
          items.push({
            type: 'tool',
            tool: tool,
            isRepeat: isRepeat,
            firstShownIn: firstShownIn,
            groupIndex: -1,
            isSeeAlso: true,
            seeAlsoGroupKey: groupKey
          });
        });
      }
    });
    
    return items;
  }

  function renderTools() {
    var container = document.getElementById('tools-grid');
    if (!container) return;
    
    // Get cached display list
    var allDisplayItems = getDisplayList();
    
    // Paginate the display list
    var start = (currentPage - 1) * itemsPerPage;
    var end = itemsPerPage === 0 ? allDisplayItems.length : start + itemsPerPage;
    var pageItems = allDisplayItems.slice(start, end);
    
    // Render paginated items
    var html = '';
    var currentFunctionGroup = null;
    var inSeeAlsoSection = false;
    var currentSeeAlsoGroup = null;
    var seeAlsoGroupExpanded = false;
    
    pageItems.forEach(function(item, idx) {
      if (item.type === 'function-header') {
        // Close previous function group if open
        if (currentFunctionGroup !== null) {
          html += '</div></div>';
        }
        // Close any open see-also group
        if (currentSeeAlsoGroup !== null) {
          if (seeAlsoGroupExpanded) {
            html += '</div></div>'; // close tools and content
          }
          html += '</div>'; // close see-also-group
          currentSeeAlsoGroup = null;
          seeAlsoGroupExpanded = false;
        }
        currentFunctionGroup = item.funcKey;
        
        var funcInfo = functionInfoContent[item.funcKey];
        var isInfoExpanded = expandedFunctionInfoIds.has(item.funcKey);
        
        html += '<div class="function-group">';
        html += '<div class="function-header' + (isInfoExpanded ? ' function-header--expanded' : '') + '" data-func-key="' + item.funcKey + '">';
        html += '<button class="function-header__toggle">';
        html += '<div class="function-header__left">';
        html += '<span class="function-header__title">' + (funcInfo ? funcInfo.name : toTitleCase(item.funcFilter).toUpperCase()) + '</span>';
        html += '<span class="function-header__subtitle">' + (isInfoExpanded ? 'Click to collapse' : '<strong>Click Here</strong> for a summary of key features to look for') + '</span>';
        html += '</div>';
        html += '<svg class="function-header__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
          (isInfoExpanded ? '<path d="m18 15-6-6-6 6"/>' : '<path d="m6 9 6 6 6-6"/>') + '</svg>';
        html += '</button>';
        if (isInfoExpanded && funcInfo) {
          html += '<div class="function-header__content">' + funcInfo.content + '</div>';
        }
        html += '</div>';
        html += '<div class="function-group__tools">';
        
      } else if (item.type === 'see-also-info') {
        // Close previous function group if open
        if (currentFunctionGroup !== null) {
          html += '</div></div>';
          currentFunctionGroup = null;
        }
        // Close any open see-also group
        if (currentSeeAlsoGroup !== null) {
          if (seeAlsoGroupExpanded) {
            html += '</div></div>'; // close tools and content
          }
          html += '</div>'; // close see-also-group
          currentSeeAlsoGroup = null;
          seeAlsoGroupExpanded = false;
        }
        inSeeAlsoSection = true;
        
        html += '<div class="see-also-section">';
        html += '<div class="see-also-info' + (seeAlsoInfoExpanded ? ' see-also-info--expanded' : '') + '">';
        html += '<button class="see-also-info__toggle">';
        html += '<span class="see-also-info__title">ITEMS IN THE FOLLOWING GROUPS MAY ALSO BE HELPFUL BASED ON YOUR SELECTIONS</span>';
        html += '<svg class="see-also-info__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
          (seeAlsoInfoExpanded ? '<path d="m18 15-6-6-6 6"/>' : '<path d="m6 9 6 6 6-6"/>') + '</svg>';
        html += '</button>';
        if (seeAlsoInfoExpanded) {
          html += '<div class="see-also-info__content"><p>Sometimes items in categories you did not select may be helpful. Shown below are categories that might have items of interest to you.</p></div>';
        }
        html += '</div>';
        
      } else if (item.type === 'see-also-group-header') {
        // Close previous see-also group if open
        if (currentSeeAlsoGroup !== null) {
          if (seeAlsoGroupExpanded) {
            html += '</div></div>'; // close tools and content
          }
          html += '</div>'; // close see-also-group
        }
        
        var isGroupExpanded = expandedSeeAlsoGroupIds.has(item.groupKey);
        currentSeeAlsoGroup = item.groupKey;
        seeAlsoGroupExpanded = isGroupExpanded;
        
        html += '<div class="see-also-group' + (isGroupExpanded ? ' see-also-group--expanded' : '') + '" data-group-key="' + item.groupKey + '">';
        html += '<button class="see-also-group__toggle">';
        html += '<div class="see-also-group__left">';
        html += '<span class="see-also-group__title">' + item.group.func.toUpperCase() + ' <span class="see-also-group__count">(' + item.itemCount + ' Items)</span></span>';
        html += '<span class="see-also-group__subtitle">' + (isGroupExpanded ? 'Click to collapse' : 'tools may also be helpful. Expand for details.') + '</span>';
        html += '</div>';
        html += '<svg class="see-also-group__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
          (isGroupExpanded ? '<path d="m18 15-6-6-6 6"/>' : '<path d="m6 9 6 6 6-6"/>') + '</svg>';
        html += '</button>';
        if (isGroupExpanded) {
          html += '<div class="see-also-group__content">';
          // Add explanation text with reasons
          html += '<div class="see-also-group__reasons">';
          html += '<p class="see-also-group__reasons-intro">These ' + item.group.func.toUpperCase() + ' items are shown because they may be of interest for the following reason(s):</p>';
          html += '<ul class="see-also-group__reasons-list">';
          item.group.reasons.forEach(function(reason) {
            html += '<li>' + escapeHtml(reason) + '</li>';
          });
          html += '</ul>';
          html += '</div>';
          html += '<div class="see-also-group__tools">';
        }
        
      } else if (item.type === 'tool') {
        var tool = item.tool;
        var toolId = tool.id;
        var isRepeat = item.isRepeat;
        var firstShownIn = item.firstShownIn;
        var isSeeAlso = item.isSeeAlso;
        var seeAlsoFunc = item.seeAlsoFunc;
        
        if (isRepeat) {
          toolId = tool.id + '-repeat-' + item.groupIndex;
        } else if (isSeeAlso) {
          toolId = 'see-also-' + tool.id;
        }
        
        var isExpanded = expandedToolIds.has(toolId);
        
        var cardClass = 'tool-card';
        if (isExpanded) cardClass += ' tool-card--expanded';
        if (isRepeat) cardClass += ' tool-card--repeat';
        if (isSeeAlso) cardClass += ' tool-card--see-also';
        
        var baseToolId = getBaseToolId(toolId);
        var isMarked = markedToolIds.has(baseToolId);
        if (isMarked) cardClass += ' tool-card--marked';
        
        var checkboxClass = 'tool-card__mark-checkbox' + (isMarked ? ' is-marked' : '');
        var checkboxHTML = '<button class="' + checkboxClass + '" data-mark-tool="' + toolId + '" aria-label="' + (isMarked ? 'Unmark' : 'Mark') + ' this product" aria-pressed="' + isMarked + '">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>' +
          '</button>';

        var html_card = '<article class="' + cardClass + '" data-tool-id="' + toolId + '" tabindex="0" role="listitem" aria-expanded="' + isExpanded + '" aria-label="' + escapeHtml(tool.name) + ' by ' + escapeHtml(tool.company) + '">';

        if (isExpanded) {
          // EXPANDED VIEW
          html_card += '<div class="tool-card__expanded">';
          html_card += '<div class="tool-card__expanded-header tool-card__collapse-trigger">';
          html_card += '<div class="tool-card__expanded-header-left">';
          html_card += '<h3 class="tool-card__expanded-title">' + escapeHtml(tool.name) + '</h3>';
          html_card += '<p class="tool-card__expanded-company">' + escapeHtml(tool.company) + '</p>';
          if (isRepeat) html_card += '<p class="tool-card__expanded-note">Already shown in ' + firstShownIn + '</p>';
          html_card += '</div>';
          html_card += '<div class="tool-card__header-right">';
          html_card += '<button class="tool-card__see-less">See Less <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m18 15-6-6-6 6"/></svg></button>';
          html_card += checkboxHTML;
          html_card += '</div>';
          html_card += '</div>';
          html_card += '<hr class="tool-card__divider">';
          html_card += '<h4 class="tool-card__section-title">Description</h4>';
          html_card += '<p class="tool-card__description">' + escapeHtml(tool.description || 'No description available.') + '</p>';
          html_card += '<hr class="tool-card__divider">';

          // Videos
          if (tool.youTubeVideos && tool.youTubeVideos.length > 0) {
            html_card += '<h4 class="tool-card__section-title">Videos</h4>';
            html_card += '<div class="tool-card__videos">';
            tool.youTubeVideos.forEach(function(video, idx) {
              var videoClass = idx === 0 ? 'tool-card__video tool-card__video--main' : 'tool-card__video tool-card__video--thumb';
              html_card += '<div class="' + videoClass + '"><iframe src="' + video.embedUrl + '" title="' + escapeHtml(video.title || 'Demo video') + '" allowfullscreen></iframe></div>';
            });
            html_card += '</div><hr class="tool-card__divider">';
          }

          // Badges
          html_card += '<div class="tool-card__badges-expanded">';
          html_card += createBadgeColumnHTML('HELPS WITH:', tool.functions, 'function');
          html_card += createBadgeColumnHTML('DEVICES:', tool.supportedPlatforms, 'device');
          html_card += createBadgeColumnHTML('INSTALL?:', tool.installTypes, 'install');
          html_card += createBadgeColumnHTML('PRICING:', tool.purchaseOptions, 'purchase');
          html_card += '</div><hr class="tool-card__divider">';

          // Visit button
          html_card += '<div class="tool-card__actions">';
          html_card += '<a href="' + escapeHtml(tool.vendorProductPageUrl || '#') + '" target="_blank" rel="noopener noreferrer" class="tool-card__visit-btn">';
          html_card += 'Visit Product Website <span class="sr-only">(opens in new tab)</span> <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
          html_card += '</a></div></div>';
        } else if (isRepeat) {
          // REPEAT VIEW (single line that wraps naturally)
          html_card += '<div class="tool-card__repeat">';
          html_card += '<span class="tool-card__repeat-text">';
          html_card += '<span class="tool-card__repeat-name">' + escapeHtml(tool.name) + '</span>';
          html_card += '<span class="tool-card__repeat-company"> · ' + escapeHtml(tool.company) + '</span> ';
          html_card += '<span class="tool-card__repeat-note">(already shown in <span class="tool-card__repeat-note-func">' + firstShownIn + '</span>)</span> ';
          html_card += '<span class="tool-card__repeat-badges">' + createCollapsedFunctionBadges(tool, isSeeAlso, seeAlsoFunc) + '</span>';
          html_card += '</span>';
          html_card += '<button class="tool-card__see-more tool-card__see-more--repeat">See More <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg></button>';
          html_card += '</div>';
        } else {
          // COLLAPSED VIEW - only show badges matching selected filters
          html_card += '<div class="tool-card__collapsed">';
          html_card += checkboxHTML;
          html_card += '<div class="tool-card__name-line">';
          html_card += '<h3 class="tool-card__name">' + escapeHtml(tool.name) + '<span class="tool-card__company"> · ' + escapeHtml(tool.company) + '</span></h3>';
          html_card += '</div>';
          html_card += '<p class="tool-card__desc-preview">' + escapeHtml(tool.description || '') + '</p>';
          html_card += '<div class="tool-card__spacer"></div>';
          html_card += '<div class="tool-card__badges-grid">';
          html_card += createCollapsedBadgeColumnHTML('Helps With:', tool, 'function', isSeeAlso, seeAlsoFunc);
          html_card += createCollapsedBadgeColumnHTML('Devices:', tool, 'device', isSeeAlso, seeAlsoFunc);
          html_card += createCollapsedBadgeColumnHTML('Install?:', tool, 'install', isSeeAlso, seeAlsoFunc);
          html_card += createCollapsedBadgeColumnHTML('Pricing:', tool, 'purchase', isSeeAlso, seeAlsoFunc);
          html_card += '<div class="tool-card__see-more-col"><button class="tool-card__see-more">See More <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg></button></div>';
          html_card += '</div>';
          html_card += '<div class="tool-card__see-more-row"><button class="tool-card__see-more">See More <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg></button></div>';
          html_card += '</div>';
        }

        html_card += '</article>';
        html += html_card;
      }
    });
    
    // Close any remaining open groups
    if (currentFunctionGroup !== null) {
      html += '</div></div>';
    }
    if (currentSeeAlsoGroup !== null) {
      if (seeAlsoGroupExpanded) {
        html += '</div></div>';
      }
      html += '</div>';
    }
    if (inSeeAlsoSection) {
      html += '</div>';
    }
    
    container.innerHTML = html;
  }
  
  // Get all active See Also function names
  function getActiveSeeAlsoFunctions() {
    var seeAlsoFuncs = [];
    filters.functions.forEach(function(selectedFunc) {
      var lower = selectedFunc.toLowerCase().trim();
      var normalizedKey;
      if (lower.includes('focus') || lower.includes('planning') || lower.includes('exec')) {
        normalizedKey = 'execfocus';
      } else if (lower.includes('speech') || lower.includes('communication')) {
        normalizedKey = 'speech';
      } else if (lower.includes('braille')) {
        normalizedKey = 'braille';
      } else {
        normalizedKey = lower.replace(' tools', '').replace(/[^a-z]/g, '');
      }
      
      var relationships = SEE_ALSO_RELATIONSHIPS[normalizedKey] || [];
      relationships.forEach(function(rel) {
        var isAlreadySelected = filters.functions.some(function(f) {
          return normalizeFilterToFunctionKey(f) === normalizeFilterToFunctionKey(rel.func);
        });
        
        if (!isAlreadySelected && seeAlsoFuncs.indexOf(rel.func) === -1) {
          seeAlsoFuncs.push(rel.func);
        }
      });
    });
    return seeAlsoFuncs;
  }
  
  // Create function badges for collapsed view
  function createCollapsedFunctionBadges(tool, isSeeAlso, seeAlsoFunc) {
    var html = '';
    var shownCount = 0;
    var totalCount = 0;
    
    if (tool.functions) {
      totalCount = tool.functions.filter(function(f) { return f && f.trim() !== ''; }).length;
    }
    
    if (isSeeAlso) {
      // For See Also cards, show badges matching ANY active See Also function
      var activeSeeAlsoFuncs = getActiveSeeAlsoFunctions();
      if (tool.functions) {
        tool.functions.forEach(function(func) {
          if (func && func.trim() !== '') {
            // Check if this function matches any active See Also function
            var funcMatches = activeSeeAlsoFuncs.some(function(seeAlsoF) {
              return toolMatchesFunction({ functions: [func] }, seeAlsoF);
            });
            if (funcMatches) {
              html += '<span class="badge badge--function">' + escapeHtml(mapFunctionToLabel(func) || func) + '</span>';
              shownCount++;
            }
          }
        });
      }
    } else if (filters.functions.length > 0) {
      // For selected function cards, show badges matching selected functions
      filters.functions.forEach(function(selectedFunc) {
        if (toolMatchesFunction(tool, selectedFunc)) {
          html += '<span class="badge badge--function">' + escapeHtml(selectedFunc) + '</span>';
          shownCount++;
        }
      });
    } else {
      // No function filters selected - show ALL function badges
      if (tool.functions) {
        tool.functions.forEach(function(func) {
          if (func && func.trim() !== '') {
            var mapped = mapFunctionToLabel(func);
            if (mapped) {
              html += '<span class="badge badge--function">' + escapeHtml(mapped) + '</span>';
              shownCount++;
            }
          }
        });
      }
    }
    
    var remaining = totalCount - shownCount;
    if (remaining > 0) {
      html += '<span class="badge badge--more">+' + remaining + '</span>';
    }
    
    return html;
  }
  
  // Create badge column for collapsed view with filtering logic
  function createCollapsedBadgeColumnHTML(label, tool, type, isSeeAlso, seeAlsoFunc) {
    var html = '<div class="tool-card__badge-col">';
    html += '<span class="tool-card__badge-label">' + label + '</span>';
    html += '<div class="tool-card__badge-list">';
    
    if (type === 'function') {
      html += createCollapsedFunctionBadges(tool, isSeeAlso, seeAlsoFunc);
    } else if (type === 'device') {
      html += createCollapsedCategoryBadges(tool.supportedPlatforms, filters.devices, 'device', mapDeviceToLabel, toolMatchesDevice, tool);
    } else if (type === 'install') {
      html += createCollapsedCategoryBadges(tool.installTypes, filters.installTypes, 'install', mapInstallToLabel, toolMatchesInstall, tool);
    } else if (type === 'purchase') {
      html += createCollapsedCategoryBadges(tool.purchaseOptions, filters.purchaseOptions, 'purchase', mapPurchaseToLabel, toolMatchesPurchase, tool);
    }
    
    html += '</div></div>';
    return html;
  }
  
  // Create badges for devices, install, purchase with +count logic
  function createCollapsedCategoryBadges(items, selectedFilters, type, mapFn, matchFn, tool) {
    var html = '';
    var shownCount = 0;
    var totalCount = 0;
    
    if (items) {
      totalCount = items.filter(function(item) { return item && item.trim() !== ''; }).length;
    }
    
    if (selectedFilters.length > 0) {
      // Show only badges that match selected filters
      selectedFilters.forEach(function(selected) {
        if (matchFn(tool, selected)) {
          var displayLabel = selected;
          // Shorten some labels
          if (type === 'device') {
            displayLabel = selected.replace(' (Windows)', '').replace('PC (Windows)', 'PC');
          } else if (type === 'install') {
            displayLabel = selected.replace(' (no install)', '');
          }
          html += '<span class="badge badge--' + type + '">' + escapeHtml(displayLabel) + '</span>';
          shownCount++;
        }
      });
      
      var remaining = totalCount - shownCount;
      if (remaining > 0) {
        html += '<span class="badge badge--more">+' + remaining + '</span>';
      }
    } else {
      // No filters selected - show all badges
      if (items) {
        items.filter(function(item) { return item && item.trim() !== ''; }).forEach(function(item) {
          var mapped = mapFn(item);
          if (mapped) html += '<span class="badge badge--' + type + '">' + escapeHtml(mapped) + '</span>';
        });
      }
    }
    
    return html;
  }

  function createBadgeColumnHTML(label, items, type) {
    var mapFn = type === 'function' ? mapFunctionToLabel :
      type === 'device' ? mapDeviceToLabel :
      type === 'install' ? mapInstallToExpandedLabel : mapPurchaseToLabel;
    
    var html = '<div class="tool-card__badge-col">';
    html += '<span class="tool-card__badge-label">' + label + '</span>';
    html += '<div class="tool-card__badge-list">';
    if (items) {
      items.filter(function(item) { return item && item.trim() !== ''; }).forEach(function(item) {
        var mapped = mapFn(item);
        if (mapped) html += '<span class="badge badge--' + type + '">' + escapeHtml(mapped) + '</span>';
      });
    }
    html += '</div></div>';
    return html;
  }

  // Creates badge column showing only badges that match selected filters (for collapsed view)
  function createFilteredBadgeColumnHTML(label, tool, type) {
    var html = '<div class="tool-card__badge-col">';
    html += '<span class="tool-card__badge-label">' + label + '</span>';
    html += '<div class="tool-card__badge-list">';
    
    if (type === 'function') {
      // Show function badges that match selected function filters
      if (filters.functions.length > 0) {
        filters.functions.forEach(function(selectedFunc) {
          if (toolMatchesFunction(tool, selectedFunc)) {
            html += '<span class="badge badge--function">' + escapeHtml(selectedFunc) + '</span>';
          }
        });
      } else if (tool.functions) {
        tool.functions.filter(function(f) { return f && f.trim() !== ''; }).forEach(function(f) {
          var mapped = mapFunctionToLabel(f);
          if (mapped) html += '<span class="badge badge--function">' + escapeHtml(mapped) + '</span>';
        });
      }
    } else if (type === 'device') {
      // Show device badges that match selected device filters
      if (filters.devices.length > 0) {
        filters.devices.forEach(function(selectedDevice) {
          if (toolMatchesDevice(tool, selectedDevice)) {
            var shortLabel = selectedDevice.replace(' (Windows)', '').replace('PC (Windows)', 'PC');
            html += '<span class="badge badge--device">' + escapeHtml(shortLabel) + '</span>';
          }
        });
      } else if (tool.supportedPlatforms) {
        tool.supportedPlatforms.forEach(function(p) {
          var mapped = mapDeviceToLabel(p);
          if (mapped) html += '<span class="badge badge--device">' + escapeHtml(mapped) + '</span>';
        });
      }
    } else if (type === 'install') {
      // Show install badges that match selected install filters
      if (filters.installTypes.length > 0) {
        filters.installTypes.forEach(function(selectedInstall) {
          if (toolMatchesInstall(tool, selectedInstall)) {
            var shortLabel = selectedInstall.replace(' (no install)', '');
            html += '<span class="badge badge--install">' + escapeHtml(shortLabel) + '</span>';
          }
        });
      } else if (tool.installTypes) {
        tool.installTypes.forEach(function(i) {
          var mapped = mapInstallToLabel(i);
          if (mapped) html += '<span class="badge badge--install">' + escapeHtml(mapped) + '</span>';
        });
      }
    } else if (type === 'purchase') {
      // Show purchase badges that match selected purchase filters
      if (filters.purchaseOptions.length > 0) {
        filters.purchaseOptions.forEach(function(selectedPurchase) {
          if (toolMatchesPurchase(tool, selectedPurchase)) {
            html += '<span class="badge badge--purchase">' + escapeHtml(selectedPurchase) + '</span>';
          }
        });
      } else if (tool.purchaseOptions) {
        tool.purchaseOptions.forEach(function(p) {
          var mapped = mapPurchaseToLabel(p);
          if (mapped) html += '<span class="badge badge--purchase">' + escapeHtml(mapped) + '</span>';
        });
      }
    }
    
    html += '</div></div>';
    return html;
  }

  // Cache for display list to avoid rebuilding on every render
  var cachedDisplayList = null;
  
  function getDisplayList() {
    if (!cachedDisplayList) {
      cachedDisplayList = buildDisplayList();
    }
    return cachedDisplayList;
  }
  
  function invalidateDisplayListCache() {
    cachedDisplayList = null;
  }
  
  function renderPagination() {
    var container = document.getElementById('pagination');
    if (!container) return;
    
    var displayList = getDisplayList();
    var totalPages = itemsPerPage === 0 ? 1 : Math.ceil(displayList.length / itemsPerPage);
    if (totalPages <= 1) { container.innerHTML = ''; return; }

    var html = '<button class="pagination__btn pagination__btn--prev"' + (currentPage === 1 ? ' disabled' : '') + ' data-page="' + (currentPage - 1) + '">Previous</button>';
    html += '<div class="pagination__pages">';
    for (var i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
        html += '<button class="pagination__page' + (i === currentPage ? ' pagination__page--active' : '') + '" data-page="' + i + '">' + i + '</button>';
      } else if (i === currentPage - 3 || i === currentPage + 3) {
        html += '<span class="pagination__ellipsis">...</span>';
      }
    }
    html += '</div>';
    html += '<button class="pagination__btn pagination__btn--next"' + (currentPage === totalPages ? ' disabled' : '') + ' data-page="' + (currentPage + 1) + '">Next</button>';
    html += '<button class="pagination__btn pagination__btn--show-all" data-action="show-all">Show All</button>';
    container.innerHTML = html;
  }

  // ============================================
  // EVENT HANDLERS
  // ============================================

  function setupEventListeners() {
    // Filter toggle
    var filterToggle = document.getElementById('filter-toggle');
    var filterContent = document.getElementById('filter-content');
    var filterToggleIcon = document.getElementById('filter-toggle-icon');
    
    if (filterToggle) {
      filterToggle.addEventListener('click', function() {
        var isOpen = filterContent.classList.toggle('is-open');
        filterToggle.setAttribute('aria-expanded', isOpen);
        filterToggleIcon.innerHTML = isOpen ? '<path d="m18 15-6-6-6 6"/>' : '<path d="m6 9 6 6 6-6"/>';
      });
    }

    // Clear all filters
    var clearBtn = document.getElementById('clear-filters-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', function() {
        filters = { functions: [], devices: [], installTypes: [], purchaseOptions: [] };
        applyFilters();
      });
    }

    // Filter checkboxes
    document.addEventListener('change', function(e) {
      if (e.target.matches('.filter-panel__checkbox')) {
        var category = e.target.getAttribute('data-category');
        var value = e.target.getAttribute('data-value');
        if (e.target.checked) {
          if (!filters[category].includes(value)) filters[category].push(value);
        } else {
          filters[category] = filters[category].filter(function(v) { return v !== value; });
        }
        applyFilters();
      }
    });

    // Remove filter badge
    document.addEventListener('click', function(e) {
      if (e.target.closest('.filter-badge__remove')) {
        var badge = e.target.closest('.filter-badge');
        var category = badge.getAttribute('data-category');
        var value = badge.getAttribute('data-value');
        
        // Handle search badge removal
        if (category === 'search') {
          searchQuery = '';
          var searchInput = document.getElementById('search-input');
          if (searchInput) searchInput.value = '';
          var searchClear = document.getElementById('search-clear');
          if (searchClear) searchClear.classList.remove('visible');
          applyFilters();
          return;
        }
        
        filters[category] = filters[category].filter(function(v) { return v !== value; });
        applyFilters();
      }
    });

    // Search
    var searchInput = document.getElementById('search-input');
    var searchClear = document.getElementById('search-clear');
    
    function updateSearchClearVisibility() {
      if (searchClear) {
        if (searchInput.value.length > 0) {
          searchClear.classList.add('visible');
        } else {
          searchClear.classList.remove('visible');
        }
      }
    }
    
    if (searchInput) {
      var timeout;
      searchInput.addEventListener('input', function() {
        clearTimeout(timeout);
        updateSearchClearVisibility();
        timeout = setTimeout(function() {
          searchQuery = searchInput.value;
          applyFilters();
        }, 300);
      });
    }
    
    if (searchClear) {
      searchClear.addEventListener('click', function() {
        searchInput.value = '';
        searchQuery = '';
        updateSearchClearVisibility();
        applyFilters();
        searchInput.focus();
      });
    }

    // Sort
    var sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', function() {
        sortBy = sortSelect.value;
        applyFilters();
      });
    }

    // Per page
    var perPageSelect = document.getElementById('per-page-select');
    if (perPageSelect) {
      perPageSelect.addEventListener('change', function() {
        itemsPerPage = parseInt(perPageSelect.value, 10);
        currentPage = 1;
        render();
      });
    }

    // Mark checkbox handler
    document.addEventListener('click', function(e) {
      var markBtn = e.target.closest('[data-mark-tool]');
      if (markBtn) {
        e.stopPropagation();
        var toolId = markBtn.getAttribute('data-mark-tool');
        // Extract base tool ID (remove -repeat- and see-also- prefixes/suffixes)
        var baseToolId = getBaseToolId(toolId);
        if (markedToolIds.has(baseToolId)) {
          markedToolIds.delete(baseToolId);
        } else {
          markedToolIds.add(baseToolId);
        }
        render();
        return;
      }
    });
    
    // Tool card interactions
    document.addEventListener('click', function(e) {
      var toolCard = e.target.closest('.tool-card');
      if (toolCard && !e.target.closest('a') && !e.target.closest('.tool-card__visit-btn') && !e.target.closest('[data-mark-tool]')) {
        var toolId = toolCard.getAttribute('data-tool-id');
        
        if (e.target.closest('.tool-card__see-more')) {
          expandedToolIds.add(toolId);
          render();
          scrollToTool(toolId);
          return;
        }
        
        if (e.target.closest('.tool-card__see-less') || e.target.closest('.tool-card__collapse-trigger')) {
          expandedToolIds.delete(toolId);
          render();
          return;
        }

        if (!toolCard.classList.contains('tool-card--expanded')) {
          expandedToolIds.add(toolId);
          render();
          scrollToTool(toolId);
        }
      }

      // Function header toggle
      var funcHeader = e.target.closest('.function-header');
      if (funcHeader && e.target.closest('.function-header__toggle')) {
        var funcKey = funcHeader.getAttribute('data-func-key');
        if (expandedFunctionInfoIds.has(funcKey)) {
          expandedFunctionInfoIds.delete(funcKey);
        } else {
          expandedFunctionInfoIds.add(funcKey);
        }
        render();
      }

      // See Also info toggle
      if (e.target.closest('.see-also-info__toggle')) {
        seeAlsoInfoExpanded = !seeAlsoInfoExpanded;
        render();
      }

      // See Also group toggle
      var seeAlsoGroup = e.target.closest('.see-also-group');
      if (seeAlsoGroup && e.target.closest('.see-also-group__toggle')) {
        var groupKey = seeAlsoGroup.getAttribute('data-group-key');
        if (expandedSeeAlsoGroupIds.has(groupKey)) {
          expandedSeeAlsoGroupIds.delete(groupKey);
        } else {
          expandedSeeAlsoGroupIds.add(groupKey);
        }
        // Invalidate cache since display list changes when groups expand/collapse
        invalidateDisplayListCache();
        render();
      }
    });

    // Pagination
    document.addEventListener('click', function(e) {
      var btn = e.target.closest('.pagination__btn, .pagination__page');
      if (btn && !btn.disabled) {
        // Check if "Show All" button
        if (btn.getAttribute('data-action') === 'show-all') {
          itemsPerPage = 0; // 0 means show all
          currentPage = 1;
          // Update the dropdown to show "All at once"
          var perPageSelect = document.getElementById('per-page-select');
          if (perPageSelect) {
            perPageSelect.value = '0';
          }
          render();
          // Don't scroll when clicking Show All
        } else {
          currentPage = parseInt(btn.getAttribute('data-page'), 10);
          render();
          // Use setTimeout to ensure scroll happens after render completes
          setTimeout(function() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }, 10);
        }
      }
    });

    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('tool-card')) {
        e.preventDefault();
        var toolId = e.target.getAttribute('data-tool-id');
        if (expandedToolIds.has(toolId)) {
          expandedToolIds.delete(toolId);
        } else {
          expandedToolIds.add(toolId);
        }
        render();
      }
    });

    // Show/Hide Mark Feature Section
    var showMarkFeatureBtn = document.getElementById('show-mark-feature-btn');
    var hideMarkFeatureBtn = document.getElementById('hide-mark-feature-btn');
    var markFeatureSection = document.getElementById('mark-feature-section');
    
    if (showMarkFeatureBtn) {
      showMarkFeatureBtn.addEventListener('click', function() {
        if (markFeatureSection.style.display === 'block') {
          markFeatureSection.style.display = 'none';
        } else {
          markFeatureSection.style.display = 'block';
        }
      });
    }
    
    if (hideMarkFeatureBtn) {
      hideMarkFeatureBtn.addEventListener('click', function() {
        markFeatureSection.style.display = 'none';
      });
    }

    // Tooltips - hover shows, click pins open
  var tooltipPinned = false;
  var currentTooltipTrigger = null;
  
  document.addEventListener('mouseenter', function(e) {
    if (e.target.matches('.tooltip') && !tooltipPinned) {
      showTooltip(e.target);
      currentTooltipTrigger = e.target;
    }
  }, true);
  
  document.addEventListener('mouseleave', function(e) {
    if (e.target.matches('.tooltip') && !tooltipPinned) {
      hideTooltip();
      currentTooltipTrigger = null;
    }
  }, true);
  
  document.addEventListener('click', function(e) {
    // Close button click
    if (e.target.closest('.tooltip-popup__close')) {
      hideTooltip();
      tooltipPinned = false;
      currentTooltipTrigger = null;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    // Tooltip trigger click - pin it open
    if (e.target.closest('.tooltip')) {
      var trigger = e.target.closest('.tooltip');
      e.preventDefault();
      e.stopPropagation();
      if (tooltipPinned && currentTooltipTrigger === trigger) {
        // Clicking same tooltip again - close it
        hideTooltip();
        tooltipPinned = false;
        currentTooltipTrigger = null;
      } else {
        showTooltip(trigger, true);
        tooltipPinned = true;
        currentTooltipTrigger = trigger;
      }
      return;
    }
    
    // Click elsewhere closes pinned tooltip
    if (tooltipPinned && !e.target.closest('.tooltip-popup')) {
      hideTooltip();
      tooltipPinned = false;
      currentTooltipTrigger = null;
    }
  });
    
    // Marking buttons
    setupMarkingButtons();
  }
  
  function setupMarkingButtons() {
    // Check if Share API is supported
    var shareBtn = document.getElementById('share-marked-link-btn');
    var shareUnsupportedMsg = document.getElementById('share-unsupported-msg');
    if (shareBtn && navigator.canShare) {
      shareBtn.style.display = '';
    } else if (shareUnsupportedMsg) {
      shareUnsupportedMsg.style.display = '';
    }
    
    // Show Only Marked button
    var showMarkedBtn = document.getElementById('show-marked-only-btn');
    if (showMarkedBtn) {
      showMarkedBtn.addEventListener('click', function() {
        showMarkedOnly = !showMarkedOnly;
        updateMarkedMode();
      });
    }
    
    // Turn off marked mode button
    var turnOffBtn = document.getElementById('turn-off-marked-mode-btn');
    if (turnOffBtn) {
      turnOffBtn.addEventListener('click', function() {
        showMarkedOnly = false;
        updateMarkedMode();
      });
    }
    
    // Copy Marked Link button
    var copyBtn = document.getElementById('copy-marked-link-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', function() {
        var link = createMarkedProductsLink();
        navigator.clipboard.writeText(link).then(function() {
          var originalText = copyBtn.textContent;
          copyBtn.textContent = 'Link Copied!';
          setTimeout(function() {
            copyBtn.textContent = originalText;
          }, 2000);
        });
      });
    }
    
    // Share Marked Link button
    if (shareBtn) {
      shareBtn.addEventListener('click', function() {
        var link = createMarkedProductsLink();
        if (navigator.share) {
          navigator.share({
            title: 'Learn and Try - Marked Products',
            text: 'Check out these assistive technology tools I found:',
            url: link
          });
        }
      });
    }
  }
  
  function createMarkedProductsLink() {
    var baseUrl = window.location.origin + window.location.pathname;
    var markedIds = Array.from(markedToolIds).join(',');
    if (markedIds) {
      return baseUrl + '?marked=' + encodeURIComponent(markedIds);
    }
    return baseUrl;
  }
  
  function clearAllMarks() {
    markedToolIds.clear();
    showMarkedOnly = false;
    updateMarkedMode();
    render();
  }
  
  // Set up Clear all Marked Products button
  var clearMarkedBtn = document.getElementById('clear-marked-btn');
  if (clearMarkedBtn) {
    clearMarkedBtn.addEventListener('click', clearAllMarks);
  }
  
  function updateMarkedMode() {
    var showMarkedBtn = document.getElementById('show-marked-only-btn');
    var banner = document.getElementById('marked-mode-banner');
    var bannerCount = document.getElementById('marked-mode-count');
    var sidebar = document.querySelector('.browse__sidebar');
    var activeFiltersContainer = document.getElementById('active-filters-container');
    var searchContainer = document.querySelector('.browse__search');
    var resultsInfo = document.querySelector('.browse__results-info');
    var searchInput = document.getElementById('search-input');
    
    if (showMarkedOnly) {
      // Save current filters and search before clearing
      savedFiltersBeforeMarkedMode = {
        functions: filters.functions.slice(),
        devices: filters.devices.slice(),
        installTypes: filters.installTypes.slice(),
        purchaseOptions: filters.purchaseOptions.slice()
      };
      savedSearchBeforeMarkedMode = searchQuery;
      
      // Clear filters and search
      filters.functions = [];
      filters.devices = [];
      filters.installTypes = [];
      filters.purchaseOptions = [];
      searchQuery = '';
      if (searchInput) searchInput.value = '';
      
      // Update UI checkboxes
      document.querySelectorAll('.browse__filter-checkbox').forEach(function(cb) {
        cb.checked = false;
      });
      
      if (showMarkedBtn) showMarkedBtn.classList.add('is-active');
      if (banner) banner.style.display = '';
      if (bannerCount) bannerCount.textContent = markedToolIds.size;
      if (sidebar) sidebar.style.display = 'none';
      if (activeFiltersContainer) activeFiltersContainer.style.display = 'none';
      if (searchContainer) searchContainer.style.display = 'none';
      if (resultsInfo) resultsInfo.style.display = 'none';
    } else {
      // Restore saved filters and search
      if (savedFiltersBeforeMarkedMode) {
        filters.functions = savedFiltersBeforeMarkedMode.functions;
        filters.devices = savedFiltersBeforeMarkedMode.devices;
        filters.installTypes = savedFiltersBeforeMarkedMode.installTypes;
        filters.purchaseOptions = savedFiltersBeforeMarkedMode.purchaseOptions;
        
        // Restore UI checkboxes
        document.querySelectorAll('.browse__filter-checkbox').forEach(function(cb) {
          var category = cb.getAttribute('data-category');
          var value = cb.value;
          cb.checked = filters[category] && filters[category].includes(value);
        });
      }
      if (savedSearchBeforeMarkedMode) {
        searchQuery = savedSearchBeforeMarkedMode;
        if (searchInput) searchInput.value = savedSearchBeforeMarkedMode;
      }
      savedFiltersBeforeMarkedMode = null;
      savedSearchBeforeMarkedMode = '';
      
      if (showMarkedBtn) showMarkedBtn.classList.remove('is-active');
      if (banner) banner.style.display = 'none';
      if (sidebar) sidebar.style.display = '';
      if (searchContainer) searchContainer.style.display = '';
      if (resultsInfo) resultsInfo.style.display = '';
    }
    
    applyFilters();
  }

  function scrollToTool(toolId) {
    setTimeout(function() {
      var card = document.querySelector('[data-tool-id="' + toolId + '"]');
      if (card) {
        var y = card.getBoundingClientRect().top + window.pageYOffset - 80;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }, 50);
  }

  var tooltipEl = null;
  function showTooltip(trigger, withCloseButton) {
    var text = trigger.getAttribute('data-tooltip');
    if (!text) return;
    if (!tooltipEl) {
      tooltipEl = document.createElement('div');
      tooltipEl.className = 'tooltip-popup';
      document.body.appendChild(tooltipEl);
    }
    
    if (withCloseButton) {
      tooltipEl.innerHTML = '<button class="tooltip-popup__close" aria-label="Close"><strong>X</strong></button>' + escapeHtml(text);
    } else {
      tooltipEl.textContent = text;
    }
    
    tooltipEl.style.display = 'block';
    var rect = trigger.getBoundingClientRect();
    tooltipEl.style.left = (rect.left + rect.width / 2) + 'px';
    tooltipEl.style.top = (rect.top - 8) + 'px';
  }
  
  function hideTooltip() {
    if (tooltipEl) tooltipEl.style.display = 'none';
  }

  // ============================================
  // URL PARAMS
  // ============================================

  function parseUrlParams() {
    var params = new URLSearchParams(window.location.search);
    
    var funcParam = params.get('function');
    if (funcParam) {
      funcParam.split(', ').forEach(function(f) {
        if (FUNCTION_OPTIONS.includes(f) && !filters.functions.includes(f)) {
          filters.functions.push(f);
        }
      });
    }

    var computerParam = params.get('computer');
    if (computerParam) {
      var deviceMapping = { 'Mac (Apple)': 'Macintosh', 'Windows (Microsoft)': 'PC (Windows)', 'Chromebook (Google)': 'Chromebook' };
      computerParam.split(', ').forEach(function(c) {
        var mapped = deviceMapping[c];
        if (mapped && !filters.devices.includes(mapped)) filters.devices.push(mapped);
      });
    }

    var phoneParam = params.get('phone');
    if (phoneParam && phoneParam !== 'None') {
      var phoneDeviceMapping = { 'iPhone': 'iPhone', 'Android (Samsung, Google)': 'Android' };
      var mapped = phoneDeviceMapping[phoneParam];
      if (mapped && !filters.devices.includes(mapped)) filters.devices.push(mapped);
    }
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  function loadTools() {
    fetch('https://raw.githubusercontent.com/raisingthefloor/learnandtry-webapp/data/public/data/catalog.json')
      .then(function(response) {
        if (!response.ok) throw new Error('Failed to load');
        return response.json();
      })
      .then(function(data) {
        allTools = data;
        filteredTools = allTools.slice();
        parseUrlParams();
        applyFilters();
      })
      .catch(function(error) {
        console.error('Error loading tools:', error);
        var loadingEl = document.getElementById('loading-state');
        if (loadingEl) loadingEl.innerHTML = '<p class="error">Failed to load tools. Please try again later.</p>';
      });
  }

  function init() {
    setupEventListeners();
    loadTools();
    setupVideoModal();
    checkMarkedUrlParams();
    handleMobileSidebarPosition();
  }
  
  // Move sidebar to just above browse__controls on mobile
  function handleMobileSidebarPosition() {
    var sidebar = document.querySelector('.browse__sidebar');
    var controls = document.querySelector('.browse__controls');
    var originalParent = sidebar ? sidebar.parentNode : null;
    var originalNextSibling = sidebar ? sidebar.nextSibling : null;
    
    function repositionSidebar() {
      if (!sidebar || !controls) return;
      
      var isMobile = window.innerWidth < 640;
      
      if (isMobile) {
        // Move sidebar to just before controls
        controls.parentNode.insertBefore(sidebar, controls);
      } else if (originalParent) {
        // Move sidebar back to original position
        if (originalNextSibling) {
          originalParent.insertBefore(sidebar, originalNextSibling);
        } else {
          originalParent.appendChild(sidebar);
        }
      }
    }
    
    repositionSidebar();
    window.addEventListener('resize', repositionSidebar);
  }
  
  function checkMarkedUrlParams() {
    var urlParams = new URLSearchParams(window.location.search);
    var markedParam = urlParams.get('marked');
    if (markedParam) {
      var ids = markedParam.split(',').filter(function(id) { return id.trim() !== ''; });
      ids.forEach(function(id) {
        markedToolIds.add(id.trim());
      });
      if (ids.length > 0) {
        showMarkedOnly = true;
        // Wait for tools to load, then update mode
        var checkInterval = setInterval(function() {
          if (allTools.length > 0) {
            clearInterval(checkInterval);
            updateMarkedMode();
          }
        }, 100);
      }
    }
  }
  
  // Video modal functionality
  function setupVideoModal() {
    var modal = document.getElementById('video-modal');
    var modalIframe = document.getElementById('video-modal-iframe');
    var closeBtn = document.getElementById('video-modal-close');
    var lastFocusedElement = null;
    
    if (!modal || !modalIframe) return;

    // Add dialog role for screen readers
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Tool video');
    
    // Delegate click events for video containers
    document.addEventListener('click', function(e) {
      var videoContainer = e.target.closest('.tool-card__video');
      if (videoContainer) {
        var iframe = videoContainer.querySelector('iframe');
        if (iframe) {
          lastFocusedElement = document.activeElement;
          var src = iframe.getAttribute('src');
          // Add autoplay parameter
          if (src.indexOf('?') === -1) {
            src += '?autoplay=1';
          } else {
            src += '&autoplay=1';
          }
          modalIframe.setAttribute('src', src);
          modal.classList.add('is-open');
          document.body.style.overflow = 'hidden';
          // Move focus to close button
          if (closeBtn) closeBtn.focus();
        }
      }
    });
    
    function closeModal() {
      modal.classList.remove('is-open');
      modalIframe.setAttribute('src', '');
      document.body.style.overflow = '';
      // Return focus to element that opened the modal
      if (lastFocusedElement) lastFocusedElement.focus();
    }
    
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
