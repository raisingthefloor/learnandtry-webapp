"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Questionnaire from "@/components/questionnaire"
import { Button } from "@/components/ui/button"

export default function ToolFinderPage() {
  const [showQuestionnaire, setShowQuestionnaire] = useState(false)
  const router = useRouter()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" })
  }, [showQuestionnaire])

  const handleStart = () => {
    setShowQuestionnaire(true)
  }

  const handleQuestionnaireComplete = (questionnaireAnswers: Record<number, string>, toolCount: number) => {
    // Convert answers to search parameters
    const searchParams = new URLSearchParams()

    console.log("[v0] Questionnaire answers received:", questionnaireAnswers)
    console.log("[v0] Tool count:", toolCount)

    // Question 1: For Myself / For Someone Else
    // Question 2: What are they having trouble with (function)
    // Question 3: Computer type
    // Question 4: Phone type
    if (questionnaireAnswers[2]) searchParams.set("function", questionnaireAnswers[2])
    if (questionnaireAnswers[3]) searchParams.set("computer", questionnaireAnswers[3])
    if (questionnaireAnswers[4]) searchParams.set("phone", questionnaireAnswers[4])

    console.log("[v0] Search params:", searchParams.toString())

    // Redirect to browse-all-tools with the search parameters
    router.push(`/browse-all-tools?${searchParams.toString()}`)
  }

  return (
    <div className="bg-background">
      {/* Main Content */}
      {showQuestionnaire ? (
        <main className="py-8" role="main" aria-label="Tool Finder Questionnaire">
          <Questionnaire onComplete={handleQuestionnaireComplete} />
        </main>
      ) : (
        <main className="flex-1 flex items-center justify-center py-16 md:py-10" role="main">
          <div className="max-w-2xl mx-auto px-8 md:px-12 lg:px-16 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-8 leading-tight tracking-tight whitespace-nowrap">
              Welcome to the <span className="text-primary">Tool Finder</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-6 leading-relaxed">
              Answer a few questions and a list
              <br />
              of possible solutions to fit will be provided.
            </p>

            <p className="text-lg md:text-xl text-foreground font-semibold mb-2">We don't store any information—</p>

            <p className="text-lg md:text-xl text-muted-foreground mb-12 leading-relaxed">
              your answers are only used to make tool suggestions.
            </p>

            <Button
              onClick={handleStart}
              className="px-10 py-5 text-lg h-14 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-semibold shadow-md"
              aria-label="Start the Tool Finder questionnaire"
            >
              Start
            </Button>
          </div>
        </main>
      )}
    </div>
  )
}
