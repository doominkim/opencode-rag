# Global Permissions Path Clarification

## What Failed
Agents interpreted `PERMISSIONS.md` as a project-relative file and looked for it in the active project directory instead of the global OpenCode configuration directory.

## Why
`AGENTS.md` referred to `PERMISSIONS.md` without an absolute path in several policy sections, even though the canonical file lives at `/Users/dominic/.config/opencode/PERMISSIONS.md`.

## What Was Added To Harness
`AGENTS.md` now explicitly instructs agents to read `/Users/dominic/.config/opencode/PERMISSIONS.md` and not to prefer the current project root's relative `PERMISSIONS.md`.

## How To Verify
Search `AGENTS.md` for permission policy references and confirm they point to `/Users/dominic/.config/opencode/PERMISSIONS.md` where path specificity matters.

## Related
- `/Users/dominic/.config/opencode/AGENTS.md`
- `/Users/dominic/.config/opencode/PERMISSIONS.md`
