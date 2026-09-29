# Synchronized occasion tabs

The user requested that the entire occasion panel change together. Previously one listing image was passed to TripPicker regardless of the selected tab.

Each occasion now has its own locally stored, credited inspiration photograph: picnic basket, villa pool, friends around a bonfire, a couple in a garden, and a team around a table. The active tab drives the photograph, alternate text, source credit, headline, explanation, panel tone and existing canonical discovery action. The city selection persists. Photo changes have a brief 300ms transition and static-import blur placeholders; reduced motion disables the transition. These editorial images are labelled inspiration rather than attributed to an unrelated property.

Sources and licensing are in [asset credits](../public/images/occasions/README.md). Existing hero/property photos remain unchanged.

Verification: 31 browser checks passed on the actual local frontend: all five distinct images loaded at 1440px and 390px; city/routes persisted; no page overflow; Arrow/Home/End and rapid switching remained synchronized; reduced-motion support; zero occasion-panel axe violations and no browser exceptions. See [evidence](rentra-ui-occasion-tabs-checks.json). Desktop bonfire and mobile pool captures were visually inspected. Scoped ESLint and Prettier passed. The full production build was not rerun for this focused UI change.

The full redesign plan and audit are also reopened at the user's explicit request. Earlier completion records remain historical functional evidence and do not exempt any component or page from reassessment.
