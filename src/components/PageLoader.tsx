/**
 * Compatibility re-export.
 *
 * `PageLoader` and `EmptyState` now live in the UI kit alongside the other
 * feedback states (`@/components/ui`). This file keeps the couple of dozen
 * existing `@/components/PageLoader` imports working; new code should
 * import from `@/components/ui` instead.
 */

export { EmptyState, PageLoader } from './ui'
