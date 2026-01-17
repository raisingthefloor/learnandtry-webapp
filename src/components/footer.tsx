export function Footer() {
  return (
    <footer className="bg-muted border-t border-border py-12" role="contentinfo">
      <div className="max-w-7xl mx-auto px-8 md:px-12 lg:px-16">
        <nav className="grid md:grid-cols-3 gap-8" aria-label="Footer navigation">
          {/* Learn & Try Column */}
          <div>
            <h3 className="font-bold text-foreground mb-4">Learn & Try</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="/"
                  className="text-muted-foreground hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary rounded"
                >
                  Home
                </a>
              </li>
              <li>
                <a
                  href="/browse-all-tools"
                  className="text-muted-foreground hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary rounded"
                >
                  Browse Directory
                </a>
              </li>
              <li>
                <a
                  href="/tool-finder"
                  className="text-muted-foreground hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary rounded"
                >
                  AT Tool Finder
                </a>
              </li>
            </ul>
          </div>

          {/* Organization Column */}
          <div>
            <h3 className="font-bold text-foreground mb-4">Organization</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="/about"
                  className="text-muted-foreground hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary rounded"
                >
                  About Us
                </a>
              </li>
              <li>
                <a
                  href="/contact"
                  className="text-muted-foreground hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary rounded"
                >
                  Contact Us
                </a>
              </li>
            </ul>
          </div>

          {/* Raising the Floor Column */}
          <div>
            <h3 className="font-bold text-foreground mb-4">Raising the Floor</h3>
            <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
              Raising the Floor works with communities to develop solutions to make technologies more inclusive and
              accessible for all.
            </p>
            <p className="text-muted-foreground text-sm">© 2026 Raising the Floor. All rights reserved.</p>
          </div>
        </nav>
      </div>
    </footer>
  )
}

export default Footer
