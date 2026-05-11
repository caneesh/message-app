# OneRoom Safe UI Migration Plan

## Baseline Reference
- Git tag: `baseline-v1`
- Rollback command: `git checkout baseline-v1`

---

## Current App Structure

### Entry Flow
```
src/main.jsx
  └── App.jsx
        └── AppLayout.jsx (src/layout/)
              └── ChatPage.jsx (src/chat/)
                    └── AppShell.jsx (src/components/)
                          ├── Sidebar.jsx (desktop)
                          ├── MobileDrawer.jsx (mobile)
                          └── {children} (content screens)
```

### Key Files

| Category | File | Purpose |
|----------|------|---------|
| **Entry** | `src/main.jsx` | CSS imports, React root |
| **Layout** | `src/layout/AppLayout.jsx` | Auth gate, loads ChatPage |
| **Shell** | `src/components/AppShell.jsx` | Sidebar + header + content |
| **Sidebar** | `src/components/Sidebar.jsx` | Navigation items (desktop) |
| **Mobile Nav** | `src/components/MobileDrawer.jsx` | Navigation (mobile) |
| **Icons** | `src/components/icons.jsx` | All icons (fixed 20x20) |
| **Main Page** | `src/chat/ChatPage.jsx` | Tab router, renders screens |

### Content Screens (all in `src/chat/`)
- `Dashboard.jsx`
- `MessageList.jsx` + `MessageInput.jsx` (chat)
- `Decisions.jsx`
- `Promises.jsx`
- `Reminders.jsx`, `Events.jsx`, `Lists.jsx`
- `Notes.jsx`, `Capsules.jsx`, `Memories.jsx`, `Vault.jsx`
- `Misunderstandings.jsx`, `CheckIn.jsx`, `CareMode.jsx`
- `Settings.jsx`, `Devices.jsx`

### CSS Files
| File | Purpose |
|------|---------|
| `design-system.css` | CSS variables, tokens (ALREADY EXISTS) |
| `design-components.css` | Component styles |
| `design-features.css` | Feature-specific styles |
| `design-auth.css` | Auth form styles |
| `styles.css` | Legacy/base styles |

---

## Previous Breakage Analysis

### Root Cause
In `premium-base.css`:
```css
img, svg {
  display: block;
  max-width: 100%;  /* BROKE ALL ICONS */
}
```

### Why It Broke
1. Global rule affected ALL svgs in the app
2. Icons inside sidebar expanded to container width
3. Dashboard icons became massive
4. No explicit size constraints on icons in new components

### Secondary Issues
- Swapped entire AppLayout to render PremiumDemo
- Used CSS variables without fallbacks
- No incremental testing per component

---

## Safe Migration Rules

### NEVER DO
1. Add global `svg`, `img` sizing rules
2. Replace AppShell or AppLayout entirely
3. Change routing logic
4. Remove existing functionality
5. Use unconstrained width/height

### ALWAYS DO
1. Use explicit icon sizes: `w-4 h-4`, `w-5 h-5`, `w-6 h-6`
2. Test after each component change
3. Build before committing
4. Scope CSS to specific components
5. Keep fallback values for CSS variables

---

## Implementation Sequence

### Phase 1: Design Tokens (Safe Foundation)
- [ ] Add new CSS variables to existing `:root` in `design-system.css`
- [ ] DO NOT add global resets
- [ ] Verify build + no visual changes

### Phase 2: Sidebar Redesign
- [ ] Modify ONLY `Sidebar.jsx`
- [ ] Keep icon sizes explicit (already 20x20 in icons.jsx)
- [ ] Test: all nav links work, no overflow

### Phase 3: Chat Screen Redesign
- [ ] Modify ONLY `MessageList.jsx` + `MessageInput.jsx`
- [ ] Keep existing props/logic
- [ ] Test: send message, attachments, reactions

### Phase 4: Dashboard Redesign
- [ ] Modify ONLY `Dashboard.jsx`
- [ ] Use explicit icon sizes (w-5 h-5 or smaller)
- [ ] Test: all stats render, no giant icons

### Phase 5: Decisions Hub Redesign
- [ ] Modify ONLY `Decisions.jsx`
- [ ] Test: decisions render, actions work

### Phase 6: Promises Hub Redesign
- [ ] Modify ONLY `Promises.jsx`
- [ ] Test: promises render, status updates work

### Phase 7: Final Polish
- [ ] Consistency check across screens
- [ ] Mobile layout verification
- [ ] Dark mode verification

---

## Verification Checklist (After Each Phase)

```bash
# Build check
npm run build

# Visual checks
- [ ] No giant icons
- [ ] No horizontal overflow
- [ ] Sidebar width normal
- [ ] All nav links work
- [ ] Content renders correctly
- [ ] Dark mode works
- [ ] Mobile layout works
```

---

## Rollback Strategy

### Quick Rollback (any phase)
```bash
git checkout baseline-v1
npm run build
firebase deploy --only hosting
```

### Partial Rollback (specific file)
```bash
git checkout baseline-v1 -- src/path/to/file.jsx
npm run build
```
