/**
 * Fills the AppShell main column under OfflineDataRibbon. Inner area scrolls so
 * fixed-shell routes can show full content without clipping, while nav/footer stay fixed.
 */
export default function ShellPageBody({ children }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain pb-1 [-webkit-overflow-scrolling:touch]">
        {children}
      </div>
    </div>
  );
}
