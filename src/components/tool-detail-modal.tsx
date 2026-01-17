"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react"

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

interface ToolDetailModalProps {
  tool: Tool | null
  isOpen: boolean
  onClose: () => void
}

export function ToolDetailModal({ tool, isOpen, onClose }: ToolDetailModalProps) {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const hasVideos = tool?.youTubeVideos && tool.youTubeVideos.length > 0
  const videos = tool?.youTubeVideos || []

  useEffect(() => {
    setCurrentVideoIndex(0)
  }, [tool?.id])

  const nextVideo = () => {
    if (videos.length > 0) {
      setCurrentVideoIndex((prev) => (prev + 1) % videos.length)
    }
  }

  const prevVideo = () => {
    if (videos.length > 0) {
      setCurrentVideoIndex((prev) => (prev - 1 + videos.length) % videos.length)
    }
  }

  const currentVideo = hasVideos ? videos[currentVideoIndex] : null

  if (!tool) return null

  return (
    <Dialog className="min-w-[60vw]" open={isOpen} onOpenChange={onClose}>
      <DialogContent className="h-screen min-w-[60vw] overflow-y-auto p-0 bg-background m-0">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-foreground mb-2">{tool.name}</h2>
              <p className="text-lg text-muted-foreground mb-3">by {tool.company}</p>

              {/* Tags */}
              <div className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
                {/* Purchase options */}
                {tool.purchaseOptions.slice(0, 1).map((option, index) => (
                  <span key={option}>{option}</span>
                ))}

                {/* Functions with bullet separators */}
                {tool.functions.slice(0, 2).map((func, index) => (
                  <span key={func} className="flex items-center">
                    <span className="mx-2">•</span>
                    <span>{func}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-8">
            <div className="relative bg-muted rounded-lg border border-border h-96 flex items-center justify-center mb-4 overflow-hidden">
              {hasVideos && currentVideo ? (
                <>
                  {/* YouTube Video Embed */}
                  <iframe
                    src={currentVideo.embedUrl}
                    title={currentVideo.title}
                    className="w-full h-full rounded-lg"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />

                  {/* Navigation arrows for multiple videos */}
                  {videos.length > 1 && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={prevVideo}
                        className="absolute left-4 z-10 bg-black/50 hover:bg-black/70 text-white"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={nextVideo}
                        className="absolute right-4 z-10 bg-black/50 hover:bg-black/70 text-white"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Button>
                    </>
                  )}
                </>
              ) : (
                <></>
              )}
            </div>

            {hasVideos && videos.length > 1 && (
              <div className="flex justify-center gap-2">
                {videos.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentVideoIndex(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentVideoIndex ? "bg-foreground" : "bg-border"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Description and Specifications */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Description */}
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-4">Description</h3>
              <p className="text-muted-foreground leading-relaxed">{tool.description}</p>
            </div>

            {/* Specifications */}
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-4">Specifications</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-medium">Company</span>
                  <span className="text-foreground text-right">{tool.company}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground font-medium">Platform</span>
                  <span className="text-foreground text-right">{tool.supportedPlatforms.join(", ")}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground font-medium">Category</span>
                  <span className="text-foreground text-right">{tool.functions.slice(0, 2).join(", ")}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground font-medium">Install Type</span>
                  <span className="text-foreground text-right">{tool.installTypes.join(", ")}</span>
                </div>

                {tool.purchaseOptions.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-medium">Purchase</span>
                    <span className="text-foreground text-right">{tool.purchaseOptions.join(", ")}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-border">
            <Button
              variant="outline"
              className="flex items-center gap-2 border-muted-foreground text-muted-foreground hover:bg-muted-foreground hover:text-background bg-transparent"
              onClick={() => window.open(tool.vendorProductPageUrl, "_blank")}
            >
              Visit Vendor
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
