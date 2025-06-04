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
//
function setupElementEvents() {
    // set up an observer to watch for the header being resized
    let headerSection = document.getElementById("HeaderSection");
    //
    headerSectionResizeObserver = new ResizeObserver(headerSectionResized);
    headerSectionResizeObserver.observe(headerSection);

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
    }
    if (fetchCatalogResponse.ok !== true) {
        let toolsListLoadingMessage = document.getElementById('ToolsListLoadingMessage');
        toolsListLoadingMessage.innerText = "Sorry, I could not load the Learn and Try catalog due to a server error.";
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
    //
    // NOTE: this replacement action clears the ToolsList innerHtml, replacing the "loading catalog..." UI element
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

    let div = document.createElement('div');
    div.appendChild(checkboxInput);
    div.appendChild(label);

    fieldset.appendChild(div);
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
    } else {
        nameGridCell.textContent = "Untitled";
        toolsListElement.dataset.sortableName = "";
        console.log("catalogEntry's name field is missing or is of an invalid type.");
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
        default:
            // leave in default order
            console.log('Unrecognized sort order: "' + sortOrder + '"');
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

    // sort grid rows based on the results of the sort
    let result = [];
    for (let iSortedIndex = 0; iSortedIndex < sortedArrayIndices.length; iSortedIndex += 1) {
        let allToolsListElementIndex = parseInt(sortedArrayIndices[iSortedIndex], 10);
        //
        result.push(toolsListElements[allToolsListElementIndex]);
    }

    return result;
}


/* code to filter the list based on search box events */

function searchClearButtonClicked()
{
    let searchTextbox = document.getElementById('SearchTextbox');
    searchTextbox.value = "";

    processSearchTextboxChange();
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
