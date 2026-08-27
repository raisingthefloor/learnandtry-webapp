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
  const stepLabels = ['Who', 'Needs', 'Devices'];
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
          question: 'Are you looking for a tool for yourself or someone else?',
          options: ['For Myself', 'For Someone Else'],
          multiSelect: false
        },
        {
          id: 2,
          question: 'What ' + verb + ' ' + subject + ' having trouble with?',
          options: [
            'Reading',
            'Writing',
            'Attention and planning',
            'Cognitive',
            'Hearing',
            'Vision',
            'Braille',
            'Physical',
            'Speech and communication'
          ],
          multiSelect: true
        },
        {
          id: 3,
          question: 'What devices ' + doVerb + ' ' + subject + ' use at home or school?',
          options: ['Windows (Microsoft)', 'Mac (Apple)', 'Chromebook (Google)', 'iPhone', 'iPad', 'Android (Samsung/Google)'],
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
  const nextHelp = document.getElementById('next-help');
  const questionSubline = document.getElementById('question-subline');
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

    // Expose progress to assistive tech
    stepperList.setAttribute('role', 'progressbar');
    stepperList.setAttribute('aria-valuemin', '1');
    stepperList.setAttribute('aria-valuemax', String(totalSteps));
    stepperList.setAttribute('aria-valuenow', String(currentStep));
    stepperList.setAttribute('aria-label', 'Step ' + currentStep + ' of ' + totalSteps);
    
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
      
      let stepLabel;
      const labelText = stepLabels[i - 1];
      if (isCompleted) stepLabel = 'Step ' + i + ' of ' + totalSteps + ', ' + labelText + ', completed';
      else if (isActive) stepLabel = 'Step ' + i + ' of ' + totalSteps + ', ' + labelText + ', current step';
      else stepLabel = 'Step ' + i + ' of ' + totalSteps + ', ' + labelText + ', not yet reached';
      
      li.innerHTML = '<div class="' + stepClass + '" role="img" aria-label="' + stepLabel + '">' + stepContent + '</div>';
      
      if (i < totalSteps) {
        const connectorClass = isCompleted ? 'stepper__connector stepper__connector--completed' : 'stepper__connector stepper__connector--pending';
        li.innerHTML += '<div class="' + connectorClass + '" aria-hidden="true"></div>';
      }
      
      stepperList.appendChild(li);
    }
  }

  function renderResultsStepper() {
    resultsStepperList.innerHTML = '';

    resultsStepperList.setAttribute('role', 'progressbar');
    resultsStepperList.setAttribute('aria-valuemin', '1');
    resultsStepperList.setAttribute('aria-valuemax', String(totalSteps));
    resultsStepperList.setAttribute('aria-valuenow', String(totalSteps));
    resultsStepperList.setAttribute('aria-label', 'All ' + totalSteps + ' steps completed');
    
    for (let i = 1; i <= totalSteps; i++) {
      const li = document.createElement('li');
      li.className = 'stepper__item';
      const labelText = stepLabels[i - 1];
      li.innerHTML = '<div class="stepper__step stepper__step--completed" role="img" aria-label="Step ' + i + ' of ' + totalSteps + ', ' + labelText + ', completed"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20,6 9,17 4,12"></polyline></svg></div>';
      
      if (i < totalSteps) {
        li.innerHTML += '<div class="stepper__connector stepper__connector--completed" aria-hidden="true"></div>';
      }
      
      resultsStepperList.appendChild(li);
    }
  }

  function createCheckmark() {
    const check = document.createElement('span');
    check.className = 'chip-check';
    check.setAttribute('aria-hidden', 'true');
    check.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20,6 9,17 4,12"></polyline></svg>';
    return check;
  }
  
  // Handle native input change events — updates state and syncs UI
  function handleChipChange(option, isMulti, isChecked) {
    if (isMulti) {
      if (isChecked) {
        if (selectedOptions.indexOf(option) === -1) {
          selectedOptions.push(option);
        }
      } else {
        const index = selectedOptions.indexOf(option);
        if (index !== -1) selectedOptions.splice(index, 1);
      }
      // On Q3, keep the "Show tools for all devices" control in sync with the chips
      if (currentStep === 3) {
        syncSelectAllState();
      }
    } else {
      // Single select (radio) — always sets the option
      selectedOption = option;
      if (currentStep === 1) {
        isForSelf = option === 'For Myself';
      }
    }
    
    updateNextButton();
  }

  // Returns the six Q3 device chip inputs (excludes the select-all control)
  function getDeviceChipInputs() {
    return Array.prototype.slice.call(
      optionsContainer.querySelectorAll('.chip-wrapper input[type="checkbox"]')
    );
  }

  // Reflect the chip selection state onto the select-all checkbox.
  // Checked only when ALL device chips are selected.
  function syncSelectAllState() {
    const selectAll = document.getElementById('q3-select-all');
    if (!selectAll) return;
    const chips = getDeviceChipInputs();
    const allChecked = chips.length > 0 && chips.every(function(cb) { return cb.checked; });
    selectAll.checked = allChecked;
  }

  // Handle the standalone "Show tools for all devices" checkbox.
  function handleSelectAllChange(isChecked) {
    const chips = getDeviceChipInputs();
    selectedOptions = [];
    chips.forEach(function(cb) {
      cb.checked = isChecked;
      if (isChecked) {
        var label = optionsContainer.querySelector('label[for="' + cb.id + '"] .chip-label');
        var optionText = label ? label.textContent : cb.value;
        selectedOptions.push(optionText);
      }
    });
    updateNextButton();
  }

  function renderQuestion() {
    const data = getQuestionnaireData();
    const question = data.questions[currentStep - 1];
    const isMulti = question.multiSelect;
    
    questionText.textContent = question.question;
    optionsLegend.textContent = question.question;
    
    // Reset the validation message on every render — it only appears
    // after a failed Next attempt (handled in handleNext).
    nextHelp.style.display = 'none';

    // Multi-select questions show the "select one or more" hint and associate it.
    // Q2 and Q3 both end with a period. Q1 (single-select) shows no sub-line.
    if (isMulti) {
      questionHint.textContent = currentStep === 2
        ? 'Select one or more, then click Next.'
        : 'Select one or more, then click Next.';
      questionHint.style.display = 'block';
      questionSubline.style.display = 'none';
      optionsContainer.setAttribute('aria-describedby', 'question-hint');
    } else {
      questionHint.style.display = 'none';
      questionSubline.style.display = 'none';
      optionsContainer.removeAttribute('aria-describedby');
    }
    
    // Native inputs provide their own semantics; remove any legacy role
    optionsContainer.removeAttribute('role');
    
    // Clear options
    optionsContainer.innerHTML = '<legend class="sr-only" id="options-legend">' + question.question + '</legend>';
    
    // Q1 has no hint line, so it needs extra top margin to feel proportional
    if (!isMulti) {
      optionsContainer.classList.add('questionnaire__options--no-hint');
    } else {
      optionsContainer.classList.remove('questionnaire__options--no-hint');
    }
    
    // Render options as native form inputs (radio for Q1, checkbox for Q2/Q3)
    question.options.forEach(function(option, index) {
      const isSelected = isMulti 
        ? selectedOptions.indexOf(option) !== -1
        : selectedOption === option;
      
      const inputType = isMulti ? 'checkbox' : 'radio';
      const inputName = 'q' + currentStep;
      const inputId = 'option-' + currentStep + '-' + index;
      const inputValue = option.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      
      const wrapper = document.createElement('div');
      wrapper.className = 'chip-wrapper';
      
      const input = document.createElement('input');
      input.type = inputType;
      input.id = inputId;
      input.name = inputName;
      input.value = inputValue;
      if (isSelected) input.checked = true;
      if (!isMulti) input.required = true;
      
      const label = document.createElement('label');
      label.setAttribute('for', inputId);
      
      const textSpan = document.createElement('span');
      textSpan.className = 'chip-label';
      textSpan.textContent = option;
      
      label.appendChild(textSpan);
      label.appendChild(createCheckmark());
      
      wrapper.appendChild(input);
      wrapper.appendChild(label);
      
      // Handle change events
      input.addEventListener('change', function() {
        handleChipChange(option, isMulti, input.checked);
      });
      
      optionsContainer.appendChild(wrapper);
    });
    
    // Q3: add the standalone "Show tools for all devices" control below the chip grid.
    // Built after the chips so the dynamically generated chip IDs are available
    // for the aria-controls attribute.
    if (currentStep === 3) {
      const deviceInputs = getDeviceChipInputs();
      const controlledIds = deviceInputs.map(function(cb) { return cb.id; }).join(' ');

      const selectAllWrapper = document.createElement('div');
      selectAllWrapper.className = 'select-all-wrapper';

      const selectAllInput = document.createElement('input');
      selectAllInput.type = 'checkbox';
      selectAllInput.id = 'q3-select-all';
      selectAllInput.className = 'select-all__input';
      selectAllInput.setAttribute('aria-controls', controlledIds);

      const selectAllLabel = document.createElement('label');
      selectAllLabel.setAttribute('for', 'q3-select-all');
      selectAllLabel.className = 'select-all__label';
      selectAllLabel.textContent = 'Show tools for all devices';

      selectAllWrapper.appendChild(selectAllInput);
      selectAllWrapper.appendChild(selectAllLabel);

      selectAllInput.addEventListener('change', function() {
        handleSelectAllChange(selectAllInput.checked);
      });

      // Append below the chip grid so the control appears after the chips
      optionsContainer.appendChild(selectAllWrapper);

      // Reflect any restored selections onto the select-all control
      syncSelectAllState();
    }
    
    // Update button states. Back is never disabled — on step 1 it returns
    // to the welcome screen (handled in handleBack).
    backBtn.disabled = false;
    updateNextButton();
  }

  function hasCurrentSelection() {
    const data = getQuestionnaireData();
    const question = data.questions[currentStep - 1];
    return question.multiSelect ? selectedOptions.length > 0 : !!selectedOption;
  }

  function updateNextButton() {
    if (hasCurrentSelection()) {
      // Enabled: clear the disabled state and dismiss any validation message
      nextBtn.setAttribute('aria-disabled', 'false');
      nextHelp.style.display = 'none';
    } else {
      // Disabled-look but still keyboard focusable. The validation message is
      // NOT shown here — it only appears after a failed Next attempt.
      nextBtn.setAttribute('aria-disabled', 'true');
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
      'Attention and planning': ['execfocus', 'execfunction', 'focus', 'planning', 'executive'],
      'Cognitive': ['cognitive'],
      'Vision': ['vision'],
      'Braille': ['braille'],
      'Hearing': ['hearing'],
      'Physical': ['physical'],
      'Speech and communication': ['speech', 'communication']
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

    // Filter by devices.
    // Selecting every device (via "Show tools for all devices" or checking all
    // six chips) is treated as "all devices" — skip device filtering entirely so
    // tools are matched purely on function, matching the prior 'All devices' behavior.
    var totalDeviceCount = Object.keys(deviceMapping).length;
    var isAllDevices = selectedDevices.length >= totalDeviceCount;
    if (selectedDevices.length > 0 && !isAllDevices) {
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
    // Move focus into the questionnaire so keyboard/SR users land on the question
    questionText.focus();
  }

  function handleNext() {
    // Guard: button is aria-disabled (not natively disabled) so it stays focusable.
    // Announce the requirement instead of advancing.
    if (!hasCurrentSelection()) {
      // Show the amber validation message (role="alert" announces it to SRs).
      // Toggle display off→on so the alert re-announces on repeated attempts.
      nextHelp.style.display = 'none';
      // Force reflow so the re-display is registered as a change
      void nextHelp.offsetWidth;
      nextHelp.style.display = 'flex';
      return;
    }

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
      // Move focus to the new question heading, not back to the top of the page
      questionText.focus();
    }
  }

  function handleBack() {
    // Save current answer before navigating back
    const data = getQuestionnaireData();
    const question = data.questions[currentStep - 1];
    var currentAnswer = question.multiSelect ? selectedOptions.join(', ') : selectedOption;
    answers[question.id] = currentAnswer;

    if (currentStep === 1) {
      // On the first question, Back returns to the welcome screen the user
      // came from, rather than being a disabled dead end.
      questionnaireScreen.style.display = 'none';
      welcomeScreen.style.display = 'flex';
      window.scrollTo({ top: 0, behavior: 'instant' });
      // Move focus to the Start button so keyboard/AT users land somewhere sensible
      startBtn.focus();
      return;
    }

    currentStep--;
    // Restore saved answers for this step
    restoreSavedAnswers();
    renderStepper();
    renderQuestion();
    window.scrollTo({ top: 0, behavior: 'instant' });
    // Move focus to the question heading
    questionText.focus();
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
    questionText.focus();
  }

  function handleShowTools() {
    // Build URL parameters
    var params = new URLSearchParams();
    
    // Map finder category display names to the labels the Browse page expects
    var functionNameToBrowseLabel = {
      'Attention and planning': 'Focus/Planning/Exec',
      'Braille': 'Braille Tools',
      'Speech and communication': 'Speech/Communication'
    };
    
    if (answers[2]) {
      var mappedFunctions = answers[2].split(', ').filter(function(f) { return f; }).map(function(f) {
        return functionNameToBrowseLabel[f] || f;
      });
      params.set('function', mappedFunctions.join(', '));
    }
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
