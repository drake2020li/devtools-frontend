// Copyright (c) 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';

import type * as TextUtils from '../text_utils/text_utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Workspace from '../workspace/workspace.js';

import {NetworkPersistenceManager} from './NetworkPersistenceManager.js';
import {PersistenceImpl} from './PersistenceImpl.js';

const UIStrings = {
  /**
   *@description Text to save content as a specific file type
   */
  saveAs: 'Save as...',
  /**
   *@description Context menu item for saving an image
   */
  saveImage: 'Save image',
  /**
   *@description Context menu item for showing all overridden files
   */
  showOverrides: 'Show all overrides',
  /**
   *@description A context menu item in the Persistence Actions of the Workspace settings in Settings
   */
  overrideContent: 'Override content',
  /**
   *@description A context menu item in the Persistence Actions of the Workspace settings in Settings
   */
  openInContainingFolder: 'Open in containing folder',
};
const str_ = i18n.i18n.registerUIStrings('models/persistence/PersistenceActions.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

let contextMenuProviderInstance: ContextMenuProvider;

export class ContextMenuProvider implements UI.ContextMenu.Provider {
  static instance(opts: {forceNew: boolean|null} = {forceNew: null}): ContextMenuProvider {
    const {forceNew} = opts;
    if (!contextMenuProviderInstance || forceNew) {
      contextMenuProviderInstance = new ContextMenuProvider();
    }

    return contextMenuProviderInstance;
  }

  appendApplicableItems(event: Event, contextMenu: UI.ContextMenu.ContextMenu, target: Object): void {
    const contentProvider = target as TextUtils.ContentProvider.ContentProvider;

    async function saveAs(): Promise<void> {
      if (contentProvider instanceof Workspace.UISourceCode.UISourceCode) {
        (contentProvider as Workspace.UISourceCode.UISourceCode).commitWorkingCopy();
      }
      const content = await contentProvider.requestContent();
      let decodedContent = content.content || '';
      if (content.isEncoded) {
        decodedContent = window.atob(decodedContent);
      }
      const url = contentProvider.contentURL();
      void Workspace.FileManager.FileManager.instance().save(url, decodedContent, true);
      Workspace.FileManager.FileManager.instance().close(url);
    }

    async function saveImage(): Promise<void> {
      const targetObject = contentProvider as SDK.Resource.Resource;
      const content = (await targetObject.requestContent()).content || '';
      const link = document.createElement('a');
      link.download = targetObject.displayName;
      link.href = 'data:' + targetObject.mimeType + ';base64,' + content;
      link.click();
    }

    if (contentProvider.contentType().isDocumentOrScriptOrStyleSheet()) {
      contextMenu.saveSection().appendItem(i18nString(UIStrings.saveAs), saveAs);
    } else if (contentProvider instanceof SDK.Resource.Resource && contentProvider.contentType().isImage()) {
      contextMenu.saveSection().appendItem(i18nString(UIStrings.saveImage), saveImage);
    }

    // Retrieve uiSourceCode by URL to pick network resources everywhere.
    const uiSourceCode = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(contentProvider.contentURL());
    const networkPersistenceManager = NetworkPersistenceManager.instance();

    const binding = uiSourceCode && PersistenceImpl.instance().binding(uiSourceCode);
    const fileURL = binding ? binding.fileSystem.contentURL() : contentProvider.contentURL();

    if (fileURL.startsWith('file://')) {
      const path = Common.ParsedURL.ParsedURL.urlToRawPathString(fileURL, Host.Platform.isWin());
      contextMenu.revealSection().appendItem(
          i18nString(UIStrings.openInContainingFolder),
          () => Host.InspectorFrontendHost.InspectorFrontendHostInstance.showItemInFolder(path));
    }

    if (contentProvider instanceof Workspace.UISourceCode.UISourceCode &&
        (contentProvider.project().type() === Workspace.Workspace.projectTypes.FileSystem ||
         uiSourceCode?.contentType().isFromSourceMap())) {
      // Do not append in Sources > Filesystem & Overrides tab
      return;
    }

    if (uiSourceCode && networkPersistenceManager.isUISourceCodeOverridable(uiSourceCode)) {
      contextMenu.overrideSection().appendItem(i18nString(UIStrings.overrideContent), async () => {
        const isSuccess = await networkPersistenceManager.setupAndStartLocalOverrides(uiSourceCode);
        if (isSuccess) {
          await Common.Revealer.reveal(uiSourceCode);
        }

        // Collect metrics: Context menu access point
        if (contentProvider instanceof SDK.NetworkRequest.NetworkRequest) {
          Host.userMetrics.actionTaken(Host.UserMetrics.Action.OverrideContentFromNetworkContextMenu);
        } else if (contentProvider instanceof Workspace.UISourceCode.UISourceCode) {
          Host.userMetrics.actionTaken(Host.UserMetrics.Action.OverrideContentFromSourcesContextMenu);
        }
        // Collect metrics: Content type
        if (uiSourceCode.isFetchXHR()) {
          Host.userMetrics.actionTaken(Host.UserMetrics.Action.OverrideFetchXHR);
        } else if (contentProvider.contentType().isScript()) {
          Host.userMetrics.actionTaken(Host.UserMetrics.Action.OverrideScript);
        } else if (contentProvider.contentType().isDocument()) {
          Host.userMetrics.actionTaken(Host.UserMetrics.Action.OverrideDocument);
        } else if (contentProvider.contentType().isStyleSheet()) {
          Host.userMetrics.actionTaken(Host.UserMetrics.Action.OverrideStyleSheet);
        } else if (contentProvider.contentType().isImage()) {
          Host.userMetrics.actionTaken(Host.UserMetrics.Action.OverrideImage);
        } else if (contentProvider.contentType().isFont()) {
          Host.userMetrics.actionTaken(Host.UserMetrics.Action.OverrideFont);
        }
      });
    } else {
      contextMenu.overrideSection().appendItem(i18nString(UIStrings.overrideContent), () => {}, true);
    }

    if (contentProvider instanceof SDK.NetworkRequest.NetworkRequest) {
      contextMenu.overrideSection().appendItem(i18nString(UIStrings.showOverrides), async () => {
        await UI.ViewManager.ViewManager.instance().showView('navigator-overrides');
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.ShowAllOverridesFromNetworkContextMenu);
      });
    }
  }
}
