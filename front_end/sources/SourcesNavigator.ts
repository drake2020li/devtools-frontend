/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../core/common/common.js';
import * as Host from '../core/host/host.js';
import * as i18n from '../core/i18n/i18n.js';
import * as SDK from '../core/sdk/sdk.js';
import * as Persistence from '../models/persistence/persistence.js';
import * as Recorder from '../recorder/recorder.js';
import * as Snippets from '../snippets/snippets.js';
import * as UI from '../ui/legacy/legacy.js';
import * as Workspace from '../workspace/workspace.js';

import {NavigatorUISourceCodeTreeNode, NavigatorView} from './NavigatorView.js';  // eslint-disable-line no-unused-vars

const UIStrings = {
  /**
  *@description Text in Sources Navigator of the Sources panel
  */
  syncChangesInDevtoolsWithThe: 'Sync changes in DevTools with the local filesystem',
  /**
  *@description Text for link in the Filesystem Side View in Sources Panel
  */
  learnMoreAboutWorkspaces: 'Learn more about Workspaces',
  /**
  *@description Text in Sources Navigator of the Sources panel
  */
  overridePageAssetsWithFilesFromA: 'Override page assets with files from a local folder',
  /**
  *@description Text that is usually a hyperlink to more documentation
  */
  learnMore: 'Learn more',
  /**
  *@description Tooltip text that appears when hovering over the largeicon clear button in the Sources Navigator of the Sources panel
  */
  clearConfiguration: 'Clear configuration',
  /**
  *@description Text in Sources Navigator of the Sources panel
  */
  selectFolderForOverrides: 'Select folder for overrides',
  /**
  *@description Text in Sources Navigator of the Sources panel
  */
  contentScriptsServedByExtensions: 'Content scripts served by extensions appear here',
  /**
  *@description Text in Sources Navigator of the Sources panel
  */
  createAndSaveCodeSnippetsFor: 'Create and save code snippets for later reuse',
  /**
  *@description Text in Sources Navigator of the Sources panel
  */
  newSnippet: 'New snippet',
  /**
  *@description Title of an action in the sources tool to create snippet
  */
  createNewSnippet: 'Create new snippet',
  /**
  *@description A context menu item in the Sources Navigator of the Sources panel
  */
  run: 'Run',
  /**
  *@description A context menu item in the Navigator View of the Sources panel
  */
  rename: 'Rename…',
  /**
  *@description Label for an item to remove something
  */
  remove: 'Remove',
  /**
  *@description Text to save content as a specific file type
  */
  saveAs: 'Save as...',
  /**
  *@description Text that describes what the recording feature does
  */
  recordAndReplayBrowser: 'Record and replay browser interactions',
  /**
  *@description Label for the button to add a new recording
  */
  addRecording: 'Add recording',
};
const str_ = i18n.i18n.registerUIStrings('sources/SourcesNavigator.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
let networkNavigatorViewInstance: NetworkNavigatorView;

export class NetworkNavigatorView extends NavigatorView {
  private constructor() {
    super();
    SDK.SDKModel.TargetManager.instance().addEventListener(
        SDK.SDKModel.Events.InspectedURLChanged, this._inspectedURLChanged, this);

    // Record the sources tool load time after the file navigator has loaded.
    Host.userMetrics.panelLoaded('sources', 'DevTools.Launch.Sources');
  }
  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): NetworkNavigatorView {
    const {forceNew} = opts;
    if (!networkNavigatorViewInstance || forceNew) {
      networkNavigatorViewInstance = new NetworkNavigatorView();
    }

    return networkNavigatorViewInstance;
  }

  acceptProject(project: Workspace.Workspace.Project): boolean {
    return project.type() === Workspace.Workspace.projectTypes.Network;
  }

  _inspectedURLChanged(event: Common.EventTarget.EventTargetEvent): void {
    const mainTarget = SDK.SDKModel.TargetManager.instance().mainTarget();
    if (event.data !== mainTarget) {
      return;
    }
    const inspectedURL = mainTarget && mainTarget.inspectedURL();
    if (!inspectedURL) {
      return;
    }
    for (const uiSourceCode of this.workspace().uiSourceCodes()) {
      if (this.acceptProject(uiSourceCode.project()) && uiSourceCode.url() === inspectedURL) {
        this.revealUISourceCode(uiSourceCode, true);
      }
    }
  }

  uiSourceCodeAdded(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    const mainTarget = SDK.SDKModel.TargetManager.instance().mainTarget();
    const inspectedURL = mainTarget && mainTarget.inspectedURL();
    if (!inspectedURL) {
      return;
    }
    if (uiSourceCode.url() === inspectedURL) {
      this.revealUISourceCode(uiSourceCode, true);
    }
  }
}

let filesNavigatorViewInstance: FilesNavigatorView;

export class FilesNavigatorView extends NavigatorView {
  private constructor() {
    super();
    const placeholder = new UI.EmptyWidget.EmptyWidget('');
    this.setPlaceholder(placeholder);
    placeholder.appendParagraph().appendChild(UI.Fragment.html`
  <div>${i18nString(UIStrings.syncChangesInDevtoolsWithThe)}</div><br />
  ${
        UI.XLink.XLink.create(
            'https://developer.chrome.com/docs/devtools/workspaces/', i18nString(UIStrings.learnMoreAboutWorkspaces))}
  `);

    const toolbar = new UI.Toolbar.Toolbar('navigator-toolbar');
    toolbar.appendItemsAtLocation('files-navigator-toolbar').then(() => {
      if (!toolbar.empty()) {
        this.contentElement.insertBefore(toolbar.element, this.contentElement.firstChild);
      }
    });
  }

  static instance(): FilesNavigatorView {
    if (!filesNavigatorViewInstance) {
      filesNavigatorViewInstance = new FilesNavigatorView();
    }
    return filesNavigatorViewInstance;
  }

  acceptProject(project: Workspace.Workspace.Project): boolean {
    return project.type() === Workspace.Workspace.projectTypes.FileSystem &&
        Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.fileSystemType(project) !== 'overrides' &&
        !Snippets.ScriptSnippetFileSystem.isSnippetsProject(project) &&
        !Recorder.RecordingFileSystem.isRecordingProject(project);
  }

  handleContextMenu(event: Event): void {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendAction('sources.add-folder-to-workspace', undefined, true);
    contextMenu.show();
  }
}

let overridesNavigatorViewInstance: OverridesNavigatorView;

export class OverridesNavigatorView extends NavigatorView {
  _toolbar: UI.Toolbar.Toolbar;
  private constructor() {
    super();
    const placeholder = new UI.EmptyWidget.EmptyWidget('');
    this.setPlaceholder(placeholder);
    placeholder.appendParagraph().appendChild(UI.Fragment.html`
  <div>${i18nString(UIStrings.overridePageAssetsWithFilesFromA)}</div><br />
  ${
        UI.XLink.XLink.create(
            'https://developers.google.com/web/updates/2018/01/devtools#overrides', i18nString(UIStrings.learnMore))}
  `);

    this._toolbar = new UI.Toolbar.Toolbar('navigator-toolbar');

    this.contentElement.insertBefore(this._toolbar.element, this.contentElement.firstChild);

    Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().addEventListener(
        Persistence.NetworkPersistenceManager.Events.ProjectChanged, this._updateProjectAndUI, this);
    this.workspace().addEventListener(Workspace.Workspace.Events.ProjectAdded, this._onProjectAddOrRemoved, this);
    this.workspace().addEventListener(Workspace.Workspace.Events.ProjectRemoved, this._onProjectAddOrRemoved, this);
    this._updateProjectAndUI();
  }

  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): OverridesNavigatorView {
    const {forceNew} = opts;
    if (!overridesNavigatorViewInstance || forceNew) {
      overridesNavigatorViewInstance = new OverridesNavigatorView();
    }

    return overridesNavigatorViewInstance;
  }

  _onProjectAddOrRemoved(event: Common.EventTarget.EventTargetEvent): void {
    const project = (event.data as Workspace.Workspace.Project);
    if (project && project.type() === Workspace.Workspace.projectTypes.FileSystem &&
        Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.fileSystemType(project) !== 'overrides') {
      return;
    }
    this._updateUI();
  }

  _updateProjectAndUI(): void {
    this.reset();
    const project = Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().project();
    if (project) {
      this.tryAddProject(project);
    }
    this._updateUI();
  }

  _updateUI(): void {
    this._toolbar.removeToolbarItems();
    const project = Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().project();
    if (project) {
      const enableCheckbox = new UI.Toolbar.ToolbarSettingCheckbox(
          Common.Settings.Settings.instance().moduleSetting('persistenceNetworkOverridesEnabled'));
      this._toolbar.appendToolbarItem(enableCheckbox);

      this._toolbar.appendToolbarItem(new UI.Toolbar.ToolbarSeparator(true));
      const clearButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.clearConfiguration), 'largeicon-clear');
      clearButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, () => {
        project.remove();
      });
      this._toolbar.appendToolbarItem(clearButton);
      return;
    }
    const title = i18nString(UIStrings.selectFolderForOverrides);
    const setupButton = new UI.Toolbar.ToolbarButton(title, 'largeicon-add', title);
    setupButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, _event => {
      this._setupNewWorkspace();
    }, this);
    this._toolbar.appendToolbarItem(setupButton);
  }

  async _setupNewWorkspace(): Promise<void> {
    const fileSystem =
        await Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager.instance().addFileSystem('overrides');
    if (!fileSystem) {
      return;
    }
    Common.Settings.Settings.instance().moduleSetting('persistenceNetworkOverridesEnabled').set(true);
  }

  acceptProject(project: Workspace.Workspace.Project): boolean {
    return project === Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().project();
  }
}

let contentScriptsNavigatorViewInstance: ContentScriptsNavigatorView;

export class ContentScriptsNavigatorView extends NavigatorView {
  private constructor() {
    super();
    const placeholder = new UI.EmptyWidget.EmptyWidget('');
    this.setPlaceholder(placeholder);
    placeholder.appendParagraph().appendChild(UI.Fragment.html`
  <div>${i18nString(UIStrings.contentScriptsServedByExtensions)}</div><br />
  ${UI.XLink.XLink.create('https://developer.chrome.com/extensions/content_scripts', i18nString(UIStrings.learnMore))}
  `);
  }

  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): ContentScriptsNavigatorView {
    const {forceNew} = opts;
    if (!contentScriptsNavigatorViewInstance || forceNew) {
      contentScriptsNavigatorViewInstance = new ContentScriptsNavigatorView();
    }

    return contentScriptsNavigatorViewInstance;
  }

  acceptProject(project: Workspace.Workspace.Project): boolean {
    return project.type() === Workspace.Workspace.projectTypes.ContentScripts;
  }
}

let snippetsNavigatorViewInstance: SnippetsNavigatorView;

export class SnippetsNavigatorView extends NavigatorView {
  constructor() {
    super();
    const placeholder = new UI.EmptyWidget.EmptyWidget('');
    this.setPlaceholder(placeholder);
    placeholder.appendParagraph().appendChild(UI.Fragment.html`
  <div>${i18nString(UIStrings.createAndSaveCodeSnippetsFor)}</div><br />
  ${
        UI.XLink.XLink.create(
            'https://developer.chrome.com/docs/devtools/javascript/snippets/', i18nString(UIStrings.learnMore))}
  `);

    const toolbar = new UI.Toolbar.Toolbar('navigator-toolbar');
    const newButton = new UI.Toolbar.ToolbarButton(
        i18nString(UIStrings.newSnippet), 'largeicon-add', i18nString(UIStrings.newSnippet));
    newButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, _event => {
      this.create(Snippets.ScriptSnippetFileSystem.findSnippetsProject(), '');
    });
    toolbar.appendToolbarItem(newButton);
    this.contentElement.insertBefore(toolbar.element, this.contentElement.firstChild);
  }

  static instance(): SnippetsNavigatorView {
    if (!snippetsNavigatorViewInstance) {
      snippetsNavigatorViewInstance = new SnippetsNavigatorView();
    }
    return snippetsNavigatorViewInstance;
  }

  acceptProject(project: Workspace.Workspace.Project): boolean {
    return Snippets.ScriptSnippetFileSystem.isSnippetsProject(project);
  }

  handleContextMenu(event: Event): void {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.headerSection().appendItem(
        i18nString(UIStrings.createNewSnippet),
        () => this.create(Snippets.ScriptSnippetFileSystem.findSnippetsProject(), ''));
    contextMenu.show();
  }

  handleFileContextMenu(event: Event, node: NavigatorUISourceCodeTreeNode): void {
    const uiSourceCode = node.uiSourceCode();
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.headerSection().appendItem(
        i18nString(UIStrings.run), () => Snippets.ScriptSnippetFileSystem.evaluateScriptSnippet(uiSourceCode));
    contextMenu.editSection().appendItem(i18nString(UIStrings.rename), () => this.rename(node, false));
    contextMenu.editSection().appendItem(
        i18nString(UIStrings.remove), () => uiSourceCode.project().deleteFile(uiSourceCode));
    contextMenu.saveSection().appendItem(i18nString(UIStrings.saveAs), this._handleSaveAs.bind(this, uiSourceCode));
    contextMenu.show();
  }

  async _handleSaveAs(uiSourceCode: Workspace.UISourceCode.UISourceCode): Promise<void> {
    uiSourceCode.commitWorkingCopy();
    const {content} = await uiSourceCode.requestContent();
    Workspace.FileManager.FileManager.instance().save(uiSourceCode.url(), content || '', true);
    Workspace.FileManager.FileManager.instance().close(uiSourceCode.url());
  }
}

let recordingsNavigatorViewInstance: RecordingsNavigatorView;

export class RecordingsNavigatorView extends NavigatorView {
  private constructor() {
    super();
    const placeholder = new UI.EmptyWidget.EmptyWidget('');
    this.setPlaceholder(placeholder);
    const p = (placeholder.appendParagraph() as HTMLElement);
    p.innerText = i18nString(UIStrings.recordAndReplayBrowser);

    const toolbar = new UI.Toolbar.Toolbar('navigator-toolbar');
    const newButton = new UI.Toolbar.ToolbarButton(
        i18nString(UIStrings.addRecording), 'largeicon-add', i18nString(UIStrings.addRecording));
    newButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, _event => {
      this.create(Recorder.RecordingFileSystem.findRecordingsProject(), '{"steps": []}');
    });
    toolbar.appendToolbarItem(newButton);
    this.contentElement.insertBefore(toolbar.element, this.contentElement.firstChild);
  }

  static instance(): RecordingsNavigatorView {
    if (!recordingsNavigatorViewInstance) {
      recordingsNavigatorViewInstance = new RecordingsNavigatorView();
    }
    return recordingsNavigatorViewInstance;
  }

  acceptProject(project: Workspace.Workspace.Project): boolean {
    return Recorder.RecordingFileSystem.isRecordingProject(project);
  }

  handleContextMenu(event: Event): void {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.headerSection().appendItem(
        i18nString(UIStrings.addRecording),
        () => this.create(Recorder.RecordingFileSystem.findRecordingsProject(), ''));
    contextMenu.show();
  }

  handleFileContextMenu(event: Event, node: NavigatorUISourceCodeTreeNode): void {
    const uiSourceCode = node.uiSourceCode();
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.editSection().appendItem(i18nString(UIStrings.rename), () => this.rename(node, false));
    contextMenu.editSection().appendItem(
        i18nString(UIStrings.remove), () => uiSourceCode.project().deleteFile(uiSourceCode));
    contextMenu.saveSection().appendItem(i18nString(UIStrings.saveAs), this._handleSaveAs.bind(this, uiSourceCode));
    contextMenu.show();
  }

  async _handleSaveAs(uiSourceCode: Workspace.UISourceCode.UISourceCode): Promise<void> {
    uiSourceCode.commitWorkingCopy();
    const {content} = await uiSourceCode.requestContent();
    Workspace.FileManager.FileManager.instance().save(uiSourceCode.url(), content || '', true);
    Workspace.FileManager.FileManager.instance().close(uiSourceCode.url());
  }
}

let actionDelegateInstance: ActionDelegate;

export class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): ActionDelegate {
    const {forceNew} = opts;
    if (!actionDelegateInstance || forceNew) {
      actionDelegateInstance = new ActionDelegate();
    }

    return actionDelegateInstance;
  }
  handleAction(context: UI.Context.Context, actionId: string): boolean {
    switch (actionId) {
      case 'sources.create-snippet':
        Snippets.ScriptSnippetFileSystem.findSnippetsProject()
            .createFile('', null, '')
            .then(uiSourceCode => Common.Revealer.reveal(uiSourceCode));
        return true;
      case 'sources.add-folder-to-workspace':
        Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager.instance().addFileSystem();
        return true;
    }
    return false;
  }
}
