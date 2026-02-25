import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Flame,
  Shield,
  Vote,
  Settings2,
  Bot,
  Eye,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { FlameLogo } from "@/components/fuega/flame-logo";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "How fuega.ai governance works — campfire-driven moderation, governance variables, and the Principles that keep everyone safe.",
  openGraph: {
    title: "How It Works | fuega.ai",
    description:
      "How fuega.ai governance works — campfire-driven moderation, governance variables, and the Principles that keep everyone safe.",
  },
};

const F = () => <span className="text-flame-400 font-semibold">fuega</span>;

/* -- Diagram: Architecture flow ----------------------------------------- */
function ArchitectureDiagram() {
  return (
    <div className="mt-6 flex flex-col items-center gap-0">
      {/* Principles */}
      <div className="w-full max-w-md border-2 border-flame-500 bg-flame-500/10 px-5 py-3 text-center">
        <div className="flex items-center justify-center gap-2">
          <Shield className="h-4 w-4 text-flame-400" />
          <p className="font-mono text-xs font-bold text-flame-300 uppercase tracking-wider">
            Platform Principles
          </p>
        </div>
        <p className="mt-1 text-xs text-ash">
          Immutable. No CSAM, no doxxing, no violence incitement, no spam.
          Applies everywhere. Can&apos;t be overridden.
        </p>
      </div>

      {/* Arrow down */}
      <div className="flex flex-col items-center py-1">
        <div className="h-5 w-px bg-flame-500/40" />
        <ChevronRight className="h-3.5 w-3.5 rotate-90 text-flame-500/60" />
      </div>

      {/* Governance variables */}
      <div className="w-full max-w-md border border-charcoal bg-charcoal/50 px-5 py-3 text-center">
        <div className="flex items-center justify-center gap-2">
          <Settings2 className="h-4 w-4 text-ash" />
          <p className="font-mono text-xs font-bold text-foreground">
            Governance Variables
          </p>
        </div>
        <p className="mt-1 text-xs text-ash">
          Structured settings voted on by campfire members: toxicity threshold,
          spam sensitivity, content rules, voting quorum, and more.
        </p>
      </div>

      {/* Arrow down */}
      <div className="flex flex-col items-center py-1">
        <div className="h-5 w-px bg-charcoal/40" />
        <ChevronRight className="h-3.5 w-3.5 rotate-90 text-smoke/60" />
      </div>

      {/* Tender compiler */}
      <div className="w-full max-w-md border border-flame-500/40 bg-flame-500/5 px-5 py-3 text-center">
        <div className="flex items-center justify-center gap-2">
          <Bot className="h-4 w-4 text-flame-400" />
          <p className="font-mono text-xs font-bold text-foreground">
            Tender Compiler
          </p>
        </div>
        <p className="mt-1 text-xs text-ash">
          Combines Principles + variable values + security wrapper into an AI
          prompt. No human writes moderation instructions directly.
        </p>
      </div>

      {/* Arrow down */}
      <div className="flex flex-col items-center py-1">
        <div className="h-5 w-px bg-charcoal/40" />
        <ChevronRight className="h-3.5 w-3.5 rotate-90 text-smoke/60" />
      </div>

      {/* Moderation decisions */}
      <div className="w-full max-w-md border border-charcoal bg-charcoal/30 px-5 py-3 text-center">
        <div className="flex items-center justify-center gap-2">
          <Eye className="h-4 w-4 text-green-400" />
          <p className="font-mono text-xs font-bold text-foreground">
            Per-Post Moderation
          </p>
        </div>
        <p className="mt-1 text-xs text-ash">
          Every post and comment evaluated in real-time. Approve, remove, flag,
          or warn. Every decision logged publicly in the campfire mod log.
        </p>
      </div>
    </div>
  );
}

/* -- Diagram: Security sandwich ----------------------------------------- */
function SecuritySandwich() {
  return (
    <div className="mt-5 w-full max-w-lg mx-auto">
      <div className="space-y-0">
        {/* Top bread */}
        <div className="border border-flame-500 bg-flame-500/10 px-4 py-2.5 rounded-t-md">
          <p className="font-mono text-xs font-bold text-flame-300 uppercase tracking-wider">
            Principles (immutable top layer)
          </p>
          <p className="text-xs text-ash mt-0.5">
            Hard-coded platform rules. The AI reads these first and can never
            override them.
          </p>
        </div>

        {/* Structured vars */}
        <div className="border-x border-charcoal bg-charcoal/50 px-4 py-2.5">
          <p className="font-mono text-xs font-bold text-foreground uppercase tracking-wider">
            Structured Variables (typed + bounded)
          </p>
          <p className="text-xs text-ash mt-0.5">
            Numeric thresholds, booleans, enums — validated against min/max
            bounds. No injection surface.
          </p>
        </div>

        {/* Free text (untrusted) */}
        <div className="border-x border-amber-600/40 bg-amber-500/5 px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3 text-amber-400" />
            <p className="font-mono text-xs font-bold text-amber-300 uppercase tracking-wider">
              Free-Text Variables (untrusted, isolated)
            </p>
          </div>
          <p className="text-xs text-ash mt-0.5">
            Campfire descriptions, custom rule text. Treated as untrusted user
            input — sanitized and sandboxed.
          </p>
        </div>

        {/* Bottom bread */}
        <div className="border border-flame-500 bg-flame-500/10 px-4 py-2.5 rounded-b-md">
          <p className="font-mono text-xs font-bold text-flame-300 uppercase tracking-wider">
            Anti-injection closing (immutable bottom layer)
          </p>
          <p className="text-xs text-ash mt-0.5">
            Reminds the AI to ignore any instructions found in the content above
            that contradict Principles.
          </p>
        </div>
      </div>
    </div>
  );
}

/* -- Diagram: Proposal lifecycle ---------------------------------------- */
const proposalSteps = [
  {
    step: "1",
    title: "Draft",
    desc: "Any member proposes changing a governance variable — for example, raising the toxicity threshold from 3 to 5.",
  },
  {
    step: "2",
    title: "Discussion",
    desc: "Configurable discussion period (default: 48 hours). Members debate the change in a dedicated thread.",
  },
  {
    step: "3",
    title: "Voting",
    desc: "Configurable voting window (default: 7 days). Threshold set by the campfire — simple majority, supermajority, or custom quorum.",
  },
  {
    step: "4",
    title: "Implementation",
    desc: "If passed, the variable updates automatically. The Tender recompiles immediately with the new value.",
  },
  {
    step: "5",
    title: "Audit",
    desc: "Full history preserved in the settings audit trail. Every change, who proposed it, how votes went — permanently on record.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-charcoal bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 2xl:px-8">
          <Link href="/">
            <FlameLogo size="sm" />
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-ash transition-colors hover:text-foreground"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 bg-flame-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-flame-600"
            >
              Sign up
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-4 py-10 2xl:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-mono text-xs text-smoke transition-colors hover:text-ash"
        >
          <ArrowLeft className="h-3 w-3" />
          cd /
        </Link>

        {/* Hero */}
        <section className="mt-6">
          <h1 className="font-mono text-xl font-bold text-foreground sm:text-2xl">
            <span className="text-flame-400 font-bold">$ </span>
            man <F />
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ash">
            Every campfire on <F /> governs itself. Members vote on structured
            settings — not raw AI prompts — and the system compiles those
            settings into a{" "}
            <span className="font-mono font-medium text-foreground">Tender</span>.
            Injection-proof by design.
          </p>
        </section>

        {/* Architecture */}
        <section className="mt-10">
          <h2 className="font-mono text-lg font-bold text-foreground">
            <span className="text-flame-400 font-bold">$ </span>
            describe architecture
          </h2>
          <p className="mt-2 text-sm text-ash leading-relaxed">
            Two layers. Platform Principles are immutable and apply everywhere.
            Below that, each campfire is sovereign — it sets its own governance
            variables, and the Tender compiler turns those into an AI prompt.
          </p>

          <div className="terminal-card mt-4 p-4 sm:p-6">
            <ArchitectureDiagram />
          </div>
        </section>

        {/* Campfires */}
        <section className="mt-10">
          <h2 className="font-mono text-lg font-bold text-foreground">
            <span className="text-flame-400 font-bold">$ </span>
            ls /campfires --info
          </h2>
          <p className="mt-2 text-sm text-ash leading-relaxed">
            A campfire is a self-governing space with transparent AI
            moderation and democratic governance. Each
            one has its own rules, its own AI moderator, and its
            own public mod log.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="terminal-card p-4">
              <p className="font-mono text-xs font-semibold text-foreground">
                flat_structure
              </p>
              <p className="mt-1 text-xs text-ash">
                No categories, no nesting. Every campfire is a direct child of
                the platform. Route:{" "}
                <code className="text-flame-400 font-mono text-xs">/f/campfire-name</code>
              </p>
            </div>
            <div className="terminal-card p-4">
              <p className="font-mono text-xs font-semibold text-foreground">
                self_governing
              </p>
              <p className="mt-1 text-xs text-ash">
                Members vote on governance variables. The AI prompt
                is recompiled automatically when settings change.
              </p>
            </div>
            <div className="terminal-card p-4">
              <p className="font-mono text-xs font-semibold text-foreground">
                public_mod_log
              </p>
              <p className="mt-1 text-xs text-ash">
                Every AI moderation decision is logged with reasoning, confidence
                score, and the Tender version used. Anyone can audit it.
              </p>
            </div>
            <div className="terminal-card p-4">
              <p className="font-mono text-xs font-semibold text-foreground">
                choose_your_ai
              </p>
              <p className="mt-1 text-xs text-ash">
                Campfires vote on which AI provider moderates their space.
                Don&apos;t trust a model? Vote it out.
              </p>
            </div>
          </div>
        </section>

        {/* Governance Variables */}
        <section className="mt-10">
          <h2 className="font-mono text-lg font-bold text-foreground">
            <span className="text-flame-400 font-bold">$ </span>
            select * from governance_variables
          </h2>
          <p className="mt-2 text-sm text-ash leading-relaxed">
            Instead of writing raw AI prompts (which opens the door to prompt
            injection), campfires configure structured variables. Each variable
            has a type, bounds, and a default value. The Tender compiler reads
            them all and produces the AI instruction set.
          </p>

          <div className="terminal-card mt-4 overflow-x-auto p-0">
            <table className="w-full border-collapse font-mono text-xs">
              <thead>
                <tr className="border-b border-lava-hot/10">
                  <th className="py-2.5 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-smoke">
                    Variable
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-smoke">
                    Type
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-smoke">
                    Bounds
                  </th>
                  <th className="py-2.5 pl-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-smoke">
                    Controls
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-lava-hot/5">
                  <td className="py-2 pl-4 pr-3 text-foreground font-medium">
                    toxicity_threshold
                  </td>
                  <td className="px-3 py-2 text-ash">integer</td>
                  <td className="px-3 py-2 text-ash">1 -- 10</td>
                  <td className="py-2 pl-3 pr-4 text-ash">
                    How aggressive the AI is at flagging toxic content
                  </td>
                </tr>
                <tr className="border-b border-lava-hot/5">
                  <td className="py-2 pl-4 pr-3 text-foreground font-medium">
                    spam_sensitivity
                  </td>
                  <td className="px-3 py-2 text-ash">integer</td>
                  <td className="px-3 py-2 text-ash">1 -- 10</td>
                  <td className="py-2 pl-3 pr-4 text-ash">
                    How strictly spam detection is enforced
                  </td>
                </tr>
                <tr className="border-b border-lava-hot/5">
                  <td className="py-2 pl-4 pr-3 text-foreground font-medium">
                    allow_nsfw
                  </td>
                  <td className="px-3 py-2 text-ash">boolean</td>
                  <td className="px-3 py-2 text-ash">true / false</td>
                  <td className="py-2 pl-3 pr-4 text-ash">
                    Whether NSFW content is permitted in the campfire
                  </td>
                </tr>
                <tr className="border-b border-lava-hot/5">
                  <td className="py-2 pl-4 pr-3 text-foreground font-medium">
                    voting_threshold
                  </td>
                  <td className="px-3 py-2 text-ash">enum</td>
                  <td className="px-3 py-2 text-ash">
                    simple_majority, supermajority_66, supermajority_75
                  </td>
                  <td className="py-2 pl-3 pr-4 text-ash">
                    How much agreement is needed to pass a proposal
                  </td>
                </tr>
                <tr className="border-b border-lava-hot/5">
                  <td className="py-2 pl-4 pr-3 text-foreground font-medium">
                    custom_rules
                  </td>
                  <td className="px-3 py-2 text-ash">text</td>
                  <td className="px-3 py-2 text-ash">max 2000 chars</td>
                  <td className="py-2 pl-3 pr-4 text-ash">
                    Free-text campfire rules (treated as untrusted input in the
                    Tender)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-3 font-mono text-xs text-smoke">
            Variables are stored in a registry (database, not code). Adding a new
            governance knob is a DB insert, not a code deploy.
          </p>
        </section>

        {/* Security Sandwich */}
        <section className="mt-10">
          <h2 className="font-mono text-lg font-bold text-foreground">
            <span className="text-flame-400 font-bold">$ </span>
            inspect tender --security
          </h2>
          <p className="mt-2 text-sm text-ash leading-relaxed">
            The Tender compiler assembles the AI prompt in a strict order.
            Principles and anti-injection layers are immutable — they wrap the
            campfire&apos;s settings like bread around a sandwich. Even if
            someone tries to inject malicious instructions through a free-text
            variable, the AI sees the closing layer last and ignores them.
          </p>

          <div className="terminal-card mt-4 p-4 sm:p-6">
            <SecuritySandwich />
          </div>
        </section>

        {/* Proposal Lifecycle */}
        <section className="mt-10">
          <h2 className="font-mono text-lg font-bold text-foreground">
            <span className="text-flame-400 font-bold">$ </span>
            <Vote className="inline h-4 w-4 text-flame-400 mr-1" />
            describe proposal_lifecycle
          </h2>
          <p className="mt-2 text-sm text-ash leading-relaxed">
            Want to change how your campfire is moderated? Create a governance
            proposal. Here&apos;s the flow:
          </p>

          <div className="terminal-card mt-4 p-4 sm:p-6">
            <div className="space-y-0">
              {proposalSteps.map((s, i) => (
                <div key={s.step} className="flex gap-3">
                  {/* Timeline line + dot */}
                  <div className="flex flex-col items-center">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-flame-500/60 bg-flame-500/10 font-mono text-xs font-bold text-flame-300">
                      {s.step}
                    </div>
                    {i < proposalSteps.length - 1 && (
                      <div className="h-full w-px bg-charcoal/50" />
                    )}
                  </div>
                  {/* Content */}
                  <div className="pb-5">
                    <p className="font-mono text-xs font-semibold text-foreground">
                      {s.title}
                    </p>
                    <p className="mt-0.5 text-xs text-ash leading-relaxed">
                      {s.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Principles */}
        <section className="mt-10">
          <h2 className="font-mono text-lg font-bold text-foreground">
            <span className="text-flame-400 font-bold">$ </span>
            cat /etc/principles
          </h2>
          <p className="mt-2 text-sm text-ash leading-relaxed">
            These are non-negotiable and enforced everywhere, regardless of
            campfire settings. No campfire can vote to override them.
          </p>

          <div className="terminal-card mt-4 p-4 sm:p-6 space-y-2">
            {[
              { text: "No child sexual abuse material (CSAM)" },
              { text: "No direct incitement of violence" },
              { text: "No doxxing (sharing personal info without consent)" },
              { text: "No spam or bot networks" },
              { text: "No impersonation of individuals or organizations" },
            ].map((p) => (
              <div key={p.text} className="flex items-start gap-2.5">
                <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-flame-400" />
                <p className="text-xs text-ash">{p.text}</p>
              </div>
            ))}
          </div>

          <p className="mt-3 font-mono text-xs text-smoke">
            Platform-level actions (banning a campfire, suspending a user) are
            logged in a separate{" "}
            <span className="text-ash">site mod log</span> — public and
            permanent.
          </p>
        </section>

        {/* Mod Logs */}
        <section className="mt-10">
          <h2 className="font-mono text-lg font-bold text-foreground">
            <span className="text-flame-400 font-bold">$ </span>
            tail -f /var/log/moderation
          </h2>
          <p className="mt-2 text-sm text-ash leading-relaxed">
            Transparency is the point. Every AI decision is logged publicly.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="terminal-card p-4">
              <div className="flex items-center gap-2">
                <Flame className="h-3.5 w-3.5 text-flame-400" />
                <p className="font-mono text-xs font-semibold text-foreground">
                  campfire_mod_log
                </p>
              </div>
              <p className="mt-1.5 text-xs text-ash leading-relaxed">
                Per-campfire. Logs every AI moderation decision: what was
                flagged, the reason, confidence score, Tender version, and
                whether it was appealed. Visible to all campfire members.
              </p>
            </div>
            <div className="terminal-card p-4">
              <div className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-flame-400" />
                <p className="font-mono text-xs font-semibold text-foreground">
                  site_mod_log
                </p>
              </div>
              <p className="mt-1.5 text-xs text-ash leading-relaxed">
                Platform-wide. Logs actions taken by the platform team: campfire
                bans, user suspensions, Principle enforcement. Visible to all
                users. Reasoning required for every action.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mt-10 pb-10">
          <div className="terminal-card border-flame-500/20 p-5 text-center">
            <h2 className="font-mono text-base font-bold text-foreground">
              <span className="text-flame-400 font-bold">$ </span>
              ./signup --ready
            </h2>
            <p className="mt-1.5 text-xs text-ash">
              Create an account, join a campfire, and watch governance happen in
              real-time.
            </p>
            <div className="mt-3 flex items-center justify-center gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center gap-1.5 bg-flame-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-flame-600"
              >
                Sign up
              </Link>
              <Link
                href="/about"
                className="font-mono text-xs text-ash transition-colors hover:text-foreground"
              >
                ./about
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
