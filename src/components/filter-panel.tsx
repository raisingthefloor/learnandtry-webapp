"use client"

import type React from "react"

import { ChevronUp, ChevronDown, HelpCircle, X } from "lucide-react"
import { useState, useEffect, useRef } from "react"

interface FilterState {
  functions: string[]
  devices: string[]
  installTypes: string[]
  purchaseOptions: string[]
}

interface FilterPanelProps {
  isOpen: boolean
  onToggle?: () => void
  onClose?: () => void
  filters: FilterState
  onFilterChange: (category: keyof FilterState, value: string, checked: boolean) => void
  onClearAll: () => void
  hasActiveFilters: boolean
}

const categoryDescriptions: Record<string, string> = {
  Functions: "Select all functions where the person needs assistance.",
  Devices: "Which devices they use at home or school/work.",
  "Need to Install?":
    "You can choose to see only solutions that do not require you to install anything, – or solutions (including browser extensions) that need to be installed on computer. (If you don't check anything, you will see all types.)",
  "Purchase Option":
    "You can choose to only see solutions that meet your cost constraints (If you don't check anything, you will see all options).",
}

const filterDescriptions: Record<string, string> = {
  // Functions
  Reading:
    "Tools to help individuals with reading disabilities (e.g. dyslexia, low vision or anyone who struggles to read standard text).",
  Writing: "Tools to help individuals who have trouble writing, or writing clearly and correctly for any reason.",
  "Focus/Planning/Exec": "Tools to help reduce distractions, stay organized, plan, and manage time.",
  Cognitive: "Tools to help with memory, understanding and processing.",
  Vision: "Tools to help see more clearly, as well as alternatives to sight.",
  "Braille Tools": "Tools for braille users.",
  Hearing: "Tools for hard-of-hearing or deaf individuals.",
  Physical: "Tools for those who have trouble with standard keyboards, mice – and includes dictation/speech to text.",
  "Speech/Communication": "Tools for those with unclear or no speech.",
  // Devices - all use the same text
  "PC (Windows)": "See each product description to see which versions of Windows each product will work with.",
  Macintosh: "See each product description to see which versions of macOS each product will work with.",
  Chromebook:
    "Products work with Chromebooks that support latest version of ChromeOS and may work with older Chromebooks as well.",
  iPad: "Products work with iPads that support latest version of iOS and may work with older iPads as well.",
  iPhone: "Products work with iPhones that support latest version of iOS and may work with older iPhones as well.",
  Android: "See each product description to see which versions of Android each product will work with.",
  // Install types
  "Built-in (no install)": "Show solutions that are already part of the computer or browser.",
  "Web-Based (no install)":
    "Show solutions that are fully on the Web and work without installing any software or browser extension on the computer.",
  "Needs to be installed":
    "Show solutions that need to be installed – including browser extensions that need to be installed.",
  // Purchase options
  Free: "Show products that are completely free (including products that have both free and paid versions).",
  "Free Trial": "Show product that have free trial – before you buy.",
  "Lifetime License": "Show products that you pay for once and you can use it as long as it works.",
  Subscription: "Show products that you need to pay for each month or year (and it stops when you stop paying).",
}

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [isHovered, setIsHovered] = useState(false)
  const [isClicked, setIsClicked] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0, rightAlign: false })
  const tooltipRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLSpanElement>(null)

  const isVisible = isHovered || isClicked

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const rightAlign = rect.right + 230 > viewportWidth
      setPosition({
        top: rect.top,
        left: rightAlign ? rect.left - 8 : rect.right + 8,
        rightAlign,
      })
    }
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    updatePosition()
    setIsClicked(!isClicked)
  }

  useEffect(() => {
    if (!isVisible) return

    const handleScroll = () => {
      updatePosition()
    }

    window.addEventListener("scroll", handleScroll, true)
    return () => window.removeEventListener("scroll", handleScroll, true)
  }, [isVisible])

  useEffect(() => {
    if (!isClicked) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsClicked(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isClicked])

  return (
    <div ref={tooltipRef} className="relative inline-flex items-center shrink-0">
      <span
        ref={triggerRef}
        onMouseEnter={() => {
          updatePosition()
          setIsHovered(true)
        }}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
        onFocus={() => {
          updatePosition()
          setIsHovered(true)
        }}
        onBlur={() => setIsHovered(false)}
        tabIndex={0}
        role="button"
        aria-label="More information"
        className="inline-flex"
      >
        {children}
      </span>
      {isVisible && (
        <span
          className="fixed max-w-[calc(100vw-2rem)] w-56 p-2 pr-6 text-xs bg-foreground text-background rounded-md shadow-lg font-bold"
          style={{
            top: position.top,
            left: position.rightAlign ? "auto" : position.left,
            right: position.rightAlign ? `calc(100vw - ${position.left}px)` : "auto",
            transform: position.rightAlign ? "translate(0, -100%)" : "translateY(-100%)",
            zIndex: 99999,
          }}
        >
          {isClicked && (
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsClicked(false)
              }}
              className="absolute top-1 right-1 p-0.5 hover:bg-background/20 rounded"
              aria-label="Close tooltip"
            >
              <X className="w-3 h-3 font-bold" strokeWidth={3} />
            </button>
          )}
          {text}
        </span>
      )}
    </div>
  )
}

export function FilterPanel({
  isOpen,
  onToggle,
  onClose,
  filters,
  onFilterChange,
  onClearAll,
  hasActiveFilters,
}: FilterPanelProps) {
  const activeFilterCount = Object.values(filters).flat().length

  const handleToggle = () => {
    if (onToggle) {
      onToggle()
    } else if (onClose) {
      onClose()
    }
  }

  return (
    <aside className="bg-background border border-border rounded-lg overflow-hidden" aria-label="Filter tools">
      <button
        onClick={handleToggle}
        className="w-full p-4 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors"
        aria-expanded={isOpen}
        aria-controls="filter-content"
      >
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-foreground">Filters</h2>
          {hasActiveFilters && <span className="text-sm text-primary font-medium">({activeFilterCount} active)</span>}
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      <div
        id="filter-content"
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        {hasActiveFilters && (
          <div className="px-4 py-2 border-t border-border bg-muted/20">
            <button
              onClick={onClearAll}
              className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              aria-label="Clear all active filters"
            >
              Clear all filters
            </button>
          </div>
        )}

        <div className="p-4 border-t border-border">
          {/* Functions */}
          <fieldset className="mb-6">
            <legend className="text-base font-bold text-foreground mb-1 flex items-center gap-2">
              Functions
              <Tooltip text={categoryDescriptions["Functions"]}>
                <HelpCircle className="w-4 h-4 text-muted-foreground hover:text-primary shrink-0" />
              </Tooltip>
            </legend>
            <p className="text-xs text-muted-foreground mb-3">What does a person need help with?</p>
            <div className="space-y-2">
              {[
                "Reading",
                "Writing",
                "Focus/Planning/Exec",
                "Cognitive",
                "Vision",
                "Braille Tools",
                "Hearing",
                "Physical",
                "Speech/Communication",
              ].map((func) => (
                <label key={func} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={filters.functions.includes(func)}
                    onChange={(e) => onFilterChange("functions", func, e.target.checked)}
                    className="w-4 h-4 border-2 border-muted-foreground rounded focus:ring-2 focus:ring-primary focus:ring-offset-2 accent-primary shrink-0"
                    aria-label={`Filter by ${func}`}
                  />
                  <span className="text-sm text-foreground">{func}</span>
                  <Tooltip text={filterDescriptions[func]}>
                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/70 hover:text-primary shrink-0" />
                  </Tooltip>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Devices */}
          <fieldset className="mb-6">
            <legend className="text-base font-bold text-foreground mb-1 flex items-center gap-2">
              Devices
              <Tooltip text={categoryDescriptions["Devices"]}>
                <HelpCircle className="w-4 h-4 text-muted-foreground hover:text-primary shrink-0" />
              </Tooltip>
            </legend>
            <p className="text-xs text-muted-foreground mb-3">What device(s) should the tool run on?</p>
            <div className="space-y-2">
              {["PC (Windows)", "Macintosh", "Chromebook", "iPad", "iPhone", "Android"].map((device) => (
                <label key={device} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={filters.devices.includes(device)}
                    onChange={(e) => onFilterChange("devices", device, e.target.checked)}
                    className="w-4 h-4 border-2 border-muted-foreground rounded focus:ring-2 focus:ring-primary focus:ring-offset-2 accent-primary shrink-0"
                    aria-label={`Filter by ${device}`}
                  />
                  <span className="text-sm text-foreground">{device}</span>
                  <Tooltip text={filterDescriptions[device]}>
                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/70 hover:text-primary shrink-0" />
                  </Tooltip>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Need to Install */}
          <fieldset className="mb-6">
            <legend className="text-base font-bold text-foreground mb-1 flex items-center gap-2">
              Need to Install?
              <Tooltip text={categoryDescriptions["Need to Install?"]}>
                <HelpCircle className="w-4 h-4 text-muted-foreground hover:text-primary shrink-0" />
              </Tooltip>
            </legend>
            <p className="text-xs text-muted-foreground mb-3">
              Tools that don't need to be installed can be used even if person has no permission to install things.
            </p>
            <div className="space-y-2">
              {["Built-in (no install)", "Web-Based (no install)", "Needs to be installed"].map((install) => (
                <label key={install} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={filters.installTypes.includes(install)}
                    onChange={(e) => onFilterChange("installTypes", install, e.target.checked)}
                    className="w-4 h-4 border-2 border-muted-foreground rounded focus:ring-2 focus:ring-primary focus:ring-offset-2 accent-primary shrink-0"
                    aria-label={`Filter by ${install}`}
                  />
                  <span className="text-sm text-foreground">{install}</span>
                  <Tooltip text={filterDescriptions[install]}>
                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/70 hover:text-primary shrink-0" />
                  </Tooltip>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Purchase Option */}
          <fieldset className="mb-2">
            <legend className="text-base font-bold text-foreground mb-1 flex items-center gap-2">
              Purchase Option
              <Tooltip text={categoryDescriptions["Purchase Option"]}>
                <HelpCircle className="w-4 h-4 text-muted-foreground hover:text-primary shrink-0" />
              </Tooltip>
            </legend>
            <p className="text-xs text-muted-foreground mb-3">How much can it cost?</p>
            <div className="space-y-2">
              {["Free", "Free Trial", "Lifetime License", "Subscription"].map((option) => (
                <label key={option} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={filters.purchaseOptions.includes(option)}
                    onChange={(e) => onFilterChange("purchaseOptions", option, e.target.checked)}
                    className="w-4 h-4 border-2 border-muted-foreground rounded focus:ring-2 focus:ring-primary focus:ring-offset-2 accent-primary shrink-0"
                    aria-label={`Filter by ${option}`}
                  />
                  <span className="text-sm text-foreground">{option}</span>
                  <Tooltip text={filterDescriptions[option]}>
                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/70 hover:text-primary shrink-0" />
                  </Tooltip>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </div>
    </aside>
  )
}

export default FilterPanel
