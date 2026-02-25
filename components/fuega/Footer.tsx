import Link from "next/link";

const footerSections = [
  {
    title: "About",
    links: [
      { href: "/about", label: "About" },
      { href: "/how-it-works", label: "How It Works" },
      { href: "/security", label: "Security" },
      { href: "/supporters", label: "Supporters" },
    ],
  },
  {
    title: "Platform",
    links: [
      { href: "/campfires", label: "Campfires" },
      { href: "/governance", label: "Governance" },
      { href: "/mod-log", label: "Mod Log" },
      { href: "/home", label: "Feed" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms" },
      { href: "/privacy", label: "Privacy" },
      { href: "/principles", label: "Principles" },
    ],
  },
  {
    title: "Campfire",
    links: [
      { href: "https://github.com/fuega", label: "GitHub" },
      { href: "/join", label: "Join" },
      { href: "/settings/referrals", label: "Referrals" },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer
      className="border-t border-lava-hot/10 bg-void"
      role="contentinfo"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-12 py-8 sm:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-xs font-semibold font-mono uppercase tracking-wider text-foreground mb-3">
                <span className="text-lava-hot font-bold">$ </span>
                {section.title}
              </h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-ash hover:text-lava-hot transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <hr className="lava-rule my-8" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-smoke">
          <div className="flex items-center gap-1">
            <span className="text-flame-400 font-bold">fuega</span>
            <span className="text-smoke">.</span>
            <span className="text-ash">ai</span>
            <span className="ml-2">
              &copy; {new Date().getFullYear()} — open source social media
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span>no ads</span>
            <span className="text-lava-hot/40">|</span>
            <span>no tracking</span>
            <span className="text-lava-hot/40">|</span>
            <span>tip-supported</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
