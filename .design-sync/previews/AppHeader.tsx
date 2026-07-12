import { AppHeader } from "dishcover";

// Riso masthead — "Dishcover" in heavy Bricolage display with a plum accent
// dot. Sits at the top of every zine page. (Links home; the design-sync bundle
// renders the link as a plain anchor.)

export function Default() {
  return (
    <div style={{ width: 360 }}>
      <AppHeader />
    </div>
  );
}
