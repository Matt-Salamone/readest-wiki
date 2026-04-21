'use client';

import React, { useState } from 'react';
import { RiDownloadLine, RiUploadLine } from 'react-icons/ri';

import { exportWikiNamespace, importWikiFromJson, isWikiExportV1 } from '@/services/wiki';
import type { WikiStore } from '@/services/wiki';
import { isTauriAppPlatform } from '@/services/environment';
import { useEnv } from '@/context/EnvContext';
import { useTranslation } from '@/hooks/useTranslation';
import { useFileSelector } from '@/hooks/useFileSelector';
import { eventDispatcher } from '@/utils/event';

function safeWikiFilename(title: string): string {
  const s = title
    .trim()
    .replace(/[<>:"/\\|?*]+/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 80);
  return s.length > 0 ? s : 'wiki';
}

interface WikiPortabilityActionsProps {
  wiki: WikiStore;
  namespaceId: string;
  namespaceTitle: string;
  /** When true, import merges into this namespace; otherwise creates `imported:*`. */
  allowMergeImport?: boolean;
  onAfterImport: () => Promise<void>;
}

const WikiPortabilityActions: React.FC<WikiPortabilityActionsProps> = ({
  wiki,
  namespaceId,
  namespaceTitle,
  allowMergeImport = false,
  onAfterImport,
}) => {
  const _ = useTranslation();
  const { appService } = useEnv();
  const { selectFiles } = useFileSelector(appService, _);
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    if (!appService) return;
    setBusy(true);
    try {
      const data = await exportWikiNamespace(wiki, namespaceId);
      const json = JSON.stringify(data, null, 2);
      const filename = `${safeWikiFilename(namespaceTitle)}.wiki.json`;

      if (isTauriAppPlatform()) {
        const { save: saveDialog } = await import('@tauri-apps/plugin-dialog');
        const { writeFile } = await import('@tauri-apps/plugin-fs');
        const path = await saveDialog({
          defaultPath: filename,
          filters: [{ name: 'JSON', extensions: ['json'] }],
        });
        if (!path) return;
        await writeFile(path, new TextEncoder().encode(json));
      } else {
        await appService.saveFile(filename, json, { mimeType: 'application/json' });
      }
      eventDispatcher.dispatch('toast', {
        type: 'success',
        message: _('Wiki exported'),
        timeout: 2500,
      });
    } catch (e) {
      eventDispatcher.dispatch('toast', {
        type: 'error',
        message: e instanceof Error ? e.message : String(e),
        timeout: 4000,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async () => {
    if (!appService) return;
    setBusy(true);
    try {
      const { files, error } = await selectFiles({
        type: 'generic',
        accept: '.json,application/json',
        extensions: ['json'],
        dialogTitle: _('Select wiki JSON'),
      });
      if (error) {
        eventDispatcher.dispatch('toast', { type: 'error', message: error, timeout: 4000 });
        return;
      }
      const sel = files[0];
      let text: string;
      if (sel?.file) {
        text = await sel.file.text();
      } else if (sel?.path) {
        const raw = await appService.readFile(sel.path, 'None', 'text');
        text = raw as string;
      } else {
        return;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(text) as unknown;
      } catch {
        eventDispatcher.dispatch('toast', {
          type: 'error',
          message: _('Invalid JSON file'),
          timeout: 4000,
        });
        return;
      }

      if (!isWikiExportV1(parsed)) {
        eventDispatcher.dispatch('toast', {
          type: 'error',
          message: _('Not a Readest wiki export'),
          timeout: 4000,
        });
        return;
      }

      let mergeInto: string | undefined;
      if (allowMergeImport) {
        const ok = await appService.ask(
          _(
            'Import into the current wiki namespace? Choose Cancel to create a new imported namespace.',
          ),
        );
        mergeInto = ok ? namespaceId : undefined;
      }

      await importWikiFromJson(wiki, parsed, {
        mergeIntoNamespaceId: mergeInto,
      });
      await onAfterImport();
      eventDispatcher.dispatch('toast', {
        type: 'success',
        message: _('Wiki imported'),
        timeout: 2500,
      });
    } catch (e) {
      eventDispatcher.dispatch('toast', {
        type: 'error',
        message: e instanceof Error ? e.message : String(e),
        timeout: 4000,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className='flex items-center gap-1'>
      <button
        type='button'
        title={_('Export wiki')}
        className='btn btn-ghost btn-circle btn-xs h-7 min-h-7 w-7'
        disabled={busy}
        onClick={() => void handleExport()}
      >
        <RiDownloadLine className='h-4 w-4' />
      </button>
      <button
        type='button'
        title={_('Import wiki')}
        className='btn btn-ghost btn-circle btn-xs h-7 min-h-7 w-7'
        disabled={busy}
        onClick={() => void handleImport()}
      >
        <RiUploadLine className='h-4 w-4' />
      </button>
    </div>
  );
};

export default WikiPortabilityActions;
