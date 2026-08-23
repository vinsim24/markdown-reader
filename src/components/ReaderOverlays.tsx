import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { CustomColors, ReaderPreferences } from '../lib/preferences';
import ImportUrlDialog from './ImportUrlDialog';
import ReadingSettings from './ReadingSettings';

interface ReaderOverlaysProps {
  focusMode: boolean;
  hasDocument: boolean;
  lowContrast: boolean;
  navOpen: boolean;
  navTrigger: RefObject<HTMLButtonElement | null>;
  onCloseSettings: () => void;
  onExitFocus: () => void;
  onCloseUrlImport: () => void;
  onImportUrl: (url: string) => Promise<void>;
  onResetPreferences: () => void;
  onSetCustomColor: (key: keyof CustomColors, value: string) => void;
  onSetNav: (open: boolean) => void;
  onSetSettings: (open: boolean) => void;
  preferences: ReaderPreferences;
  selectedColors: CustomColors;
  setPreferences: Dispatch<SetStateAction<ReaderPreferences>>;
  settingsOpen: boolean;
  settingsPanel: RefObject<HTMLElement | null>;
  settingsReturnFocus: RefObject<HTMLButtonElement | null>;
  urlImportOpen: boolean;
  urlImportReturnFocus: RefObject<HTMLButtonElement | null>;
}

export default function ReaderOverlays({
  focusMode,
  hasDocument,
  lowContrast,
  navOpen,
  navTrigger,
  onCloseSettings,
  onExitFocus,
  onCloseUrlImport,
  onImportUrl,
  onResetPreferences,
  onSetCustomColor,
  onSetNav,
  onSetSettings,
  preferences,
  selectedColors,
  setPreferences,
  settingsOpen,
  settingsPanel,
  settingsReturnFocus,
  urlImportOpen,
  urlImportReturnFocus,
}: ReaderOverlaysProps) {
  return (
    <>
      {hasDocument && focusMode && (
        <button type="button" className="exit-focus" onClick={onExitFocus}>
          Exit Focus <span>Esc</span>
        </button>
      )}
      {(settingsOpen || navOpen || urlImportOpen) && (
        <button
          type="button"
          className="overlay open"
          aria-label={
            urlImportOpen
              ? 'Close URL import'
              : settingsOpen
                ? 'Close reading settings'
                : 'Close navigation'
          }
          onClick={() => {
            if (urlImportOpen) onCloseUrlImport();
            else {
              onSetSettings(false);
              onSetNav(false);
            }
            requestAnimationFrame(() =>
              (urlImportOpen
                ? urlImportReturnFocus.current
                : settingsOpen
                  ? settingsReturnFocus.current
                  : navTrigger.current
              )?.focus()
            );
          }}
        />
      )}
      {urlImportOpen && (
        <ImportUrlDialog onClose={onCloseUrlImport} onImport={onImportUrl} />
      )}
      {settingsOpen && (
        <ReadingSettings
          lowContrast={lowContrast}
          onClose={onCloseSettings}
          onResetAll={onResetPreferences}
          onSetCustomColor={onSetCustomColor}
          panelRef={settingsPanel}
          preferences={preferences}
          selectedColors={selectedColors}
          setPreferences={setPreferences}
        />
      )}
    </>
  );
}
