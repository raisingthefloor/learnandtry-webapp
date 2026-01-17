"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"

interface QuestionnaireProps {
  onComplete: (answers: Record<number, string>, toolCount: number) => void
}

export default function Questionnaire({ onComplete }: QuestionnaireProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [selectedOption, setSelectedOption] = useState<string>("")
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])
  const [showResultsPage, setShowResultsPage] = useState(false)
  const [toolCount, setToolCount] = useState(0)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" })
  }, [currentStep, showResultsPage])

  const isForSelf = answers[1] === "For Myself"
  const subject = isForSelf ? "you" : "they"
  const verb = isForSelf ? "are" : "are"
  const doVerb = isForSelf ? "do" : "do"

  const questionnaireData = useMemo(() => {
    return {
      questions: [
        {
          id: 1,
          question: "Are you looking for a tool for yourself - or someone else?",
          options: ["For Myself", "For Someone Else"],
          multiSelect: false,
        },
        {
          id: 2,
          question: `What ${verb} ${subject} having trouble with?`,
          options: [
            "Reading",
            "Writing",
            "Focus/Planning (Exec Functions)",
            "Cognitive",
            "Vision",
            "Braille Tools",
            "Hearing",
            "Physical",
            "Speech/Communication",
          ],
          multiSelect: true,
        },
        {
          id: 3,
          question: `What type of computer ${doVerb} ${subject} use at home or school\n(check all that apply)?`,
          options: ["Mac (Apple)", "Windows (Microsoft)", "Chromebook (Google)", "My Device Is Not Listed"],
          multiSelect: true,
        },
        {
          id: 4,
          question: `What type of phone ${doVerb} ${subject} primarily use?`,
          options: ["iPhone", "Android (Samsung, Google, Lenovo)", "None"],
          multiSelect: false,
        },
      ],
    }
  }, [subject, verb, doVerb])

  const totalSteps = 4
  const currentQuestion = questionnaireData.questions[currentStep - 1]

  const toggleOption = (option: string) => {
    setSelectedOptions((prev) => (prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]))
  }

  const calculateToolCount = (finalAnswers: Record<number, string>) => {
    // This is placeholder logic - in a real app, this would query the database
    // For now, return a reasonable number based on selections
    const troubles = finalAnswers[2]?.split(", ") || []
    const baseCount = 206 // Total tools
    const filteredCount = Math.max(10, Math.floor(baseCount / (troubles.length || 1)))
    return filteredCount
  }

  const handleNext = () => {
    if (currentQuestion) {
      const currentAnswer = currentQuestion.multiSelect ? selectedOptions.join(", ") : selectedOption

      if (
        (currentQuestion.multiSelect && selectedOptions.length > 0) ||
        (!currentQuestion.multiSelect && selectedOption)
      ) {
        // Save answer and proceed
        const newAnswers = { ...answers, [currentQuestion.id]: currentAnswer }
        setAnswers(newAnswers)
        setSelectedOption("")
        setSelectedOptions([])

        if (currentStep === totalSteps) {
          const count = calculateToolCount(newAnswers)
          setToolCount(count)
          setShowResultsPage(true)
        } else {
          setCurrentStep((prev) => prev + 1)
        }
      }
    }
  }

  const handleBack = () => {
    if (showResultsPage) {
      setShowResultsPage(false)
    } else if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1)
      setSelectedOption("")
      setSelectedOptions([])
    }
  }

  const handleShowTools = () => {
    onComplete(answers, toolCount)
  }

  const isNextDisabled = currentQuestion?.multiSelect ? selectedOptions.length === 0 : !selectedOption

  if (showResultsPage) {
    return (
      <div
        className="min-h-[calc(100vh-200px)] bg-background flex flex-col pb-24"
        role="region"
        aria-label="Tool search results"
      >
        {/* Stepper - show all completed */}
        <nav className="flex justify-center pt-2.5 pb-2.5" aria-label="Questionnaire progress">
          <ol className="flex items-center">
            {Array.from({ length: totalSteps }, (_, index) => {
              const stepNumber = index + 1
              return (
                <li key={stepNumber} className="flex items-center">
                  <div
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-primary-foreground font-semibold bg-primary"
                    aria-label={`Step ${stepNumber} completed`}
                  >
                    <Check size={16} aria-hidden="true" />
                  </div>
                  {stepNumber < totalSteps && <div className="w-5 h-0.5 bg-primary/30 mx-1" aria-hidden="true" />}
                </li>
              )
            })}
          </ol>
        </nav>

        {/* Results content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 mt-6">
          <div className="max-w-3xl w-full text-center">
            <p className="text-2xl md:text-3xl text-foreground mb-4 leading-relaxed">
              We found <strong className="text-primary">{toolCount}</strong> tools that meet those choices.
            </p>
            <p className="text-xl md:text-2xl text-foreground mb-4 leading-relaxed">
              We will now show you them in a list.
              <br />- Click any item in the list to see more information about that tool.
            </p>
            <p className="text-lg md:text-xl text-muted-foreground mb-12 leading-relaxed whitespace-pre-line">
              {
                "You can also use the checkboxes on the left of the next screen\nto increase or decrease the number of items listed\nby limiting the list by cost or availability."
              }
            </p>

            <div className="flex justify-center gap-4">
              <Button
                variant="outline"
                onClick={handleBack}
                className="px-12 py-4 text-lg h-14 border-2 border-foreground/30 text-foreground hover:bg-foreground/5 bg-transparent rounded-lg font-medium"
                aria-label="Go back to previous question"
              >
                ← Back
              </Button>
              <Button
                onClick={handleShowTools}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-12 py-4 text-lg h-14 rounded-lg font-semibold shadow-md"
                aria-label="View recommended tools"
              >
                Show me the Tools →
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-[calc(100vh-200px)] bg-background flex flex-col pb-24"
      role="form"
      aria-label="Tool Finder Questionnaire"
    >
      {/* Stepper */}
      <nav className="flex justify-center pt-2.5 pb-2.5" aria-label="Questionnaire progress">
        <ol className="flex items-center">
          {Array.from({ length: totalSteps }, (_, index) => {
            const stepNumber = index + 1
            const isCompleted = stepNumber < currentStep
            const isActive = stepNumber === currentStep

            return (
              <li key={stepNumber} className="flex items-center">
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-semibold ${
                    isCompleted
                      ? "bg-primary text-primary-foreground"
                      : isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                  }`}
                  aria-current={isActive ? "step" : undefined}
                  aria-label={`Step ${stepNumber}${isCompleted ? " completed" : isActive ? " current" : ""}`}
                >
                  {isCompleted ? <Check size={16} aria-hidden="true" /> : stepNumber}
                </div>
                {stepNumber < totalSteps && (
                  <div className={`w-5 h-0.5 mx-1 ${isCompleted ? "bg-primary" : "bg-border"}`} aria-hidden="true" />
                )}
              </li>
            )
          })}
        </ol>
      </nav>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center px-6">
        <div className="max-w-4xl w-full h-auto">
          <h2 className="text-3xl font-bold text-foreground text-center mb-8 mt-12 whitespace-pre-line">
            {currentQuestion?.question}
          </h2>

          {currentQuestion?.multiSelect && (
            <p className="text-center text-muted-foreground text-base mb-6">
              Select one or more options, then click Next
            </p>
          )}

          <fieldset className="flex flex-wrap justify-center gap-4 mb-8">
            <legend className="sr-only">{currentQuestion?.question}</legend>
            {currentQuestion?.options.map((option, index) => {
              const isSelected = currentQuestion.multiSelect
                ? selectedOptions.includes(option)
                : selectedOption === option

              return (
                <button
                  key={index}
                  onClick={() => (currentQuestion.multiSelect ? toggleOption(option) : setSelectedOption(option))}
                  className={`px-6 py-4 border-2 font-medium transition-all text-base rounded-2xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/30 bg-background"
                  }`}
                  aria-pressed={isSelected}
                  type="button"
                >
                  {option}
                </button>
              )
            })}
          </fieldset>

          <div className="flex justify-center gap-4 w-full mt-8">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="px-12 py-4 text-lg h-14 border-2 border-foreground/30 text-foreground hover:bg-foreground/5 bg-transparent rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Go back to previous question"
            >
              ← Back
            </Button>

            <Button
              onClick={handleNext}
              disabled={isNextDisabled}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-12 py-4 text-lg h-14 rounded-lg font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={currentStep === totalSteps ? "View results" : "Go to next question"}
            >
              Next →
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
