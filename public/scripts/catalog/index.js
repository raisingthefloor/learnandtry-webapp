/* Copyright 2024-2025 Raising the Floor - US, Inc.
 |
 | Licensed under the New BSD license. You may not use this file except in
 | compliance with this License.
 |
 | You may obtain a copy of the License at
 | https://github.com/raisingthefloor/learnandtry-webapp/blob/main/LICENSE
 |
 | The R&D leading to these results received funding from the:
 | * Rehabilitation Services Administration, US Dept. of Education under
 |   grant H421A150006 (APCP)
 | * National Institute on Disability, Independent Living, and
 |   Rehabilitation Research (NIDILRR)
 | * Administration for Independent Living & Dept. of Education under grants
 |   H133E080022 (RERC-IT) and H133E130028/90RE5003-01-00 (UIITA-RERC)
 | * European Union's Seventh Framework Programme (FP7/2007-2013) grant
 |   agreement nos. 289016 (Cloud4all) and 610510 (Prosperity4All)
 | * William and Flora Hewlett Foundation
 | * Ontario Ministry of Research and Innovation
 | * Canadian Foundation for Innovation
 | * Adobe Foundation
 | * Consumer Electronics Association Foundation
*/

/* filters (value and displayName) */
//
// functions
const functionsFilters = {
    "reading": "Reading",
    "cognitive": "Cognitive",
    "vision": "Vision",
    "physical": "Physical",
    "hearing": "Hearing",
    "speech": "Speech",
};
//
// supportedPlatforms
const supportedPlatformsFilters = {
    "windows": "PC (Windows)",
    "macos": "Macintosh",
    "chromeos": "Chromebooks",
    "ipados": "iPad",   
    "ios": "iPhone",
    "android": "Android",
};
//
// installTypes
const installTypesFilters = {
    "builtIn": "Built-in",
    "installable": "Installable",
};
//
// purchaseOptions
const purchaseOptionsFilters = {
    "free": "Free",
    "freeTrial": "Free Trial",
    "lifetimeLicense": "Lifetime License",
    "subscription": "Subscription",
}


/* script to run after the page loads */
let bodyResizeObserver;
let headerSectionResizeObserver;
let isOllamaAccessible = false; // Track Ollama accessibility status
let hasCompletedInitialOllamaCheck = false; // Track first check completion
let ollamaCheckIntervalId = null; // Interval id for periodic checks (not used after initial)
let isCheckingOllama = false; // Prevent multiple simultaneous checks

async function checkOllamaAccessibility() {
    // Prevent multiple simultaneous checks
    if (isCheckingOllama) {
        console.log('Ollama check already in progress, skipping');
        return;
    }
    
    isCheckingOllama = true;
    
    try {
        // Fetch with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch('/api/check-ollama', { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            isOllamaAccessible = !!data.accessible;
            console.log('Ollama accessibility check:', data.accessible ? 'accessible' : 'not accessible');
        } else {
            console.log('Ollama check failed with status:', response.status);
            isOllamaAccessible = false;
        }
    } catch (error) {
        // Only log actual errors, not aborts from rapid requests
        if (error.name !== 'AbortError') {
            console.error('Error checking Ollama accessibility:', error);
        }
        // Don't change isOllamaAccessible on abort - keep previous state
        if (error.name === 'AbortError') {
            console.log('Ollama check aborted (likely due to rapid requests)');
        } else {
            isOllamaAccessible = false;
        }
    } finally {
        isCheckingOllama = false;
        hasCompletedInitialOllamaCheck = true;
        
        // Stop further periodic checks after first determination, if any
        if (ollamaCheckIntervalId !== null) {
            clearInterval(ollamaCheckIntervalId);
            ollamaCheckIntervalId = null;
        }

        updateButtonVisibility();
    }
}

function updateButtonVisibility() {
    const startNewChatButton = document.getElementById('StartNewChatButton');
    const setupChatbotButton = document.getElementById('SetupChatbotButton');

    const chatOptionsLoading = document.getElementById('ChatOptionsLoading');
    const chatOptionsContent = document.getElementById('ChatOptionsContent');

    // First, apply the correct states BEFORE revealing content to avoid flicker
    if (startNewChatButton) {
        startNewChatButton.style.display = 'block';
        // Start disabled by default, only enable if Ollama is confirmed accessible
        if (isOllamaAccessible) {
            startNewChatButton.classList.remove('is-disabled');
            startNewChatButton.removeAttribute('aria-disabled');
        } else {
            startNewChatButton.classList.add('is-disabled');
            startNewChatButton.setAttribute('aria-disabled', 'true');
        }
    }
    if (setupChatbotButton) {
        setupChatbotButton.style.display = 'block';
        setupChatbotButton.disabled = false;
    }

    // After states are set, switch from loading to content
    if (chatOptionsLoading && chatOptionsContent && hasCompletedInitialOllamaCheck) {
        chatOptionsLoading.style.display = 'none';
        chatOptionsContent.style.display = 'block';
    }
}

//
function setupElementEvents() {
    // set up an observer to watch for the header being resized
    let headerSection = document.getElementById("HeaderSection");
    //
    headerSectionResizeObserver = new ResizeObserver(headerSectionResized);
    headerSectionResizeObserver.observe(headerSection);

    // Kick off one initial check (no periodic polling)
    checkOllamaAccessibility();

    // wire up a click event to the filter button (so that the flyout pops out when it's clicked)
    let filterButton = document.getElementById("FilterButton");
    filterButton.addEventListener('click', filterButtonClicked);

    // set up an observer to watch for the body being resized
    let body = document.querySelector("body");
    //
    bodyResizeObserver = new ResizeObserver(bodyResized);
    bodyResizeObserver.observe(body);
    //
    // wire up a click event to the body (so that we can hide the flyout when the user clicks anywhere else)
    body.addEventListener('click', bodyClicked);

    // wire up a click event to the sidebar (so that we can suppress clicks from progating to the body...so that clicking on the sidebar or its elements doesn't hide the sidebar)
    let sidebarSection = document.getElementById("SidebarSection")
    sidebarSection.addEventListener("click", sidebarSectionClicked);

    // wire up keyboard event for shift+enter to toggle chatbot
    document.addEventListener('keydown', function(event) {
        if (event.shiftKey && event.key === 'Enter') {
            event.preventDefault();
            // Toggle chatbot - open if closed, close if open
            let chatBotSection = document.getElementById('ChatBotSection');
            if (chatBotSection.hidden) {
                openChatBot();
            } else {
                closeChatBot();
            }
        }
        
        // Shift+N to start a new chat
        if (event.shiftKey && (event.key === 'N' || event.key === 'n')) {
            event.preventDefault();
            let chatBotSection = document.getElementById('ChatBotSection');
            if (chatBotSection.hidden) {
                openChatBot();
            }
            // If Start New Chat is visually disabled, alert instead
            const startBtn = document.getElementById('StartNewChatButton');
            if (startBtn && (startBtn.classList.contains('is-disabled') || startBtn.getAttribute('aria-disabled') === 'true')) {
                alert('Please setup the local chatbot first.');
                return;
            }
            // If chatbot is already open, start a new chat directly
            hideChatOptionsScreen();
            initializeConversation();
        }
        
        // Shift+L to load a previously saved chat
        if (event.shiftKey && (event.key === 'L' || event.key === 'l')) {
            event.preventDefault();
            let chatBotSection = document.getElementById('ChatBotSection');
            if (chatBotSection.hidden) {
                openChatBot();
            }
            // Trigger the file input for loading a chat
            document.getElementById('ChatFileInput').click();
        }
        
        // Shift+S to setup local chatbot
        if (event.shiftKey && (event.key === 'S' || event.key === 's')) {
            event.preventDefault();
            let chatBotSection = document.getElementById('ChatBotSection');
            if (chatBotSection.hidden) {
                openChatBot();
            }
            // Show the platform selection screen
            showPlatformSelectionScreen();
        }
    });

    // Wire up chatbot button events
    let chatBotCloseButton = document.getElementById('ChatBotCloseButton');
    if (chatBotCloseButton) {
        chatBotCloseButton.addEventListener('click', closeChatBot);
    }

    let chatBotSendButton = document.getElementById('ChatBotSendButton');
    if (chatBotSendButton) {
        chatBotSendButton.addEventListener('click', sendChatBotMessage);
    }

    let chatBotInputTextbox = document.getElementById('ChatBotInputTextbox');
    if (chatBotInputTextbox) {
        chatBotInputTextbox.addEventListener('keypress', handleChatInputKeyPress);
    }

    let floatingChatBotButton = document.getElementById('FloatingChatBotButton');
    if (floatingChatBotButton) {
        floatingChatBotButton.addEventListener('click', openChatBot);
    }

    // Wire up info popup events for the devices info section
    let devicesInfoButton = document.querySelector('#devices-info').previousElementSibling;
    if (devicesInfoButton && devicesInfoButton.classList.contains('info-button')) {
        devicesInfoButton.addEventListener('click', () => toggleInfoPopup('devices-info'));
    }

    let devicesInfoCloseButton = document.querySelector('#devices-info .info-close');
    if (devicesInfoCloseButton) {
        devicesInfoCloseButton.addEventListener('click', () => toggleInfoPopup('devices-info'));
    }
}

// NOTE: currently unused
function bodyResized() {
}

function headerSectionResized() {
    let headerSection = document.getElementById("HeaderSection");

    let filterIconDiv = document.getElementById("FilterIconDiv");
    filterIconDiv.style.top = ((headerSection.offsetHeight - filterIconDiv.offsetHeight) / 2) + "px";

    let headerSectionVerticalSpacer = document.getElementById("HeaderSectionVerticalSpacer");
    headerSectionVerticalSpacer.style.height = headerSection.offsetHeight + "px";
}

function filterButtonClicked(event) {
     // toggle the aria-expanded attribute
    const isExpanded = getSidebarIsOpened();
    setSidebarIsOpened(!isExpanded);

    // do not propagate clicks on the filter button (or else the body would capture a 'click' and close the sidebar)
    event.stopPropagation();
}

function getSidebarIsOpened() {
    let filterButton = document.getElementById("FilterButton");
    const isExpanded = filterButton.getAttribute("aria-expanded");

    if (typeof isExpanded === "undefined" || isExpanded === "false") {
        return false;
    } else {
        return true;
    }
}

function setSidebarIsOpened(value) {
    let filterButton = document.getElementById("FilterButton");

    if (value === true) {
        filterButton.setAttribute("aria-expanded", "true")
        document.getElementById('SidebarSection').classList.add('offscreen-sidebar-visible');
    } else if (value === false) {
        filterButton.setAttribute("aria-expanded", "false")
        document.getElementById('SidebarSection').classList.remove('offscreen-sidebar-visible');
    } else {
        console.assert(false, "Invalid argument: value");
    }
}

function bodyClicked() {
    // if the body is clicked, make sure the sidebar is closed
    if (getSidebarIsOpened() === true) {
        setSidebarIsOpened(false);
    }
}

function sidebarSectionClicked(event) {
    // do not propagate clicks on the sidebar section (or else the body would capture a 'click' and close the sidebar)
    event.stopPropagation();
}

/* script to run after the page loads */

async function populateInitialContents() {
    // set up filters sidebar; note that the filter checkboxes are disabled by default (until we have loaded the filter list)
        populateFiltersSidebar();

        let fetchCatalogResponse;
    try {
        fetchCatalogResponse = await fetch('/data/catalog.json');
    } catch {
        let toolsListLoadingMessage = document.getElementById('ToolsListLoadingMessage');
        toolsListLoadingMessage.innerText = "Sorry, I could not load the Learn and Try catalog due to a network error.";
        return;
    }
    if (fetchCatalogResponse.ok !== true) {
        let toolsListLoadingMessage = document.getElementById('ToolsListLoadingMessage');
        toolsListLoadingMessage.innerText = "Sorry, I could not load the Learn and Try catalog due to a server error.";
        return;
    }
    const catalog = await fetchCatalogResponse.json();

    // populate the tools list's elements
    // NOTE: we assemble the full catalog, then push it to the DOM all at once
    let toolsList = document.getElementById('ToolsList');
    let toolsListElements = [];
    await catalog.forEach(async (element, index) => {
        let toolsListElement = await createToolItemElement(element, index);
        
        // add the tool item element to the list
        toolsListElements.push(toolsListElement);
    });
    //
    // before populating the list, sort the list by the default (intiially selected, default) sort order
    const defaultSortOrder = getSelectedSortOrder();
    toolsListElements = sortToolsListElements(toolsListElements, defaultSortOrder);
    //
    // before populating the list, apply our default filters
    const defaultFilters = getSelectedFilters();
    filterToolsListElements(toolsListElements, defaultFilters);
    
    toolsList.replaceChildren(...toolsListElements);

    // if the web page's URL (window location) includes a hash component, expand and navigate to that element now
    const windowLocationHash = window.location.hash;
    if (isOfStringType(windowLocationHash) === true && windowLocationHash.indexOf('#') === 0) {
        const selectedToolId = windowLocationHash.substring(1);
        let selectedToolsListElement = getToolsListElementById(selectedToolId);
        if (selectedToolsListElement !== null) {
            // expand and scroll to the list element
            expandAndScrollToToolsListElement(selectedToolsListElement);
        } else {
            console.log('Could not navigate to tool with id: ', selectedToolId);
        }
    }

    // update the total count of tools (which should read 'All Tools' by default if we have not enabled any filters)
    updateToolsListCount();

    // wire up search textbox event(s) and enable search textbox
    let searchTextbox = document.getElementById('SearchTextbox');
    // NOTE: we intentionally capture keyup (versus the traditionally keydown) to avoid rapid calls to the filter code during a long key hold (and also to capture the key after it has been pressed)
    searchTextbox.addEventListener('keyup', processSearchTextboxChange);
    // enable the search textbox (which is disabled by default so that it is not used until after the catalog loads)
    searchTextbox.disabled = false;

    // wire up search text box's 'clear' button
    let searchClearButton = document.getElementById("SearchClearButton");
    searchClearButton.addEventListener('click', searchClearButtonClicked);
    searchClearButton.disabled = false;

    // enable the filter checkboxes
    filterCheckboxes = document.querySelectorAll('input[id^="filter_"]');
    filterCheckboxes.forEach((filterCheckbox) => { 
        filterCheckbox.disabled = false;
    });

    // wire up the "sort order" dropdown's change event (so that the user can change the sort order)
    let sortOrderDropdownList = document.getElementById('SortOrderDropdownList');
    sortOrderDropdownList.addEventListener('change', sortToolsList);

    // finally, show the filter button; note that it will not appear if its parent is collapsed
    let filterButton = document.getElementById("FilterButton");
    // filterButton.style.visibility = "visible";
}

function populateFiltersSidebar() {
    // NOTE: we disable the populated filter checkboxes by default

    // functions
    let functionsFiltersFieldset = document.getElementById('FunctionsFiltersFieldset');
    populateFieldset(functionsFiltersFieldset, functionsFilters, 'filter_functions_', /*disabled: */true);

    // supportedPlatforms
    let supportedPlatformsFiltersFieldset = document.getElementById('SupportedPlatformsFiltersFieldset');
    populateFieldset(supportedPlatformsFiltersFieldset, supportedPlatformsFilters, 'filter_supportedPlatforms_', /*disabled: */true);

    // installTypes
    let installTypesFiltersFieldset = document.getElementById('InstallTypesFiltersFieldset');
    populateFieldset(installTypesFiltersFieldset, installTypesFilters, 'filter_installTypes_', /*disabled: */true);
    //
    // purchaseOptions
    let purchaseOptionsFiltersFieldset = document.getElementById('PurchaseOptionsFiltersFieldset');
    populateFieldset(purchaseOptionsFiltersFieldset, purchaseOptionsFilters, 'filter_purchaseOptions_', /*disabled: */true);
}

function populateFieldset(fieldset, filtersDictionary, filter_id_prefix, disabled) {
    const filterEntries = Object.entries(filtersDictionary);
    filterEntries.forEach((filterEntry) => {
        const idValue = filterEntry[0];
        const textValue = filterEntry[1];

        const filterId = filter_id_prefix + idValue;

        appendFilterCheckboxAndLabelToFieldset(filterId, idValue, /*checked: */false, textValue, disabled, fieldset);
    });
}

function appendFilterCheckboxAndLabelToFieldset(id, value, checked, text, disabled, fieldset) {
    let checkboxInput = document.createElement('input');
    checkboxInput.type = 'checkbox';
    checkboxInput.id = id;
    checkboxInput.value = value;
    checkboxInput.checked = checked;
    checkboxInput.disabled = disabled;
    checkboxInput.addEventListener('click', () => { filterToolItemsAndUpdateToolsListCount() });

    let label = document.createElement('label');
    label.htmlFor = checkboxInput.id;
    label.innerText = text;

    if(!id.includes("filter_supportedPlatforms")) {

    // Create info button for this filter item
    let infoButton = document.createElement('button');
    infoButton.className = 'info-button';
    infoButton.type = 'button';
    infoButton.setAttribute('aria-label', `Information about ${text}`);
    
    let infoIcon = document.createElement('span');
    infoIcon.className = 'info-icon';
    infoIcon.textContent = 'i';
    infoButton.appendChild(infoIcon);

    // Create popup for this filter item
    let popupId = `filter-info-${value}`;
    let popup = document.createElement('div');
    popup.id = popupId;
    popup.className = 'info-popup';
    popup.style.display = 'none';
    
    let popupContent = document.createElement('div');
    popupContent.className = 'info-popup-content';
    
    let popupText = document.createElement('p');
    popupText.textContent = getFilterInfoText(value, text);
    
    let closeButton = document.createElement('button');
    closeButton.className = 'info-close';
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => toggleInfoPopup(popupId));
    
    popupContent.appendChild(popupText);
    popupContent.appendChild(closeButton);
    popup.appendChild(popupContent);
    
    // Add click handler to info button
    infoButton.addEventListener('click', () => toggleInfoPopup(popupId));

    let div = document.createElement('div');
    div.className = 'filter-item-container';
    div.appendChild(checkboxInput);
    div.appendChild(label);
    div.appendChild(infoButton);
    div.appendChild(popup);

    fieldset.appendChild(div);
    }
    else {
        let div = document.createElement('div');
        div.className = 'filter-item-container';
        div.appendChild(checkboxInput);
        div.appendChild(label);
        fieldset.appendChild(div);
    }
}

/* code to create tools list elements */

// NOTE: this function clones the ToolItemTemplate, populates its DOM and then returns the resulting (cloned) element to the caller
async function createToolItemElement(catalogEntry, index) {
    // clone the tool item template
    let toolItemElement = document.getElementById('ToolItemTemplate').content.cloneNode(true);
    // capture a reference to the template's main DIV (which holds data about the overall element and will be the function's return value)
    let toolsListElement = toolItemElement.querySelector('.ToolsListElement');

    var validatedToolId = validateIdOrNull(catalogEntry.id);
    if (validatedToolId !== null) {
        toolsListElement.id = 'ToolItem_' + validatedToolId;
        toolsListElement.dataset.toolId = validatedToolId;
    }
    // Preserve original backend id_tag (database id) if provided
    if (isOfStringType(catalogEntry.dbId) === true && catalogEntry.dbId.trim().length > 0) {
        toolsListElement.dataset.dbId = catalogEntry.dbId.trim();
    } else if (isOfStringType(catalogEntry.id) === true && catalogEntry.id.trim().length > 0) {
        // Fall back to catalog id
        toolsListElement.dataset.dbId = catalogEntry.id.trim();
    }

    let toolItemHeader = toolItemElement.querySelector('.ToolItemHeader');
    // NOTE: we open/close the element using its element rather than its id in case the tool does not have an id
    toolItemHeader.addEventListener('click', () => { toggleToolsListElement(toolsListElement) });

    // populate element details
    //
    // "Name of AT" (in header)
    let nameGridCell = toolItemElement.querySelector('.ToolItemHeader');
    if (isOfStringType(catalogEntry.name) === true) {
        nameGridCell.textContent = catalogEntry.name;
        toolsListElement.dataset.sortableName = catalogEntry.name.trim().toLowerCase();
        toolsListElement.dataset.toolName = catalogEntry.name.trim();
    } else {
        nameGridCell.textContent = "Untitled";
        toolsListElement.dataset.sortableName = "";
        toolsListElement.dataset.toolName = "";
        console.log("catalogEntry's name field is missing or is of an invalid type.");
    }
    // Persist company for deduping in UI
    if (isOfStringType(catalogEntry.company) === true) {
        toolsListElement.dataset.toolCompany = catalogEntry.company.trim();
    } else {
        toolsListElement.dataset.toolCompany = "";
    }
    // index (used for "newest first" and "oldest first" sorting)
    toolsListElement.dataset.sortableIndex = "" + index;
    //
    // "Description"
    let descriptionGridCell = toolItemElement.querySelector('.ToolItemDescriptionGridCell');
    let descriptionGridContent = descriptionGridCell.querySelector('.ToolItemDescriptionGridContent');
    if (isOfStringType(catalogEntry.description) === true) {
        descriptionGridContent.textContent = catalogEntry.description;
    } else {
        console.log("catalogEntry's description field is missing or is of an invalid type.");
    }
    //
    // Primary vendor video
    let toolItemPrimaryVideoGridCell = toolItemElement.querySelector('.ToolItemPrimaryVideoGridCell');
    if (catalogEntry.youTubeVideos.length > 0) {
        var vendorVideoIFrame = createYouTubeVideoEmbedIframe(catalogEntry.youTubeVideos[0].embedUrl, catalogEntry.youTubeVideos[0].title, catalogEntry.youTubeVideos[0].aspectRatio);
        vendorVideoIFrame.className = "ToolItemPrimaryVideoIframe";
        toolItemPrimaryVideoGridCell.replaceChildren(vendorVideoIFrame);
    } else {
        toolItemPrimaryVideoGridCell.replaceChildren();
    }
    //
    // Additional vendor videos
    let toolItemSecondaryVideosGridCell = toolItemElement.querySelector('.ToolItemSecondaryVideosGridCell');
    if (catalogEntry.youTubeVideos.length > 1) {
        var vendorVideoDivs = [];
        for (var index = 1; index < Math.min(5, catalogEntry.youTubeVideos.length); index += 1) {
            var embedUrl = catalogEntry.youTubeVideos[index].embedUrl;
            var title = catalogEntry.youTubeVideos[index].title;
            var aspectRatio = catalogEntry.youTubeVideos[index].aspectRatio;
            //
            var vendorVideoIframe = createYouTubeVideoEmbedIframe(embedUrl, title, aspectRatio);
            vendorVideoIFrame.className = "ToolItemSecondaryVideoIframe";
            //
            var vendorVideoDiv = document.createElement('div')
            vendorVideoDiv.class = '.ToolItemSecondaryVideosSubGridCell'
            vendorVideoDiv.replaceChildren(vendorVideoIframe);
            vendorVideoDivs.push(vendorVideoDiv);
        }
        toolItemSecondaryVideosGridCell.replaceChildren(...vendorVideoDivs);
    } else {
        toolItemSecondaryVideosGridCell.replaceChildren();
    }
    //
    // "Link to Vendor Page"
    let toolItemVendorProductPageUrlAnchor = toolItemElement.querySelector('.ToolItemVendorProductPageUrlAnchor');
    if (isOfStringType(catalogEntry.vendorProductPageUrl) === true) {
        try {
            // validate URL
            vendorProductPageUrl = new URL(catalogEntry.vendorProductPageUrl);
            toolItemVendorProductPageUrlAnchor.href = vendorProductPageUrl.href;
            toolItemVendorProductPageUrlAnchor.style.visibility = 'visible';
        } catch {
            console.log("catalogEntry's vendorProductPageUrl field contains an invalid url.");
            toolItemVendorProductPageUrlAnchor.style.visibility = 'hidden';        
        }
    } else {
        console.log("catalogEntry's vendorProductPageUrl field is missing or is of an invalid type.");
        toolItemVendorProductPageUrlAnchor.style.visibility = 'hidden';
    }
    //
    // "Functions"
    let functionsGridCell = toolItemElement.querySelector('.ToolItemFunctionsGridCell');
    const populatedFunctions = populateFunctionsGridCell(catalogEntry, functionsGridCell);
    toolsListElement.dataset.functions = populatedFunctions.join(' ');
    //
    // "Need to install?"
    let needToInstallGridCell = toolItemElement.querySelector('.ToolItemNeedToInstallGridCell');
    const populatedInstallTypes = populateNeedToInstallGridCell(catalogEntry, needToInstallGridCell);
    toolsListElement.dataset.installTypes = populatedInstallTypes.join(' ');
    //
    // (Supported) "Devices"
    let supportedPlatformsGridCell = toolItemElement.querySelector('.ToolItemSupportedPlatformsGridCell');
    const populatedSupportedPlatforms = populateSupportedPlatformsGridCell(catalogEntry, supportedPlatformsGridCell);
    toolsListElement.dataset.supportedPlatforms = populatedSupportedPlatforms.join(' ');
    //
    // "Purchase Options"
    let purchaseOptionsGridCell = toolItemElement.querySelector('.ToolItemPurchaseOptionsGridCell');
    const populatedPurchaseOptions = populatePurchaseOptionsGridCell(catalogEntry, purchaseOptionsGridCell);
    toolsListElement.dataset.purchaseOptions = populatedPurchaseOptions.join(' ');

    // create a "searchableText" data field which contains the text against which the user can search; note that we reduce the string to cast-invariant lowercase (for easier matching)
    // NOTE: we separate fields by newline characters for optimum search matching (since in theory '\n' cannot be matched by the single-line search textbox)
    let searchableText = "";
    if (isOfStringType(catalogEntry.name) === true) {
        searchableText += catalogEntry.name.toLowerCase() + "\n";
    }
    if (isOfStringType(catalogEntry.description) == true) {
        searchableText += catalogEntry.description.toLowerCase() + "\n";
    }
    toolsListElement.dataset.searchableText = searchableText;

    return toolsListElement;
}

function populateFunctionsGridCell(catalogEntry, gridCell) {
    let populatedFunctions = [];

    let list = gridCell.querySelector('.ToolItemFunctionsList');
    list.replaceChildren();
    //
    if (Array.isArray(catalogEntry.functions) == true) {
        catalogEntry.functions.forEach(element => {
            var listItemText = functionsFilters[element];
            if (typeof listItemText === 'undefined') {
                console.log("Unknown function: " + element);
            }
            //
            if (listItemText !== null) {
                appendListItemTextToList(listItemText, list);

                populatedFunctions.push(element);
            }
        });
    } else {
        console.log("catalogEntry's functions field is missing or is of an invalid type.");
    }
    //
    var header = gridCell.querySelector('.ToolItemFunctionsHeader');
    setHeaderVisibilityByListLength(header, list);

    return populatedFunctions;
}

function populateSupportedPlatformsGridCell(catalogEntry, gridCell) {
    let populatedSupportedPlatforms = [];

    let list = gridCell.querySelector('.ToolItemSupportedPlatformsList');
    list.replaceChildren();
    //
    if (Array.isArray(catalogEntry.supportedPlatforms) == true) {
        catalogEntry.supportedPlatforms.forEach(element => {
            let listItemText = supportedPlatformsFilters[element];
            if (typeof listItemText === 'undefined') {
                console.log("Unknown platform: " + element);
            }
            //
            if (listItemText !== null) {
                appendListItemTextToList(listItemText, list);

                populatedSupportedPlatforms.push(element);
            }
        });
    } else {
        console.log("catalogEntry's supportedPlatforms field is missing or is of an invalid type.");
    }
    //
    var header = gridCell.querySelector('.ToolItemSupportedPlatformsHeader');
    setHeaderVisibilityByListLength(header, list);

    return populatedSupportedPlatforms;
}

function populateNeedToInstallGridCell(catalogEntry, gridCell) {
    let populatedInstallTypes = [];

    let list = gridCell.querySelector('.ToolItemNeedToInstallList');
    list.replaceChildren();
    //
    if (Array.isArray(catalogEntry.installTypes) == true) {
        catalogEntry.installTypes.forEach(element => {
            let listItemText = installTypesFilters[element];
            if (typeof listItemText === 'undefined') {
                console.log("Unknown installType: " + element);
            }
            //
            if (listItemText !== null) {
                appendListItemTextToList(listItemText, list);

                populatedInstallTypes.push(element);
            }
        });
    } else {
        console.log("catalogEntry's installTypes field is missing or is of an invalid type.");
    }
    //
    var header = gridCell.querySelector('.ToolItemNeedToInstallHeader');
    setHeaderVisibilityByListLength(header, list);

    return populatedInstallTypes;
}

function populatePurchaseOptionsGridCell(catalogEntry, gridCell) {
    let populatedPurchaseOptions = [];

    let list = gridCell.querySelector('.ToolItemPurchaseOptionsList');
    list.replaceChildren();
    //
    if (Array.isArray(catalogEntry.purchaseOptions) == true) {
        catalogEntry.purchaseOptions.forEach(element => {
            let listItemText = purchaseOptionsFilters[element];
            if (typeof listItemText === 'undefined') {
                console.log("Unknown purchaseOption: " + element);
            }
            //
            if (listItemText !== null) {
                appendListItemTextToList(listItemText, list);

                populatedPurchaseOptions.push(element);
            }
        });
    } else {
        console.log("catalogEntry's purchaseOptions field is missing or is of an invalid type.");
    }
    //
    var header = gridCell.querySelector('.ToolItemPurchaseOptionsHeader');
    setHeaderVisibilityByListLength(header, list);

    return populatedPurchaseOptions;
}

//

function createYouTubeVideoEmbedIframe(src, title, aspectRatio) {
    let iframe = document.createElement("iframe");
    iframe.loading = "lazy";
    iframe.frameborder = 0;
    // iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.referrerpolicy = "strict-origin-when-cross-origin";
    iframe.setAttribute("allowfullscreen", ""); // enable
    //
    // NOTE: we set the initial iframe src to 'about:blank' so that we can load the YouTube embed when the user first expands the element (to avoid requesting 100s of videos from YouTube in advance)
    iframe.src = "about:blank";
    iframe.setAttribute('data-src', src);
    iframe.title = title;
    iframe.style.aspectRatio = aspectRatio;

    return iframe;
}

//

function setHeaderVisibilityByListLength(header, list) {
    if (list.getElementsByTagName('li').length > 0) {
        header.style.visibility = 'visible'
    } else {
        header.style.visibility = 'hidden'
    }
}

function appendListItemTextToList(listItemText, list) {
    let listItem = document.createElement('li');
    listItem.textContent = listItemText;
    list.appendChild(listItem);
}

//

function validateIdOrNull(idToValidate) {
    if (isOfStringType(idToValidate) === true) {
        let idToValidateChars = idToValidate.split('');
        for (let index = 0; index < idToValidateChars.length; index += 1) {
            if ((idToValidateChars[index] >= 'a' && idToValidateChars[index] <= 'z') ||
                (idToValidateChars[index] >= 'A' && idToValidateChars[index] <= 'Z') ||
                (idToValidateChars[index] >= '0' && idToValidateChars[index] <= '9') ||
                (idToValidateChars[index] == '_')) {
                    // valid character
            } else {
                return null;
            }
        }
    } else {
        return null;
    }

    // if we passed all tests, return the original argument
    return idToValidate;
}


/* code to update the current visible count of tools (i.e. removing the elements hidden by search text, unchecked filters, etc.) */

function updateToolsListCount() {
    let toolsListAllElements = document.querySelectorAll('.ToolsListElement');
    let toolsListHiddenElements = document.querySelectorAll('.ToolElementHiddenByFilter, .ToolElementHiddenBySearch');

    const totalElementcount = toolsListAllElements.length;
    const visibleElementCount = totalElementcount - toolsListHiddenElements.length;
    const listIsFiltered = (toolsListHiddenElements.length > 0);

    let toolsListCount = document.getElementById('ToolsListCount');
    if (listIsFiltered == false) {
        toolsListCount.innerText = "Showing all tools";
    } else {
        let toolsListCountText = "Showing " + visibleElementCount;
        if (visibleElementCount == 1) {
            toolsListCountText += " tool";
        } else {
            toolsListCountText += " tools";
        }
        toolsListCountText += " out of " + totalElementcount;

        toolsListCount.innerText = toolsListCountText;
    }
}

/* code to filter the tools list (called whenever the filter list is updated or filters are selected/unselected) */

function filterToolItemsAndUpdateToolsListCount() {
    // step 1: capture the list of filters which are currently selected
    const selectedFilters = getSelectedFilters();

    // step 2: apply the filters (i.e. the unselected checkboxes) to the elements
    // 
    let toolsList = document.getElementById('ToolsList');
    let allToolsListElements = toolsList.querySelectorAll('.ToolsListElement');
    //
    filterToolsListElements(allToolsListElements, selectedFilters);

    // step 3: update the tools list count
    updateToolsListCount();
    
    // Clear relevance cache when filters change
    clearRelevanceCache();
}

function getSelectedFilters() {
    let filterFunctionsCheckboxes;
    //
    // filter: functions
    let selectedFunctions = [];
    filterFunctionsCheckboxes = document.querySelectorAll('input[id^="filter_functions_"]');
    filterFunctionsCheckboxes.forEach((filterFunctionCheckbox) => {
        if (filterFunctionCheckbox.checked === true) {
            selectedFunctions.push(filterFunctionCheckbox.value);
        }
    });
    //
    // filter: supportedPlatforms
    let selectedSupportedPlatforms = [];
    filterFunctionsCheckboxes = document.querySelectorAll('input[id^="filter_supportedPlatforms_"]');
    filterFunctionsCheckboxes.forEach((filterFunctionCheckbox) => {
        if (filterFunctionCheckbox.checked === true) {
            selectedSupportedPlatforms.push(filterFunctionCheckbox.value);
        }
    });
    //
    // filter: installTypes
    let selectedInstallTypes = [];
    filterFunctionsCheckboxes = document.querySelectorAll('input[id^="filter_installTypes_"]');
    filterFunctionsCheckboxes.forEach((filterFunctionCheckbox) => {
        if (filterFunctionCheckbox.checked === true) {
            selectedInstallTypes.push(filterFunctionCheckbox.value);
        }
    });
    //
    // filter: purchaseOptions
    let selectedPurchaseOptions = [];
    filterFunctionsCheckboxes = document.querySelectorAll('input[id^="filter_purchaseOptions_"]');
    filterFunctionsCheckboxes.forEach((filterFunctionCheckbox) => {
        if (filterFunctionCheckbox.checked === true) {
            selectedPurchaseOptions.push(filterFunctionCheckbox.value);
        }
    });

    return { 
        selectedFunctions: selectedFunctions, 
        selectedSupportedPlatforms: selectedSupportedPlatforms, 
        selectedInstallTypes: selectedInstallTypes, 
        selectedPurchaseOptions: selectedPurchaseOptions
    };
}

// NOTE: this function filters the list in place
// NOTE: in the current implementation, we only apply filters in a filter category if at least one checkbox is checked
function filterToolsListElements(toolsListElements, selectedFilters) {
    toolsListElements.forEach((toolsListElement) => {
        // filter: functions
        const toolItemFunctions = toolsListElement.dataset.functions.split(' ');
        //
        let toolItemSupportsSelectedFunction = false;
        if (selectedFilters.selectedFunctions.length > 0) {
            selectedFilters.selectedFunctions.forEach((selectedFunction) => {
                if (toolItemFunctions.includes(selectedFunction)) {
                    toolItemSupportsSelectedFunction = true;
                }
            });    
        } else {
            toolItemSupportsSelectedFunction = true;
        }
        //
        // filter: supportedPlatforms
        const toolItemSupportedPlatforms = toolsListElement.dataset.supportedPlatforms.split(' ');
        //
        let toolItemSupportsSelectedSupportedPlatforms = false;
        if (selectedFilters.selectedSupportedPlatforms.length > 0) {
            selectedFilters.selectedSupportedPlatforms.forEach((selectedSupportedPlatform) => {
                if (toolItemSupportedPlatforms.includes(selectedSupportedPlatform)) {
                    toolItemSupportsSelectedSupportedPlatforms = true;
                }
            });
        } else {
            toolItemSupportsSelectedSupportedPlatforms = true;
        }
        //
        // filter: installTypes
        const toolItemInstallTypes = toolsListElement.dataset.installTypes.split(' ');
        //
        let toolItemSupportsSelectedInstallTypes = false;
        if (selectedFilters.selectedInstallTypes.length > 0) {
            selectedFilters.selectedInstallTypes.forEach((selectedInstallType) => {
                if (toolItemInstallTypes.includes(selectedInstallType)) {
                    toolItemSupportsSelectedInstallTypes = true;
                }
            });
        } else {
            toolItemSupportsSelectedInstallTypes = true;
        }
        //
        // filter: purchaseOptions
        const toolItemPurchaseOptions = toolsListElement.dataset.purchaseOptions.split(' ');
        //
        let toolItemSupportsSelectedPurchaseOptions = false;
        if (selectedFilters.selectedPurchaseOptions.length > 0) {
            selectedFilters.selectedPurchaseOptions.forEach((selectedInstallType) => {
                if (toolItemPurchaseOptions.includes(selectedInstallType)) {
                    toolItemSupportsSelectedPurchaseOptions = true;
                }
            });
        } else {
            toolItemSupportsSelectedPurchaseOptions = true;
        }
        // set/clear ToolItemPresent class on the tool item, depending on whether the element should be filtered out by the selected filter(s)
        if ((toolItemSupportsSelectedFunction === false) ||
            (toolItemSupportsSelectedSupportedPlatforms === false) ||
            (toolItemSupportsSelectedInstallTypes === false) ||
            (toolItemSupportsSelectedPurchaseOptions === false)
            ){
            toolsListElement.classList.add('ToolElementHiddenByFilter')
        } else {
            toolsListElement.classList.remove('ToolElementHiddenByFilter');
        }
    });
}


/* functions to sort the tools list elements */

function getSelectedSortOrder() {
    let sortOrderDropdownList = document.getElementById('SortOrderDropdownList');
    let selectedOption = sortOrderDropdownList[sortOrderDropdownList.selectedIndex];
    return selectedOption.value;
}

function sortToolsList() {
    let toolsList = document.getElementById('ToolsList');
    let allToolsListElements = toolsList.querySelectorAll('.ToolsListElement');
    //
    const sortOrder = getSelectedSortOrder();

    // If user picked Relevance manually, check cache first, then re-run relevance sorting if needed
    if (sortOrder === 'relevance') {
        // Check if we have cached relevance results that match current conversation state
        // Also check if cache is not too old (expire after 1 hour)
        const cacheAge = Date.now() - (relevanceSortedCache.timestamp || 0);
        const cacheExpired = cacheAge > 3600000; // 1 hour in milliseconds
        
        if (relevanceSortedCache.tools && 
            !cacheExpired &&
            relevanceSortedCache.query === conversationState.problem_description &&
            relevanceSortedCache.filters === JSON.stringify(conversationState.applied_filters)) {
            
            console.log('Using cached relevance-sorted results (age:', Math.round(cacheAge/1000), 'seconds)');
            // Use cached results immediately
            displaySearchResults(relevanceSortedCache.tools);
            
            // Ensure the dropdown shows relevance as selected
            setRelevanceSorting();
            return;
        }
        
        // If no cache hit, check if we have conversation context to re-sort
        if (typeof conversationState === 'object' && conversationState && conversationState.problem_description && conversationState.applied_filters) {
            console.log('Cache miss - re-sorting by relevance with conversation context');
            // Silent mode: do not post chat messages, just re-sort the UI
            applySortingToResults(conversationState.problem_description, conversationState.applied_filters, /*silent:*/ true);
            return;
        }
        // If no query context, we can't do relevance sorting - restore original order
        console.log('No conversation context for relevance sorting - restoring original order');
        
        // Show a brief message to the user
        const toolsListCount = document.getElementById('ToolsListCount');
        if (toolsListCount) {
            const originalText = toolsListCount.textContent;
            toolsListCount.textContent = "Relevance sorting requires a conversation context - showing original order";
            setTimeout(() => {
                toolsListCount.textContent = originalText;
            }, 3000);
        }
        
        // Restore the original order by sorting by the original index
        const originalOrderElements = Array.from(allToolsListElements).sort((a, b) => {
            const indexA = parseInt(a.dataset.sortableIndex || '0', 10);
            const indexB = parseInt(b.dataset.sortableIndex || '0', 10);
            return indexA - indexB;
        });
        toolsList.replaceChildren(...originalOrderElements);
        return;
    }

    // NOTE: 'sortToolsListElements' sorts the list in-place
    let sortedToolsListElements = sortToolsListElements(allToolsListElements, sortOrder);
    toolsList.replaceChildren(...sortedToolsListElements);
}

function sortToolsListElements(toolsListElements, sortOrder) {
    // capture each tools list element's name and original index #
    let arrayIndicesAndNames = {};
    let arrayIndicesAndOriginalIndices = {};
    for (let index = 0; index < toolsListElements.length; index += 1) {
        // store the sortable name of each element along with its index number
        arrayIndicesAndNames["" + index] = toolsListElements[index].dataset.sortableName;
        arrayIndicesAndOriginalIndices["" + index] = toolsListElements[index].dataset.sortableIndex;
    }
    // capture the tools list array indices and names (for sorting); do the same for the original index #s
    let arrayIndicesAndSortedNames = Object.entries(arrayIndicesAndNames);
    let arrayIndicesAndSortedIndices = Object.entries(arrayIndicesAndOriginalIndices);


    let sortedArrayIndices;
    switch (sortOrder) {
        case "alphabetical":
            // alphabetical sort (invariant)
            arrayIndicesAndSortedNames.sort((lhs, rhs) => lhs[1].localeCompare(rhs[1], undefined, { sensitivity: 'base' }));
            sortedArrayIndices = arrayIndicesAndSortedNames.map((x) => x[0]);
            break;
        case "alphabeticalReverse":
            // reverse alphabetical sort (invariant)
            arrayIndicesAndSortedNames.sort((lhs, rhs) => -(lhs[1].localeCompare(rhs[1], undefined, { sensitivity: 'base' })));
            sortedArrayIndices = arrayIndicesAndSortedNames.map((x) => x[0]);
            break;
        case "newestFirst":
            // newest (most recently added) first; this is simply a reversal of the default ordering
            arrayIndicesAndSortedIndices.sort((lhs, rhs) => -(lhs[1].localeCompare(rhs[1], undefined, { numeric: true })));
            sortedArrayIndices = arrayIndicesAndSortedIndices.map((x) => x[0]);
            break;
        case "oldestFirst":
            // oldest (least recently added) first; this is simply the original ordering
            arrayIndicesAndSortedIndices.sort((lhs, rhs) => lhs[1].localeCompare(rhs[1], undefined, { numeric: true }));
            sortedArrayIndices = arrayIndicesAndSortedIndices.map((x) => x[0]);
            break;
        case "relevance":
            // This case should never be reached - relevance is handled in sortToolsList()
            console.warn('Relevance case reached in sortToolsListElements - this should not happen');
            sortedArrayIndices = Array.from({length: toolsListElements.length}, (_, i) => i.toString());
            break;
        default:
            // leave in default order
            console.log('Unrecognized sort order: "' + sortOrder + '"');
            sortedArrayIndices = Array.from({length: toolsListElements.length}, (_, i) => i.toString());
    }

    // alternate implementation (if we wanted to chagne the grid row of elements); note that we'd also need to update the reading order for screen readers
    // NOTE: in this implementation, the items are NOT reorders; the caller would NOT need to replace the children upon getting the result from this function (and in fact we could simply 'sort in place')
    // // assign grid rows based on the results of the sort
    // for (let iSortedIndex = 0; iSortedIndex < sortedArrayIndices.length; iSortedIndex += 1) {
    //     const allToolsListElementIndex = parseInt(sortedArrayIndices[iSortedIndex], 10);
    //     const gridRow = iSortedIndex + 1;
    //     //
    //     toolsListElements[allToolsListElementIndex].style.gridRow = gridRow;
    // }

    // sort grid rows based on the results of the sort, with a client-side dedupe by normalized name|company
    let result = [];
    let seenKeys = new Set();
    for (let iSortedIndex = 0; iSortedIndex < sortedArrayIndices.length; iSortedIndex += 1) {
        let allToolsListElementIndex = parseInt(sortedArrayIndices[iSortedIndex], 10);
        let el = toolsListElements[allToolsListElementIndex];
        let nm = (el.dataset.toolName || '').trim().toLowerCase();
        let co = (el.dataset.toolCompany || '').trim().toLowerCase();
        let key = nm + '|' + co;
        if (seenKeys.has(key)) {
            continue;
        }
        seenKeys.add(key);
        result.push(el);
    }

    return result;
}

/* functions to manage relevance sorting option */

function showRelevanceSortOption() {
    const relevanceOption = document.querySelector('#SortOrderDropdownList option[value="relevance"]');
    if (relevanceOption) {
        relevanceOption.style.display = '';
    }
}

function hideRelevanceSortOption() {
    const relevanceOption = document.querySelector('#SortOrderDropdownList option[value="relevance"]');
    if (relevanceOption) {
        // Do not hide relevance option anymore, so users can switch back to it manually
        // relevanceOption.style.display = 'none';
    }
}

function setRelevanceSorting() {
    const dropdown = document.getElementById('SortOrderDropdownList');
    if (dropdown) {
        showRelevanceSortOption();
        
        // Temporarily remove event listener to prevent automatic re-sorting
        dropdown.removeEventListener('change', sortToolsList);
        dropdown.value = 'relevance';
        // Re-add event listener for future manual changes
        dropdown.addEventListener('change', sortToolsList);
    }
}

function resetToDefaultSorting() {
    const dropdown = document.getElementById('SortOrderDropdownList');
    if (dropdown) {
        // Temporarily remove event listener to prevent automatic re-sorting
        dropdown.removeEventListener('change', sortToolsList);
        dropdown.value = 'newestFirst'; // back to default
        // Re-add event listener for future manual changes
        dropdown.addEventListener('change', sortToolsList);
    }
    
    // Clear relevance cache when resetting to default sorting
    clearRelevanceCache();
}


/* code to filter the list based on search box events */

function searchClearButtonClicked()
{
    let searchTextbox = document.getElementById('SearchTextbox');
    searchTextbox.value = "";

    processSearchTextboxChange();
    
    // Clear relevance cache when search is cleared
    clearRelevanceCache();
}

function processSearchTextboxChange(e) {
    let searchTextbox = document.getElementById('SearchTextbox');
    const searchTextboxValue = searchTextbox.value;
    const searchText = searchTextboxValue.trim();

    // show/hide the clear button (based on whether or not the search box has any text entered)
    let searchClearButton = document.getElementById("SearchClearButton");
    if (searchTextboxValue !== "") {
        searchClearButton.style.visibility = "visible";
    } else {
        searchClearButton.style.visibility = "hidden";
    }

    // search algorithm design: find any elements which match ALL of the search elements; note that we are matching against a string sequence, not only against the start of words (i.e. "at" will match "bat", not just "attention")
    //
    // step 1: break the search text into elements (e.g. "writ read" would become ["writ", "read"], which we could then match against "Read&Write")
    let searchElements = searchText.split(' ');
    //
    // trim each search element and convert it to case-invariant lowercase; if the element was whitespace, then remove the empty element
    let index = 0;
    while (index < searchElements.length) {
        searchElements[index] = searchElements[index].trim().toLowerCase();
        if (searchElements[index] == '') {
            /*_ = */searchElements.splice(index, 1);
        } else {
            index += 1;
        }
    }

    // step 2: apply search filter to the elements
    // 
    let toolsList = document.getElementById('ToolsList');
    //
    let allToolsListElements = toolsList.querySelectorAll('.ToolsListElement');
    allToolsListElements.forEach((toolsListElement) => {
        if (searchElements.length > 0) {
            let toolItemMatchesAllSearchElements = true;
            const toolItemSearchableText = toolsListElement.dataset.searchableText;
        
            for (let iSearchElement = 0; iSearchElement < searchElements.length; iSearchElement += 1) {
                if (toolItemSearchableText.includes(searchElements[iSearchElement]) == false) {
                    toolItemMatchesAllSearchElements = false;
                    break;
                }
            };

            // set/clear ToolItemPresent class on the tool item, depending on whether the element should be filtered out by the selected filter(s)
            if (toolItemMatchesAllSearchElements === false) {
                toolsListElement.classList.add('ToolElementHiddenBySearch')
            } else {
                toolsListElement.classList.remove('ToolElementHiddenBySearch');
            }
        } else {
            // if there were no search terms, all tool elements should match
            toolsListElement.classList.remove('ToolElementHiddenBySearch');
        }
    });

    // NOTE: once we update our tools list, we update the tools list count
    updateToolsListCount();
    
    // Clear relevance cache when search changes as it affects the visible tools
    clearRelevanceCache();
}


/* function to show/hide (toggle) the tools list elements */

function toggleToolsListElement(toolsListElement) {
    // before closing all tool list elements, capture whether or not the toolsListElement is currently open or closed
    let toolsListElementIsExpanded = toolsListElement.classList.contains('ToolItemExpanded');

    // close any tool list elements that are expanded
    closeAllToolsListElements();

    if (toolsListElementIsExpanded === false) {
        expandToolsListElement(toolsListElement);
    }
}

function closeAllToolsListElements() {
    // close any tool list elements that are expanded
    let toolsListElements = document.querySelectorAll('.ToolItemExpanded');
    toolsListElements.forEach((x) => {
        let xContent = x.querySelector('.ToolItemContent');
        if (xContent !== null) {
            xContent.style.maxHeight = null;
        }

        x.classList.remove('ToolItemExpanded');
    });
}

function getPixelCountFromPxStringOrNull(value) {
    const indexOfPx = value.indexOf('px');
    if (indexOfPx === -1) {
        return value;
    } 
    
    if (indexOfPx !== value.length - 2) {
        console.error('Argument is not a valid pixel string value: ' + value);
        return null;
    }

    return value.substring(0, indexOfPx);
}

// NOTE: the options parameter is an object; its single field is 'behavior' which may be set to 'auto', 'smooth' or 'instant' (just like scrollIntoView())
function expandToolsListElement(toolsListElement, options) {
    let toolItemContent = toolsListElement.querySelector('.ToolItemContent');

    // capture options
    let behavior = "smooth";
    if (typeof options === 'object') {
        if (isOfStringType(options.behavior) === true) {
            behavior = options.behavior;
            switch (behavior) {
                case "auto":
                    behavior = "smooth";
                    break;
                case "smooth":
                    // this is the default; allowed
                    break;
                case "instant":
                    // allowed
                    break;
                default:
                    console.error("Invalid animation behavior: " + behavior);
            }
        }
    }

    //
    let extraVerticalPadding = 0;
    //
    const currentTopPadding = getPixelCountFromPxStringOrNull(getComputedStyle(toolsListElement).getPropertyValue('padding-top'));
    const currentBottomPadding = getPixelCountFromPxStringOrNull(getComputedStyle(toolsListElement).getPropertyValue('padding-bottom'));
    //
    // NOTE: ideally we would read this from the default styling, rather than from the body (root)
    let expandedPaddingOnEachSidePxString = getComputedStyle(document.body).getPropertyValue('--tool-item-padding');
    //
    let expandedPaddingOnEachSide = getPixelCountFromPxStringOrNull(expandedPaddingOnEachSidePxString);
    //
    if (expandedPaddingOnEachSide !== null && currentTopPadding !== null && currentBottomPadding !== null) {
        let expandedTotalPadding = expandedPaddingOnEachSide * 2;
        if (expandedTotalPadding > currentTopPadding + currentBottomPadding) {
            extraVerticalPadding = expandedTotalPadding - currentTopPadding - currentBottomPadding;
        }
    }
    //
    toolItemContent.style.maxHeight = (toolItemContent.scrollHeight + extraVerticalPadding) + 'px';

    // load the video(s), copying their data-src attribute to the actual src attribute
    let iframes = toolItemContent.querySelectorAll('iframe[data-src]');
    iframes.forEach((iframe) => {
        var src = iframe.getAttribute('data-src');
        if (iframe.src != src) {
            iframe.src = src;
        }
    });

    // if the caller has asked for an instant expansion, temporarily override the transition before expanding the element
    let previousTransition;
    if (behavior === "instant") {
        previousTransition = toolItemContent.style.transition;
        toolItemContent.style.transition = 'none';
    }
    //
    toolsListElement.classList.add('ToolItemExpanded');
    //
    // restore the transition setting as necessary
    if (typeof previousTransition !== 'undefined') {
        toolItemContent.style.transition = previousTransition;
    }
}

function toggleToolsListElementById(toolId) {
    let toolsListElement = getToolsListElementById(toolId);
    if (toolsListElement !== null) {
        toggleToolsListElement(toolsListElement);
    } else {
        console.error("Could not find tools list element in DOM: " + toolId);
    }
}

function expandToolsListElementById(toolId) {
    let toolsListElement = getToolsListElementById(toolId);
    if (toolsListElement !== null) {
        // NOTE: before opening the new tool, we must close all other tools
        closeAllToolsListElements();
        //
        expandToolsListElement(toolsListElement);
    } else {
        console.error("Could not find tools list element in DOM: " + toolId);
    }    
}

function expandAndScrollToToolsListElement(toolsListElement) {
    // expand the element (instantly) and then scroll it into view
    expandToolsListElement(toolsListElement, { behavior: "instant" });
    
    // scroll to the expanded tools element; note that we do this after the element is expanded (or after ten tries)
    let toolItemContent = toolsListElement.querySelector('.ToolItemContent');

    setIntervalWithTimeout(
        (args) => {
                // scroll to the expanded tools list element
                args.toolsListElement.scrollIntoView( { behavior: "smooth", block: "start", inline: "nearest" } );
        }, 
        (args) => {
            return args.toolItemContent.style.maxHeight == args.toolItemContent.scrollHeight + 'px';
        },
        100,
        3000,
        {
            toolsListElement: toolsListElement,
            toolItemContent: toolItemContent,
        }
    );
}

function getToolsListElementById(toolId) {
    const validatedToolId = validateIdOrNull(toolId);
    if (validatedToolId === null) {
        console.error("Invalid toolId: " + toolId);
        return null;
    }

    return document.getElementById('ToolItem_' + toolId);
}


/* code to create a 'share' link URL (using the current window location but changing the has value) */

function createShareLinkUrl(toolId) {
    let result = new URL(window.location);
    result.search = '';
    result.hash = '#' + toolId;

    // return the full stringified version of the string
    return result.href;
}


/* helper functions */

function sanitizeHTML(htmlString) {
    // Create a temporary div to parse and sanitize HTML
    const tempDiv = document.createElement('div');
    
    // Allow only specific safe tags
    const allowedTags = ['strong', 'em', 'b', 'i', 'br', 'span', 'div', 'p'];
    const allowedAttributes = ['class', 'style'];
    
    // For basic security, we'll use a simple approach that allows safe tags
    // In production, you might want to use a library like DOMPurify for more robust sanitization
    
    // First, escape the entire string to be safe
    tempDiv.textContent = htmlString;
    let escapedString = tempDiv.textContent;
    
    // Now selectively unescape only the allowed tags
    allowedTags.forEach(tag => {
        const escapedOpenTag = `&lt;${tag}&gt;`;
        const escapedCloseTag = `&lt;/${tag}&gt;`;
        const openTag = `<${tag}>`;
        const closeTag = `</${tag}>`;
        
        escapedString = escapedString.replace(new RegExp(escapedOpenTag, 'g'), openTag);
        escapedString = escapedString.replace(new RegExp(escapedCloseTag, 'g'), closeTag);
    });
    
    return escapedString;
}

function getFilterInfoText(filterValue, filterDisplayName) {
    const filterDescriptions = {
        // Functions descriptions
        'reading': 'Tools to help individuals with reading disabilities (e.g. dyslexia, low vision or anyone who struggles to read standard text).',
        'cognitive': 'Tools to help users with cognitive disabilities that affect reading, writing, memory, or comprehension (e.g. dyslexia, dysgraphia, ADHD, or processing disorders).',
        'vision': 'Tools that assist individuals who are blind, have low vision, or other vision-related impairments. Also aids to prevent photosensitive seizures.',
        'physical': 'Tools designed to help users with physical disabilities that limit their ability to interact with devices using standard input methods.',
        'hearing': 'Tools for those who are deaf or hard of hearing.',
        'speech': 'Tools for individuals who are non-verbal or have difficulty speaking or forming clear verbal communication.',
        
        // Install types descriptions
        'builtIn': 'choosing this option will cause the list to show ONLY those solutions that are built into the computer (so always there and always free)',
        'installable': 'chosing this option will cause the list to show ONLY those solutions that need to be installed in order to be used',
        
        // Purchase options descriptions
        'free': 'If you check this box under Purchase Options the list will include solutions that are described as FREE (this includes built-in options).',
        'freeTrial': 'If you check this box under Purchase Options the list will include solutions that allow you to try the solution for free - but then you have to pay for it.',
        'lifetimeLicense': 'If you check this box under Purchase Options the list will include solutions that you only pay for once - and then you own it and can use it for as long as it lasts and works.',
        'subscription': 'If you check this box under Purchase Options the list will include solutions that you must continually pay for each month or year in order to keep using it.'
    };
    
    return filterDescriptions[filterValue] || `Information about ${filterDisplayName.toLowerCase()} options.`;
}

function isOfStringType(value) {
    if (typeof value === 'string') {
        return true;
    } else if (value instanceof String) {
        return true;
    } else {
        return false;
    }
}

function setIntervalWithTimeout(fn, condition, interval, expiration, args) {
    // wait until the element is expanded, then scroll to it
    let intervalVars = {
        condition: condition,
        interval: interval,
        expiration: expiration,
        //
        intervalId: undefined,
        numberOfCalls: 0,
    };
    intervalVars.intervalId = setInterval((fn, args) => {
        if ((intervalVars.condition(args) === true) ||
            (intervalVars.numberOfCalls * intervalVars.interval > intervalVars.expiration)) {
            clearInterval(intervalVars.intervalId);

            fn(args);
        }

        intervalVars.numberOfCalls += 1;
    }, intervalVars.interval, fn, args);
}




//**************** CHAT BOT CODE ******************** *//

// Global variable to store conversation state
let conversationState = {};

// Cache for relevance-sorted results to avoid recalculation
let relevanceSortedCache = {
    tools: null,
    query: null,
    filters: null,
    timestamp: null
};

async function openChatBot() {
    let chatBotSection = document.getElementById('ChatBotSection');
    let floatingChatBotContainer = document.getElementById('FloatingChatBotContainer');
    let mainSection = document.querySelector('.MainSection');
    
    // Show chatbot and hide floating button container
    chatBotSection.hidden = false;
    floatingChatBotContainer.style.display = 'none';
    
    // Adjust the main section to make room for the chatbot
    // Get chatbot width and apply it as left margin
    const chatBotWidth = chatBotSection.offsetWidth;
    mainSection.style.marginLeft = chatBotWidth + 'px';
    
    // Clear relevance cache when opening chatbot (new context)
    clearRelevanceCache();
    
    // Show chat options screen with loading indicator
    showChatOptionsScreen();

    // If we already know Ollama status, update immediately and do a background recheck
    if (hasCompletedInitialOllamaCheck) {
        updateButtonVisibility();
        // background recheck (don't block UI)
        checkOllamaAccessibility();
    } else {
        // Do one blocking check to resolve initial state and hide loader
        await checkOllamaAccessibility();
    }
}

function initializeConversation() {
            // Reset conversation state
        conversationState = {};
        
        // Clear relevance cache for new conversation
        clearRelevanceCache();
    
    // Clear existing chat content except initial message
    let chatContent = document.getElementById('ChatBotContent');
    // Keep only the initial welcome message
    let welcomeMessage = chatContent.querySelector('.BotMessage');
    // Clear content safely
    while (chatContent.firstChild) {
        chatContent.removeChild(chatContent.firstChild);
    }
    if (welcomeMessage) {
        chatContent.appendChild(welcomeMessage);
    }
    
    // Send initial message to start conversation
    sendInitialChatBotMessage();
}

async function sendInitialChatBotMessage() {
    // Show loading indicator for initial message
    let loadingMessageId = showChatLoadingIndicator();
    
    try {
        const response = await fetch('/api/chatbot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: '', 
                state: conversationState 
            })
        });
        
        const data = await response.json();
        
        // Remove loading indicator
        removeChatLoadingIndicator(loadingMessageId);
        
        if (data.success) {
            conversationState = data.state;
            addMessageToChat(data.bot_message, 'bot');
        } else {
            addMessageToChat('Sorry, I encountered an error starting our conversation.', 'bot');
        }
    } catch (error) {
        console.error('Error initializing conversation:', error);
        // Remove loading indicator
        removeChatLoadingIndicator(loadingMessageId);
        addMessageToChat('Sorry, I couldn\'t connect to the AI service.', 'bot');
    }
}

function closeChatBot() {
    let chatBotSection = document.getElementById('ChatBotSection');
    let floatingChatBotContainer = document.getElementById('FloatingChatBotContainer');
    let mainSection = document.querySelector('.MainSection');
    
    // Hide all chat screens
    document.getElementById('ChatOptionsScreen').style.display = 'none';
    document.getElementById('ChatDownloadPrompt').style.display = 'none';
    document.getElementById('PlatformSelectionScreen').style.display = 'none';
    document.getElementById('ChatBotContent').style.display = 'block';
    document.getElementById('ChatBotInput').style.display = 'flex';
    
    // Hide chatbot and show floating button container
    chatBotSection.hidden = true;
    floatingChatBotContainer.style.display = 'flex';
    
    // Reset the main section margin
    mainSection.style.marginLeft = '';
    
            // Reset conversation state when closing so user gets options next time
        conversationState = {};
        
        // Clear relevance cache when closing chatbot
        clearRelevanceCache();
}

function handleChatInputKeyPress(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        sendChatBotMessage();
    }
}

async function sendChatBotMessage() {
    let chatInput = document.getElementById('ChatBotInputTextbox');
    let sendButton = document.getElementById('ChatBotSendButton');
    let query = chatInput.value.trim();
    
    if (!query) return;
    
    // Clear input and disable send button
    chatInput.value = '';
    sendButton.disabled = true;
    sendButton.textContent = 'Thinking...';
    
    // Add user message to chat
    addMessageToChat(query, 'user');

    // Show loading indicator
    let loadingMessageId = showChatLoadingIndicator();

    try {
        // Send message to conversational chatbot API
        const response = await fetch('/api/chatbot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: query, 
                state: conversationState 
            })
        });
        
        const data = await response.json();
        
        // Remove loading indicator
        removeChatLoadingIndicator(loadingMessageId);
        
        if (data.success) {
            // Update conversation state
            conversationState = data.state;
            
            // If we should show the interface (final results), apply filters and show filter message first
            if (data.show_interface) {
                // Apply filters to the main UI based on conversation state
                const appliedFilters = conversationState.applied_filters;
                if (appliedFilters) {
                    applyConversationFilters(appliedFilters);
                    
                    // Show a message about filters being applied BEFORE the bot response
                    const filterSummary = generateFilterSummary(appliedFilters);
                    if (filterSummary) {
                        addMessageToChat(`🔍 <strong>Filters Applied:</strong><br>${filterSummary}`, 'bot');
                    }
                }
            }
            
            // Add bot response to chat (after filters message if applicable)
            addMessageToChat(data.bot_message, 'bot');
            
            // Handle sorting if requested
            if (data.show_interface && data.request_sorting && conversationState.applied_filters && (conversationState.problem_summary || conversationState.problem_description)) {
                // Show a loading indicator specific to sorting phase
                const sortingLoadingId = showChatLoadingIndicator();
                setTimeout(async () => {
                    const sortQuery = conversationState.problem_summary || conversationState.problem_description;
                    await applySortingToResults(sortQuery, conversationState.applied_filters);
                    removeChatLoadingIndicator(sortingLoadingId);
                }, 250);
            }
            
            // Show download prompt after conversation is complete and filters are applied
            if (data.show_interface && conversationState.applied_filters && conversationState.step === 'show_results') {
                setTimeout(() => {
                    showChatDownloadPrompt();
                }, 1000); // Show after sorting if applicable
            }
        } else {
            addMessageToChat('Sorry, I encountered an error processing your message.', 'bot');
        }
    } catch (error) {
        console.error('Error in conversational chatbot:', error);
        // Remove loading indicator
        removeChatLoadingIndicator(loadingMessageId);
        addMessageToChat('Sorry, I couldn\'t connect to the AI service. Please make sure all services are running.', 'bot');
    }
    
    // Re-enable send button
    sendButton.disabled = false;
    sendButton.textContent = 'Send';
    chatInput.focus();
}

function addMessageToChat(message, sender) {
    let chatContent = document.getElementById('ChatBotContent');
    
    let messageDiv = document.createElement('div');
    messageDiv.className = sender === 'user' ? 'UserMessage' : 'BotMessage';
    
    let messageContentDiv = document.createElement('div');
    messageContentDiv.className = sender === 'user' ? 'UserMessageContent' : 'BotMessageContent';

    let messageP = document.createElement('p');
    // Safely render HTML tags from bot messages
    if (message.includes('<') && message.includes('>')) {
        // If message contains HTML, we need to sanitize and parse it
        const sanitizedMessage = sanitizeHTML(message);

        // Use DOMParser to parse the sanitized HTML string into nodes
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<div>${sanitizedMessage}</div>`, 'text/html');
        const nodes = doc.body.firstChild.childNodes;

        // Append each node to messageP
        nodes.forEach(node => {
            messageP.appendChild(node.cloneNode(true));
        });
    } else {
        // If no HTML, use textContent for safety
        messageP.textContent = message;
    }
    
    messageContentDiv.appendChild(messageP);
    messageDiv.appendChild(messageContentDiv);
    chatContent.appendChild(messageDiv);
    
    // Scroll to bottom
    chatContent.scrollTop = chatContent.scrollHeight;
}

async function applyConversationFilters(appliedFilters) {
    // Apply filters using frontend filtering (chatbot-determined filters)
    applyFrontendFilters(appliedFilters);
    
    // Clear relevance cache when filters change
    clearRelevanceCache();
    
    // Close the sidebar if it's open (so user can see results)
    if (getSidebarIsOpened()) {
        setSidebarIsOpened(false);
    }
}

async function applySortingToResults(userQuery, appliedFilters, silent) {
    try {
        // Inform user that sorting is in progress
        if (!silent) {
            addMessageToChat('Sorting the list by relevance. Please wait...', 'bot');
        }
        // Collect currently visible tool names after filters/search
        const toolsList = document.getElementById('ToolsList');
        const visibleToolElements = toolsList.querySelectorAll('.ToolsListElement:not(.ToolElementHiddenByFilter):not(.ToolElementHiddenBySearch)');
        const visibleToolNames = Array.from(visibleToolElements)
            .map(el => el.dataset.toolName)
            .filter(n => typeof n === 'string' && n.trim().length > 0);
        const visibleToolIds = Array.from(visibleToolElements)
            .map(el => el.dataset.toolId)
            .filter(id => typeof id === 'string' && id.trim().length > 0);
        const visibleDbIds = Array.from(visibleToolElements)
            .map(el => el.dataset.dbId)
            .filter(id => typeof id === 'string' && id.trim().length > 0);
        const response = await fetch('/api/sort-tools', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: userQuery,
                filters: {
                    functions: appliedFilters.functions || [],
                    platforms: appliedFilters.platforms || [],
                    installTypes: appliedFilters.installTypes || [],
                    purchaseOptions: appliedFilters.purchaseOptions || []
                },
                visible_tools: visibleToolNames,
                visible_ids: visibleToolIds.length > 0 ? visibleToolIds : visibleDbIds
            })
        });
        
        const data = await response.json();
        
        if (data.success && data.tools) {
            console.log('Sorted results received:', data.tools.length, 'tools');
            
            // Cache the relevance-sorted results
            relevanceSortedCache = {
                tools: data.tools,
                query: userQuery,
                filters: JSON.stringify(appliedFilters),
                timestamp: Date.now()
            };
            console.log('Relevance cache populated with', data.tools.length, 'tools for query:', userQuery);
            
            // Replace the tools list with sorted results
            displaySearchResults(data.tools);
            
            // Reflect relevance sorting in the UI dropdown
            setRelevanceSorting();

            // Update the count display
            const toolsListCount = document.getElementById('ToolsListCount');
            if (toolsListCount) {
                let toolsListCountText = "Showing " + data.tools.length;
                if(data.tools.length == 1){
                    toolsListCountText += " tool";
                }
                else{
                    toolsListCountText += " tools";
                }
                toolsListCountText += " out of " + toolsList.children.length;
                
                toolsListCount.textContent = toolsListCountText;
            }
            
            // Add a message about sorting being applied
            if (!silent) {
                setTimeout(() => {
                    addMessageToChat(`✨ <strong>Sorted by relevance!</strong> The tools most relevant to your problem "${userQuery}" are now at the top.`, 'bot');
                }, 250);
            }
            
        } else {
            console.error('Sorting failed:', data.error || 'Unknown error');
            if (!silent) {
                addMessageToChat('Sorry, I had trouble sorting the results. The tools are still filtered according to your preferences.', 'bot');
            }
        }
    } catch (error) {
        console.error('Error sorting results:', error);
        if (!silent) {
            addMessageToChat('Sorry, I had trouble sorting the results. The tools are still filtered according to your preferences.', 'bot');
        }
    }
}

function applyFrontendFilters(appliedFilters) {
    // First, clear all existing filters
    clearAllFilters();
    
    // Apply function filters
    if (appliedFilters.functions && appliedFilters.functions.length > 0) {
        appliedFilters.functions.forEach(functionName => {
            let checkbox = document.getElementById(`filter_functions_${functionName}`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
    }
    
    // Apply platform filters
    if (appliedFilters.platforms && appliedFilters.platforms.length > 0) {
        appliedFilters.platforms.forEach(platform => {
            let checkbox = document.getElementById(`filter_supportedPlatforms_${platform}`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
    }
    
    // Apply install types filters
    if (appliedFilters.installTypes && appliedFilters.installTypes.length > 0) {
        appliedFilters.installTypes.forEach(installType => {
            let checkbox = document.getElementById(`filter_installTypes_${installType}`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
    }
    
    // Apply purchase option filters
    if (appliedFilters.purchaseOptions && appliedFilters.purchaseOptions.length > 0) {
        appliedFilters.purchaseOptions.forEach(option => {
            let checkbox = document.getElementById(`filter_purchaseOptions_${option}`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
    }
    
    // Update the filtered results using frontend filtering
    filterToolItemsAndUpdateToolsListCount();
    
    // Reset to default sorting for frontend filtering
    resetToDefaultSorting();
}

function displaySearchResults(tools) {
    // Instead of creating new elements, we need to reorder the existing elements
    // to match the relevance-sorted order from the backend
    
    let toolsList = document.getElementById('ToolsList');
    let existingElements = Array.from(toolsList.querySelectorAll('.ToolsListElement'));
    
    // Create a map of tool names to existing elements for quick lookup
    let toolNameToElement = new Map();
    existingElements.forEach(element => {
        const toolName = element.dataset.toolName;
        if (toolName) {
            toolNameToElement.set(toolName.toLowerCase().trim(), element);
        }
    });
    
    // Create a map of tool names to their relevance-sorted positions
    let toolNameToRelevancePosition = new Map();
    tools.forEach((tool, index) => {
        if (tool.tool_name) {
            toolNameToRelevancePosition.set(tool.tool_name.toLowerCase().trim(), index);
        }
    });
    
    // Sort existing elements by their relevance position
    let sortedElements = existingElements.sort((a, b) => {
        const nameA = (a.dataset.toolName || '').toLowerCase().trim();
        const nameB = (b.dataset.toolName || '').toLowerCase().trim();
        
        const positionA = toolNameToRelevancePosition.get(nameA) ?? Number.MAX_SAFE_INTEGER;
        const positionB = toolNameToRelevancePosition.get(nameB) ?? Number.MAX_SAFE_INTEGER;
        
        return positionA - positionB;
    });
    
    // Reorder the elements in the DOM
    toolsList.replaceChildren(...sortedElements);
}

function generateFilterSummary(appliedFilters) {
    let filterParts = [];
    
    if (appliedFilters.platforms && appliedFilters.platforms.length > 0) {
        const platformNames = appliedFilters.platforms.map(p => supportedPlatformsFilters[p]).filter(Boolean);
        if (platformNames.length > 0) {
            filterParts.push(`<strong>Devices:</strong> ${platformNames.join(', ')}`);
        }
    }
    
    if (appliedFilters.functions && appliedFilters.functions.length > 0) {
        const functionNames = appliedFilters.functions.map(f => functionsFilters[f]).filter(Boolean);
        if (functionNames.length > 0) {
            filterParts.push(`<strong>Accessibility needs:</strong> ${functionNames.join(', ')}`);
        }
    }
    
    if (appliedFilters.installTypes && appliedFilters.installTypes.length > 0) {
        const installNames = appliedFilters.installTypes.map(i => installTypesFilters[i]).filter(Boolean);
        if (installNames.length > 0) {
            filterParts.push(`<strong>Installation:</strong> ${installNames.join(', ')}`);
        }
    }
    
    if (appliedFilters.purchaseOptions && appliedFilters.purchaseOptions.length > 0) {
        const pricingNames = appliedFilters.purchaseOptions.map(p => purchaseOptionsFilters[p]).filter(Boolean);
        if (pricingNames.length > 0) {
            filterParts.push(`<strong>Pricing:</strong> ${pricingNames.join(', ')}`);
        }
    }
    
    return filterParts.join('<br>');
}

// Keep the old function for backwards compatibility
function applyAIFilters(filters) {
    // Convert old format to new format and use the new function
    const appliedFilters = {
        functions: filters.functions || [],
        platforms: filters.supportedPlatforms || [],
        installTypes: filters.installTypes || [],
        purchaseOptions: filters.purchaseOptions || []
    };
    applyConversationFilters(appliedFilters);
}

// Chat Management Functions
function showChatOptionsScreen() {
    // Hide other chat elements
    document.getElementById('ChatBotContent').style.display = 'none';
    document.getElementById('ChatBotInput').style.display = 'none';
    document.getElementById('ChatDownloadPrompt').style.display = 'none';
    
    // Show options screen
    document.getElementById('ChatOptionsScreen').style.display = 'block';
    
    const chatOptionsLoading = document.getElementById('ChatOptionsLoading');
    const chatOptionsContent = document.getElementById('ChatOptionsContent');

    // If status not yet known, show loader; otherwise show content immediately
    if (chatOptionsLoading && chatOptionsContent) {
        if (!hasCompletedInitialOllamaCheck) {
            chatOptionsLoading.style.display = 'block';
            chatOptionsContent.style.display = 'none';
        } else {
            chatOptionsLoading.style.display = 'none';
            chatOptionsContent.style.display = 'block';
        }
    }

    // Set button states pre-check: Start disabled by default, Setup enabled
    const startNewChatButton = document.getElementById('StartNewChatButton');
    const setupChatbotButton = document.getElementById('SetupChatbotButton');
    if (startNewChatButton) {
        // Start disabled by default until Ollama is confirmed accessible
        startNewChatButton.classList.add('is-disabled');
        startNewChatButton.setAttribute('aria-disabled', 'true');
    }
    if (setupChatbotButton) setupChatbotButton.disabled = false;

    // Do a background recheck every time options screen is shown (no interval persistence)
    // Only check if we haven't completed the initial check yet
    if (!hasCompletedInitialOllamaCheck) {
        checkOllamaAccessibility();
    }

    // Set up event listeners for the buttons
    setupChatOptionsEventListeners();
}

function setupChatOptionsEventListeners() {
    // Start New Chat button
    let startNewChatButton = document.getElementById('StartNewChatButton');
    if (startNewChatButton) {
        startNewChatButton.addEventListener('click', () => {
            // If disabled visually (before setup), show alert
            if (startNewChatButton.classList.contains('is-disabled') || startNewChatButton.getAttribute('aria-disabled') === 'true') {
                alert('Please setup the local chatbot first.');
                return;
            }
            hideChatOptionsScreen();
            initializeConversation();
        });
    }
    
    // Load Chat button
    let loadChatButton = document.getElementById('LoadChatButton');
    if (loadChatButton) {
        loadChatButton.addEventListener('click', () => {
            document.getElementById('ChatFileInput').click();
        });
    }
    
    // File input change event
    let chatFileInput = document.getElementById('ChatFileInput');
    if (chatFileInput) {
        chatFileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                loadChatFromFile(file);
                    }
    });
}
    
    // Setup Chatbot button
    let setupChatbotButton = document.getElementById('SetupChatbotButton');
    if (setupChatbotButton) {
        setupChatbotButton.addEventListener('click', () => {
            showPlatformSelectionScreen();
        });
    }
}

function hideChatOptionsScreen() {
    // Hide options screen
    document.getElementById('ChatOptionsScreen').style.display = 'none';
    
    // Show chat elements
    document.getElementById('ChatBotContent').style.display = 'block';
    document.getElementById('ChatBotInput').style.display = 'flex';
    
    // Focus on input
    let chatInput = document.getElementById('ChatBotInputTextbox');
    chatInput.focus();
}

function showChatDownloadPrompt() {
    // Show download prompt
    document.getElementById('ChatDownloadPrompt').style.display = 'block';
    // Hide chat input when conversation is over
    const chatInputContainer = document.getElementById('ChatBotInput');
    if (chatInputContainer) {
        chatInputContainer.style.display = 'none';
    }
    
    // Set up event listeners
    let downloadChatYesButton = document.getElementById('DownloadChatYesButton');
    if (downloadChatYesButton) {
        downloadChatYesButton.addEventListener('click', () => {
            downloadCurrentChat();
            hideChatDownloadPrompt();
        });
    }
    
    let downloadChatNoButton = document.getElementById('DownloadChatNoButton');
    if (downloadChatNoButton) {
        downloadChatNoButton.addEventListener('click', () => {
            hideChatDownloadPrompt();
        });
    }
}

function hideChatDownloadPrompt() {
    document.getElementById('ChatDownloadPrompt').style.display = 'none';
}

function downloadCurrentChat() {
    // Create chat data object
    const chatData = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        conversationState: conversationState,
        chatHistory: getAllChatMessages()
    };
    
    // Create and download file
    const dataStr = JSON.stringify(chatData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `learn-and-try-chat-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

function getAllChatMessages() {
    const chatContent = document.getElementById('ChatBotContent');
    const messages = [];
    
    // Get all message elements
    const messageElements = chatContent.querySelectorAll('.UserMessage, .BotMessage');
    
    messageElements.forEach(element => {
        const isUser = element.classList.contains('UserMessage');
        const messageContent = element.querySelector(isUser ? '.UserMessageContent' : '.BotMessageContent');
        
        if (messageContent) {
            messages.push({
                sender: isUser ? 'user' : 'bot',
                content: messageContent.textContent || messageContent.innerText || '',
                timestamp: new Date().toISOString()
            });
        }
    });
    
    return messages;
}

function loadChatFromFile(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const chatData = JSON.parse(e.target.result);
            
            if (chatData.version && chatData.conversationState && chatData.chatHistory) {
                // Restore conversation state
                conversationState = chatData.conversationState;
                
                // Hide options screen and show chat
                hideChatOptionsScreen();
                
                // Clear existing chat content
                const chatContent = document.getElementById('ChatBotContent');
                while (chatContent.firstChild) {
                    chatContent.removeChild(chatContent.firstChild);
                }
                
                // Restore chat messages
                chatData.chatHistory.forEach(message => {
                    addMessageToChat(message.content, message.sender);
                });
                
                // Apply filters if they exist in the conversation state
                if (conversationState.applied_filters) {
                    applyConversationFilters(conversationState.applied_filters);
                }
                
            } else {
                throw new Error('Invalid chat file format');
            }
        } catch (error) {
            alert('Error loading chat file: ' + error.message);
            showChatOptionsScreen(); // Go back to options
        }
    };
    
    reader.readAsText(file);
}

function clearRelevanceCache() {
    relevanceSortedCache = {
        tools: null,
        query: null,
        filters: null,
        timestamp: null
    };
    console.log('Relevance cache cleared');
}

function getRelevanceCacheInfo() {
    if (!relevanceSortedCache.tools) {
        return 'Cache is empty';
    }
    const cacheAge = Date.now() - (relevanceSortedCache.timestamp || 0);
    const cacheExpired = cacheAge > 3600000;
    return {
        hasTools: !!relevanceSortedCache.tools,
        toolCount: relevanceSortedCache.tools ? relevanceSortedCache.tools.length : 0,
        query: relevanceSortedCache.query,
        filters: relevanceSortedCache.filters,
        age: Math.round(cacheAge/1000),
        expired: cacheExpired
    };
}

function clearAllFilters() {
    // Clear all filter checkboxes
    let allFilterCheckboxes = document.querySelectorAll('input[id^="filter_"]');
    allFilterCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Clear search text
    let searchTextbox = document.getElementById('SearchTextbox');
    if (searchTextbox) {
        searchTextbox.value = '';
        // Trigger the search update
        processSearchTextboxChange();
    }
    
    // Clear relevance cache when filters change
    clearRelevanceCache();
}

/* Info popup functionality */
function toggleInfoPopup(popupId) {
    const popup = document.getElementById(popupId);
    if (!popup) return;
    
    // Hide all other popups first
    const allPopups = document.querySelectorAll('.info-popup');
    allPopups.forEach(otherPopup => {
        if (otherPopup.id !== popupId) {
            otherPopup.style.display = 'none';
        }
    });
    
    // Toggle the requested popup
    if (popup.style.display === 'none' || popup.style.display === '') {
        popup.style.display = 'block';
    } else {
        popup.style.display = 'none';
    }
}

// Close info popups when clicking outside
document.addEventListener('click', function(event) {
    // Check if the click was on an info button or inside a popup
    const isInfoButton = event.target.closest('.info-button');
    const isInsidePopup = event.target.closest('.info-popup');
    
    if (!isInfoButton && !isInsidePopup) {
        // Close all popups
        const allPopups = document.querySelectorAll('.info-popup');
        allPopups.forEach(popup => {
            popup.style.display = 'none';
        });
    }
});

function showChatLoadingIndicator() {
    let chatContent = document.getElementById('ChatBotContent');
    
    // Create a unique ID for this loading message
    let loadingMessageId = 'loading-' + Date.now();
    
    // Get the template and clone it
    let template = document.getElementById('ChatLoaderTemplate');
    let loadingMessage = template.content.cloneNode(true);
    
    // Set the ID on the container
    let container = loadingMessage.querySelector('#ChatLoaderContainer');
    container.id = loadingMessageId;
    
    // Add to chat
    chatContent.appendChild(loadingMessage);
    
    // Scroll to bottom
    chatContent.scrollTop = chatContent.scrollHeight;
    
    return loadingMessageId;
}

function removeChatLoadingIndicator(loadingMessageId) {
    let loadingElement = document.getElementById(loadingMessageId);
    if (loadingElement) {
        loadingElement.remove();
    }
}

/* Chatbot Setup Functions */
function showPlatformSelectionScreen() {
    // Hide chat options screen
    document.getElementById('ChatOptionsScreen').style.display = 'none';
    
    // Show platform selection screen
    document.getElementById('PlatformSelectionScreen').style.display = 'block';
    
    // Set up event listeners for platform selection
    setupPlatformSelectionEventListeners();
}

// Track if event listeners are already set up
let platformEventListenersSetup = false;

function setupPlatformSelectionEventListeners() {
    // Prevent duplicate event listeners
    if (platformEventListenersSetup) {
        return;
    }
    
    // Windows setup button
    let windowsSetupButton = document.getElementById('WindowsSetupButton');
    if (windowsSetupButton) {
        windowsSetupButton.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            downloadSetup('windows');
        });
    }
    
    // macOS setup button
    let macSetupButton = document.getElementById('MacSetupButton');
    if (macSetupButton) {
        macSetupButton.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            downloadSetup('macos');
        });
    }
    
    // Linux setup button
    let linuxSetupButton = document.getElementById('LinuxSetupButton');
    if (linuxSetupButton) {
        linuxSetupButton.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            downloadSetup('linux');
        });
    }
    
    // Back button
    let backToChatOptionsButton = document.getElementById('BackToChatOptionsButton');
    if (backToChatOptionsButton) {
        backToChatOptionsButton.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            hidePlatformSelectionScreen();
        });
    }
    
    platformEventListenersSetup = true;
}

function hidePlatformSelectionScreen() {
    // Hide platform selection screen
    document.getElementById('PlatformSelectionScreen').style.display = 'none';
    
    // Show chat options screen
    document.getElementById('ChatOptionsScreen').style.display = 'block';
}

// Global variable to prevent multiple downloads
let isDownloading = false;

async function downloadSetup(platform) {
    // Prevent multiple simultaneous downloads
    if (isDownloading) {
        console.log('Download already in progress, ignoring request');
        return;
    }
    
    isDownloading = true;
    
    // Show loading indicator
    const downloadLoading = document.getElementById('DownloadLoading');
    if (downloadLoading) {
        console.log('Showing download loading indicator');
        downloadLoading.classList.add('show');
        downloadLoading.style.display = 'block'; // Force display
    } else {
        console.error('DownloadLoading element not found');
    }
    
    // Get the appropriate button based on platform
    let platformButton;
    if (platform === 'windows') {
        platformButton = document.getElementById('WindowsSetupButton');
    } else if (platform === 'macos') {
        platformButton = document.getElementById('MacSetupButton');
    } else if (platform === 'linux') {
        platformButton = document.getElementById('LinuxSetupButton');
    }
    
    if (!platformButton) {
        console.error('Platform button not found for:', platform);
        isDownloading = false;
        if (downloadLoading) {
            downloadLoading.classList.remove('show');
        }
        return;
    }
    
    // Show loading state
    let originalText = platformButton.querySelector('.platform-status').textContent;
    platformButton.querySelector('.platform-status').textContent = 'Preparing...';
    platformButton.disabled = true;
    
    // Disable all platform buttons to prevent multiple clicks
    document.querySelectorAll('.platform-btn').forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.6';
    });
    
    try {
        // Create download link
        const downloadUrl = `/api/download-setup?platform=${platform}&t=` + Date.now(); // Add timestamp to prevent caching
        
        // First, fetch the file to ensure it's ready
        console.log('Fetching download URL:', downloadUrl);
        const response = await fetch(downloadUrl);
        
        if (response.ok) {
            // Server has prepared the file, now trigger download
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            
            // Create a temporary anchor element for download
            const link = document.createElement('a');
            link.href = url;
            link.download = `ollama-chatbot-setup-${platform}.zip`;
            link.style.display = 'none';
            document.body.appendChild(link);
            
            // Trigger download
            link.click();
            
            // Hide loading indicator when download actually starts
            if (downloadLoading) {
                console.log('Hiding download loading indicator - download started');
                downloadLoading.classList.remove('show');
                downloadLoading.style.display = 'none';
            }
            
            // Clean up
            setTimeout(() => {
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            }, 100);
            
            // Show success message
            platformButton.querySelector('.platform-status').textContent = 'Downloaded!';
        } else {
            throw new Error(`Download failed with status: ${response.status}`);
        }
        
        // Reset button state after delay
        setTimeout(() => {
            platformButton.querySelector('.platform-status').textContent = originalText;
            platformButton.disabled = false;
            
            // Re-enable all platform buttons
            document.querySelectorAll('.platform-btn').forEach(btn => {
                if (!btn.classList.contains('disabled')) {
                    btn.disabled = false;
                    btn.style.opacity = '1';
                }
            });
            
            isDownloading = false;
        }, 3000);
        
    } catch (error) {
        console.error('Download failed:', error);
        
        // Reset on error
        platformButton.querySelector('.platform-status').textContent = 'Error';
        
        // Hide loading indicator on error
        if (downloadLoading) {
            console.log('Hiding download loading indicator (error)');
            downloadLoading.classList.remove('show');
            downloadLoading.style.display = 'none'; // Force hide
        }
        
        setTimeout(() => {
            platformButton.querySelector('.platform-status').textContent = originalText;
            platformButton.disabled = false;
            
            // Re-enable all platform buttons
            document.querySelectorAll('.platform-btn').forEach(btn => {
                if (!btn.classList.contains('disabled')) {
                    btn.disabled = false;
                    btn.style.opacity = '1';
                }
            });
            
            isDownloading = false;
        }, 2000);
    }
}

