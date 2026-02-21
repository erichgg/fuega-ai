# INJECTION.md - Hot Task Injection

Leave this file empty for normal operation.

If you need to inject an urgent task while the builder is running, edit this file with your task and save it. The builder will execute it before the next scheduled prompt.

## Example:

```
FIX BUG: Auth endpoint returning 500 errors

READ: app/api/auth/login/route.ts
DEBUG: Find the issue
FIX: Correct the problem
TEST: Verify it works

When done output: ✅ PROMPT_COMPLETE
```

---

**Status:** Empty - No injection pending
