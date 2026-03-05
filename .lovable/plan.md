

## Problem

The holiday tooltip on date headers (e.g. "Fr. 01.05") in the Wochenplan table is clipped/unreadable because the tooltip renders inside a scroll container with `overflow: hidden/auto`, causing it to be cut off.

## Root Cause

In `ZtWochenplan.tsx` (lines 552-558), the `<TooltipContent>` renders inside a `<div>` with `overflow-x-auto overflow-y-auto` (line 535). The tooltip content gets clipped by the container boundaries.

## Solution

Replace the `Tooltip` with a `Popover` (or use `HoverCard`) for holiday date headers, which renders via a portal and escapes scroll containers. Alternatively, add explicit portal rendering to the `TooltipContent`.

### Changes

**`src/pages/zeiterfassung/ZtWochenplan.tsx`** (lines 551-559):
- Replace the `Tooltip` / `TooltipContent` with a `HoverCard` / `HoverCardContent` (already used elsewhere in the codebase, e.g. `BuchhaltungRow.tsx` for sick days).
- Use `side="bottom"` and ensure the content renders via a portal (HoverCard does this by default).
- This matches the existing pattern used for the sick-days hover in `BuchhaltungRow.tsx`.

The change is minimal: swap `Tooltip`→`HoverCard`, `TooltipTrigger`→`HoverCardTrigger`, `TooltipContent`→`HoverCardContent` for the holiday name display on date headers.

