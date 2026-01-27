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
  const totalSteps = 4;
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
          question: 'What type of computer ' + doVerb + ' ' + subject + ' use at home or school\n(check all that apply)?',
          options: ['Mac (Apple)', 'Windows (Microsoft)', 'Chromebook (Google)', 'My Device Is Not Listed'],
          multiSelect: true
        },
        {
          id: 4,
          question: 'What type of phone ' + doVerb + ' ' + subject + ' primarily use?',
          options: ['iPhone', 'Android (Samsung, Google)', 'None'],
          multiSelect: false
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
    fetch('https://raw.githubusercontent.com/raisingthefloor/learnandtry-webapp/dev/public/data/catalog.json')
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
    
    // Render options
    question.options.forEach(function(option) {
      const isSelected = question.multiSelect 
        ? selectedOptions.indexOf(option) !== -1
        : selectedOption === option;
      
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'questionnaire__option' + (isSelected ? ' questionnaire__option--selected' : '');
      btn.setAttribute('aria-pressed', isSelected);
      btn.textContent = option;
      
      btn.addEventListener('click', function() {
        if (question.multiSelect) {
          toggleMultiOption(option);
        } else {
          selectSingleOption(option);
        }
      });
      
      optionsContainer.appendChild(btn);
    });
    
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
    
    // Update UI
    const buttons = optionsContainer.querySelectorAll('.questionnaire__option');
    buttons.forEach(function(btn) {
      const isSelected = btn.textContent === option;
      btn.classList.toggle('questionnaire__option--selected', isSelected);
      btn.setAttribute('aria-pressed', isSelected);
    });
    
    updateNextButton();
  }

  function toggleMultiOption(option) {
    const index = selectedOptions.indexOf(option);
    if (index !== -1) {
      selectedOptions.splice(index, 1);
    } else {
      selectedOptions.push(option);
    }
    
    // Update UI
    const buttons = optionsContainer.querySelectorAll('.questionnaire__option');
    buttons.forEach(function(btn) {
      const isSelected = selectedOptions.indexOf(btn.textContent) !== -1;
      btn.classList.toggle('questionnaire__option--selected', isSelected);
      btn.setAttribute('aria-pressed', isSelected);
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
    
    // Get selected computers from question 3
    var selectedComputers = answers[3] ? answers[3].split(', ').filter(function(c) { return c; }) : [];
    
    // Get selected phone from question 4
    var selectedPhone = answers[4] || '';

    // Device mapping
    var deviceMapping = {
      'Mac (Apple)': ['mac', 'macintosh', 'macos', 'osx'],
      'Windows (Microsoft)': ['pc', 'windows', 'win'],
      'Chromebook (Google)': ['chrome', 'chromebook', 'chromeos', 'cros'],
      'iPhone': ['iphone', 'ios'],
      'Android (Samsung, Google)': ['android']
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
    var allSelectedDevices = selectedComputers.slice();
    if (selectedPhone && selectedPhone !== 'None') {
      allSelectedDevices.push(selectedPhone);
    }

    if (allSelectedDevices.length > 0 && selectedComputers.indexOf('My Device Is Not Listed') === -1) {
      filteredTools = filteredTools.filter(function(tool) {
        if (!tool.supportedPlatforms || tool.supportedPlatforms.length === 0) return false;
        var toolPlatformsLower = tool.supportedPlatforms.map(function(p) { return p.toLowerCase(); });
        return allSelectedDevices.some(function(selectedDevice) {
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
      renderStepper();
      renderQuestion();
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }

  function handleBack() {
    if (currentStep > 1) {
      currentStep--;
      selectedOption = '';
      selectedOptions = [];
      renderStepper();
      renderQuestion();
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }

  function handleResultsBack() {
    resultsScreen.style.display = 'none';
    questionnaireScreen.style.display = 'flex';
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function handleShowTools() {
    // Build URL parameters
    var params = new URLSearchParams();
    
    if (answers[2]) params.set('function', answers[2]);
    if (answers[3]) params.set('computer', answers[3]);
    if (answers[4]) params.set('phone', answers[4]);
    
    // Redirect to browse tools
    window.location.href = 'browse-tools.html?' + params.toString();
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
