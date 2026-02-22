#!/usr/bin/env python
"""
fuega_builder.py - Automated Builder for fuega.ai

WHAT THIS DOES:
1. On FIRST RUN: Executes BOOTSTRAP.md (Claude Code updates all docs)
2. ALWAYS: Resumes from checkpoint (no cleanup, no restart)
3. Shows colored, verbose real-time output with heartbeat
4. Handles restarts, token limits, and stuck sessions automatically
5. AUTO-FIX: Detects rate limits, parses reset times, waits and retries
6. AUTO-FIX: Classifies failures as retriable vs fatal
7. AUTO-FIX: Max 3 retries per prompt with exponential backoff

USAGE:
  python fuega_builder.py
  python fuega_builder.py --skip-bootstrap
"""

import argparse
import subprocess
import sys
import time
import json
import re
import os
import threading
import queue
from datetime import datetime, timedelta
from pathlib import Path

# ANSI Color codes
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BOLD = '\033[1m'
    DIM = '\033[2m'
    END = '\033[0m'

def colored(text, color):
    """Add color to text"""
    return f"{color}{text}{Colors.END}"

# Configuration
PROJECT_DIR = Path(__file__).parent
PROMPT_FILE = PROJECT_DIR / "PROMPT.md"
BOOTSTRAP_FILE = PROJECT_DIR / "BOOTSTRAP.md"
LOG_FILE = PROJECT_DIR / "build_log.txt"
DETAIL_LOG_FILE = PROJECT_DIR / "build_log_detail.txt"
STATE_FILE = PROJECT_DIR / ".builder_state.json"
FIXUP_MARKER = PROJECT_DIR / ".design_fixup_done"

# Timing
MAX_SESSION_TIME = 3600       # 1 hour max per prompt
INACTIVITY_TIMEOUT = 600      # 10 minutes with no output AND no file changes = stuck
HEARTBEAT_INTERVAL = 15       # Print heartbeat every 15 seconds of silence
FILE_CHECK_INTERVAL = 10      # Check for file changes every 10 seconds

# Auto-fix
MAX_RETRIES_PER_PROMPT = 3    # Max retries before marking as fatal
RETRY_BACKOFF_BASE = 30       # Base seconds between retries (doubles each time)
RATE_LIMIT_BUFFER = 30        # Extra seconds to wait after rate limit resets
MAX_RATE_LIMIT_WAIT = 300     # 5 minutes max wait for any rate limit (cap)

TOKEN_LIMIT_PATTERNS = [
    "context window",
    "conversation is too long",
    "token limit",
    "context limit",
    "maximum context length",
]

RATE_LIMIT_PATTERNS = [
    "hit your limit",
    "rate limit",
    "too many requests",
    "resets ",
    "try again later",
    "429",
]


def _reader_thread(pipe, q):
    """Background thread to read lines from a pipe into a queue."""
    try:
        for line in pipe:
            q.put(line)
    except Exception:
        pass
    finally:
        q.put(None)  # Sentinel: stream closed


class FailureAnalysis:
    """Result of analyzing a prompt failure."""
    def __init__(self, category, retriable, wait_seconds=0, message=""):
        self.category = category      # "rate_limit", "token_limit", "timeout", "crash", "unknown"
        self.retriable = retriable    # Can we retry this prompt?
        self.wait_seconds = wait_seconds  # How long to wait before retry
        self.message = message        # Human-readable explanation


class FuegaBuilder:
    def __init__(self, skip_bootstrap=False):
        self.state = self.load_state()
        self.start_time = datetime.now()
        self.current_phase = self.state.get("current_phase", 0)
        self.current_prompt = self.state.get("current_prompt", 0)
        self.bootstrap_complete = self.state.get("bootstrap_complete", False)
        self.skip_bootstrap_flag = skip_bootstrap
        self.prompts = self.load_prompts()

    def load_state(self):
        """Load build state from file"""
        if STATE_FILE.exists():
            try:
                with open(STATE_FILE, 'r') as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                self.log("State file corrupted, starting fresh", Colors.YELLOW, "WARN")
        return {
            "current_phase": 0,
            "current_prompt": 0,
            "completed_prompts": [],
            "bootstrap_complete": False,
            "last_run": None,
            "retry_counts": {},  # prompt_id -> retry count
        }

    def save_state(self):
        """Save current build state"""
        self.state["last_run"] = datetime.now().isoformat()
        self.state["bootstrap_complete"] = self.bootstrap_complete
        with open(STATE_FILE, 'w') as f:
            json.dump(self.state, f, indent=2)

    def load_prompts(self):
        """Extract all prompts from PROMPT.md"""
        if not PROMPT_FILE.exists():
            self.log_error("PROMPT.md not found!")
            return []

        with open(PROMPT_FILE, 'r', encoding='utf-8') as f:
            content = f.read()

        # Extract prompts by looking for code blocks after ### Prompt X.Y:
        prompt_pattern = r'### Prompt (\d+\.\d+):[^\n]*\n```\n(.*?)\n```'
        matches = re.findall(prompt_pattern, content, re.DOTALL)

        prompts = []
        for prompt_id, prompt_text in matches:
            phase = int(prompt_id.split('.')[0])
            prompts.append({
                "id": prompt_id,
                "phase": phase,
                "text": prompt_text.strip()
            })

        self.log(f"Loaded {len(prompts)} prompts from PROMPT.md", Colors.CYAN)
        return prompts

    def log(self, message, color=Colors.END, level="INFO"):
        """Log message to both console (colored) and file"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_line = f"[{timestamp}] [{level}] {message}"

        # Console (colored)
        print(colored(log_line, color), flush=True)

        # File (no color)
        with open(LOG_FILE, 'a', encoding='utf-8') as f:
            f.write(log_line + "\n")

    def log_error(self, message):
        """Log error message"""
        self.log(message, Colors.RED, "ERROR")

    def log_success(self, message):
        """Log success message"""
        self.log(message, Colors.GREEN, "SUCCESS")

    def log_detail(self, message):
        """Write to the detailed log file only (not console)"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with open(DETAIL_LOG_FILE, 'a', encoding='utf-8') as f:
            f.write(f"[{timestamp}] {message}\n")

    def get_latest_file_mtime(self):
        """Get the most recent modification time of any project file (excluding .git, node_modules, .next)."""
        latest = 0
        skip_dirs = {'.git', 'node_modules', '.next', '.playwright-mcp', 'outputs', '.claude'}
        try:
            for entry in os.scandir(PROJECT_DIR):
                if entry.name in skip_dirs:
                    continue
                if entry.is_file(follow_symlinks=False):
                    try:
                        mt = entry.stat().st_mtime
                        if mt > latest:
                            latest = mt
                    except OSError:
                        pass
                elif entry.is_dir(follow_symlinks=False):
                    # One level deep scan for common working dirs
                    try:
                        for sub in os.scandir(entry.path):
                            if sub.is_file(follow_symlinks=False):
                                try:
                                    mt = sub.stat().st_mtime
                                    if mt > latest:
                                        latest = mt
                                except OSError:
                                    pass
                    except OSError:
                        pass
        except OSError:
            pass
        return latest

    # =========================================================================
    # AUTO-FIX: Failure analysis and recovery
    # =========================================================================

    def analyze_failure(self, output, returncode, elapsed):
        """Analyze a failed prompt run and determine recovery strategy."""
        output_lower = output.lower()

        # 1. Rate limit detection
        for pattern in RATE_LIMIT_PATTERNS:
            if pattern.lower() in output_lower:
                wait_time = self._parse_rate_limit_reset(output)
                return FailureAnalysis(
                    category="rate_limit",
                    retriable=True,
                    wait_seconds=wait_time,
                    message=f"Rate limited. Waiting {wait_time}s until reset."
                )

        # 2. Token/context limit
        for pattern in TOKEN_LIMIT_PATTERNS:
            if pattern.lower() in output_lower:
                return FailureAnalysis(
                    category="token_limit",
                    retriable=True,
                    wait_seconds=5,
                    message="Token limit hit. Restarting with fresh context."
                )

        # 3. Inactivity timeout (already handled in run_claude_code, but just in case)
        if "inactivity timeout" in output_lower:
            return FailureAnalysis(
                category="timeout",
                retriable=True,
                wait_seconds=10,
                message="Inactivity timeout. Retrying prompt."
            )

        # 4. Non-zero return code with no recognized pattern
        if returncode != 0:
            # Check for common transient errors
            if any(x in output_lower for x in ["econnreset", "network", "socket", "dns", "enotfound"]):
                return FailureAnalysis(
                    category="network",
                    retriable=True,
                    wait_seconds=30,
                    message="Network error. Retrying after brief wait."
                )
            # Unknown error — still retry once
            return FailureAnalysis(
                category="unknown_error",
                retriable=True,
                wait_seconds=15,
                message=f"Unknown error (return code {returncode}). Retrying."
            )

        # 5. Process completed but no PROMPT_COMPLETE signal and very little output
        if len(output.strip()) < 50:
            return FailureAnalysis(
                category="empty_output",
                retriable=True,
                wait_seconds=10,
                message="Very little output. May have failed silently. Retrying."
            )

        # Default: assume success was handled elsewhere
        return FailureAnalysis(
            category="ok",
            retriable=False,
            wait_seconds=0,
            message="No failure detected."
        )

    def _parse_rate_limit_reset(self, output):
        """Parse rate limit reset time from Claude output. Returns seconds to wait."""
        # Pattern: "resets Feb 22, 4pm (America/Chicago)"
        # Pattern: "resets in 2 hours"
        # Pattern: "try again in 30 minutes"

        # Try to find "resets <date>, <time>"
        reset_match = re.search(
            r'resets?\s+(\w+\s+\d+),?\s+(\d+(?::\d+)?)\s*(am|pm)',
            output, re.IGNORECASE
        )
        if reset_match:
            try:
                month_str = reset_match.group(1)
                time_str = reset_match.group(2)
                ampm = reset_match.group(3).lower()

                # Parse hour
                if ':' in time_str:
                    hour = int(time_str.split(':')[0])
                else:
                    hour = int(time_str)
                if ampm == 'pm' and hour != 12:
                    hour += 12
                if ampm == 'am' and hour == 12:
                    hour = 0

                # Calculate wait time assuming today or tomorrow
                now = datetime.now()
                # Try today first
                reset_time = now.replace(hour=hour, minute=0, second=0, microsecond=0)
                if reset_time <= now:
                    reset_time += timedelta(days=1)

                wait = (reset_time - now).total_seconds() + RATE_LIMIT_BUFFER
                # Cap at MAX_RATE_LIMIT_WAIT
                return min(wait, MAX_RATE_LIMIT_WAIT)
            except (ValueError, IndexError):
                pass

        # Try "in X hours/minutes"
        in_match = re.search(r'in\s+(\d+)\s+(hour|minute|min|sec)', output, re.IGNORECASE)
        if in_match:
            amount = int(in_match.group(1))
            unit = in_match.group(2).lower()
            if 'hour' in unit:
                wait = amount * 3600 + RATE_LIMIT_BUFFER
            elif 'min' in unit:
                wait = amount * 60 + RATE_LIMIT_BUFFER
            else:
                wait = amount + RATE_LIMIT_BUFFER
            return min(wait, MAX_RATE_LIMIT_WAIT)

        # Default: wait 5 minutes (safe fallback for rate limits)
        return 300 + RATE_LIMIT_BUFFER

    def wait_with_countdown(self, seconds, reason):
        """Wait for a specified time, showing countdown every 60 seconds."""
        self.log(f"AUTO-FIX: {reason}", Colors.YELLOW + Colors.BOLD, "AUTOFIX")
        self.log(f"Waiting {int(seconds)}s ({int(seconds/60)}m)...", Colors.YELLOW)

        end_time = time.time() + seconds
        while time.time() < end_time:
            remaining = end_time - time.time()
            if remaining <= 0:
                break
            # Print countdown every 60 seconds
            mins_left = int(remaining / 60)
            if mins_left > 0 and int(remaining) % 60 == 0:
                self.log(
                    f"  ... {mins_left}m remaining until retry",
                    Colors.YELLOW + Colors.DIM
                )
            time.sleep(min(60, remaining))

        self.log("Wait complete. Resuming.", Colors.GREEN)

    def get_retry_count(self, prompt_id):
        """Get current retry count for a prompt."""
        retry_counts = self.state.get("retry_counts", {})
        return retry_counts.get(prompt_id, 0)

    def increment_retry(self, prompt_id):
        """Increment and persist retry count for a prompt."""
        if "retry_counts" not in self.state:
            self.state["retry_counts"] = {}
        current = self.state["retry_counts"].get(prompt_id, 0)
        self.state["retry_counts"][prompt_id] = current + 1
        self.save_state()
        return current + 1

    def reset_retry(self, prompt_id):
        """Reset retry count on success."""
        if "retry_counts" in self.state and prompt_id in self.state["retry_counts"]:
            del self.state["retry_counts"][prompt_id]
            self.save_state()

    # =========================================================================

    def git_push(self, prompt_id):
        """Git add, commit, and push after each successful prompt"""
        try:
            self.log(f"Git push: committing prompt {prompt_id}...", Colors.CYAN)
            subprocess.run(
                ["git", "add", "-A"],
                cwd=PROJECT_DIR, capture_output=True, text=True, timeout=30
            )
            subprocess.run(
                ["git", "commit", "-m", f"builder: complete prompt {prompt_id}"],
                cwd=PROJECT_DIR, capture_output=True, text=True, timeout=30
            )
            push_result = subprocess.run(
                ["git", "push", "origin", "main"],
                cwd=PROJECT_DIR, capture_output=True, text=True, timeout=60
            )
            if push_result.returncode == 0:
                self.log_success(f"Git push successful after prompt {prompt_id}")
            else:
                self.log(f"Git push warning: {push_result.stderr[:200]}", Colors.YELLOW)
        except Exception as e:
            self.log(f"Git push failed (non-fatal): {e}", Colors.YELLOW)

    def run_claude_code(self, prompt_text, prompt_id):
        """Run Claude Code with a specific prompt, streaming output in real-time"""
        self.log("=" * 60, Colors.BLUE)
        self.log(f"STARTING PROMPT {prompt_id}", Colors.BLUE + Colors.BOLD)
        self.log("=" * 60, Colors.BLUE)
        # Show first 200 chars of the task
        preview = prompt_text[:200].replace('\n', ' ')
        print(colored(f"  Task: {preview}...\n", Colors.CYAN), flush=True)

        # Add automation instructions
        auto_instructions = """
===================================================================
  EXTREME AUTOMATION MODE - ZERO QUESTIONS ALLOWED
===================================================================

ABSOLUTE RULES:
- NEVER ASK QUESTIONS - Make decisions and execute
- NEVER WAIT FOR APPROVAL - Everything is pre-approved
- NEVER PAUSE - Execute immediately
- ALWAYS OUTPUT AS YOU WORK - Show progress every 10-15 seconds
- ALWAYS COMPLETE TASKS - No partial work
- ALWAYS BUILD ON EXISTING - Review context first

AUTOMATIC DECISIONS:
- DATABASE_URL missing? -> Use env var or skip gracefully
- Sync vs Async? -> SYNCHRONOUS (spec requirement)
- Which approach? -> Most production-ready
- Plan approval? -> AUTO-APPROVED
- Mock vs Real data? -> Mock, clearly marked
- Missing info? -> Make reasonable assumption

ERROR HANDLING — CRITICAL:
- If you encounter ANY build errors (TypeScript, import, runtime) — FIX THEM IMMEDIATELY
- Fix errors regardless of which phase or prompt they came from
- Run `npm run build` or `npx tsc --noEmit` to verify no errors before finishing
- Do NOT leave broken code — every prompt must leave the project in a buildable state

DESKTOP LAYOUT — CRITICAL:
- Use max-w-7xl (not max-w-6xl) for all page containers
- Reduce vertical padding on desktop: py-12 lg:py-10, pt-16 lg:pt-12
- Use 2xl:px-8 for extra side padding on ultrawide
- Feature grids: gap-4 lg:gap-5 (not gap-8)
- Text sizes: text-xs/text-sm for body, text-2xl/text-3xl for headings
- No wasted whitespace — content should fill the viewport on 27" monitors

ANIMATIONS & STYLING:
- Use existing CSS animations: animate-flame-flicker, animate-spark-rise, animate-douse-fall
- Use .glow-text, .glow-text-subtle, .glow-text-intense for fire glow effects
- Use .text-gradient-fire for gradient text
- Use .terminal-card for card styling
- Community references: ALWAYS use <CommunityPrefix name="x" linked /> component from @/components/fuega/community-prefix
- Community prefix display: f | name (orange colored, linked to /f/name)

COMPLETION SIGNAL: PROMPT_COMPLETE

===================================================================

"""

        full_prompt = auto_instructions + prompt_text

        # Save full prompt for debugging
        temp_prompt_file = PROJECT_DIR / f".temp_prompt_{prompt_id.replace('.', '_')}.txt"
        with open(temp_prompt_file, 'w', encoding='utf-8') as f:
            f.write(full_prompt)

        cmd = ["claude", "-p", full_prompt, "--dangerously-skip-permissions"]
        output_lines = []
        start_time = time.time()
        last_output_time = time.time()
        last_heartbeat_time = time.time()
        last_activity_time = time.time()   # Tracks stdout OR file changes
        last_file_check_time = time.time()
        baseline_mtime = self.get_latest_file_mtime()

        try:
            process = subprocess.Popen(
                cmd,
                cwd=PROJECT_DIR,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding='utf-8',
                errors='replace',
                bufsize=1
            )

            # Use a background thread to read stdout so we can timeout
            line_queue = queue.Queue()
            reader = threading.Thread(
                target=_reader_thread,
                args=(process.stdout, line_queue),
                daemon=True
            )
            reader.start()

            stream_ended = False
            while not stream_ended:
                # Try to get a line with a short timeout
                try:
                    line = line_queue.get(timeout=0.5)
                except queue.Empty:
                    line = None

                now = time.time()
                elapsed = now - start_time
                mins = int(elapsed // 60)
                secs = int(elapsed % 60)

                if line is not None:
                    # Check for sentinel (stream closed)
                    if line is None:
                        stream_ended = True
                        continue

                    line = line.rstrip('\n')
                    output_lines.append(line)
                    last_output_time = now
                    last_activity_time = now
                    last_heartbeat_time = now
                    self.log_detail(f"[{prompt_id}] {line}")

                    # Print ALL non-empty lines with color coding
                    if line.strip():
                        if 'error' in line.lower() or 'fail' in line.lower():
                            print(colored(f"  >> {line[:200]}", Colors.RED), flush=True)
                        elif 'success' in line.lower() or 'PROMPT_COMPLETE' in line or 'complete' in line.lower():
                            print(colored(f"  >> {line[:200]}", Colors.GREEN), flush=True)
                        elif any(kw in line.lower() for kw in ['creating', 'writing', 'reading', 'built', 'added', 'updated']):
                            print(colored(f"  >> {line[:200]}", Colors.CYAN), flush=True)
                        else:
                            print(f"  >> {line[:200]}", flush=True)
                    continue

                # line is None from queue.Empty — no data yet
                # Check if process has ended
                if process.poll() is not None:
                    # Drain remaining lines
                    while True:
                        try:
                            remaining = line_queue.get_nowait()
                            if remaining is None:
                                stream_ended = True
                                break
                            remaining = remaining.rstrip('\n')
                            output_lines.append(remaining)
                            self.log_detail(f"[{prompt_id}] {remaining}")
                            if remaining.strip():
                                print(f"  >> {remaining[:200]}", flush=True)
                        except queue.Empty:
                            stream_ended = True
                            break
                    continue

                # === No output right now — check file changes, heartbeat, inactivity ===
                silence_duration = now - last_output_time

                # Periodically check if files have been modified (Claude is working)
                if now - last_file_check_time >= FILE_CHECK_INTERVAL:
                    last_file_check_time = now
                    current_mtime = self.get_latest_file_mtime()
                    if current_mtime > baseline_mtime:
                        baseline_mtime = current_mtime
                        last_activity_time = now  # File changed — Claude is working

                inactive_duration = now - last_activity_time

                # Heartbeat every HEARTBEAT_INTERVAL seconds of silence
                if now - last_heartbeat_time >= HEARTBEAT_INTERVAL:
                    last_activity = datetime.fromtimestamp(last_activity_time).strftime("%H:%M:%S")
                    file_note = " (files changing)" if last_activity_time > last_output_time else ""
                    print(colored(
                        f"  [{mins:02d}:{secs:02d}] Prompt {prompt_id} still running... "
                        f"| {len(output_lines)} lines | last activity: {last_activity}{file_note} "
                        f"| silent {int(silence_duration)}s",
                        Colors.YELLOW + Colors.DIM
                    ), flush=True)
                    last_heartbeat_time = now

                # Inactivity timeout — no stdout AND no file changes
                if inactive_duration >= INACTIVITY_TIMEOUT:
                    self.log(
                        f"INACTIVITY TIMEOUT: No output or file changes for {int(inactive_duration)}s — killing stuck session",
                        Colors.RED, "WARN"
                    )
                    process.kill()
                    process.wait(timeout=10)
                    return "timeout", '\n'.join(output_lines), time.time() - start_time

                # Overall session timeout
                if elapsed >= MAX_SESSION_TIME:
                    self.log(f"SESSION TIMEOUT: {mins}m exceeded max session time", Colors.RED, "WARN")
                    process.kill()
                    process.wait(timeout=10)
                    return "timeout", '\n'.join(output_lines), time.time() - start_time

            # Stream ended normally
            process.wait(timeout=30)
            returncode = process.returncode
            output = '\n'.join(output_lines)

            elapsed = time.time() - start_time
            mins = int(elapsed // 60)
            secs = int(elapsed % 60)

            self.log("=" * 60, Colors.GREEN)
            self.log(f"COMPLETED PROMPT {prompt_id} in {mins}m {secs}s", Colors.GREEN + Colors.BOLD)
            self.log(f"   Return code: {returncode} | Output lines: {len(output_lines)}", Colors.GREEN)
            self.log("=" * 60, Colors.GREEN)
            print("", flush=True)

            # Check for token limit
            for pattern in TOKEN_LIMIT_PATTERNS:
                if pattern.lower() in output.lower():
                    self.log("Token limit detected, will restart", Colors.YELLOW)
                    return "token_limit", output, elapsed

            # Check for rate limit
            for pattern in RATE_LIMIT_PATTERNS:
                if pattern.lower() in output.lower():
                    self.log("Rate limit detected", Colors.YELLOW)
                    return "rate_limit", output, elapsed

            # Check for errors
            if returncode != 0:
                self.log_error(f"Claude Code failed with return code {returncode}")
                return "error", output, elapsed

            # Save full output
            output_file = PROJECT_DIR / f"outputs/prompt_{prompt_id.replace('.', '_')}.txt"
            output_file.parent.mkdir(exist_ok=True)
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(output)

            return "success", output, elapsed

        except subprocess.TimeoutExpired:
            process.kill()
            self.log_error(f"Prompt {prompt_id} timed out after 1 hour")
            return "timeout", '\n'.join(output_lines), MAX_SESSION_TIME

        except Exception as e:
            self.log_error(f"Exception running Prompt {prompt_id}: {e}")
            return "error", '\n'.join(output_lines), 0

        finally:
            if temp_prompt_file.exists():
                temp_prompt_file.unlink()

    def run_bootstrap(self):
        """Run bootstrap task to update all documentation"""
        # Skip if flag set
        if self.skip_bootstrap_flag:
            self.log("--skip-bootstrap flag set, skipping bootstrap", Colors.YELLOW)
            self.bootstrap_complete = True
            self.save_state()
            return True

        # Skip if BOOTSTRAP.md doesn't exist (already done)
        if not BOOTSTRAP_FILE.exists():
            self.log("BOOTSTRAP.md not found — bootstrap already complete, skipping", Colors.YELLOW)
            self.bootstrap_complete = True
            self.save_state()
            return True

        self.log("=" * 60, Colors.HEADER)
        self.log("BOOTSTRAP TASK: Updating all documentation", Colors.HEADER + Colors.BOLD)
        self.log("=" * 60, Colors.HEADER)

        # Read bootstrap instructions
        with open(BOOTSTRAP_FILE, 'r', encoding='utf-8') as f:
            bootstrap_content = f.read()

        # Run bootstrap with retry logic
        for attempt in range(MAX_RETRIES_PER_PROMPT):
            result, output, elapsed = self.run_claude_code(bootstrap_content, "BOOTSTRAP")

            if result == "success":
                self.log_success("Bootstrap complete - docs updated")
                self.bootstrap_complete = True
                self.save_state()

                # Verify BOOTSTRAP.md was deleted by Claude Code
                if BOOTSTRAP_FILE.exists():
                    self.log("BOOTSTRAP.md still exists, deleting manually", Colors.YELLOW)
                    BOOTSTRAP_FILE.unlink()

                return True

            elif result == "rate_limit":
                analysis = self.analyze_failure(output, 1, elapsed)
                self.wait_with_countdown(analysis.wait_seconds, analysis.message)
                continue

            elif result == "token_limit" or result == "timeout":
                self.log(f"Bootstrap attempt {attempt+1} returned {result}, retrying...", Colors.YELLOW)
                time.sleep(RETRY_BACKOFF_BASE * (2 ** attempt))
                continue

            else:
                self.log_error(f"Bootstrap failed with result: {result}")
                if attempt < MAX_RETRIES_PER_PROMPT - 1:
                    wait = RETRY_BACKOFF_BASE * (2 ** attempt)
                    self.log(f"Retrying in {wait}s (attempt {attempt+2}/{MAX_RETRIES_PER_PROMPT})...", Colors.YELLOW)
                    time.sleep(wait)
                    continue
                return False

        self.log_error(f"Bootstrap failed after {MAX_RETRIES_PER_PROMPT} attempts")
        return False

    def get_design_fixup_prompt(self):
        """Build a fixup prompt that audits completed Phase 3 code against updated UI_DESIGN.md"""
        return """
CONTEXT: The design docs (UI_DESIGN.md, PROMPT.md) have been updated with the correct
fuega.ai terminal/lava aesthetic from the fuega-site reference codebase. Some Phase 3
code may have been built with an older, incorrect design system (fire-red, dark-bg,
dark-surface, dark-border, text-primary, text-secondary, Inter font, tailwind.config.js).

READ: UI_DESIGN.md (the authoritative design spec — lava/void/coal color system, JetBrains Mono, Tailwind v4)
READ: CLAUDE.md (project context and terminology)

TASK — DESIGN SYSTEM AUDIT & FIX:

1. SCAN all files in app/ and components/ for these WRONG patterns:
   - CSS classes: dark-bg, dark-surface, dark-border, text-primary, text-secondary, text-tertiary, fire-red, fire-orange, fire-yellow, bg-fire-gradient
   - Font references: "Inter", "System UI" (should be JetBrains Mono)
   - Tailwind v3: tailwind.config.js or tailwind.config.ts (should use @theme inline in globals.css)
   - Wrong color hex codes: #1a1a1a, #2a2a2a, #0a0a0a (should be void #050505, coal #111111)

2. REPLACE with correct fuega.ai design system from UI_DESIGN.md:
   - dark-bg → bg-void
   - dark-surface → bg-coal
   - dark-border → border-lava-hot/20 or border-lava-hot/10
   - text-primary → text-foreground
   - text-secondary → text-ash
   - text-tertiary → text-smoke
   - fire-red / fire-orange → lava-hot
   - fire-yellow → lava-glow
   - bg-fire-gradient → bg-gradient-to-r from-lava-hot to-lava-glow
   - "Inter" font → JetBrains Mono (font-mono class)

3. VERIFY globals.css uses Tailwind v4 @theme inline (NOT tailwind.config.js)

4. VERIFY app/layout.tsx loads JetBrains Mono via next/font with --font-jetbrains variable

5. ADD light mode support:
   - Add .light / [data-theme="light"] CSS overrides to globals.css per UI_DESIGN.md Light Mode section
   - Ensure ThemeContext toggles dark/light class on documentElement

6. FIX community prefix display:
   - Community names must display as "f | name" (spaced pipe), NOT "f/name"
   - HTML: <span class="text-lava-hot">f</span><span class="text-smoke mx-1">|</span><span>name</span>
   - URL routes stay as /f/[community] (slash in URL path is fine)
   - Search should normalize: handle "f|name", "f/name", "f | name" inputs

7. FIX any build errors found (TypeScript, missing imports, etc.) — fix ALL errors regardless of which phase they came from.

OUTPUT: List every file changed and what was fixed.
"""

    def run_design_fixup(self):
        """Run a one-time design system fixup on completed Phase 3 code."""
        if FIXUP_MARKER.exists():
            self.log("Design fixup already completed, skipping", Colors.YELLOW)
            return True

        # Only run if we've completed any Phase 3 prompts
        completed = self.state.get("completed_prompts", [])
        phase3_done = [p for p in completed if p.startswith("3.")]
        if not phase3_done:
            self.log("No Phase 3 prompts completed yet, skipping design fixup", Colors.YELLOW)
            return True

        self.log("=" * 60, Colors.HEADER)
        self.log("DESIGN SYSTEM FIXUP — Aligning code with updated UI_DESIGN.md", Colors.HEADER + Colors.BOLD)
        self.log("=" * 60, Colors.HEADER)
        self.log(f"Phase 3 prompts to audit: {', '.join(phase3_done)}", Colors.CYAN)

        fixup_prompt = self.get_design_fixup_prompt()

        for attempt in range(MAX_RETRIES_PER_PROMPT):
            result, output, elapsed = self.run_claude_code(fixup_prompt, "FIXUP")

            if result == "success":
                self.log_success("Design fixup complete — code aligned with UI_DESIGN.md")
                FIXUP_MARKER.touch()
                self.git_push("FIXUP")
                return True

            elif result == "rate_limit":
                analysis = self.analyze_failure(output, 1, elapsed)
                self.wait_with_countdown(analysis.wait_seconds, analysis.message)
                continue

            elif result in ("token_limit", "timeout"):
                self.log(f"Fixup attempt {attempt+1} returned {result}, retrying...", Colors.YELLOW)
                time.sleep(RETRY_BACKOFF_BASE * (2 ** attempt))
                continue

            else:
                self.log_error(f"Fixup failed with result: {result}")
                if attempt < MAX_RETRIES_PER_PROMPT - 1:
                    wait = RETRY_BACKOFF_BASE * (2 ** attempt)
                    self.log(f"Retrying in {wait}s...", Colors.YELLOW)
                    time.sleep(wait)
                    continue
                # Don't block the build on fixup failure — continue with remaining prompts
                self.log("Design fixup failed but continuing build...", Colors.YELLOW)
                return True

        self.log("Design fixup exhausted retries, continuing build...", Colors.YELLOW)
        return True

    def run_build(self):
        """Main build loop"""
        self.log("=" * 60, Colors.BOLD)
        self.log("FUEGA.AI AUTOMATED BUILDER", Colors.BOLD)
        self.log("=" * 60, Colors.BOLD)

        # Doc update notification
        self.log("", Colors.CYAN)
        self.log("📋 DOC UPDATES DETECTED:", Colors.CYAN + Colors.BOLD)
        self.log("  ✅ UI_DESIGN.md — Updated with fuega-site source (terminal/lava aesthetic)", Colors.GREEN)
        self.log("  ✅ PROMPT.md — Fixed design system refs, added READ directives, V1 terminology", Colors.GREEN)
        self.log("  ✅ UI_DESIGN.md — Light mode spec added (dark red contrast on light bg)", Colors.GREEN)
        self.log("  ✅ GAMIFICATION.md, DATA_SCHEMA.md, SECURITY.md, DEPLOYMENT.md — Referenced in prompts", Colors.GREEN)
        self.log("  ✅ Builder — Design fixup loop will audit completed code against updated specs", Colors.GREEN)
        self.log("", Colors.CYAN)

        self.log(f"Total prompts: {len(self.prompts)}", Colors.CYAN)
        self.log(f"Resuming from prompt index: {self.current_prompt}", Colors.CYAN)
        self.log(f"Current phase: {self.current_phase}", Colors.CYAN)
        completed = self.state.get("completed_prompts", [])
        if completed:
            self.log(f"Already completed: {', '.join(completed)}", Colors.GREEN)
        print("", flush=True)

        # Run bootstrap if not already complete
        if not self.bootstrap_complete:
            if not self.run_bootstrap():
                return "failed"
            print("", flush=True)

        # Run design fixup if Phase 3 code needs alignment with updated docs
        self.run_design_fixup()
        print("", flush=True)

        if not self.prompts:
            self.log_error("No prompts found in PROMPT.md!")
            return "failed"

        # Process each prompt
        for i in range(self.current_prompt, len(self.prompts)):
            prompt = self.prompts[i]
            prompt_id = prompt["id"]
            prompt_text = prompt["text"]

            # Skip if already completed
            if prompt_id in self.state.get("completed_prompts", []):
                self.log(f"Skipping {prompt_id} (already completed)", Colors.YELLOW)
                continue

            # Run prompt with auto-fix retry loop
            success = False
            for attempt in range(MAX_RETRIES_PER_PROMPT):
                retry_num = self.get_retry_count(prompt_id)
                if retry_num > 0:
                    self.log(
                        f"Retry {retry_num}/{MAX_RETRIES_PER_PROMPT} for prompt {prompt_id}",
                        Colors.YELLOW + Colors.BOLD
                    )

                result, output, elapsed = self.run_claude_code(prompt_text, prompt_id)

                if result == "success":
                    success = True
                    self.reset_retry(prompt_id)
                    break

                # Analyze the failure
                analysis = self.analyze_failure(output, 1 if result != "success" else 0, elapsed)
                self.log(
                    f"AUTO-FIX: {analysis.category} — {analysis.message}",
                    Colors.YELLOW, "AUTOFIX"
                )

                if result == "rate_limit" or analysis.category == "rate_limit":
                    # Rate limit: wait for reset, don't count as retry
                    self.wait_with_countdown(analysis.wait_seconds, analysis.message)
                    continue

                if not analysis.retriable:
                    self.log_error(f"Non-retriable failure for {prompt_id}: {analysis.category}")
                    break

                # Increment retry counter
                count = self.increment_retry(prompt_id)
                if count >= MAX_RETRIES_PER_PROMPT:
                    self.log_error(f"Max retries ({MAX_RETRIES_PER_PROMPT}) exhausted for {prompt_id}")
                    break

                # Wait with backoff before retry
                wait = RETRY_BACKOFF_BASE * (2 ** attempt)
                self.log(f"Waiting {wait}s before retry {count+1}...", Colors.YELLOW)
                time.sleep(wait)

            if not success:
                self.log_error(f"Build stopped at Prompt {prompt_id} after all retries")
                self.save_state()
                return "failed"

            # === Prompt succeeded ===
            if "completed_prompts" not in self.state:
                self.state["completed_prompts"] = []
            self.state["completed_prompts"].append(prompt_id)
            self.current_prompt = i + 1
            self.current_phase = prompt["phase"]
            self.save_state()

            # Git commit and push so changes are visible on the web
            self.git_push(prompt_id)

            # Show progress
            completed_count = len(self.state["completed_prompts"])
            total = len(self.prompts)
            remaining = total - completed_count
            percent = int((completed_count / total) * 100)
            self.log(
                f"PROGRESS: {completed_count}/{total} ({percent}%) | {remaining} remaining",
                Colors.CYAN + Colors.BOLD
            )
            print("", flush=True)

        # All prompts completed!
        self.log("=" * 60, Colors.GREEN + Colors.BOLD)
        self.log_success("ALL PROMPTS COMPLETED!")
        self.log("=" * 60, Colors.GREEN + Colors.BOLD)
        self.log("fuega.ai build complete!", Colors.GREEN)
        return "done"


def main():
    """Entry point"""
    parser = argparse.ArgumentParser(description="fuega.ai Automated Builder")
    parser.add_argument(
        '--skip-bootstrap', action='store_true',
        help='Skip the bootstrap step (useful if docs are already updated)'
    )
    args = parser.parse_args()

    print(colored("=" * 60, Colors.BOLD))
    print(colored("  FUEGA.AI BUILDER", Colors.BOLD))
    print(colored("=" * 60, Colors.BOLD))
    print("")
    print(colored("This builder will:", Colors.CYAN))
    print(colored("  1. Run BOOTSTRAP (if needed) - update all docs", Colors.CYAN))
    print(colored("  2. Resume from checkpoint - no cleanup", Colors.CYAN))
    print(colored("  3. Build fuega.ai with full features", Colors.CYAN))
    print(colored(f"  4. Inactivity timeout: {INACTIVITY_TIMEOUT}s (stdout+files) | Heartbeat: every {HEARTBEAT_INTERVAL}s", Colors.CYAN))
    print(colored(f"  5. Auto-fix: rate limits (wait+retry), crashes ({MAX_RETRIES_PER_PROMPT} retries/prompt)", Colors.CYAN))
    if args.skip_bootstrap:
        print(colored("  ** --skip-bootstrap flag set **", Colors.YELLOW))
    print("")

    # Single run — no outer restart loop needed, auto-fix handles retries internally
    builder = FuegaBuilder(skip_bootstrap=args.skip_bootstrap)
    result = builder.run_build()

    if result == "done":
        print(colored("\n  fuega.ai is ready!\n", Colors.GREEN + Colors.BOLD))
        print(colored("Next steps:", Colors.CYAN))
        print(colored("  1. Review build logs", Colors.CYAN))
        print(colored("  2. Test locally: npm run dev", Colors.CYAN))
        print(colored("  3. Deploy: git push origin main", Colors.CYAN))
    else:  # "failed"
        print(colored("\n  Build paused - check logs\n", Colors.RED))
        print(colored("The auto-fix system exhausted all retries.", Colors.YELLOW))
        print(colored("Check build_log.txt and build_log_detail.txt for details.", Colors.YELLOW))


if __name__ == "__main__":
    main()
