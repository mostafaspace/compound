# Mobile Design System

This mobile app uses a production, role-first design system for compound operations. Keep the UI calm, dense enough for daily work, and predictable across resident, admin, and security flows.

## Principles

- One screen, one primary job. Residents see actions and transparency, admins see operational exceptions and tools, security sees fast scan/validate loops.
- Use shared primitives before local styles: `Button`, `Input`, `Typography`, `Card`, `ActionTile`, `StatusBadge`, `ScreenContainer`, and `ScreenHeader`.
- Do not use emoji, two-letter glyphs, or decorative text as structural icons. Use `Icon` from `components/ui/Icon`.
- Keep touch targets at least `componentSize.touch` and use visible pressed, disabled, loading, and error states.
- Keep logout/signout in the navigation/header layer only. Do not duplicate it inside dashboard content.
- Use `FlatList` or another virtualized list for long data sets. Use `ScrollView` only for short page content and forms.

## Tokens

- Colors live in `colors` and `colors.palette`.
- Spacing lives in `spacing`; prefer 4/8-point increments.
- Screen layout lives in `layout`. Default screen gutter is `layout.screenGutter` = 16, section gap is `layout.sectionGap` = 24, and card/list gap is `layout.cardGap` / `layout.listGap` = 16.
- Radius lives in `radii`; cards use `radii.xl`, controls use `radii.lg`, pills use `radii.pill`.
- Type lives in `typography`; body text should remain 16px or larger for readable mobile forms.
- Elevation lives in `shadows`; avoid ad-hoc shadow values in screens.

## Screen Patterns

- Dashboard screens start with a role-aware hero, then attention items, then shortcuts.
- Security screens prioritize the scanner/manual token flow before pending visitor lists.
- Admin screens prioritize exception metrics and management tools, not decorative charts.
- Empty states should explain what happened and what the user can do next.

## Hard Rules For Future Agents

- No raw visual systems in feature screens when a token or primitive exists.
- No duplicate logout/signout buttons on the same route.
- No adding icon libraries without checking whether the local `Icon` primitive is enough.
- No claiming a mobile UI pass is ready without running `npm run typecheck -w apps/mobile`.
