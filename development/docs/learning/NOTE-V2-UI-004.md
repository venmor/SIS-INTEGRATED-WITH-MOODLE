# V2 public discovery presentation review

TASK-V2-UI-004 turns the programme search into a focused entry point. The primary search remains visible, while labelled detailed filters are one disclosure away and reopen for filtered URLs. Result cards retain their published facts and now name the intake. The API's existing `skip`/`take` paging is exposed as previous/next links with a result range and page count; those links preserve search filters and the comparison tray.

The hover/focus changes are restrained and respect reduced-motion preference. Tailwind's additive semantic-token utility layer is used for page hierarchy and pager layout, with CSS Modules for component state. No catalogue, policy, eligibility, authentication or database behavior changed. The public route remains anonymous and uses published catalogue records only. Human visual and assistive-technology review remains pending.

Verification on the isolated synthetic local database: web TypeScript, lint and production build passed; the three focused public programme browser checks passed, including 390px overflow, URL-preserving paging and changed-page recovery. Desktop and 390px screenshots were inspected locally. The public catalogue still uses the configured intake code as its label; a human-friendly intake display name belongs in governed catalogue reference data rather than a frontend-only mapping.
