import { FileTextIcon as FileText } from '@phosphor-icons/react/FileText';
import { PlusIcon as Plus } from '@phosphor-icons/react/Plus';
import { XIcon as X } from '@phosphor-icons/react/X';
import { useRef } from 'react';
import { type DocumentTab, isDocumentDirty } from '../lib/documentTabs';

interface DocumentTabsProps {
  activeId: string;
  onClose: (id: string) => void;
  onOpen: () => void;
  onSelect: (id: string) => void;
  tabs: DocumentTab[];
}

export default function DocumentTabs({
  activeId,
  onClose,
  onOpen,
  onSelect,
  tabs,
}: DocumentTabsProps) {
  const tabList = useRef<HTMLDivElement>(null);
  const selectAt = (index: number) => {
    const tab = tabs[index];
    if (!tab) return;
    onSelect(tab.id);
    requestAnimationFrame(() =>
      tabList.current
        ?.querySelector<HTMLButtonElement>(`[data-tab-id="${tab.id}"]`)
        ?.focus()
    );
  };

  return (
    <div className="document-tabs">
      <nav className="document-tab-navigation" aria-label="Open documents">
        <div ref={tabList} className="document-tab-list">
          {tabs.map((tab, index) => {
            const active = tab.id === activeId;
            const dirty = isDocumentDirty(tab);
            return (
              <div
                className={`document-tab${active ? ' active' : ''}`}
                key={tab.id}
              >
                <button
                  type="button"
                  className="document-tab-select"
                  id={`tab-${tab.id}`}
                  data-tab-id={tab.id}
                  aria-current={active ? 'page' : undefined}
                  tabIndex={active ? 0 : -1}
                  title={tab.title}
                  onClick={() => onSelect(tab.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowRight') {
                      event.preventDefault();
                      selectAt((index + 1) % tabs.length);
                    } else if (event.key === 'ArrowLeft') {
                      event.preventDefault();
                      selectAt((index - 1 + tabs.length) % tabs.length);
                    } else if (event.key === 'Home') {
                      event.preventDefault();
                      selectAt(0);
                    } else if (event.key === 'End') {
                      event.preventDefault();
                      selectAt(tabs.length - 1);
                    }
                  }}
                >
                  <FileText
                    className="document-tab-icon"
                    size={16}
                    aria-hidden="true"
                  />
                  <span className="document-tab-title">{tab.title}</span>
                  {dirty && (
                    <>
                      <span className="document-tab-dirty" aria-hidden="true">
                        •
                      </span>
                      <span className="visually-hidden">Unsaved changes</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="document-tab-close"
                  aria-label={`Close ${tab.title}`}
                  onClick={() => onClose(tab.id)}
                >
                  <X size={13} aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
      </nav>
      <button
        type="button"
        className="document-tab-add"
        onClick={onOpen}
        aria-label="Open another Markdown file"
        title="Open another Markdown file"
      >
        <Plus size={17} aria-hidden="true" />
      </button>
    </div>
  );
}
