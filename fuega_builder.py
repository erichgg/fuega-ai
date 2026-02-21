#!/usr/bin/env python
"""
fuega_builder.py - FINAL Automated Builder for fuega.ai

This script:
- Cleans the project folder (preserves only planning docs)
- Runs Claude Code with full automation
- Makes ALL decisions automatically
- Shows colored, verbose real-time output
- Reviews context before each prompt
- Handles restarts and token limits
- Logs everything to files
"""

import subprocess
import sys
import time
import json
import re
import os
from datetime import datetime
from pathlib import Path

# ANSI Color codes for beautiful console output
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'
    END = '\033[0m'

def colored(text, color):
    """Add color to text"""
    return f"{color}{text}{Colors.END}"

# Configuration
PROJECT_DIR = Path(__file__).parent
PROMPT_FILE = PROJECT_DIR / "PROMPT.md"
LOG_FILE = PROJECT_DIR / "build_log.txt"
DETAIL_LOG_FILE = PROJECT_DIR / "build_log_detail.txt"
STATE_FILE = PROJECT_DIR / ".builder_state.json"
INJECTION_FILE = PROJECT_DIR / "INJECTION.md"

# Files to KEEP during cleanup
KEEP_FILES = {
    'SCOPE_AND_REQUIREMENTS.md',
    'DATA_SCHEMA.md',
    'SECURITY.md',
    'DEPLOYMENT.md',
    'SCRUB.md',
    'PROMPT.md',
    'fuega_builder.py',
    'run_builder.bat',
    'run_builder.ps1',
    'INJECTION.md',
    'README.md',
    '.env',  # Keep if exists
    '.gitignore',  # Keep if exists
}

# Timing
MAX_SESSION_TIME = 3600  # 1 hour
TOKEN_LIMIT_RETURN_CODES = [2]
TOKEN_LIMIT_PATTERNS = [
    "context window",
    "conversation is too long",
    "token limit",
    "context limit",
    "maximum context length",
]

class FuegaBuilder:
    def __init__(self):
        self.state = self.load_state()
        self.is_restart = self.state.get("total_runs", 0) > 0
        self.state["total_runs"] = self.state.get("total_runs", 0) + 1
        self.start_time = datetime.now()
        self.current_phase = self.state.get("current_phase", 0)
        self.current_prompt = self.state.get("current_prompt", 0)
        self.prompts = self.load_prompts()
        
    def load_state(self):
        """Load build state from file"""
        if STATE_FILE.exists():
            with open(STATE_FILE, 'r') as f:
                return json.load(f)
        return {
            "current_phase": 0,
            "current_prompt": 0,
            "completed_prompts": [],
            "last_run": None,
            "total_runs": 0
        }
    
    def save_state(self):
        """Save current build state"""
        self.state["last_run"] = datetime.now().isoformat()
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
        print(colored(log_line, color))
        
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
    
    def cleanup_project(self):
        """Clean project folder, keeping only planning docs"""
        self.log("=" * 60, Colors.YELLOW)
        self.log("🧹 CLEANING PROJECT FOLDER", Colors.YELLOW)
        self.log("=" * 60, Colors.YELLOW)
        
        if not PROJECT_DIR.exists():
            self.log("Project directory doesn't exist, skipping cleanup", Colors.YELLOW)
            return
        
        removed_count = 0
        kept_count = 0
        
        for item in PROJECT_DIR.iterdir():
            # Skip the builder script itself
            if item.name == Path(__file__).name:
                continue
                
            # Keep planning docs and essential files
            if item.name in KEEP_FILES:
                kept_count += 1
                self.log(f"  ✓ Keeping: {item.name}", Colors.GREEN)
                continue
            
            # Remove everything else
            try:
                if item.is_file():
                    item.unlink()
                    removed_count += 1
                    self.log(f"  ✗ Removed: {item.name}", Colors.RED)
                elif item.is_dir() and item.name != '__pycache__':
                    import shutil
                    shutil.rmtree(item)
                    removed_count += 1
                    self.log(f"  ✗ Removed: {item.name}/ (directory)", Colors.RED)
            except Exception as e:
                self.log_error(f"Failed to remove {item.name}: {e}")
        
        self.log("", Colors.END)
        self.log(f"✅ Cleanup complete: Kept {kept_count} files, Removed {removed_count} items", Colors.GREEN)
        self.log("", Colors.END)
    
    def run_claude_code(self, prompt_text, prompt_id):
        """Run Claude Code with a specific prompt, streaming output in real-time"""
        self.log("=" * 60, Colors.BLUE)
        self.log(f"🚀 STARTING PROMPT {prompt_id}", Colors.BLUE + Colors.BOLD)
        self.log("=" * 60, Colors.BLUE)
        print(colored(f"  Task: {prompt_text[:100]}...\n", Colors.CYAN))

        # Add SUPER AGGRESSIVE automation instructions
        auto_instructions = """
═══════════════════════════════════════════════════════════════
⚠️  EXTREME AUTOMATION MODE - ABSOLUTE ZERO QUESTIONS  ⚠️
═══════════════════════════════════════════════════════════════

🚨 YOU ARE IN FULLY AUTOMATED BUILD MODE 🚨

MANDATORY FIRST - REVIEW CONTEXT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BEFORE executing your task:

1. READ to understand current state:
   - CLAUDE.md (if exists - project context)
   - build_log_detail.txt (recent work - last 50 lines)
   - List files: ls -la app/ components/ lib/ migrations/
   - Check: package.json, .env, existing code

2. OUTPUT your context review:
   "📋 CONTEXT REVIEW:
   - Existing files: [list what you found]
   - Last work done: [what previous prompt did]
   - Current state: [brief summary]
   - My task now: [what you're about to do]
   
   ✅ Context reviewed, beginning execution..."

3. THEN execute building on what exists

ABSOLUTE IRON-CLAD RULES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ NEVER EVER ASK QUESTIONS - Decide and execute
❌ NEVER WAIT FOR APPROVAL - Everything is pre-approved
❌ NEVER REQUEST CONFIRMATION - Just execute
❌ NEVER SAY "What would you like" - Execute the task
❌ NEVER SAY "Should I proceed" - YES, always proceed
❌ NEVER SAY "Which approach" - Pick best and execute
❌ NEVER SAY "Ready to implement when you approve" - NO, implement NOW
❌ NEVER PAUSE OR WAIT - Immediate execution only

✅ ALWAYS review context first (see above)
✅ ALWAYS output as you work (every 10-15 seconds)
✅ ALWAYS show file names as you create them
✅ ALWAYS complete tasks fully
✅ ALWAYS build on existing work (don't replace)

IF YOU CATCH YOURSELF:
- Asking any question → STOP. Make the decision. Execute.
- Waiting for input → STOP. Assume YES. Execute.
- Planning silently → STOP. Output your plan. Execute immediately.
- Hesitating → STOP. Pick the best option. Execute.

REQUIRED OUTPUT (narrate as you work):
- "Creating file: app/api/auth/route.ts..."
- "Writing authentication logic..."
- "Adding error handling..."
- "Testing auth endpoint..."
- "✅ Auth complete"

AUTOMATIC DECISIONS (NEVER ASK):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ DATABASE_URL missing? → Use process.env or create in-memory mock
✓ Sync vs Async? → SYNCHRONOUS (spec says real-time <3sec)
✓ Which approach? → Most production-ready, follows SCOPE.md
✓ Plan approval? → AUTO-APPROVED, execute immediately
✓ Mock vs Real data? → Mock data, clearly marked for deletion
✓ Technology? → Use package.json dependencies
✓ Architecture? → Follow SCOPE_AND_REQUIREMENTS.md
✓ Files exist? → Review and enhance, don't replace
✓ Missing info? → Reasonable assumption, continue
✓ Execution method? → Subagent-driven, fast iteration
✓ Test coverage? → Comprehensive (80%+), production-ready
✓ Error handling? → Complete with logging
✓ Security? → Maximum, follow SECURITY.md

PRODUCTION STANDARDS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ COMPLETE production code (ZERO TODOs/stubs)
✓ Comprehensive error handling
✓ Detailed logging for debugging
✓ Thorough automated tests
✓ Security best practices
✓ Clean, maintainable code
✓ TypeScript strict mode
✓ Build on existing work

TEST DATA MARKING:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Mark: "// TEST_DATA - DELETE BEFORE PRODUCTION"
✓ Mark: "-- SEED DATA - DELETE BEFORE PRODUCTION"
✓ Test users: test_user_1, test_user_2, demo_admin
✓ Test communities: f/test-tech, f/demo-science
✓ Easy cleanup: DELETE FROM users WHERE username LIKE 'test_%';

COMPLETION SIGNAL (REQUIRED):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
When finished, output: ✅ PROMPT_COMPLETE

═══════════════════════════════════════════════════════════════
🔥 FIRST: Review context. THEN: Execute task below 🔥
═══════════════════════════════════════════════════════════════

"""

        full_prompt = auto_instructions + prompt_text
        
        # Save full prompt
        temp_prompt_file = PROJECT_DIR / f".temp_prompt_{prompt_id.replace('.', '_')}.txt"
        with open(temp_prompt_file, 'w', encoding='utf-8') as f:
            f.write(full_prompt)

        cmd = [
            "claude",
            "-p", full_prompt,
            "--dangerously-skip-permissions"
        ]

        output_lines = []
        last_status_time = time.time()
        start_time = time.time()

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

            for line in process.stdout:
                line = line.rstrip('\n')
                output_lines.append(line)
                self.log_detail(f"[{prompt_id}] {line}")

                # Show ALL output in real-time (colored)
                if line.strip():
                    # Color code based on content
                    if 'error' in line.lower() or 'fail' in line.lower():
                        print(colored(f"  >> {line[:150]}", Colors.RED), flush=True)
                    elif 'success' in line.lower() or '✅' in line or 'complete' in line.lower():
                        print(colored(f"  >> {line[:150]}", Colors.GREEN), flush=True)
                    elif 'creating' in line.lower() or 'writing' in line.lower():
                        print(colored(f"  >> {line[:150]}", Colors.CYAN), flush=True)
                    else:
                        print(f"  >> {line[:150]}", flush=True)

                # Status update every 3 seconds
                now = time.time()
                if now - last_status_time >= 3:
                    elapsed = now - start_time
                    mins = int(elapsed // 60)
                    secs = int(elapsed % 60)
                    print(colored(f"  [{mins:02d}:{secs:02d}] Prompt {prompt_id} | {len(output_lines)} lines", Colors.YELLOW), flush=True)
                    last_status_time = now

            process.wait(timeout=3600)
            returncode = process.returncode
            output = '\n'.join(output_lines)

            elapsed = time.time() - start_time
            mins = int(elapsed // 60)
            secs = int(elapsed % 60)
            
            self.log("=" * 60, Colors.GREEN)
            self.log(f"✅ COMPLETED PROMPT {prompt_id} in {mins}m {secs}s", Colors.GREEN + Colors.BOLD)
            self.log(f"   Return code: {returncode} | Output lines: {len(output_lines)}", Colors.GREEN)
            self.log("=" * 60, Colors.GREEN)
            print("")

            # Check for token limit
            if returncode in TOKEN_LIMIT_RETURN_CODES:
                self.log("Token limit detected (return code), will restart", Colors.YELLOW)
                return "token_limit"

            for pattern in TOKEN_LIMIT_PATTERNS:
                if pattern.lower() in output.lower():
                    self.log("Token limit detected (output pattern), will restart", Colors.YELLOW)
                    return "token_limit"

            # Check for errors
            if returncode != 0:
                self.log_error(f"Claude Code failed with return code {returncode}")
                self.log_error(f"Output (last 500 chars): {output[-500:]}")
                return "error"

            # Save full output
            output_file = PROJECT_DIR / f"outputs/prompt_{prompt_id.replace('.', '_')}.txt"
            output_file.parent.mkdir(exist_ok=True)
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(output)

            return "success"

        except subprocess.TimeoutExpired:
            process.kill()
            self.log_error(f"Prompt {prompt_id} timed out after 1 hour")
            return "timeout"

        except Exception as e:
            self.log_error(f"Exception running Prompt {prompt_id}: {e}")
            return "error"

        finally:
            if temp_prompt_file.exists():
                temp_prompt_file.unlink()
    
    def check_injection(self):
        """Check INJECTION.md for hot-injected tasks"""
        if not INJECTION_FILE.exists():
            return True
            
        with open(INJECTION_FILE, 'r', encoding='utf-8') as f:
            content = f.read().strip()
            
        # Check if file is empty or just template
        if not content or 'Hot Task Injection' in content or len(content) < 50:
            return True

        self.log("INJECTION.md has content - executing injected task first...", Colors.YELLOW)
        self.log(f"Injection: {content[:100]}...", Colors.YELLOW)

        result = self.run_claude_code(content, "INJECT")

        # Clear the file
        with open(INJECTION_FILE, 'w', encoding='utf-8') as f:
            f.write("")

        if result == "success":
            self.log_success("Injection completed successfully, resuming normal build")
            return True
        elif result == "token_limit":
            self.log("Token limit hit during injection, will restart", Colors.YELLOW)
            return False
        else:
            self.log_error(f"Injection failed with result: {result}")
            self.log("Continuing normal build despite injection failure...", Colors.YELLOW)
            return True
    
    def run_build(self):
        """Main build loop"""
        self.log("=" * 60, Colors.BOLD)
        self.log("🔥 FUEGA.AI AUTOMATED BUILDER STARTED 🔥", Colors.BOLD)
        self.log("=" * 60, Colors.BOLD)
        self.log(f"Total prompts to execute: {len(self.prompts)}", Colors.CYAN)
        self.log(f"Starting from prompt {self.current_prompt}", Colors.CYAN)
        self.log(f"Current phase: {self.current_phase}", Colors.CYAN)
        print("")

        if not self.prompts:
            self.log_error("No prompts found in PROMPT.md! Nothing to do.")
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

            # Check for hot-injected tasks
            if not self.check_injection():
                self.current_prompt = i
                self.save_state()
                return "restart"

            # Run prompt
            result = self.run_claude_code(prompt_text, prompt_id)
            
            # Handle result
            if result == "success":
                if "completed_prompts" not in self.state:
                    self.state["completed_prompts"] = []
                self.state["completed_prompts"].append(prompt_id)
                self.current_prompt = i + 1
                self.current_phase = prompt["phase"]
                self.save_state()
                
                # Show progress
                completed = len(self.state["completed_prompts"])
                total = len(self.prompts)
                remaining = total - completed
                percent = int((completed / total) * 100)
                self.log(f"📊 PROGRESS: {completed}/{total} ({percent}%) | {remaining} remaining", Colors.CYAN + Colors.BOLD)
                print("")
                
            elif result == "token_limit":
                self.log("Restarting due to token limit...", Colors.YELLOW)
                self.current_prompt = i
                self.save_state()
                return "restart"
                
            elif result == "error" or result == "timeout":
                self.log_error(f"Build stopped at Prompt {prompt_id}")
                self.log_error("Manual intervention required")
                self.log_error(f"Check outputs/prompt_{prompt_id.replace('.', '_')}.txt for details")
                self.save_state()
                return "failed"
        
        # All prompts completed!
        self.log("=" * 60, Colors.GREEN + Colors.BOLD)
        self.log_success("🎉 ALL PROMPTS COMPLETED! 🎉")
        self.log("=" * 60, Colors.GREEN + Colors.BOLD)
        self.log("fuega.ai v1 build complete!", Colors.GREEN)
        elapsed_hours = (datetime.now() - self.start_time).total_seconds() / 3600
        self.log(f"Total time: {elapsed_hours:.1f} hours", Colors.GREEN)
        return "done"

def main():
    """Entry point"""
    print(colored("=" * 60, Colors.BOLD))
    print(colored("🔥 FUEGA.AI FINAL BUILDER 🔥", Colors.BOLD))
    print(colored("=" * 60, Colors.BOLD))
    print("")
    
    # Ask for confirmation before cleanup
    print(colored("⚠️  WARNING: This will DELETE all files except planning docs!", Colors.RED + Colors.BOLD))
    print(colored("   Files that will be KEPT:", Colors.YELLOW))
    for filename in sorted(KEEP_FILES):
        print(colored(f"     ✓ {filename}", Colors.GREEN))
    print("")
    print(colored("   Everything else will be DELETED!", Colors.RED))
    print("")
    
    response = input(colored("Continue? (yes/no): ", Colors.YELLOW))
    if response.lower() not in ['yes', 'y']:
        print(colored("Cancelled by user", Colors.RED))
        return
    
    print("")
    
    # Run builder in a loop
    while True:
        builder = FuegaBuilder()
        
        # Clean project on first run
        if builder.state.get("total_runs") == 1:
            builder.cleanup_project()
        
        result = builder.run_build()

        if result == "restart":
            print(colored("\n--- Restarting builder (new session) ---\n", Colors.YELLOW))
            time.sleep(2)
            continue
        elif result == "done":
            print(colored("\n🔥 fuega.ai is ready to launch! 🔥\n", Colors.GREEN + Colors.BOLD))
            break
        else:  # "failed"
            print(colored("\n⚠️ Build paused - check logs for details\n", Colors.RED))
            break

if __name__ == "__main__":
    main()
