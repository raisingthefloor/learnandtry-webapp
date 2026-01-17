import { Button } from "@/components/ui/button"
import { Search, BookOpen, MousePointer } from "lucide-react"
import Link from "next/link"

export default function LearnAndTryLandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-muted py-16 md:py-10" aria-labelledby="hero-heading">
        <div className="max-w-5xl mx-auto px-8 md:px-12 lg:px-16 text-center">
          <h1
            id="hero-heading"
            className="text-5xl md:text-6xl lg:text-7xl font-bold mb-8 leading-tight tracking-tight"
          >
            The <span className="text-primary">Learn and Try Tool</span>
          </h1>
          <p className="text-xl md:text-2xl lg:text-3xl text-foreground mb-4 font-semibold leading-snug">
            Explore tools that could make computers accessible
            <br />
            and easier to use.
          </p>
          <p className="text-base md:text-lg text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Get personalized suggestions with our Tool Finder, or browse the tools directly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/tool-finder">
              <Button
                className="px-10 py-5 text-lg h-14 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-semibold w-full sm:w-auto shadow-md"
                aria-label="Start using the Tool Finder to get personalized suggestions"
              >
                Use Tool Finder
              </Button>
            </Link>
            <Link href="/browse-all-tools">
              <Button
                variant="outline"
                className="px-10 py-5 text-lg h-14 border-2 border-foreground/30 text-foreground hover:bg-foreground/5 bg-transparent rounded-lg font-semibold w-full sm:w-auto"
                aria-label="Browse the complete directory of assistive technology tools"
              >
                Browse Tools Directly
              </Button>
            </Link>
          </div>
          <p className="text-sm text-muted-foreground mt-8 italic">
            No information about you or others is gathered, stored, or used by this site.
          </p>
        </div>
      </section>

      {/* How to Use Section */}
      <section className="bg-background py-16 md:py-10" aria-labelledby="how-to-use-heading">
        <div className="max-w-4xl mx-auto px-8 md:px-12 lg:px-16 text-center">
          <h2 id="how-to-use-heading" className="text-2xl md:text-3xl font-bold text-foreground mb-12 md:mb-16">
            Use this Website to:
          </h2>

          <div className="grid md:grid-cols-3 gap-10 md:gap-12">
            {/* Discover */}
            <div className="flex flex-col items-center">
              <div
                className="w-16 h-16 border-2 border-primary/40 bg-primary/5 rounded-full flex items-center justify-center mb-5"
                aria-hidden="true"
              >
                <Search className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Discover</h3>
              <p className="text-muted-foreground leading-relaxed">
                Search, browse, or use our Tool Finder to discover tools for any individual.
              </p>
            </div>

            {/* Learn */}
            <div className="flex flex-col items-center">
              <div
                className="w-16 h-16 border-2 border-primary/40 bg-primary/5 rounded-full flex items-center justify-center mb-5"
                aria-hidden="true"
              >
                <BookOpen className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Learn</h3>
              <p className="text-muted-foreground leading-relaxed">
                Read tool descriptions, learn about their features, and watch demo videos of how they work.
              </p>
            </div>

            {/* Try */}
            <div className="flex flex-col items-center">
              <div
                className="w-16 h-16 border-2 border-primary/40 bg-primary/5 rounded-full flex items-center justify-center mb-5"
                aria-hidden="true"
              >
                <MousePointer className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Try</h3>
              <p className="text-muted-foreground leading-relaxed">
                Try out solutions that you find.
                <br />1 out of 3 are already built in.
                <br />3 out of 4 are Free. And
                <br />9 out of 10 are free or have free trials.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Video Section */}
      <section className="bg-muted/50 py-16 md:py-10" aria-labelledby="video-heading">
        <div className="max-w-4xl mx-auto px-8 md:px-12 lg:px-16 text-center">
          <h2 id="video-heading" className="text-2xl md:text-3xl font-bold text-foreground mb-10 md:mb-12">
            Watch Our Website Walkthrough
          </h2>

          <button
            className="relative bg-background rounded-xl aspect-video mb-8 flex items-center justify-center border border-border w-full shadow-sm hover:shadow-md transition-shadow"
            aria-label="Play website walkthrough video"
          >
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-lg">
              <div
                className="w-0 h-0 border-l-[14px] border-l-primary-foreground border-t-[9px] border-t-transparent border-b-[9px] border-b-transparent ml-1"
                aria-hidden="true"
              ></div>
            </div>
          </button>

          <Button
            variant="outline"
            className="border-foreground/30 text-foreground hover:bg-foreground/5 bg-transparent font-medium"
            aria-label="Read transcript of the website walkthrough video"
          >
            Read Transcript
          </Button>
        </div>
      </section>

      {/* Bottom CTA Section */}
      <section className="bg-background py-16 border-t border-border md:py-10" aria-labelledby="cta-heading">
        <div className="max-w-4xl mx-auto px-8 md:px-12 lg:px-16 text-center">
          <h2 id="cta-heading" className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
            Find the perfect tool(s) for users with different needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/tool-finder">
              <Button
                className="px-10 py-5 text-lg h-14 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-semibold w-full sm:w-auto shadow-md"
                aria-label="Start using the Tool Finder to get personalized suggestions"
              >
                Use Tool Finder
              </Button>
            </Link>
            <Link href="/browse-all-tools">
              <Button
                variant="outline"
                className="px-10 py-5 text-lg h-14 border-2 border-foreground/30 text-foreground hover:bg-foreground/5 bg-transparent rounded-lg font-semibold w-full sm:w-auto"
                aria-label="Browse the complete directory of assistive technology tools"
              >
                Browse Tools Directly
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
