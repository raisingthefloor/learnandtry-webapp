"use client"

import type React from "react"

import { useState, useEffect, Suspense, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronUp, ChevronDown, ExternalLink, Search } from "lucide-react"
import { FilterPanel } from "@/components/filter-panel"

interface Tool {
  id: string
  name: string
  company: string
  description: string
  vendorProductPageUrl: string
  functions: string[]
  installTypes: string[]
  supportedPlatforms: string[]
  purchaseOptions: string[]
  youTubeVideos?: Array<{
    id: string
    embedUrl: string
    title: string
    aspectRatio: number
  }>
}

interface FilterState {
  functions: string[]
  devices: string[]
  installTypes: string[]
  purchaseOptions: string[]
}

function removeParentheses(text: string): string {
  return text.replace(/\s*$$[^)]*$$/g, "").trim()
}

function mapFunctionToLabel(func: string): string {
  if (func.toLowerCase() === "trainingtherapy" || func.toLowerCase() === "training therapy") {
    return ""
  }
  const functionMap: Record<string, string> = {
    reading: "Reading",
    writing: "Writing",
    execfocus: "Exec/Focus",
    cognitive: "Cognitive",
    vision: "Vision",
    braille: "Braille",
    hearing: "Hearing",
    physical: "Physical",
    speech: "SpeechComm",
    communication: "SpeechComm",
  }
  const lowerFunc = func.toLowerCase()
  // Check for exact match first
  if (functionMap[lowerFunc]) return functionMap[lowerFunc]
  // Then check for partial match
  for (const [key, value] of Object.entries(functionMap)) {
    if (lowerFunc.includes(key)) return value
  }
  return func
}

function mapDeviceToLabel(platform: string): string {
  const deviceMap: Record<string, string> = {
    windows: "PC",
    macos: "Mac",
    mac: "Mac",
    chromeos: "Chromebook",
    chrome: "Chromebook",
    ipad: "iPad",
    iphone: "iPhone",
    ios: "iPhone",
    android: "Android",
  }
  const lowerPlatform = platform.toLowerCase()
  // Check for exact match first
  if (deviceMap[lowerPlatform]) return deviceMap[lowerPlatform]
  // Then check for partial match
  for (const [key, value] of Object.entries(deviceMap)) {
    if (lowerPlatform.includes(key)) return value
  }
  return platform
}

function mapInstallToLabel(install: string): string {
  const installMap: Record<string, string> = {
    builtin: "Built-in",
    "built-in": "Built-in",
    webbased: "Web-based",
    "web-based": "Web-based",
    web: "Web-based",
    install: "Needs Install",
    download: "Needs Install",
  }
  const lowerInstall = install.toLowerCase()
  // Check for exact match first
  if (installMap[lowerInstall]) return installMap[lowerInstall]
  // Then check for partial match
  for (const [key, value] of Object.entries(installMap)) {
    if (lowerInstall.includes(key)) return value
  }
  return install
}

function mapPurchaseToLabel(option: string): string {
  const purchaseMap: Record<string, string> = {
    free: "Free",
    freetrial: "Free Trial",
    "free trial": "Free Trial",
    trial: "Free Trial",
    subscription: "Subscription",
    lifetime: "Lifetime",
    "lifetime license": "Lifetime",
  }
  const lowerOption = option.toLowerCase()
  // Check for exact match first
  if (purchaseMap[lowerOption]) return purchaseMap[lowerOption]
  // Then check for partial match
  for (const [key, value] of Object.entries(purchaseMap)) {
    if (lowerOption.includes(key)) return value
  }
  return option
}

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(/[\s/]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function normalizeFilterValue(value: string): string {
  // Remove parenthetical content and lowercase for comparison
  return value
    .replace(/\s*$$[^)]*$$/g, "")
    .trim()
    .toLowerCase()
}

// Helper functions to filter badges based on selected filters
const getFilteredFunctions = (toolFunctions: string[], selectedFilters: string[]) => {
  if (selectedFilters.length === 0) return toolFunctions
  return toolFunctions.filter((func) => {
    const normalizedFunc = func.toLowerCase()
    return selectedFilters.some((filter) => {
      const normalizedFilter = normalizeFilterValue(filter).toLowerCase()
      return (
        normalizedFunc.includes(normalizedFilter) ||
        normalizedFilter.includes(normalizedFunc) ||
        ((normalizedFilter === "focus/planning" || normalizedFilter === "focus/planning/exec") &&
          (normalizedFunc.includes("focus") || normalizedFunc.includes("exec"))) ||
        (normalizedFilter === "cognitive" && normalizedFunc.includes("cognit")) ||
        (normalizedFilter === "speech/communication" &&
          (normalizedFunc.includes("speech") || normalizedFunc.includes("comm")))
      )
    })
  })
}

const getMoreFunctionsCount = (toolFunctions: string[], selectedFilters: string[]) => {
  if (selectedFilters.length === 0) return 0
  return toolFunctions.length - getFilteredFunctions(toolFunctions, selectedFilters).length
}

const getFilteredDevices = (toolDevices: string[], selectedFilters: string[]) => {
  if (selectedFilters.length === 0) return toolDevices
  return toolDevices.filter((device) => {
    const normalizedDevice = device.toLowerCase()
    return selectedFilters.some((filter) => {
      const normalizedFilter = normalizeFilterValue(filter).toLowerCase()
      return (
        normalizedDevice.includes(normalizedFilter) ||
        normalizedFilter.includes(normalizedDevice) ||
        (normalizedFilter === "pc" && (normalizedDevice.includes("windows") || normalizedDevice.includes("pc"))) ||
        (normalizedFilter === "macintosh" && (normalizedDevice.includes("mac") || normalizedDevice.includes("osx"))) ||
        (normalizedFilter === "chromebook" &&
          (normalizedDevice.includes("chrome") ||
            normalizedDevice.includes("chromeos") ||
            normalizedDevice.includes("cros")))
      )
    })
  })
}

const getMoreDevicesCount = (toolDevices: string[], selectedFilters: string[]) => {
  if (selectedFilters.length === 0) return 0
  return toolDevices.length - getFilteredDevices(toolDevices, selectedFilters).length
}

const getFilteredInstallTypes = (toolInstallTypes: string[], selectedFilters: string[]) => {
  if (selectedFilters.length === 0) return toolInstallTypes
  return toolInstallTypes.filter((install) => {
    const normalizedInstall = install.toLowerCase()
    return selectedFilters.some((filter) => {
      const normalizedFilter = normalizeFilterValue(filter).toLowerCase()
      return (
        normalizedInstall.includes(normalizedFilter) ||
        normalizedFilter.includes(normalizedInstall) ||
        (normalizedFilter === "built-in" && normalizedInstall.includes("built")) ||
        (normalizedFilter === "web-based" && normalizedInstall.includes("web")) ||
        (normalizedFilter === "needs to be installed" && normalizedInstall.includes("install"))
      )
    })
  })
}

const getMoreInstallTypesCount = (toolInstallTypes: string[], selectedFilters: string[]) => {
  if (selectedFilters.length === 0) return 0
  return toolInstallTypes.length - getFilteredInstallTypes(toolInstallTypes, selectedFilters).length
}

const getFilteredPurchaseOptions = (toolOptions: string[], selectedFilters: string[]) => {
  if (selectedFilters.length === 0) return toolOptions
  return toolOptions.filter((option) => {
    const normalizedOption = option.toLowerCase().trim()
    return selectedFilters.some((filter) => {
      const normalizedFilter = normalizeFilterValue(filter).toLowerCase().trim()
      // Exact match for "free" to avoid matching "freetrial"
      if (normalizedFilter === "free") {
        return normalizedOption === "free"
      }
      // Exact match for "free trial"
      if (normalizedFilter === "free trial" || normalizedFilter === "freetrial") {
        return normalizedOption === "freetrial" || normalizedOption === "free trial"
      }
      // For other options like subscription, lifetime license - use includes
      return normalizedOption.includes(normalizedFilter) || normalizedFilter.includes(normalizedOption)
    })
  })
}

const getMorePurchaseOptionsCount = (toolOptions: string[], selectedFilters: string[]) => {
  if (selectedFilters.length === 0) return 0
  return toolOptions.length - getFilteredPurchaseOptions(toolOptions, selectedFilters).length
}

const FUNCTION_ORDER = [
  "Reading",
  "Writing",
  "Focus/Planning/Exec",
  "Cognitive",
  "Vision",
  "Braille Tools",
  "Hearing",
  "Physical",
  "Speech/Communication",
]

const SEE_ALSO_RELATIONSHIPS: Record<string, { func: string; reason: string }[]> = {
  reading: [
    { func: "Vision", reason: "Some features for making text larger or clearer might make text easier to read." },
  ],
  writing: [
    {
      func: "Physical",
      reason:
        "If users have trouble using a standard keyboard to write – other physical input devices or techniques including speech-to-text or dictation might be helpful.",
    },
  ],
  execfocus: [
    {
      func: "Cognitive",
      reason: "People with focus or executive function problems might benefit from some other cognitive tools.",
    },
  ],
  cognitive: [
    { func: "Vision", reason: "Making things larger can make things cognitively easier." },
    {
      func: "Focus/Planning/Exec",
      reason:
        "People with cognitive disabilities often have problems with focus, planning or other executive functions.",
    },
    {
      func: "Reading",
      reason:
        "Some reading tools that read-aloud, provide the meaning of words, and other features might be helpful for a person with cognitive problems.",
    },
    {
      func: "Writing",
      reason: "Writing tools might be helpful if the person cognitively has trouble writing clearly.",
    },
    {
      func: "Speech/Communication",
      reason:
        "If person has trouble with communication because of cognitive problems, some speech/communication tools might be helpful.",
    },
  ],
  vision: [
    {
      func: "Reading",
      reason:
        "Those with limited or no vision might find reading tools like ebooks, a read-aloud feature, and other reading aids to be helpful.",
    },
  ],
  braille: [{ func: "Vision", reason: "Braille users might benefit from other vision tools as well." }],
  hearing: [
    {
      func: "Writing",
      reason:
        "If native language is sign-language, writing in English (another language) may be difficult and writing tools might help in writing more clearly and correcting errors.",
    },
    {
      func: "Speech/Communication",
      reason:
        "If a person's hearing causes them to have trouble speaking or speaking clearly, then some speech/communication tools might be helpful.",
    },
  ],
  physical: [
    {
      func: "Writing",
      reason: "For those with physical writing difficulties, writing tools might help speed up writing.",
    },
    {
      func: "Speech/Communication",
      reason:
        "If physical disabilities interfere with clear speech – some speech/communication tools might be helpful.",
    },
  ],
  speech: [
    {
      func: "Physical",
      reason:
        "For individuals with speech or communication difficulties – some alternate or special interfaces for communication or writing might be helpful.",
    },
    {
      func: "Writing",
      reason:
        "For those who rely on writing to communicate, some writing tools might allow faster and better expression.",
    },
  ],
}

function normalizeFilterToFunctionKey(filter: string): string {
  const mapping: Record<string, string> = {
    reading: "reading",
    writing: "writing",
    "focus/planning/exec": "execfocus",
    "focus/planning (exec functions)": "execfocus",
    "focus/planning": "execfocus",
    cognitive: "cognitive",
    vision: "vision",
    "braille tools": "braille",
    braille: "braille",
    hearing: "hearing",
    physical: "physical",
    "speech/communication": "speech",
  }
  return mapping[filter.toLowerCase()] || filter.toLowerCase()
}

function toolMatchesFunction(tool: Tool, filterFunc: string): boolean {
  const normalizedFilter = normalizeFilterToFunctionKey(filterFunc)

  const filterToJsonMap: Record<string, string[]> = {
    reading: ["reading"],
    writing: ["writing"],
    execfocus: ["execfocus", "execfunction", "focus", "planning", "executive"],
    cognitive: ["cognitive"],
    vision: ["vision"],
    braille: ["braille"],
    hearing: ["hearing"],
    physical: ["physical"],
    speech: ["speech", "communication", "aac"],
  }

  const matchingJsonValues = filterToJsonMap[normalizedFilter] || [normalizedFilter]

  return tool.functions.some((toolFunc) => {
    const normalizedToolFunc = toolFunc.toLowerCase()
    return matchingJsonValues.some(
      (jsonValue) => normalizedToolFunc === jsonValue || normalizedToolFunc.includes(jsonValue),
    )
  })
}

function BrowseAllToolsContent() {
  const searchParams = useSearchParams()
  const [tools, setTools] = useState<Tool[]>([])
  const [filteredTools, setFilteredTools] = useState<Tool[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(true)
  const [expandedToolIds, setExpandedToolIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedFunctionInfoIds, setExpandedFunctionInfoIds] = useState<Set<string>>(new Set())
  const [seeAlsoInfoExpanded, setSeeAlsoInfoExpanded] = useState(true)
  const [expandedSeeAlsoGroupIds, setExpandedSeeAlsoGroupIds] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState<FilterState>({
    functions: [],
    devices: [],
    installTypes: [],
    purchaseOptions: [],
  })
  const [initialFiltersApplied, setInitialFiltersApplied] = useState(false)

  const [sortBy, setSortBy] = useState<"name" | "company" | "newest">("name")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState<number>(20)

  const cardRefs = useRef<Map<string, HTMLElement>>(new Map())

  const expandAndScrollToTool = (toolId: string) => {
    setExpandedToolIds((prev) => {
      const newSet = new Set(prev)
      newSet.add(toolId)
      return newSet
    })
    // Scroll to the card after a brief delay to let the DOM update
    setTimeout(() => {
      const cardElement = cardRefs.current.get(toolId)
      if (cardElement) {
        const yOffset = -80 // 80px above the card to account for fixed header
        const y = cardElement.getBoundingClientRect().top + window.pageYOffset + yOffset
        window.scrollTo({ top: y, behavior: "smooth" })
      }
    }, 50)
  }

  const setCardRef = (toolId: string, element: HTMLElement | null) => {
    if (element) {
      cardRefs.current.set(toolId, element)
    } else {
      cardRefs.current.delete(toolId)
    }
  }

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" })
  }, [])

  const functionType = searchParams.get("function")
  const computerType = searchParams.get("computer")
  const phoneType = searchParams.get("phone")
  const deviceType = searchParams.get("device")
  const specificDeviceType = searchParams.get("deviceType")
  const installType = searchParams.get("install")

  const handleToolClick = (tool: Tool) => {
    setSelectedTool(tool)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedTool(null)
  }

  const handleFilterChange = (category: keyof FilterState, value: string, checked: boolean) => {
    setFilters((prev) => ({
      ...prev,
      [category]: checked ? [...prev[category], value] : prev[category].filter((item) => item !== value),
    }))
  }

  const clearAllFilters = () => {
    setFilters({
      functions: [],
      devices: [],
      installTypes: [],
      purchaseOptions: [],
    })
  }

  const hasFilters = Object.values(filters).some((arr) => arr.length > 0)
  const sidebarHasFilters = hasFilters
  const urlHasFilters = !!(functionType || computerType || phoneType || deviceType || specificDeviceType || installType)

  const toggleFilterPanel = () => {
    setIsFilterOpen((prev) => !prev)
  }

  useEffect(() => {
    if (!initialFiltersApplied && (functionType || computerType || phoneType)) {
      const newFilters: FilterState = {
        functions: [],
        devices: [],
        installTypes: [],
        purchaseOptions: [],
      }

      // Map function types from questionnaire to filter panel options
      if (functionType) {
        const functionsList = functionType.split(", ")
        newFilters.functions = functionsList
      }

      // Map computer types to device filters
      if (computerType) {
        const computerList = computerType.split(", ")
        const deviceMapping: Record<string, string> = {
          "Mac (Apple)": "Macintosh",
          "Windows (Microsoft)": "PC (Windows)",
          "Chromebook (Google)": "Chromebook",
        }
        computerList.forEach((comp) => {
          const mapped = deviceMapping[comp]
          if (mapped && !newFilters.devices.includes(mapped)) {
            newFilters.devices.push(mapped)
          }
        })
      }

      // Map phone types to device filters
      if (phoneType && phoneType !== "None") {
        const phoneMapping: Record<string, string> = {
          iPhone: "iPhone",
          "Android (Samsung, Google, Lenovo)": "Android",
        }
        const mapped = phoneMapping[phoneType]
        if (mapped && !newFilters.devices.includes(mapped)) {
          newFilters.devices.push(mapped)
        }
      }

      setFilters(newFilters)
      setInitialFiltersApplied(true)
    }
  }, [functionType, computerType, phoneType, initialFiltersApplied])

  useEffect(() => {
    const fetchTools = async () => {
      try {
        setLoading(true)
        const response = await fetch(
          "https://raw.githubusercontent.com/raisingthefloor/learnandtry-webapp/dev/public/data/catalog.json",
        )

        if (!response.ok) {
          throw new Error("Failed to fetch tools")
        }

        const data = await response.json()
        setTools(data)
        // Initialize filteredTools with all tools initially
        setFilteredTools(data)
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
        setLoading(false)
      }
    }

    fetchTools()
  }, [])

  // Apply sidebar filters and search query
  useEffect(() => {
    if (tools.length === 0) return

    let filtered = [...tools]

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(
        (tool) =>
          tool.name.toLowerCase().includes(query) ||
          tool.company.toLowerCase().includes(query) ||
          tool.description.toLowerCase().includes(query),
      )
    }

    // Apply function filters
    if (filters.functions.length > 0) {
      filtered = filtered.filter((tool) => {
        return filters.functions.some((filterFunc) => {
          const normalizedFilter = normalizeFilterValue(filterFunc).toLowerCase()

          // Map UI filter labels to exact JSON values
          const filterToJsonMap: Record<string, string[]> = {
            reading: ["reading"],
            writing: ["writing"],
            "focus/planning": ["execfocus", "execfunction", "focus", "planning", "executive"],
            "focus/planning/exec": ["execfocus", "execfunction", "focus", "planning", "executive"],
            cognitive: ["cognitive"],
            vision: ["vision"],
            "braille tools": ["braille"],
            hearing: ["hearing"],
            physical: ["physical"],
            "speech/communication": ["speech", "communication", "aac"],
          }

          // Get the JSON values that match this filter
          const matchingJsonValues = filterToJsonMap[normalizedFilter] || [normalizedFilter]

          // Check if the tool's function matches any of the expected JSON values
          return tool.functions.some((toolFunc) => {
            const normalizedToolFunc = toolFunc.toLowerCase()
            return matchingJsonValues.some(
              (jsonValue) => normalizedToolFunc === jsonValue || normalizedToolFunc.includes(jsonValue),
            )
          })
        })
      })
    }

    // Apply device filters
    if (filters.devices.length > 0) {
      filtered = filtered.filter((tool) =>
        filters.devices.some((filterDevice) => {
          // Map filter panel values to platform search terms
          const deviceMap: Record<string, string[]> = {
            "PC (Windows)": ["windows"],
            Macintosh: ["macos", "mac", "macintosh"],
            Chromebook: ["chromeos", "chrome"],
            iPhone: ["ios", "iphone"],
            iPad: ["ios", "ipad"],
            Android: ["android"],
          }
          const searchTerms = deviceMap[filterDevice] || [filterDevice.toLowerCase()]
          return tool.supportedPlatforms.some((platform) =>
            searchTerms.some((term) => platform.toLowerCase().includes(term)),
          )
        }),
      )
    }

    // Apply install type filters
    if (filters.installTypes.length > 0) {
      filtered = filtered.filter((tool) =>
        filters.installTypes.some((filterInstall) => {
          const normalizedFilter = normalizeFilterValue(filterInstall)

          // Map UI filter labels to possible JSON values
          const installToJsonMap: Record<string, string[]> = {
            "built-in": ["builtin", "built-in", "built", "native", "included", "preinstalled"],
            "web-based": ["webbased", "web-based", "web", "browser", "online", "webapp"],
            "needs to be installed": ["install", "download", "needsinstall", "app", "application"],
          }

          // Get the JSON values that match this filter
          const matchingJsonValues = installToJsonMap[normalizedFilter] || [normalizedFilter]

          return tool.installTypes.some((toolInstall) => {
            const normalizedToolInstall = toolInstall.toLowerCase().replace(/[-_\s]/g, "")
            return matchingJsonValues.some((jsonValue) => {
              const normalizedJsonValue = jsonValue.toLowerCase().replace(/[-_\s]/g, "")
              return (
                normalizedToolInstall === normalizedJsonValue ||
                normalizedToolInstall.includes(normalizedJsonValue) ||
                normalizedJsonValue.includes(normalizedToolInstall)
              )
            })
          })
        }),
      )
    }

    // Apply purchase option filters
    if (filters.purchaseOptions.length > 0) {
      filtered = filtered.filter((tool) =>
        filters.purchaseOptions.some((filterPurchase) => {
          const normalizedFilter = filterPurchase.toLowerCase()
          return tool.purchaseOptions.some((toolPurchase) => {
            const normalizedToolPurchase = toolPurchase.toLowerCase()
            // Use exact matching for "free" to avoid matching "free trial"
            if (normalizedFilter === "free") {
              return normalizedToolPurchase === "free"
            }
            if (normalizedFilter === "free trial") {
              return normalizedToolPurchase === "free trial" || normalizedToolPurchase.includes("trial")
            }
            // For other options, use partial matching
            return (
              normalizedToolPurchase.includes(normalizedFilter) || normalizedFilter.includes(normalizedToolPurchase)
            )
          })
        }),
      )
    }

    setFilteredTools(filtered)
    setCurrentPage(1) // Reset to first page when filters change
  }, [filters, tools, searchQuery])

  const sortTools = (tools: Tool[], sortBy: string) => {
    const sorted = [...tools].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name)
        case "company":
          return a.company.localeCompare(b.company)
        case "newest":
          // Since we don't have dates, we'll sort by ID as a proxy
          return b.id.localeCompare(a.id)
        default:
          return 0
      }
    })
    return sorted
  }

  function filterTrainingTherapy(functions: string[]): string[] {
    return functions.filter((f) => f.toLowerCase() !== "trainingtherapy" && f.toLowerCase() !== "training therapy")
  }

  const getFullDisplayList = () => {
    const sortedTools = sortTools(filteredTools, sortBy) // Use sorted version of filteredTools
    if (filters.functions.length === 0) {
      // If no function filters are applied, just return all sorted tools without any special grouping logic.
      // Each item will have an empty functionName, isRepeat: false, and firstShownIn: ''.
      // We add a default functionName to maintain consistency in the type if needed, but it won't be used for grouping.
      return sortedTools.map((tool) => ({ tool, functionName: "", isRepeat: false, firstShownIn: "" }))
    }

    const orderedSelectedFunctions = FUNCTION_ORDER.filter((func) =>
      filters.functions.some((f) => f.toLowerCase() === func.toLowerCase()),
    )

    // Define the type for items in the display list
    type DisplayItem = {
      tool: Tool
      functionName: string // The function group this item is primarily associated with
      isRepeat: boolean // True if this tool has already been shown in a previous function group
      firstShownIn: string // The functionName where this tool was first shown
      isSeeAlso?: boolean // True if this item is from the "See Also" section
      reasons?: string[] // Reasons for including this item in the "See Also" section
    }
    const displayList: DisplayItem[] = []
    const firstShownInMap = new Map<string, string>() // toolId -> functionName where first shown

    // Add all main group tools, including duplicates as repeats
    for (const func of orderedSelectedFunctions) {
      const matchingTools = sortedTools.filter((tool) => {
        const filteredFunctions = filterTrainingTherapy(tool.functions)
        return filteredFunctions.some((toolFunc) => {
          const normalizedFilter = normalizeFilterValue(func).toLowerCase()

          // Map UI filter labels to exact JSON values
          const filterToJsonMap: Record<string, string[]> = {
            reading: ["reading"],
            writing: ["writing"],
            "focus/planning": ["execfocus", "execfunction", "focus", "planning", "executive"],
            "focus/planning/exec": ["execfocus", "execfunction", "focus", "planning", "executive"],
            cognitive: ["cognitive"],
            vision: ["vision"],
            "braille tools": ["braille"],
            hearing: ["hearing"],
            physical: ["physical"],
            "speech/communication": ["speech", "communication", "aac"],
          }

          // Get the JSON values that match this filter
          const matchingJsonValues = filterToJsonMap[normalizedFilter] || [normalizedFilter]

          // Check if the tool's function matches any of the expected JSON values
          return (
            toolFunc.toLowerCase() === normalizedFilter ||
            matchingJsonValues.some(
              (jsonValue) => toolFunc.toLowerCase() === jsonValue || toolFunc.toLowerCase().includes(jsonValue),
            )
          )
        })
      })
      for (const tool of matchingTools) {
        const isRepeat = firstShownInMap.has(tool.id)
        const firstShownIn = firstShownInMap.get(tool.id) || ""
        displayList.push({ tool, functionName: func, isRepeat, firstShownIn })
        if (!isRepeat) {
          firstShownInMap.set(tool.id, func)
        }
      }
    }

    // Now add see-also tools
    const normalizedSelected = orderedSelectedFunctions.map((f) => normalizeFilterToFunctionKey(f))
    const seeAlsoMap: Record<string, string[]> = {} // Maps see-also function name to its reasons

    for (const selected of normalizedSelected) {
      const relationships = SEE_ALSO_RELATIONSHIPS[selected] || []
      for (const rel of relationships) {
        const normalizedSeeAlsoFunc = normalizeFilterToFunctionKey(rel.func)
        // Only add if this see-also function is NOT already selected by the user
        if (!normalizedSelected.includes(normalizedSeeAlsoFunc)) {
          if (!seeAlsoMap[rel.func]) {
            seeAlsoMap[rel.func] = []
          }
          seeAlsoMap[rel.func].push(rel.reason)
        }
      }
    }

    // Order see-also functions according to FUNCTION_ORDER
    const orderedSeeAlsoFunctions = FUNCTION_ORDER.filter((func) => seeAlsoMap[func])

    // Add see-also tools - these are only added if they haven't appeared in main groups
    for (const func of orderedSeeAlsoFunctions) {
      const matchingTools = tools.filter((tool) => toolMatchesFunction(tool, func))
      for (const tool of matchingTools) {
        if (!firstShownInMap.has(tool.id)) {
          // Add to display list, marking it as a 'see also' item and including reasons
          displayList.push({
            tool,
            functionName: func,
            isRepeat: false,
            firstShownIn: "",
            isSeeAlso: true,
            reasons: seeAlsoMap[func],
          } as DisplayItem)
          firstShownInMap.set(tool.id, func) // Mark as shown to prevent further duplicates
        }
      }
    }

    return displayList
  }

  const fullDisplayList = getFullDisplayList()

  const getEffectiveDisplayCount = () => {
    // Count main items (non-see-also items)
    const mainItemsCount = fullDisplayList.filter((item) => !(item as any).isSeeAlso).length

    // For see-also items, count based on expanded state
    // First, group see-also items by function
    const seeAlsoByFunction: Record<string, number> = {}
    for (const item of fullDisplayList) {
      if ((item as any).isSeeAlso) {
        const func = item.functionName
        seeAlsoByFunction[func] = (seeAlsoByFunction[func] || 0) + 1
      }
    }

    // Count see-also items based on collapsed/expanded state
    let seeAlsoCount = 0
    const seeAlsoFunctions = Object.keys(seeAlsoByFunction)

    if (seeAlsoFunctions.length > 0) {
      // Add 1 for the main "SEE ALSO" header card
      seeAlsoCount += 1

      // For each see-also function group
      for (const func of seeAlsoFunctions) {
        const seeAlsoFuncKey = normalizeFilterValue(func).toLowerCase().replace(/\s+/g, "")
        const isExpanded = expandedSeeAlsoGroupIds.has(seeAlsoFuncKey)

        if (isExpanded) {
          // When expanded: 1 header + all tools in the group
          seeAlsoCount += 1 + seeAlsoByFunction[func]
        } else {
          // When collapsed: just 1 for the header
          seeAlsoCount += 1
        }
      }
    }

    return mainItemsCount + seeAlsoCount
  }

  const effectiveCount = getEffectiveDisplayCount()
  const mainItemsOnly = fullDisplayList.filter((item) => !(item as any).isSeeAlso)
  const seeAlsoItemsOnly = fullDisplayList.filter((item) => (item as any).isSeeAlso)

  // For see-also items, show ALL of them if any should appear on this page
  const effectiveStartIndex = itemsPerPage === 0 ? 0 : (currentPage - 1) * itemsPerPage
  const effectiveEndIndex = itemsPerPage === 0 ? mainItemsOnly.length : currentPage * itemsPerPage

  // Slice main items normally
  const paginatedMainItems =
    itemsPerPage === 0
      ? mainItemsOnly
      : mainItemsOnly.slice(effectiveStartIndex, Math.min(effectiveEndIndex, mainItemsOnly.length))

  // Calculate how many effective items remain after main items on this page
  const mainItemsOnThisPage = paginatedMainItems.length
  const effectiveItemsRemainingOnPage =
    itemsPerPage === 0 ? Number.POSITIVE_INFINITY : itemsPerPage - mainItemsOnThisPage

  // See-also section starts after all main items
  const seeAlsoStartsOnOrBeforePage = effectiveEndIndex > mainItemsOnly.length
  const paginatedSeeAlsoItems = itemsPerPage === 0 || seeAlsoStartsOnOrBeforePage ? seeAlsoItemsOnly : []

  // Combine for backwards compatibility
  const paginatedDisplayList = [...paginatedMainItems, ...paginatedSeeAlsoItems]

  const showingStartNumber = filteredTools.length === 0 ? 0 : effectiveStartIndex + 1
  // const showingEndNumber = Math.min(effectiveStartIndex + mainToolsOnCurrentPage, filteredTools.length)
  // The following line was causing a lint error: 'mainToolsOnCurrentPage' was used before declaration.
  // It has been moved to after `paginatedMainItems` is defined.
  const mainToolsOnCurrentPage = paginatedMainItems.length
  const showingEndNumber = Math.min(effectiveStartIndex + mainToolsOnCurrentPage, filteredTools.length)

  const getGroupedDisplayItems = () => {
    // If no function filters are selected, we don't group by function
    if (filters.functions.length === 0) {
      // Return null for mainGroups and empty array for seeAlsoGroups, indicating no function-based grouping.
      return { mainGroups: null, seeAlsoGroups: [] }
    }

    // Get the selected functions in the desired order
    const orderedSelectedFunctions = FUNCTION_ORDER.filter((func) =>
      filters.functions.some((f) => f.toLowerCase() === func.toLowerCase()),
    )

    // --- Build main groups from the paginated display list ---
    // This section will contain tools primarily assigned to the selected functions.
    const mainGroups: { functionName: string; items: typeof paginatedDisplayList }[] = []

    for (const func of orderedSelectedFunctions) {
      // Filter the paginated list for items that belong to this function and are NOT 'see also' items.
      const items = paginatedDisplayList.filter((item) => item.functionName === func && !(item as any).isSeeAlso)
      // If there are any items for this function, create a group.
      if (items.length > 0) {
        mainGroups.push({ functionName: func, items })
      }
    }

    // --- Build see-also groups from the paginated display list ---
    // This section will contain tools recommended from other function categories.

    // Normalize selected function names for lookup
    const normalizedSelected = orderedSelectedFunctions.map((f) => normalizeFilterToFunctionKey(f))
    const seeAlsoMap: Record<string, string[]> = {} // Maps see-also function names to their inclusion reasons

    // Populate seeAlsoMap by looking at relationships for each selected function
    for (const selected of normalizedSelected) {
      const relationships = SEE_ALSO_RELATIONSHIPS[selected] || []
      for (const rel of relationships) {
        const normalizedSeeAlsoFunc = normalizeFilterToFunctionKey(rel.func)
        // Only add a see-also entry if the target function is NOT one the user has already selected.
        if (!normalizedSelected.includes(normalizedSeeAlsoFunc)) {
          if (!seeAlsoMap[rel.func]) {
            seeAlsoMap[rel.func] = []
          }
          seeAlsoMap[rel.func].push(rel.reason)
        }
      }
    }

    // Order the potential see-also functions according to the predefined FUNCTION_ORDER.
    const orderedSeeAlsoFunctions = FUNCTION_ORDER.filter((func) => seeAlsoMap[func])
    const seeAlsoGroups: { functionName: string; reasons: string[]; items: typeof paginatedDisplayList }[] = []

    // For each ordered see-also function, find the relevant items from the paginated list.
    for (const func of orderedSeeAlsoFunctions) {
      const items = paginatedDisplayList.filter(
        (item) => item.functionName === func && (item as any).isSeeAlso, // Filter for items marked as 'see also' and matching this function
      )
      // If any items are found for this see-also function, create a group.
      if (items.length > 0) {
        seeAlsoGroups.push({ functionName: func, reasons: seeAlsoMap[func], items })
      }
    }

    return { mainGroups, seeAlsoGroups }
  }

  const { mainGroups: groupedTools, seeAlsoGroups } = getGroupedDisplayItems()

  useEffect(() => {
    setCurrentPage(1)
  }, [filters, functionType, deviceType, specificDeviceType, installType, itemsPerPage, expandedSeeAlsoGroupIds])

  const handleShowAll = () => {
    setItemsPerPage(0)
    setCurrentPage(1)
  }

  const collapseAllExpanded = () => {
    setExpandedToolIds(new Set())
  }

  const getSeeAlsoGroups = (selectedFunctions: string[], shownToolIds: Set<string>, allTools: Tool[]) => {
    // Normalize selected function names for lookup
    const normalizedSelected = selectedFunctions.map((f) => normalizeFilterToFunctionKey(f))

    console.log("[v0] getSeeAlsoGroups called with:", selectedFunctions)
    console.log("[v0] Normalized selections:", normalizedSelected)
    console.log("[v0] allTools count:", allTools.length)

    // Gather all see-also functions and their reasons
    const seeAlsoMap: Record<string, string[]> = {}

    for (const selected of normalizedSelected) {
      const relationships = SEE_ALSO_RELATIONSHIPS[selected] || []
      console.log("[v0] For selection", selected, "found relationships:", relationships)
      for (const rel of relationships) {
        const normalizedSeeAlsoFunc = normalizeFilterToFunctionKey(rel.func)
        // Don't include if this function is already selected by the user
        if (!normalizedSelected.includes(normalizedSeeAlsoFunc)) {
          if (!seeAlsoMap[rel.func]) {
            seeAlsoMap[rel.func] = []
          }
          seeAlsoMap[rel.func].push(rel.reason)
        }
      }
    }

    console.log("[v0] seeAlsoMap:", seeAlsoMap)
    console.log("[v0] FUNCTION_ORDER:", FUNCTION_ORDER)

    // Order see-also functions by FUNCTION_ORDER
    const orderedSeeAlsoFunctions = FUNCTION_ORDER.filter((func) => seeAlsoMap[func])

    console.log("[v0] orderedSeeAlsoFunctions:", orderedSeeAlsoFunctions)

    // Build groups with tools (excluding already shown tools entirely)
    const seeAlsoGroups: { functionName: string; reasons: string[]; tools: Tool[] }[] = []

    for (const func of orderedSeeAlsoFunctions) {
      console.log("[v0] Checking see-also function:", func)
      console.log("[v0] allTools count:", allTools.length)
      console.log("[v0] shownToolIds count:", shownToolIds.size)

      const matchingTools = allTools.filter((tool) => {
        const notAlreadyShown = !shownToolIds.has(tool.id)
        const matchesFunc = toolMatchesFunction(tool, func)
        if (matchesFunc) {
          console.log("[v0] Tool", tool.name, "matches function", func, "notAlreadyShown:", notAlreadyShown)
        }
        return notAlreadyShown && matchesFunc
      })

      console.log("[v0] matchingTools for", func, ":", matchingTools.length)

      if (matchingTools.length > 0) {
        seeAlsoGroups.push({
          functionName: func,
          reasons: seeAlsoMap[func],
          tools: matchingTools,
        })
      }
    }

    console.log("[v0] Final seeAlsoGroups:", seeAlsoGroups)
    return seeAlsoGroups
  }

  // const groupedTools = getGroupedTools() // Replaced by the new `groupedTools` constant derived from the simplified `getGroupedTools` function
  // const seeAlsoGroups =
  //   groupedToolsResult && filters.functions.length > 0
  //     ? getSeeAlsoGroups(filters.functions, groupedToolsResult.shownToolIds, tools)
  //     : [] // Replaced by the new `seeAlsoGroups` constant derived from the simplified `getPaginatedSeeAlsoGroups` function

  const totalPages = itemsPerPage === 0 ? 1 : Math.ceil(filteredTools.length / itemsPerPage)

  return (
    <div className="bg-muted/50 min-h-screen">
      {/* Responsive Container */}
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row">
          {/* Filter sidebar - hidden on mobile, visible on desktop */}
          <div className="hidden lg:block lg:flex-shrink-0 lg:w-72 p-4">
            <FilterPanel
              isOpen={isFilterOpen}
              onToggle={toggleFilterPanel}
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearAll={clearAllFilters}
              hasActiveFilters={sidebarHasFilters}
            />
          </div>

          {/* Main Content */}
          <main className="flex-1 px-4 sm:px-8 md:px-12 lg:px-16 py-8 md:py-12" role="main">
            <div className="lg:hidden mb-6">
              <FilterPanel
                isOpen={isFilterOpen}
                onToggle={toggleFilterPanel}
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearAll={clearAllFilters}
                hasActiveFilters={sidebarHasFilters}
              />
            </div>

            <div className="mb-6 md:mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
                <h1 className="text-2xl md:text-4xl font-bold text-primary tracking-tight">
                  {hasFilters ? "Listing of Tools Found" : "Browse Tools"}
                </h1>
              </div>

              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search tools by name, company, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 py-3 text-base border-gray-400 bg-background"
                />
              </div>

              {!urlHasFilters && !sidebarHasFilters && !searchQuery && (
                <p className="text-base md:text-lg text-muted-foreground mb-6 leading-relaxed whitespace-pre-line">
                  {"Explore our complete directory of " +
                    tools.length +
                    " assistive technology tools. You can search using the search field above or use the filters to narrow your search.\nTo learn more about a product - just click on it to expand the description."}
                </p>
              )}

              {(hasFilters || searchQuery) && (
                <div className="mb-6">
                  <p className="text-base md:text-lg text-muted-foreground mb-4 leading-relaxed">
                    We found {filteredTools.length} tools that match your selections.
                  </p>

                  {(filters.functions.length > 0 ||
                    filters.devices.length > 0 ||
                    filters.installTypes.length > 0 ||
                    filters.purchaseOptions.length > 0) && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {filters.functions.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-200 text-purple-900 rounded-full text-sm">
                          <span className="font-bold">Function(s):</span>{" "}
                          {filters.functions.map((f) => removeParentheses(f)).join(", ")}
                        </span>
                      )}
                      {filters.devices.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-900 rounded-full text-sm">
                          <span className="font-bold">Device(s):</span>{" "}
                          {filters.devices.map((d) => removeParentheses(d)).join(", ")}
                        </span>
                      )}
                      {filters.installTypes.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-900 rounded-full text-sm">
                          <span className="font-bold">Install:</span>{" "}
                          {filters.installTypes.map((i) => removeParentheses(i)).join(", ")}
                        </span>
                      )}
                      {filters.purchaseOptions.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-900 rounded-full text-sm">
                          <span className="font-bold">Pricing:</span>{" "}
                          {filters.purchaseOptions.map((p) => removeParentheses(p)).join(", ")}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Controls row - all on one line */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                Showing {showingStartNumber} to {showingEndNumber} of {filteredTools.length} tools found.
              </span>

              <div className="flex flex-wrap items-center gap-3">
                {/* Show X at a time */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">Show:</span>
                  <Select
                    value={itemsPerPage === 0 ? "all" : itemsPerPage.toString()}
                    onValueChange={(value) => {
                      if (value === "all") {
                        setItemsPerPage(0)
                      } else {
                        setItemsPerPage(Number.parseInt(value))
                      }
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className="w-28 h-8 text-sm border-gray-400 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="all">All at once</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">Sort:</span>
                  <Select value={sortBy} onValueChange={(value: "name" | "company" | "newest") => setSortBy(value)}>
                    <SelectTrigger className="w-28 h-8 text-sm border-gray-400 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="company">Company</SelectItem>
                      <SelectItem value="newest">Newest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12" role="status" aria-live="polite">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mb-4"></div>
                <p className="text-muted-foreground">Loading tools...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12 px-4 bg-destructive/10 rounded-lg" role="alert" aria-live="assertive">
                <p className="text-destructive font-medium">{error}</p>
                <Button variant="outline" className="mt-4 bg-transparent" onClick={() => window.location.reload()}>
                  Try Again
                </Button>
              </div>
            ) : (
              <>
                {groupedTools ? (
                  // Render grouped view
                  <div className="space-y-4" role="list" aria-label="Tools list grouped by function">
                    {groupedTools.map((group, groupIndex) => {
                      const funcKey = normalizeFilterValue(group.functionName).toLowerCase().replace(/\s+/g, "")
                      const isInfoExpanded = expandedFunctionInfoIds.has(funcKey)

                      // Function info content (same as before)
                      const functionInfoContent: Record<string, { name: string; content: React.ReactNode }> = {
                        cognitive: {
                          name: "COGNITIVE",
                          content: (
                            <>
                              <p className="mb-4">
                                <span className="font-bold">COGNITIVE</span> contains tools for users who have any
                                problems with thinking, remembering, or complex language or concepts.
                              </p>
                              <p className="font-bold mb-2">TYPICAL FEATURES IN THESE TOOLS:</p>
                              <ul className="list-disc pl-6 mb-4 space-y-1">
                                <li>toolbars to make things easier to find and use</li>
                                <li>language simplification</li>
                                <li>extra time to read pop-ups</li>
                                <li>breaking complex sentences into simpler chunks/phrases for easier understanding</li>
                                <li>
                                  automatic extraction of key ideas, vocabulary lists, or study questions from text
                                </li>
                                <li>memory aids, and shortcuts that do not involve memorization</li>
                                <li>simplified screen layouts</li>
                                <li>distraction masking and removal</li>
                                <li>animation control</li>
                                <li>both visual and audio presentation of information</li>
                              </ul>
                              <p className="font-bold mb-2">SEE ALSO:</p>
                              <p className="mb-2">
                                Some features in the following other categories can be useful and are shown at the
                                bottom of the list below:
                              </p>
                              <ul className="list-disc pl-6 space-y-1">
                                <li>
                                  <span className="font-bold">Vision</span> (for features that make things larger)
                                </li>
                                <li>
                                  <span className="font-bold">Exec/Focus</span> (for features to help with distraction
                                  or focus or planning)
                                </li>
                                <li>
                                  <span className="font-bold">Reading</span> (for features that read text aloud and
                                  more)
                                </li>
                                <li>
                                  <span className="font-bold">Writing</span> (for things to help with writing)
                                </li>
                                <li>
                                  <span className="font-bold">Speech/Comm</span> (if users have trouble with
                                  communication)
                                </li>
                              </ul>
                            </>
                          ),
                        },
                        reading: {
                          name: "READING",
                          content: (
                            <>
                              <p className="mb-4">
                                <span className="font-bold">READING</span> contains tools for users who have any
                                problems with xxxxxx.
                              </p>
                              <p className="font-bold mb-2">TYPICAL FEATURES IN THESE TOOLS:</p>
                              <ul className="list-disc pl-6 mb-4 space-y-1">
                                <li>yyyyyy</li>
                                <li>yyyyyy</li>
                              </ul>
                              <p className="font-bold mb-2">SEE ALSO:</p>
                              <p className="mb-2">
                                Some features in the following other categories can be useful and are shown at the
                                bottom of the list below:
                              </p>
                              <ul className="list-disc pl-6 space-y-1">
                                <li>
                                  <span className="font-bold">Feature</span> (for features that xxxx)
                                </li>
                                <li>
                                  <span className="font-bold">Feature</span> (for features that xxxx)
                                </li>
                                <li>
                                  <span className="font-bold">Feature</span> (for features that xxxx)
                                </li>
                              </ul>
                            </>
                          ),
                        },
                        writing: {
                          name: "WRITING",
                          content: (
                            <>
                              <p className="mb-4">
                                <span className="font-bold">WRITING</span> contains tools for users who have any
                                problems with xxxxxx.
                              </p>
                              <p className="font-bold mb-2">TYPICAL FEATURES IN THESE TOOLS:</p>
                              <ul className="list-disc pl-6 mb-4 space-y-1">
                                <li>yyyyyy</li>
                                <li>yyyyyy</li>
                              </ul>
                              <p className="font-bold mb-2">SEE ALSO:</p>
                              <p className="mb-2">
                                Some features in the following other categories can be useful and are shown at the
                                bottom of the list below:
                              </p>
                              <ul className="list-disc pl-6 space-y-1">
                                <li>
                                  <span className="font-bold">Feature</span> (for features that xxxx)
                                </li>
                                <li>
                                  <span className="font-bold">Feature</span> (for features that xxxx)
                                </li>
                                <li>
                                  <span className="font-bold">Feature</span> (for features that xxxx)
                                </li>
                              </ul>
                            </>
                          ),
                        },
                        "focus/planning/exec": {
                          name: "EXEC/FOCUS",
                          content: (
                            <>
                              <p className="mb-4">
                                <span className="font-bold">EXEC/FOCUS</span> contains tools for users who have any
                                problems with xxxxxx.
                              </p>
                              <p className="font-bold mb-2">TYPICAL FEATURES IN THESE TOOLS:</p>
                              <ul className="list-disc pl-6 mb-4 space-y-1">
                                <li>yyyyyy</li>
                                <li>yyyyyy</li>
                              </ul>
                              <p className="font-bold mb-2">SEE ALSO:</p>
                              <p className="mb-2">
                                Some features in the following other categories can be useful and are shown at the
                                bottom of the list below:
                              </p>
                              <ul className="list-disc pl-6 space-y-1">
                                <li>
                                  <span className="font-bold">Feature</span> (for features that xxxx)
                                </li>
                                <li>
                                  <span className="font-bold">Feature</span> (for features that xxxx)
                                </li>
                                <li>
                                  <span className="font-bold">Feature</span> (for features that xxxx)
                                </li>
                              </ul>
                            </>
                          ),
                        },
                        vision: {
                          name: "VISION",
                          content: (
                            <>
                              <p className="mb-4">
                                <span className="font-bold">VISION</span> contains tools for users who have any problems
                                with xxxxxx.
                              </p>
                              <p className="font-bold mb-2">TYPICAL FEATURES IN THESE TOOLS:</p>
                              <ul className="list-disc pl-6 mb-4 space-y-1">
                                <li>yyyyyy</li>
                                <li>yyyyyy</li>
                              </ul>
                              <p className="font-bold mb-2">SEE ALSO:</p>
                              <p className="mb-2">
                                Some features in the following other categories can be useful and are shown at the
                                bottom of the list below:
                              </p>
                              <ul className="list-disc pl-6 space-y-1">
                                <li>
                                  <span className="font-bold">Feature</span> (for features that xxxx)
                                </li>
                                <li>
                                  <span className="font-bold">Feature</span> (for features that xxxx)
                                </li>
                                <li>
                                  <span className="font-bold">Feature</span> (for features that xxxx)
                                </li>
                              </ul>
                            </>
                          ),
                        },
                        "braille tools": {
                          name: "BRAILLE",
                          content: (
                            <>
                              <p className="mb-4">
                                <span className="font-bold">BRAILLE</span> contains tools for users who have any
                                problems with xxxxxx.
                              </p>
                              <p className="font-bold mb-2">TYPICAL FEATURES IN THESE TOOLS:</p>
                              <ul className="list-disc pl-6 mb-4 space-y-1">
                                <li>yyyyyy</li>
                                <li>yyyyyy</li>
                              </ul>
                              <p className="font-bold mb-2">SEE ALSO:</p>
                              <p className="mb-2">
                                Some features in the following other categories can be useful and are shown at the
                                bottom of the list below:
                              </p>
                              <ul className="list-disc pl-6 space-y-1">
                                <li>
                                  <span className="font-bold">Feature</span> (for features that xxxx)
                                </li>
                                <li>
                                  <span className="font-bold">Feature</span> (for features that xxxx)
                                </li>
                                <li>
                                  <span className="font-bold">Feature</span> (for features that xxxx)
                                </li>
                              </ul>
                            </>
                          ),
                        },
                        hearing: {
                          name: "HEARING",
                          content: (
                            <>
                              <p className="mb-4">
                                <span className="font-bold">HEARING</span> contains tools for users who have any
                                problems with xxxxxx.
                              </p>
                              <p className="font-bold mb-2">TYPICAL FEATURES IN THESE TOOLS:</p>
                              <ul className="list-disc pl-6 mb-4 space-y-1">
                                <li>yyyyyy</li>
                                <li>yyyyyy</li>
                              </ul>
                              <p className="font-bold mb-2">SEE ALSO:</p>
                              <p className="mb-2">
                                Some features in the following other categories can be useful and are shown at the
                                bottom of the list below:
                              </p>
                              <ul className="list-disc pl-6 space-y-1">
                                <li>
                                  <span className="font-bold">Feature</span> (for features that xxxx)
                                </li>
                                <li>
                                  <span className="font-bold">Feature</span> (for features that xxxx)
                                </li>
                                <li>
                                  <span className="font-bold">Feature</span> (for features that xxxx)
                                </li>
                              </ul>
                            </>
                          ),
                        },
                        physical: {
                          name: "PHYSICAL",
                          content: (
                            <>
                              <p className="mb-4">
                                <span className="font-bold">PHYSICAL</span> contains tools for users who have any
                                problems with xxxxxx.
                              </p>
                              <p className="font-bold mb-2">TYPICAL FEATURES IN THESE TOOLS:</p>
                              <ul className="list-disc pl-6 mb-4 space-y-1">
                                <li>yyyyyy</li>
                                <li>yyyyyy</li>
                              </ul>
                              <p className="font-bold mb-2">SEE ALSO:</p>
                              <p className="mb-2">
                                Some features in the following other categories can be useful and are shown at the
                                bottom of the list below:
                              </p>
                              <ul className="list-disc pl-6 space-y-1">
                                <li>
                                  <span className="font-bold">Feature</span> (for features that xxxx)
                                </li>
                                <li>
                                  <span className="font-bold">Feature</span> (for features that xxxx)
                                </li>
                                <li>
                                  <span className="font-bold">Feature</span> (for features that xxxx)
                                </li>
                              </ul>
                            </>
                          ),
                        },
                        "speech/communication": {
                          name: "SPEECH/COMM",
                          content: (
                            <>
                              <p className="mb-4">
                                <span className="font-bold">SPEECH/COMM</span> contains tools for users who have any
                                problems with xxxxxx.
                              </p>
                              <p className="font-bold mb-2">TYPICAL FEATURES IN THESE TOOLS:</p>
                              <ul className="list-disc pl-6 mb-4 space-y-1">
                                <li>yyyyyy</li>
                                <li>yyyyyy</li>
                              </ul>
                              <p className="font-bold mb-2">SEE ALSO:</p>
                              <p className="mb-2">
                                Some features in the following other categories can be useful and are shown at the
                                bottom of the list below:
                              </p>
                              <ul className="list-disc pl-6 space-y-1">
                                <li>
                                  <span className="font-bold">Feature</span> (for features that xxxx)
                                </li>
                                <li>
                                  <span className="font-bold">Feature</span> (for features that xxxx)
                                </li>
                                <li>
                                  <span className="font-bold">Feature</span> (for features that xxxx)
                                </li>
                              </ul>
                            </>
                          ),
                        },
                      }

                      const info = functionInfoContent[funcKey] || {
                        name: toTitleCase(group.functionName),
                        content: (
                          <>
                            <p className="mb-4">
                              <span className="font-bold">{toTitleCase(group.functionName)}</span> contains tools for
                              users who have any problems with xxxxxx.
                            </p>
                            <p className="font-bold mb-2">TYPICAL FEATURES IN THESE TOOLS:</p>
                            <ul className="list-disc pl-6 mb-4 space-y-1">
                              <li>yyyyyy</li>
                              <li>yyyyyy</li>
                            </ul>
                            <p className="font-bold mb-2">SEE ALSO:</p>
                            <p className="mb-2">
                              Some features in the following other categories can be useful and are shown at the bottom
                              of the list below:
                            </p>
                            <ul className="list-disc pl-6 space-y-1">
                              <li>
                                <span className="font-bold">Feature</span> (for features that xxxx)
                              </li>
                            </ul>
                          </>
                        ),
                      }

                      return (
                        <div key={funcKey}>
                          <div
                            className={`bg-blue-50 border-2 border-blue-400 rounded-lg overflow-hidden ${groupIndex > 0 ? "mt-6" : ""}`}
                          >
                            <button
                              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-blue-100 transition-colors"
                              onClick={() => {
                                setExpandedFunctionInfoIds((prev) => {
                                  const newSet = new Set(prev)
                                  if (newSet.has(funcKey)) {
                                    newSet.delete(funcKey)
                                  } else {
                                    newSet.add(funcKey)
                                  }
                                  return newSet
                                })
                              }}
                              aria-expanded={isInfoExpanded}
                            >
                              <div className="flex items-baseline gap-5">
                                <span className="text-xl font-bold text-foreground">{info.name}</span>
                                <span className="text-sm text-muted-foreground">
                                  {isInfoExpanded
                                    ? "Click to collapse"
                                    : `Expand this for more information on the types of features to look for in ${toTitleCase(info?.name || group.functionName)} tools`}
                                </span>
                              </div>
                              {isInfoExpanded ? (
                                <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                              )}
                            </button>
                            {isInfoExpanded && <div className="px-4 pb-4 text-sm text-foreground">{info.content}</div>}
                          </div>

                          {/* Tools in this group */}
                          <div className="space-y-1 mt-2">
                            {group.items.map((item) => {
                              const { tool, functionName, isRepeat, firstShownIn, isSeeAlso, reasons } = item
                              const repeatId = `${tool.id}-repeat` // Unique ID for repeated entries
                              const currentToolId = isSeeAlso ? `see-also-${tool.id}` : isRepeat ? repeatId : tool.id
                              const isExpanded = expandedToolIds.has(currentToolId)

                              return (
                                <Card
                                  key={currentToolId}
                                  ref={(el) => setCardRef(currentToolId, el)}
                                  className={`border-gray-400 transition-all px-4 py-1 border cursor-pointer ${
                                    !isExpanded ? "hover:border-primary/50" : ""
                                  } ${isSeeAlso ? "bg-orange-50 hover:bg-orange-100" : isRepeat ? "bg-gray-100" : ""}`}
                                  role="listitem"
                                  tabIndex={0}
                                  aria-expanded={isExpanded}
                                  onClick={() => {
                                    if (!isExpanded) {
                                      expandAndScrollToTool(currentToolId)
                                    } else {
                                      setExpandedToolIds((prev) => {
                                        const newSet = new Set(prev)
                                        newSet.delete(currentToolId)
                                        return newSet
                                      })
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault()
                                      const idToToggle = isSeeAlso ? tool.id : isRepeat ? repeatId : tool.id
                                      if (!isExpanded) {
                                        expandAndScrollToTool(idToToggle)
                                      } else {
                                        setExpandedToolIds((prev) => {
                                          const newSet = new Set(prev)
                                          newSet.delete(idToToggle)
                                          return newSet
                                        })
                                      }
                                    }
                                  }}
                                >
                                  {isExpanded ? (
                                    // Expanded view for all items (main, repeat, see-also)
                                    <div className="py-1">
                                      {/* Header - clickable to collapse */}
                                      <div
                                        className="flex items-start justify-between gap-4 cursor-pointer hover:bg-muted/50 p-1 rounded -m-1"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setExpandedToolIds((prev) => {
                                            const newSet = new Set(prev)
                                            newSet.delete(currentToolId)
                                            return newSet
                                          })
                                        }}
                                      >
                                        <div className="flex-1 min-w-0">
                                          <h3 className="text-xl font-bold text-foreground">{tool.name}</h3>
                                          <p className="text-base text-muted-foreground mt-1">{tool.company}</p>
                                          {isRepeat && (
                                            <p className="text-sm italic text-gray-600">
                                              Already shown in {firstShownIn}
                                            </p>
                                          )}
                                          {isSeeAlso && (
                                            <p className="text-sm italic text-orange-800">See Also - {functionName}</p>
                                          )}
                                        </div>
                                        <span className="text-primary text-sm font-medium flex items-center gap-1 whitespace-nowrap flex-shrink-0 mt-1">
                                          See Less <ChevronUp className="w-4 h-4" />
                                        </span>
                                      </div>

                                      <hr className="border-gray-300 my-3" />

                                      <h4 className="text-base font-semibold mb-1">Description</h4>
                                      <p className="text-base text-foreground leading-snug">{tool.description}</p>

                                      <hr className="border-gray-300 my-3" />

                                      {/* Videos */}
                                      {tool.youTubeVideos && tool.youTubeVideos.length > 0 && (
                                        <>
                                          <h4 className="text-base font-semibold mb-2">Videos</h4>
                                          <div className="flex flex-wrap gap-3">
                                            {/* First video - large */}
                                            <div className="w-full sm:w-[calc(50%-6px)] aspect-video rounded-lg overflow-hidden">
                                              <iframe
                                                src={tool.youTubeVideos[0].embedUrl}
                                                title={tool.youTubeVideos[0].title}
                                                className="w-full h-full"
                                                allowFullScreen
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                              />
                                            </div>
                                            {/* Additional videos - 1/4 size, arranged next to big video */}
                                            {tool.youTubeVideos.length > 1 && (
                                              <div className="flex flex-wrap gap-2 w-full sm:w-[calc(50%-6px)]">
                                                {tool.youTubeVideos.slice(1).map((video) => (
                                                  <div
                                                    key={video.id}
                                                    className="w-[calc(50%-4px)] aspect-video rounded-lg overflow-hidden"
                                                  >
                                                    <iframe
                                                      src={video.embedUrl}
                                                      title={video.title}
                                                      className="w-full h-full"
                                                      allowFullScreen
                                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    />
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                          <hr className="border-gray-300 my-3" />
                                        </>
                                      )}

                                      {/* CHANGE: Updated SEE ALSO expanded card badges to use 2-row grid on mobile */}
                                      <div className="grid grid-cols-2 md:flex md:flex-wrap gap-4 md:gap-8 mt-3">
                                        <div className="mt-0.5">
                                          <p className="text-xs font-semibold text-muted-foreground mb-1">
                                            HELPS WITH:
                                          </p>
                                          <div className="flex flex-wrap gap-1">
                                            {tool.functions &&
                                              tool.functions.map((func, idx) => (
                                                <span
                                                  key={idx}
                                                  className="px-2 py-0.5 text-xs rounded-full bg-purple-200 text-purple-900"
                                                >
                                                  {mapFunctionToLabel(func)}
                                                </span>
                                              ))}
                                          </div>
                                        </div>

                                        <div className="mt-0.5">
                                          <p className="text-xs font-semibold text-muted-foreground mb-1">DEVICES:</p>
                                          <div className="flex flex-wrap gap-1">
                                            {tool.supportedPlatforms &&
                                              tool.supportedPlatforms.map((platform, idx) => (
                                                <span
                                                  key={idx}
                                                  className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-900"
                                                >
                                                  {mapDeviceToLabel(platform)}
                                                </span>
                                              ))}
                                          </div>
                                        </div>

                                        <div className="mt-0.5">
                                          <p className="text-xs font-semibold text-muted-foreground mb-1">INSTALL?:</p>
                                          <div className="flex flex-wrap gap-1">
                                            {tool.installTypes &&
                                              tool.installTypes.map((install, idx) => (
                                                <span
                                                  key={idx}
                                                  className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-900"
                                                >
                                                  {mapInstallToLabel(install)}
                                                </span>
                                              ))}
                                          </div>
                                        </div>

                                        <div className="mt-0.5">
                                          <p className="text-xs font-semibold text-muted-foreground mb-1">PRICING:</p>
                                          <div className="flex flex-wrap gap-1">
                                            {tool.purchaseOptions &&
                                              tool.purchaseOptions.map((option, idx) => (
                                                <span
                                                  key={idx}
                                                  className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-900"
                                                >
                                                  {mapPurchaseToLabel(option)}
                                                </span>
                                              ))}
                                          </div>
                                        </div>
                                      </div>
                                      <hr className="my-2 border-gray-200" />

                                      <div className="flex justify-end mt-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="text-sm bg-transparent"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            window.open(tool.vendorProductPageUrl, "_blank")
                                          }}
                                        >
                                          <ExternalLink className="h-4 w-4 mr-2" />
                                          Visit Product Website
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    // Collapsed view
                                    <div className="px-3 py-0">
                                      {isRepeat && (
                                        // Simplified single-line format for already shown items
                                        <p className="py-1">
                                          <span className="text-base font-bold text-foreground">{tool.name}</span>
                                          <span className="text-muted-foreground font-normal"> · {tool.company}</span>
                                          <span className="text-gray-500 italic">
                                            {" "}
                                            (already shown in {firstShownIn})
                                          </span>
                                          {tool.functions &&
                                            getFilteredFunctions(tool.functions, filters.functions).map((func, idx) => {
                                              const label = mapFunctionToLabel(func)
                                              if (!label) return null
                                              return (
                                                <span
                                                  key={idx}
                                                  className="inline-flex items-center px-2 py-0.5 bg-purple-200 text-purple-900 rounded text-xs ml-1"
                                                >
                                                  {label}
                                                </span>
                                              )
                                            })}
                                          {tool.functions &&
                                            getMoreFunctionsCount(tool.functions, filters.functions) > 0 && (
                                              <span className="text-xs text-muted-foreground ml-1">
                                                +{getMoreFunctionsCount(tool.functions, filters.functions)}
                                              </span>
                                            )}
                                        </p>
                                      )}
                                      {!isRepeat && (
                                        <>
                                          <div className="flex items-center gap-4">
                                            <h3 className="text-base font-bold text-foreground">
                                              {tool.name}
                                              <span className="font-normal text-muted-foreground">
                                                {" "}
                                                · {tool.company}
                                              </span>
                                            </h3>
                                          </div>

                                          {/* Line 2: One line description */}
                                          <p className="text-sm text-foreground line-clamp-1">{tool.description}</p>

                                          {/* 1/8 inch whitespace */}
                                          <div className="h-1.5"></div>

                                          <div className="flex flex-col gap-2">
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1">
                                              {/* HELPS WITH - Purple badges */}
                                              <div className="mt-0.5">
                                                <span className="text-xs text-muted-foreground uppercase tracking-wide block mb-1">
                                                  Helps With:
                                                </span>
                                                <div className="flex flex-wrap gap-1">
                                                  {tool.functions &&
                                                    getFilteredFunctions(tool.functions, filters.functions).map(
                                                      (func, idx) => (
                                                        <span
                                                          key={idx}
                                                          className="inline-flex items-center px-2 py-0.5 bg-purple-200 text-purple-900 rounded text-xs"
                                                        >
                                                          {mapFunctionToLabel(func)}
                                                        </span>
                                                      ),
                                                    )}
                                                  {tool.functions &&
                                                    getMoreFunctionsCount(tool.functions, filters.functions) > 0 && (
                                                      <span className="text-xs text-muted-foreground ml-0.5">
                                                        +{getMoreFunctionsCount(tool.functions, filters.functions)}
                                                      </span>
                                                    )}
                                                </div>
                                              </div>

                                              <div className="mt-0.5">
                                                <span className="text-xs text-muted-foreground uppercase tracking-wide block mb-1">
                                                  Devices:
                                                </span>
                                                <div className="flex flex-wrap gap-1">
                                                  {tool.supportedPlatforms &&
                                                    getFilteredDevices(tool.supportedPlatforms, filters.devices).map(
                                                      (platform, idx) => (
                                                        <span
                                                          key={idx}
                                                          className="inline-flex items-center px-2 py-0.5 bg-blue-100 text-blue-900 rounded text-xs"
                                                        >
                                                          {mapDeviceToLabel(platform)}
                                                        </span>
                                                      ),
                                                    )}
                                                  {tool.supportedPlatforms &&
                                                    getMoreDevicesCount(tool.supportedPlatforms, filters.devices) >
                                                      0 && (
                                                      <span className="text-xs text-muted-foreground ml-0.5">
                                                        +{getMoreDevicesCount(tool.supportedPlatforms, filters.devices)}
                                                      </span>
                                                    )}
                                                </div>
                                              </div>

                                              {/* INSTALL? - Buff/Yellow badges */}
                                              <div className="mt-0.5">
                                                <span className="text-xs text-muted-foreground uppercase tracking-wide block mb-1">
                                                  Install?:
                                                </span>
                                                <div className="flex flex-wrap gap-1">
                                                  {tool.installTypes &&
                                                    getFilteredInstallTypes(
                                                      tool.installTypes,
                                                      filters.installTypes,
                                                    ).map((install, idx) => (
                                                      <span
                                                        key={idx}
                                                        className="inline-flex items-center px-2 py-0.5 bg-amber-100 text-amber-900 rounded text-xs"
                                                      >
                                                        {mapInstallToLabel(install)}
                                                      </span>
                                                    ))}
                                                  {tool.installTypes &&
                                                    getMoreInstallTypesCount(tool.installTypes, filters.installTypes) >
                                                      0 && (
                                                      <span className="text-xs text-muted-foreground ml-0.5">
                                                        +
                                                        {getMoreInstallTypesCount(
                                                          tool.installTypes,
                                                          filters.installTypes,
                                                        )}
                                                      </span>
                                                    )}
                                                </div>
                                              </div>

                                              <div>
                                                <span className="text-xs text-muted-foreground uppercase tracking-wide block mb-1">
                                                  Pricing:
                                                </span>
                                                <div className="flex flex-wrap gap-1">
                                                  {tool.purchaseOptions &&
                                                    getFilteredPurchaseOptions(
                                                      tool.purchaseOptions,
                                                      filters.purchaseOptions,
                                                    ).map((option, idx) => (
                                                      <span
                                                        key={idx}
                                                        className="inline-flex items-center px-2 py-0.5 bg-green-100 text-green-900 rounded text-xs"
                                                      >
                                                        {mapPurchaseToLabel(option)}
                                                      </span>
                                                    ))}
                                                  {tool.purchaseOptions &&
                                                    getMorePurchaseOptionsCount(
                                                      tool.purchaseOptions,
                                                      filters.purchaseOptions,
                                                    ) > 0 && (
                                                      <span className="text-xs text-muted-foreground ml-0.5">
                                                        +
                                                        {getMorePurchaseOptionsCount(
                                                          tool.purchaseOptions,
                                                          filters.purchaseOptions,
                                                        )}
                                                      </span>
                                                    )}
                                                </div>
                                              </div>
                                            </div>
                                            <div className="flex justify-end">
                                              <button
                                                className="text-primary text-sm font-medium flex items-center gap-1 whitespace-nowrap"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  expandAndScrollToTool(currentToolId)
                                                }}
                                              >
                                                See More <ChevronDown className="h-4 w-4" />
                                              </button>
                                            </div>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </Card>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}

                    {/* SEE ALSO GROUPS */}
                    {seeAlsoGroups.length > 0 && (
                      <>
                        <div className="mt-8 pt-3">
                          <Card
                            className={`border-2 border-purple-400 bg-purple-50 cursor-pointer transition-all ${
                              seeAlsoInfoExpanded ? "" : "hover:bg-purple-100"
                            }`}
                            onClick={() => setSeeAlsoInfoExpanded(!seeAlsoInfoExpanded)}
                          >
                            <div className="px-4 py-0.5">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="text-base font-bold text-purple-900">
                                    ITEMS IN THE FOLLOWING GROUPS MAY ALSO BE HELPFUL BASED ON YOUR SELECTIONS
                                  </span>
                                </div>
                                {seeAlsoInfoExpanded ? (
                                  <ChevronUp className="h-4 w-4 text-purple-700" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-purple-700" />
                                )}
                              </div>
                              {seeAlsoInfoExpanded && (
                                <div className="mt-2 text-sm text-purple-900">
                                  <p>
                                    Sometimes items in categories you did not select may be helpful for problems that
                                    you did select. Shown below are categories that might have items that are also of
                                    interest to you. At the start of each group is a header that describes why that
                                    group was listed. You can then decide if you want to expand that group and look at
                                    the products in that group.
                                  </p>
                                </div>
                              )}
                            </div>
                          </Card>
                        </div>

                        {/* SEE ALSO function groups */}
                        {seeAlsoGroups.map((seeAlsoGroup, seeAlsoGroupIndex) => {
                          const seeAlsoFuncKey = normalizeFilterValue(seeAlsoGroup.functionName)
                            .toLowerCase()
                            .replace(/\s+/g, "")
                          const isSeeAlsoGroupExpanded = expandedSeeAlsoGroupIds.has(seeAlsoFuncKey)
                          const displayName = toTitleCase(removeParentheses(seeAlsoGroup.functionName))

                          const seeAlsoFunctionKeys = seeAlsoGroups.map((g) =>
                            normalizeFilterToFunctionKey(g.functionName),
                          )

                          return (
                            <div key={`see-also-${seeAlsoFuncKey}`}>
                              <div
                                className={`bg-purple-50 border-2 border-purple-400 rounded-lg overflow-hidden ${seeAlsoGroupIndex > 0 ? "mt-6" : "mt-6"}`}
                              >
                                <button
                                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-purple-100 transition-colors"
                                  onClick={() =>
                                    setExpandedSeeAlsoGroupIds((prev) => {
                                      const newSet = new Set(prev)
                                      if (newSet.has(seeAlsoFuncKey)) {
                                        newSet.delete(seeAlsoFuncKey)
                                      } else {
                                        newSet.add(seeAlsoFuncKey)
                                      }
                                      return newSet
                                    })
                                  }
                                  aria-expanded={isSeeAlsoGroupExpanded}
                                >
                                  <div className="flex items-baseline gap-5">
                                    <span className="text-xl font-bold text-purple-900">
                                      {displayName.toUpperCase()}
                                    </span>
                                    <span className="text-sm text-purple-700">
                                      {isSeeAlsoGroupExpanded
                                        ? "Click to collapse"
                                        : "tools may also be helpful given your choices. Expand for details."}
                                    </span>
                                  </div>
                                  {isSeeAlsoGroupExpanded ? (
                                    <ChevronUp className="w-5 h-5 text-purple-700 flex-shrink-0" />
                                  ) : (
                                    <ChevronDown className="w-5 h-5 text-purple-700 flex-shrink-0" />
                                  )}
                                </button>
                                {isSeeAlsoGroupExpanded && (
                                  <div className="px-4 pb-4 text-sm text-purple-900">
                                    <p className="mb-2">
                                      These {displayName} items are shown because they may be of interest for the
                                      following reason(s) based on the functions you chose:
                                    </p>
                                    <ul className="list-disc pl-5 space-y-1">
                                      {seeAlsoGroup.reasons.map((reason, idx) => (
                                        <li key={idx}>{reason}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                              {isSeeAlsoGroupExpanded && (
                                <div className="space-y-1 mt-2">
                                  {seeAlsoGroup.items.map(
                                    ({ tool, functionName, isRepeat, firstShownIn, isSeeAlso, reasons }) => {
                                      const currentToolId = `see-also-${tool.id}`
                                      const isExpanded = expandedToolIds.has(currentToolId)

                                      const seeAlsoMatchingFunctions = tool.functions.filter((func) => {
                                        const normalizedFunc = normalizeFilterToFunctionKey(func)
                                        return seeAlsoFunctionKeys.includes(normalizedFunc)
                                      })
                                      const otherFunctionsCount =
                                        tool.functions.length - seeAlsoMatchingFunctions.length

                                      return (
                                        <Card
                                          key={currentToolId}
                                          ref={(el) => setCardRef(currentToolId, el)}
                                          className={`border-gray-400 bg-background transition-all px-4 py-2 border ${!isExpanded ? "cursor-pointer hover:border-primary/50" : ""}`}
                                          role="listitem"
                                          tabIndex={0}
                                          aria-expanded={isExpanded}
                                          onClick={() => {
                                            if (!isExpanded) {
                                              expandAndScrollToTool(currentToolId)
                                            } else {
                                              setExpandedToolIds((prev) => {
                                                const newSet = new Set(prev)
                                                newSet.delete(currentToolId)
                                                return newSet
                                              })
                                            }
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                              e.preventDefault()
                                              if (!isExpanded) {
                                                expandAndScrollToTool(currentToolId)
                                              } else {
                                                setExpandedToolIds((prev) => {
                                                  const newSet = new Set(prev)
                                                  newSet.delete(currentToolId)
                                                  return newSet
                                                })
                                              }
                                            }
                                          }}
                                        >
                                          {isExpanded ? (
                                            /* Expanded view */
                                            <div>
                                              <div
                                                className="flex items-start justify-between gap-3 cursor-pointer"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  setExpandedToolIds((prev) => {
                                                    const newSet = new Set(prev)
                                                    newSet.delete(currentToolId)
                                                    return newSet
                                                  })
                                                }}
                                              >
                                                <h3 className="text-lg font-bold text-foreground">
                                                  {tool.name}{" "}
                                                  <span className="text-muted-foreground font-normal text-base">
                                                    · {tool.company}
                                                  </span>
                                                </h3>
                                                <span className="text-primary text-sm flex items-center gap-1 shrink-0">
                                                  See Less <ChevronUp className="h-4 w-4" />
                                                </span>
                                              </div>
                                              <hr className="my-2 border-gray-200" />

                                              <div className="mb-3">
                                                <h4 className="text-base font-semibold mb-1">Description</h4>
                                                <p className="foreground leading-snug">{tool.description}</p>
                                              </div>
                                              <hr className="my-2 border-gray-200" />

                                              {tool.youTubeVideos && tool.youTubeVideos.length > 0 && (
                                                <>
                                                  <div className="mb-3">
                                                    <h4 className="text-base font-semibold mb-2">Videos</h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                      {tool.youTubeVideos.slice(0, 2).map((video) => (
                                                        <div
                                                          key={video.id}
                                                          className="aspect-video rounded-lg overflow-hidden"
                                                        >
                                                          <iframe
                                                            src={video.embedUrl}
                                                            title={video.title}
                                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                            allowFullScreen
                                                            className="w-full h-full"
                                                          />
                                                        </div>
                                                      ))}
                                                    </div>
                                                  </div>
                                                  <hr className="my-2 border-gray-200" />
                                                </>
                                              )}

                                              {/* Categories section - left: Helps With & Devices, right: Install & Pricing */}
                                              <div className="flex flex-wrap gap-8 mt-3">
                                                <div className="flex gap-8">
                                                  <div className="mt-0.5">
                                                    <p className="text-xs font-semibold text-muted-foreground mb-1">
                                                      HELPS WITH:
                                                    </p>
                                                    <div className="flex flex-wrap gap-1">
                                                      {seeAlsoMatchingFunctions.map((func, idx) => (
                                                        <span
                                                          key={idx}
                                                          className="px-2 py-0.5 text-xs rounded-full bg-purple-200 text-purple-900"
                                                        >
                                                          {mapFunctionToLabel(func)}
                                                        </span>
                                                      ))}
                                                      {otherFunctionsCount > 0 && (
                                                        <span className="text-xs text-muted-foreground ml-0.5">
                                                          +{otherFunctionsCount}
                                                        </span>
                                                      )}
                                                    </div>
                                                  </div>

                                                  <div className="mt-0.5">
                                                    <p className="text-xs font-semibold text-muted-foreground mb-1">
                                                      DEVICES:
                                                    </p>
                                                    <div className="flex flex-wrap gap-1">
                                                      {tool.supportedPlatforms.map((platform, idx) => (
                                                        <span
                                                          key={idx}
                                                          className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-900"
                                                        >
                                                          {mapDeviceToLabel(platform)}
                                                        </span>
                                                      ))}
                                                    </div>
                                                  </div>
                                                </div>

                                                <div className="flex gap-8">
                                                  <div className="mt-0.5">
                                                    <p className="text-xs font-semibold text-muted-foreground mb-1">
                                                      INSTALL?:
                                                    </p>
                                                    <div className="flex flex-wrap gap-1">
                                                      {tool.installTypes.map((type, idx) => (
                                                        <span
                                                          key={idx}
                                                          className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-900"
                                                        >
                                                          {mapInstallToLabel(type)}
                                                        </span>
                                                      ))}
                                                    </div>
                                                  </div>

                                                  <div className="mt-0.5">
                                                    <p className="text-xs font-semibold text-muted-foreground mb-1">
                                                      PRICING:
                                                    </p>
                                                    <div className="flex flex-wrap gap-1">
                                                      {tool.purchaseOptions.map((option, idx) => (
                                                        <span
                                                          key={idx}
                                                          className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-900"
                                                        >
                                                          {mapPurchaseToLabel(option)}
                                                        </span>
                                                      ))}
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                              <hr className="my-2 border-gray-200" />

                                              <div className="flex justify-end mt-2">
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  className="text-sm bg-transparent"
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    window.open(tool.vendorProductPageUrl, "_blank")
                                                  }}
                                                >
                                                  <ExternalLink className="h-4 w-4 mr-2" />
                                                  Visit Product Website
                                                </Button>
                                              </div>
                                            </div>
                                          ) : (
                                            /* Collapsed view */
                                            <div>
                                              <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                  <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="text-base font-bold text-foreground">{tool.name}</h3>
                                                    <span className="text-muted-foreground text-sm">
                                                      · {tool.company}
                                                    </span>
                                                  </div>
                                                </div>
                                                <span className="text-primary text-sm flex items-center gap-1 whitespace-nowrap flex-shrink-0 self-end">
                                                  See More <ChevronDown className="h-4 w-4" />
                                                </span>
                                              </div>
                                              <div className="h-px"></div>
                                              <p className="text-foreground text-sm line-clamp-1">{tool.description}</p>
                                              <div className="h-1.5"></div>
                                              <div className="flex flex-wrap items-end justify-between gap-2">
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 flex-1">
                                                  <div className="mt-0.5">
                                                    <p className="text-xs font-semibold text-muted-foreground mb-0.5">
                                                      HELPS WITH:
                                                    </p>
                                                    <div className="flex flex-wrap gap-1 items-center">
                                                      {seeAlsoMatchingFunctions.map((func, idx) => (
                                                        <span
                                                          key={idx}
                                                          className="px-2 py-0.5 text-xs rounded-full bg-purple-200 text-purple-900"
                                                        >
                                                          {mapFunctionToLabel(func)}
                                                        </span>
                                                      ))}
                                                      {otherFunctionsCount > 0 && (
                                                        <span className="text-xs text-muted-foreground ml-0.5">
                                                          +{otherFunctionsCount}
                                                        </span>
                                                      )}
                                                    </div>
                                                  </div>

                                                  <div className="mt-0.5">
                                                    <p className="text-xs font-semibold text-muted-foreground mb-0.5">
                                                      DEVICES:
                                                    </p>
                                                    <div className="flex flex-wrap gap-1 items-center">
                                                      {tool.supportedPlatforms.map((platform, idx) => (
                                                        <span
                                                          key={idx}
                                                          className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-900"
                                                        >
                                                          {mapDeviceToLabel(platform)}
                                                        </span>
                                                      ))}
                                                    </div>
                                                  </div>

                                                  <div className="mt-0.5">
                                                    <p className="text-xs font-semibold text-muted-foreground mb-0.5">
                                                      INSTALL?:
                                                    </p>
                                                    <div className="flex flex-wrap gap-1 items-center">
                                                      {tool.installTypes.map((type, idx) => (
                                                        <span
                                                          key={idx}
                                                          className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-900"
                                                        >
                                                          {mapInstallToLabel(type)}
                                                        </span>
                                                      ))}
                                                    </div>
                                                  </div>

                                                  <div className="mt-0.5">
                                                    <p className="text-xs font-semibold text-muted-foreground mb-0.5">
                                                      PRICING:
                                                    </p>
                                                    <div className="flex flex-wrap gap-1 items-center">
                                                      {tool.purchaseOptions.map((option, idx) => (
                                                        <span
                                                          key={idx}
                                                          className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-900"
                                                        >
                                                          {mapPurchaseToLabel(option)}
                                                        </span>
                                                      ))}
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        </Card>
                                      )
                                    },
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </>
                    )}
                  </div>
                ) : (
                  // Original ungrouped view when no function filters selected
                  <div className="space-y-1" role="list" aria-label="Tools list">
                    {paginatedDisplayList.map((item) => {
                      // Use paginatedDisplayList here
                      const { tool, functionName, isRepeat, firstShownIn, isSeeAlso, reasons } = item
                      // For ungrouped view, we still need unique IDs for expansion state.
                      // Use tool.id for main items, and a generated ID for repeated items.
                      // See Also items should also have unique IDs.
                      const currentToolId = isSeeAlso ? `see-also-${tool.id}` : isRepeat ? `${tool.id}-repeat` : tool.id
                      const isExpanded = expandedToolIds.has(currentToolId)

                      return (
                        <Card
                          key={isSeeAlso ? `see-also-${tool.id}` : currentToolId}
                          ref={(el) => setCardRef(currentToolId, el)}
                          className={`border-gray-400 bg-background transition-all px-4 py-2 border ${!isExpanded ? "cursor-pointer hover:border-primary/50" : ""}`}
                          role="listitem"
                          tabIndex={0}
                          aria-expanded={isExpanded}
                          onClick={() => {
                            if (!isExpanded) {
                              expandAndScrollToTool(currentToolId)
                            } else {
                              setExpandedToolIds((prev) => {
                                const newSet = new Set(prev)
                                newSet.delete(currentToolId)
                                return newSet
                              })
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              if (!isExpanded) {
                                expandAndScrollToTool(currentToolId)
                              } else {
                                setExpandedToolIds((prev) => {
                                  const newSet = new Set(prev)
                                  newSet.delete(currentToolId)
                                  return newSet
                                })
                              }
                            }
                          }}
                        >
                          {isExpanded ? (
                            // Expanded view - spacious like v99
                            <div className="py-1">
                              {/* Header - clickable to collapse */}
                              <div
                                className="flex items-start justify-between gap-4 cursor-pointer hover:bg-muted/50 p-1 rounded -m-1"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setExpandedToolIds((prev) => {
                                    const newSet = new Set(prev)
                                    newSet.delete(currentToolId)
                                    return newSet
                                  })
                                }}
                              >
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-xl font-bold text-foreground">{tool.name}</h3>
                                  <p className="text-base text-muted-foreground mt-1">{tool.company}</p>
                                  {isRepeat && (
                                    <p className="text-sm italic text-gray-600">Already shown in {firstShownIn}</p>
                                  )}
                                  {isSeeAlso && (
                                    <p className="text-sm italic text-orange-800">See Also - {functionName}</p>
                                  )}
                                </div>
                                <span className="text-primary text-sm font-medium flex items-center gap-1 whitespace-nowrap flex-shrink-0 mt-1">
                                  See Less <ChevronUp className="w-4 h-4" />
                                </span>
                              </div>

                              <hr className="border-gray-300 my-3" />

                              <h4 className="text-base font-semibold mb-1">Description</h4>
                              <p className="text-base text-foreground leading-snug">{tool.description}</p>

                              <hr className="border-gray-300 my-3" />

                              {/* Videos */}
                              {tool.youTubeVideos && tool.youTubeVideos.length > 0 && (
                                <>
                                  <h4 className="text-base font-semibold mb-2">Videos</h4>
                                  <div className="flex flex-wrap gap-3">
                                    {/* First video - large */}
                                    <div className="w-full sm:w-[calc(50%-6px)] aspect-video rounded-lg overflow-hidden">
                                      <iframe
                                        src={tool.youTubeVideos[0].embedUrl}
                                        title={tool.youTubeVideos[0].title}
                                        className="w-full h-full"
                                        allowFullScreen
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                      />
                                    </div>
                                    {/* Additional videos - 1/4 size, arranged next to big video */}
                                    {tool.youTubeVideos.length > 1 && (
                                      <div className="flex flex-wrap gap-2 w-full sm:w-[calc(50%-6px)]">
                                        {tool.youTubeVideos.slice(1).map((video) => (
                                          <div
                                            key={video.id}
                                            className="w-[calc(50%-4px)] aspect-video rounded-lg overflow-hidden"
                                          >
                                            <iframe
                                              src={video.embedUrl}
                                              title={video.title}
                                              className="w-full h-full"
                                              allowFullScreen
                                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            />
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <hr className="border-gray-300 my-3" />
                                </>
                              )}

                              <div className="flex justify-between gap-6 mb-3">
                                {/* Left side - Helps With and Devices */}
                                <div className="flex gap-6">
                                  {/* HELPS WITH - Purple badges - horizontal */}
                                  <div>
                                    <span className="text-xs text-muted-foreground uppercase tracking-wide block mb-1">
                                      Helps With:
                                    </span>
                                    <div className="flex flex-wrap gap-1">
                                      {tool.functions &&
                                        tool.functions.map((func, idx) => (
                                          <span
                                            key={idx}
                                            className="inline-flex items-center px-2 py-0.5 bg-purple-200 text-purple-900 rounded text-xs"
                                          >
                                            {mapFunctionToLabel(func)}
                                          </span>
                                        ))}
                                    </div>
                                  </div>

                                  {/*DEVICES - Blue badges - horizontal */}
                                  <div>
                                    <span className="text-xs text-muted-foreground uppercase tracking-wide block mb-1">
                                      Devices:
                                    </span>
                                    <div className="flex flex-wrap gap-1">
                                      {tool.supportedPlatforms &&
                                        tool.supportedPlatforms.map((platform, idx) => (
                                          <span
                                            key={idx}
                                            className="inline-flex items-center px-2 py-0.5 bg-blue-100 text-blue-900 rounded text-xs"
                                          >
                                            {mapDeviceToLabel(platform)}
                                          </span>
                                        ))}
                                    </div>
                                  </div>
                                </div>

                                {/* Right side - Install? and Pricing */}
                                <div className="flex gap-6">
                                  {/* INSTALL? - Buff/Yellow badges - horizontal */}
                                  <div>
                                    <span className="text-xs text-muted-foreground uppercase tracking-wide block mb-1">
                                      Install?:
                                    </span>
                                    <div className="flex flex-wrap gap-1">
                                      {tool.installTypes &&
                                        tool.installTypes.map((install, idx) => (
                                          <span
                                            key={idx}
                                            className="inline-flex items-center px-2 py-0.5 bg-amber-100 text-amber-900 rounded text-xs"
                                          >
                                            {mapInstallToLabel(install)}
                                          </span>
                                        ))}
                                    </div>
                                  </div>

                                  {/* PRICING - Green badges - horizontal */}
                                  <div>
                                    <span className="text-xs text-muted-foreground uppercase tracking-wide block mb-1">
                                      Pricing:
                                    </span>
                                    <div className="flex flex-wrap gap-1">
                                      {tool.purchaseOptions &&
                                        tool.purchaseOptions.map((option, idx) => (
                                          <span
                                            key={idx}
                                            className="inline-flex items-center px-2 py-0.5 bg-green-100 text-green-900 rounded text-xs"
                                          >
                                            {mapPurchaseToLabel(option)}
                                          </span>
                                        ))}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <hr className="border-gray-300 my-3" />

                              <div className="flex justify-end">
                                <Button
                                  size="default"
                                  className="text-sm px-4 py-2"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    window.open(tool.vendorProductPageUrl, "_blank")
                                  }}
                                >
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  Visit Product Website
                                </Button>
                              </div>
                            </div>
                          ) : (
                            // Collapsed view
                            <div className="px-3 py-0">
                              {isRepeat && (
                                // Simplified single-line format for already shown items
                                <p className="py-1">
                                  <span className="text-base font-bold text-foreground">{tool.name}</span>
                                  <span className="text-muted-foreground font-normal"> · {tool.company}</span>
                                  <span className="text-gray-500 italic"> (already shown in {firstShownIn})</span>
                                  {tool.functions &&
                                    getFilteredFunctions(tool.functions, filters.functions).map((func, idx) => {
                                      const label = mapFunctionToLabel(func)
                                      if (!label) return null
                                      return (
                                        <span
                                          key={idx}
                                          className="inline-flex items-center px-2 py-0.5 bg-purple-200 text-purple-900 rounded text-xs ml-1"
                                        >
                                          {label}
                                        </span>
                                      )
                                    })}
                                  {tool.functions && getMoreFunctionsCount(tool.functions, filters.functions) > 0 && (
                                    <span className="text-xs text-muted-foreground ml-1">
                                      +{getMoreFunctionsCount(tool.functions, filters.functions)}
                                    </span>
                                  )}
                                </p>
                              )}
                              {!isRepeat && (
                                <>
                                  <div className="flex items-center gap-4">
                                    <h3 className="text-base font-bold text-foreground">
                                      {tool.name}
                                      <span className="font-normal text-muted-foreground"> · {tool.company}</span>
                                    </h3>
                                  </div>

                                  {/* Line 2: One line description */}
                                  <p className="text-sm text-foreground line-clamp-1">{tool.description}</p>

                                  {/* 1/8 inch whitespace */}
                                  <div className="h-1.5"></div>

                                  <div className="flex items-end justify-between gap-3">
                                    <div className="grid grid-cols-4 gap-3 flex-1">
                                      {/* HELPS WITH - Purple badges */}
                                      <div className="mt-0.5">
                                        <span className="text-xs text-muted-foreground uppercase tracking-wide block mb-1">
                                          Helps With:
                                        </span>
                                        <div className="flex flex-wrap gap-1">
                                          {tool.functions &&
                                            getFilteredFunctions(tool.functions, filters.functions).map((func, idx) => (
                                              <span
                                                key={idx}
                                                className="inline-flex items-center px-2 py-0.5 bg-purple-200 text-purple-900 rounded text-xs"
                                              >
                                                {mapFunctionToLabel(func)}
                                              </span>
                                            ))}
                                          {tool.functions &&
                                            getMoreFunctionsCount(tool.functions, filters.functions) > 0 && (
                                              <span className="text-xs text-muted-foreground ml-0.5">
                                                +{getMoreFunctionsCount(tool.functions, filters.functions)}
                                              </span>
                                            )}
                                        </div>
                                      </div>

                                      <div className="mt-0.5">
                                        <span className="text-xs text-muted-foreground uppercase tracking-wide block mb-1">
                                          Devices:
                                        </span>
                                        <div className="flex flex-wrap gap-1">
                                          {tool.supportedPlatforms &&
                                            getFilteredDevices(tool.supportedPlatforms, filters.devices).map(
                                              (platform, idx) => (
                                                <span
                                                  key={idx}
                                                  className="inline-flex items-center px-2 py-0.5 bg-blue-100 text-blue-900 rounded text-xs"
                                                >
                                                  {mapDeviceToLabel(platform)}
                                                </span>
                                              ),
                                            )}
                                          {tool.supportedPlatforms &&
                                            getMoreDevicesCount(tool.supportedPlatforms, filters.devices) > 0 && (
                                              <span className="text-xs text-muted-foreground ml-0.5">
                                                +{getMoreDevicesCount(tool.supportedPlatforms, filters.devices)}
                                              </span>
                                            )}
                                        </div>
                                      </div>

                                      {/* INSTALL? - Buff/Yellow badges */}
                                      <div className="mt-0.5">
                                        <span className="text-xs text-muted-foreground uppercase tracking-wide block mb-1">
                                          Install?:
                                        </span>
                                        <div className="flex flex-wrap gap-1">
                                          {tool.installTypes &&
                                            getFilteredInstallTypes(tool.installTypes, filters.installTypes).map(
                                              (install, idx) => (
                                                <span
                                                  key={idx}
                                                  className="inline-flex items-center px-2 py-0.5 bg-amber-100 text-amber-900 rounded text-xs"
                                                >
                                                  {mapInstallToLabel(install)}
                                                </span>
                                              ),
                                            )}
                                          {tool.installTypes &&
                                            getMoreInstallTypesCount(tool.installTypes, filters.installTypes) > 0 && (
                                              <span className="text-xs text-muted-foreground ml-0.5">
                                                +{getMoreInstallTypesCount(tool.installTypes, filters.installTypes)}
                                              </span>
                                            )}
                                        </div>
                                      </div>

                                      <div>
                                        <span className="text-xs text-muted-foreground uppercase tracking-wide block mb-1">
                                          Pricing:
                                        </span>
                                        <div className="flex flex-wrap gap-1">
                                          {tool.purchaseOptions &&
                                            getFilteredPurchaseOptions(
                                              tool.purchaseOptions,
                                              filters.purchaseOptions,
                                            ).map((option, idx) => (
                                              <span
                                                key={idx}
                                                className="inline-flex items-center px-2 py-0.5 bg-green-100 text-green-900 rounded text-xs"
                                              >
                                                {mapPurchaseToLabel(option)}
                                              </span>
                                            ))}
                                          {tool.purchaseOptions &&
                                            getMorePurchaseOptionsCount(tool.purchaseOptions, filters.purchaseOptions) >
                                              0 && (
                                              <span className="text-xs text-muted-foreground ml-0.5">
                                                +
                                                {getMorePurchaseOptionsCount(
                                                  tool.purchaseOptions,
                                                  filters.purchaseOptions,
                                                )}
                                              </span>
                                            )}
                                        </div>
                                      </div>
                                    </div>
                                    <button
                                      className="text-primary text-sm font-medium flex items-center gap-1 whitespace-nowrap flex-shrink-0 self-end"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        expandAndScrollToTool(currentToolId)
                                      }}
                                    >
                                      See More
                                      <ChevronDown className="w-4 h-4" />
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </Card>
                      )
                    })}
                  </div>
                )}
              </>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <nav className="flex flex-wrap items-center justify-center gap-2 mt-6" aria-label="Pagination">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                    window.scrollTo(0, 0)
                  }}
                  disabled={currentPage === 1}
                  className="border-gray-400"
                >
                  Previous
                </Button>
                <div className="flex flex-wrap items-center justify-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setCurrentPage(page)
                        window.scrollTo(0, 0)
                      }}
                      className={currentPage === page ? "" : "border-gray-400"}
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    window.scrollTo(0, 0)
                  }}
                  disabled={currentPage === totalPages}
                  className="border-gray-400"
                >
                  Next
                </Button>
                {/* Show All button does NOT scroll to top */}
                <Button variant="outline" size="sm" onClick={handleShowAll} className="border-gray-400 bg-transparent">
                  Show All
                </Button>
              </nav>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

export default function BrowseAllToolsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-muted/50">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <BrowseAllToolsContent />
    </Suspense>
  )
}
