/**
 * Learn and Try - Questionnaire JavaScript
 * Vanilla JS implementation
 */

(function() {
  'use strict';

  // =============================================
  // State
  // =============================================
  
  let currentStep = 1;
  const totalSteps = 3;
  let answers = {};
  let selectedOption = '';
  let selectedOptions = [];
  let allTools = [];
  let isForSelf = true;

  // =============================================
  // Questionnaire Data
  // =============================================
  
  function getQuestionnaireData() {
    const subject = isForSelf ? 'you' : 'they';
    const verb = 'are';
    const doVerb = 'do';

    return {
      questions: [
        {
          id: 1,
          question: 'Are you looking for a tool for yourself - or someone else?',
          options: ['For Myself', 'For Someone Else'],
          multiSelect: false
        },
        {
          id: 2,
          question: 'What ' + verb + ' ' + subject + ' having trouble with?',
          options: [
            'Reading',
            'Writing',
            'Focus/Planning/Exec',
            'Cognitive',
            'Vision',
            'Braille Tools',
            'Hearing',
            'Physical',
            'Speech/Communication'
          ],
          multiSelect: true
        },
        {
          id: 3,
          question: 'What devices ' + doVerb + ' ' + subject + ' use at home or school\n(check all that apply)?',
          options: ['Windows (Microsoft)', 'Mac (Apple)', 'Chromebook (Google)', 'iPhone', 'iPad', 'Android (Samsung/Google)', 'Show all'],
          multiSelect: true
        }
      ]
    };
  }

  // =============================================
  // DOM Elements
  // =============================================
  
  const welcomeScreen = document.getElementById('welcome-screen');
  const questionnaireScreen = document.getElementById('questionnaire-screen');
  const resultsScreen = document.getElementById('results-screen');
  const startBtn = document.getElementById('start-questionnaire');
  const stepperList = document.getElementById('stepper-list');
  const resultsStepperList = document.getElementById('results-stepper-list');
  const questionText = document.getElementById('question-text');
  const questionHint = document.getElementById('question-hint');
  const optionsContainer = document.getElementById('options-container');
  const optionsLegend = document.getElementById('options-legend');
  const backBtn = document.getElementById('back-btn');
  const nextBtn = document.getElementById('next-btn');
  const resultsBackBtn = document.getElementById('results-back-btn');
  const showToolsBtn = document.getElementById('show-tools-btn');
  const toolCountEl = document.getElementById('tool-count');

  // =============================================
  // Fetch Tools Data
  // =============================================
  
  function fetchTools() {
    fetch('https://raw.githubusercontent.com/raisingthefloor/learnandtry-webapp/data/public/data/catalog.json')
      .then(function(response) {
        return response.json();
      })
      .then(function(data) {
        allTools = data;
      })
      .catch(function(error) {
        console.error('Failed to load tools:', error);
      });
  }

  // =============================================
  // Render Functions
  // =============================================
  
  function renderStepper() {
    stepperList.innerHTML = '';
    
    for (let i = 1; i <= totalSteps; i++) {
      const isCompleted = i < currentStep;
      const isActive = i === currentStep;
      
      const li = document.createElement('li');
      li.className = 'stepper__item';
      
      let stepClass = 'stepper__step';
      if (isCompleted) stepClass += ' stepper__step--completed';
      else if (isActive) stepClass += ' stepper__step--active';
      else stepClass += ' stepper__step--pending';
      
      const stepContent = isCompleted 
        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20,6 9,17 4,12"></polyline></svg>'
        : i;
      
      const stepLabel = isCompleted ? 'Step ' + i + ' completed' : (isActive ? 'Step ' + i + ' current' : 'Step ' + i);
      
      li.innerHTML = '<div class="' + stepClass + '" aria-label="' + stepLabel + '">' + stepContent + '</div>';
      
      if (i < totalSteps) {
        const connectorClass = isCompleted ? 'stepper__connector stepper__connector--completed' : 'stepper__connector stepper__connector--pending';
        li.innerHTML += '<div class="' + connectorClass + '" aria-hidden="true"></div>';
      }
      
      stepperList.appendChild(li);
    }
  }

  function renderResultsStepper() {
    resultsStepperList.innerHTML = '';
    
    for (let i = 1; i <= totalSteps; i++) {
      const li = document.createElement('li');
      li.className = 'stepper__item';
      li.innerHTML = '<div class="stepper__step stepper__step--completed" aria-label="Step ' + i + ' completed"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20,6 9,17 4,12"></polyline></svg></div>';
      
      if (i < totalSteps) {
        li.innerHTML += '<div class="stepper__connector stepper__connector--completed" aria-hidden="true"></div>';
      }
      
      resultsStepperList.appendChild(li);
    }
  }

  function renderQuestion() {
    const data = getQuestionnaireData();
    const question = data.questions[currentStep - 1];
    
    questionText.textContent = question.question;
    optionsLegend.textContent = question.question;
    
    if (question.multiSelect) {
      questionHint.style.display = 'block';
    } else {
      questionHint.style.display = 'none';
    }
    
    // Clear options
    optionsContainer.innerHTML = '<legend class="sr-only" id="options-legend">' + question.question + '</legend>';
    optionsContainer.classList.remove('questionnaire__options--rows');
    
    // Create rows for question 3 layout
    var mainRow = null;
    var secondRow = null;
    var thirdRow = null;
    
    if (currentStep === 3) {
      optionsContainer.classList.add('questionnaire__options--rows');
      mainRow = document.createElement('div');
      mainRow.className = 'questionnaire__options-row';
      secondRow = document.createElement('div');
      secondRow.className = 'questionnaire__options-row';
      thirdRow = document.createElement('div');
      thirdRow.className = 'questionnaire__options-row questionnaire__options-row--single';
    }
    
    // Render options
    question.options.forEach(function(option, index) {
      const isSelected = question.multiSelect 
        ? selectedOptions.indexOf(option) !== -1
        : selectedOption === option;
      
      const inputType = 'checkbox';
      const inputId = 'option-' + currentStep + '-' + index;
      const inputName = 'question-' + currentStep;
      
      // Create label (styled as button)
      const label = document.createElement('label');
      label.className = 'questionnaire__option' + (isSelected ? ' questionnaire__option--selected' : '');
      label.setAttribute('for', inputId);
      
      // Create hidden input
      const input = document.createElement('input');
      input.type = inputType;
      input.id = inputId;
      input.name = inputName;
      input.value = option;
      input.checked = isSelected;
      input.className = 'questionnaire__input';
      
      input.addEventListener('change', function() {
        if (question.multiSelect) {
          toggleMultiOption(option);
        } else {
          selectSingleOption(option);
        }
      });
      
      // Create text span
      const textSpan = document.createElement('span');
      textSpan.textContent = option;
      
      label.appendChild(input);
      label.appendChild(textSpan);
      
      // Add to appropriate row for question 3
      if (currentStep === 3) {
        if (option === 'Show all') {
          thirdRow.appendChild(label);
        } else if (option === 'iPhone' || option === 'iPad' || option === 'Android (Samsung/Google)') {
          secondRow.appendChild(label);
        } else {
          mainRow.appendChild(label);
        }
      } else {
        optionsContainer.appendChild(label);
      }
    });
    
    // Append rows for question 3
    if (currentStep === 3) {
      optionsContainer.appendChild(mainRow);
      optionsContainer.appendChild(secondRow);
      optionsContainer.appendChild(thirdRow);
    }
    
    // Update button states
    backBtn.disabled = currentStep === 1;
    updateNextButton();
  }

  function selectSingleOption(option) {
    selectedOption = option;
    
    // Update for question 1
    if (currentStep === 1) {
      isForSelf = option === 'For Myself';
    }
    
    // Update UI - uncheck all other checkboxes and update visual state
    const labels = optionsContainer.querySelectorAll('.questionnaire__option');
    labels.forEach(function(label) {
      const input = label.querySelector('input');
      const textSpan = label.querySelector('span');
      const optionText = textSpan ? textSpan.textContent : label.textContent;
      const isSelected = optionText === option;
      label.classList.toggle('questionnaire__option--selected', isSelected);
      if (input) input.checked = isSelected;
    });
    
    updateNextButton();
  }

  function toggleMultiOption(option) {
    // Handle "Show all" - deselect all others
    if (option === 'Show all') {
      const wasSelected = selectedOptions.indexOf('Show all') !== -1;
      if (wasSelected) {
        selectedOptions = [];
      } else {
        selectedOptions = ['Show all'];
      }
    } else {
      // If selecting a device, remove "Show all" if present
      const showAllIndex = selectedOptions.indexOf('Show all');
      if (showAllIndex !== -1) {
        selectedOptions.splice(showAllIndex, 1);
      }
      
      const index = selectedOptions.indexOf(option);
      if (index !== -1) {
        selectedOptions.splice(index, 1);
      } else {
        selectedOptions.push(option);
      }
    }
    
    // Update UI
    const labels = optionsContainer.querySelectorAll('.questionnaire__option');
    labels.forEach(function(label) {
      const input = label.querySelector('input');
      const textSpan = label.querySelector('span');
      const optionText = textSpan ? textSpan.textContent : label.textContent;
      const isSelected = selectedOptions.indexOf(optionText) !== -1;
      label.classList.toggle('questionnaire__option--selected', isSelected);
      if (input) input.checked = isSelected;
    });
    
    updateNextButton();
  }

  function updateNextButton() {
    const data = getQuestionnaireData();
    const question = data.questions[currentStep - 1];
    
    if (question.multiSelect) {
      nextBtn.disabled = selectedOptions.length === 0;
    } else {
      nextBtn.disabled = !selectedOption;
    }
  }

  // =============================================
  // Calculate Tool Count
  // =============================================
  
  function calculateToolCount() {
    if (allTools.length === 0) return 0;

    // Get selected functions from question 2
    var selectedFunctions = answers[2] ? answers[2].split(', ').filter(function(f) { return f; }) : [];
    
    // Get selected devices from question 3 (computers and phones combined)
    var selectedDevices = answers[3] ? answers[3].split(', ').filter(function(c) { return c; }) : [];

    // Device mapping
    var deviceMapping = {
      'Mac (Apple)': ['mac', 'macintosh', 'macos', 'osx'],
      'Windows (Microsoft)': ['pc', 'windows', 'win'],
      'Chromebook (Google)': ['chrome', 'chromebook', 'chromeos', 'cros'],
      'iPhone': ['iphone', 'ios'],
      'iPad': ['ipad', 'ios'],
      'Android (Samsung/Google)': ['android']
    };

    // Function mapping
    var functionMapping = {
      'Reading': ['reading'],
      'Writing': ['writing'],
      'Focus/Planning/Exec': ['execfocus', 'execfunction', 'focus', 'planning', 'executive'],
      'Cognitive': ['cognitive'],
      'Vision': ['vision'],
      'Braille Tools': ['braille'],
      'Hearing': ['hearing'],
      'Physical': ['physical'],
      'Speech/Communication': ['speech', 'communication']
    };

    var filteredTools = allTools;

    // Filter by functions
    if (selectedFunctions.length > 0) {
      filteredTools = filteredTools.filter(function(tool) {
        if (!tool.functions || tool.functions.length === 0) return false;
        var toolFuncsLower = tool.functions.map(function(f) { return f.toLowerCase(); });
        return selectedFunctions.some(function(selectedFunc) {
          var mappedValues = functionMapping[selectedFunc] || [selectedFunc.toLowerCase()];
          return mappedValues.some(function(mapped) {
            return toolFuncsLower.some(function(toolFunc) {
              return toolFunc.indexOf(mapped) !== -1 || mapped.indexOf(toolFunc) !== -1;
            });
          });
        });
      });
    }

    // Filter by devices
    if (selectedDevices.length > 0 && selectedDevices.indexOf('Show all') === -1) {
      filteredTools = filteredTools.filter(function(tool) {
        if (!tool.supportedPlatforms || tool.supportedPlatforms.length === 0) return false;
        var toolPlatformsLower = tool.supportedPlatforms.map(function(p) { return p.toLowerCase(); });
        return selectedDevices.some(function(selectedDevice) {
          var mappedValues = deviceMapping[selectedDevice] || [selectedDevice.toLowerCase()];
          return mappedValues.some(function(mapped) {
            return toolPlatformsLower.some(function(platform) {
              return platform.indexOf(mapped) !== -1 || mapped.indexOf(platform) !== -1;
            });
          });
        });
      });
    }

    return filteredTools.length;
  }

  // =============================================
  // Navigation
  // =============================================
  
  function handleStart() {
    welcomeScreen.style.display = 'none';
    questionnaireScreen.style.display = 'flex';
    window.scrollTo({ top: 0, behavior: 'instant' });
    renderStepper();
    renderQuestion();
  }

  function handleNext() {
    const data = getQuestionnaireData();
    const question = data.questions[currentStep - 1];
    
    // Save answer
    var currentAnswer = question.multiSelect ? selectedOptions.join(', ') : selectedOption;
    answers[question.id] = currentAnswer;
    
    // Reset selections
    selectedOption = '';
    selectedOptions = [];
    
    if (currentStep === totalSteps) {
      // Show results
      var count = calculateToolCount();
      toolCountEl.textContent = count;
      questionnaireScreen.style.display = 'none';
      resultsScreen.style.display = 'flex';
      renderResultsStepper();
      window.scrollTo({ top: 0, behavior: 'instant' });
    } else {
      // Next question
      currentStep++;
      // Restore saved answers for the next step if any
      restoreSavedAnswers();
      renderStepper();
      renderQuestion();
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }

  function handleBack() {
    if (currentStep > 1) {
      // Save current answer before going back
      const data = getQuestionnaireData();
      const question = data.questions[currentStep - 1];
      var currentAnswer = question.multiSelect ? selectedOptions.join(', ') : selectedOption;
      answers[question.id] = currentAnswer;
      
      currentStep--;
      // Restore saved answers for this step
      restoreSavedAnswers();
      renderStepper();
      renderQuestion();
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }
  
  function restoreSavedAnswers() {
    const data = getQuestionnaireData();
    const question = data.questions[currentStep - 1];
    const savedAnswer = answers[question.id];
    
    if (savedAnswer) {
      if (question.multiSelect) {
        selectedOptions = savedAnswer.split(', ').filter(function(s) { return s; });
        selectedOption = '';
      } else {
        selectedOption = savedAnswer;
        selectedOptions = [];
      }
    } else {
      selectedOption = '';
      selectedOptions = [];
    }
  }

  function handleResultsBack() {
    resultsScreen.style.display = 'none';
    questionnaireScreen.style.display = 'flex';
    // Restore saved answers for current step
    restoreSavedAnswers();
    renderStepper();
    renderQuestion();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function handleShowTools() {
    // Build URL parameters
    var params = new URLSearchParams();
    
    if (answers[2]) params.set('function', answers[2]);
    if (answers[3]) params.set('devices', answers[3]);
    
    // Redirect to browse tools
    window.location.href = '/browse/index.html?' + params.toString();
  }

  // =============================================
  // Initialize
  // =============================================
  
  function init() {
    if (!welcomeScreen) return; // Not on tool-finder page
    
    fetchTools();
    
    startBtn.addEventListener('click', handleStart);
    nextBtn.addEventListener('click', handleNext);
    backBtn.addEventListener('click', handleBack);
    resultsBackBtn.addEventListener('click', handleResultsBack);
    showToolsBtn.addEventListener('click', handleShowTools);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
