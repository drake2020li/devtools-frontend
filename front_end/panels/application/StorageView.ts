// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../ui/legacy/legacy.js';

import {ApplicationCacheModel} from './ApplicationCacheModel.js';
import {DatabaseModel} from './DatabaseModel.js';
import {DOMStorageModel} from './DOMStorageModel.js';
import {IndexedDBModel} from './IndexedDBModel.js';

const UIStrings = {
  /**
   * @description Text in the Storage View that expresses the amout of used and available storage quota
   * @example {1.5 MB} PH1
   * @example {123.1 MB} PH2
   */
  storageQuotaUsed: '{PH1} used out of {PH2} storage quota',
  /**
   * @description Tooltip in the Storage View that expresses the precise amout of used and available storage quota
   * @example {200} PH1
   * @example {400} PH2
   */
  storageQuotaUsedWithBytes: '{PH1} bytes used out of {PH2} bytes storage quota',
  /**
   * @description Fragment indicating that a certain data size has been custom configured
   * @example {1.5 MB} PH1
   */
  storageWithCustomMarker: '{PH1} (custom)',
  /**
   * @description Text in Application Panel Sidebar and title text of the Storage View of the Application panel
   */
  storageTitle: 'Storage',
  /**
   * @description Title text in Storage View of the Application panel
   */
  usage: 'Usage',
  /**
   * @description Unit for data size in DevTools
   */
  mb: 'MB',
  /**
   * @description Link to learn more about Progressive Web Apps
   */
  learnMore: 'Learn more',
  /**
   * @description Button text for the button in the Storage View of the Application panel for clearing site-specific storage
   */
  clearSiteData: 'Clear site data',
  /**
   * @description Category description in the Clear Storage section of the Storage View of the Application panel
   */
  application: 'Application',
  /**
   * @description Checkbox label in the Clear Storage section of the Storage View of the Application panel
   */
  unregisterServiceWorker: 'Unregister service workers',
  /**
   * @description Checkbox label in the Clear Storage section of the Storage View of the Application panel
   */
  localAndSessionStorage: 'Local and session storage',
  /**
   * @description Checkbox label in the Clear Storage section of the Storage View of the Application panel
   */
  indexDB: 'IndexedDB',
  /**
   * @description Checkbox label in the Clear Storage section of the Storage View of the Application panel
   */
  webSql: 'Web SQL',
  /**
   * @description Checkbox label in the Clear Storage section of the Storage View of the Application panel
   */
  cookies: 'Cookies',
  /**
   * @description Category description in the Clear Storage section of the Storage View of the Application panel
   */
  cache: 'Cache',
  /**
   * @description Checkbox label in the Clear Storage section of the Storage View of the Application panel
   */
  cacheStorage: 'Cache storage',
  /**
   * @description Checkbox label in the Clear Storage section of the Storage View of the Application panel
   */
  applicationCache: 'Application cache',
  /**
   * @description Checkbox label in the Clear Storage section of the Storage View of the Application panel
   */
  includingThirdPartyCookies: 'including third-party cookies',
  /**
   * @description Text for error message in Application Quota Override
   * @example {Image} PH1
   */
  sFailedToLoad: '{PH1} (failed to load)',
  /**
   * @description Text for error message in Application Quota Override
   */
  internalError: 'Internal error',
  /**
   * @description Text for error message in Application Quota Override
   */
  pleaseEnterANumber: 'Please enter a number',
  /**
   * @description Text for error message in Application Quota Override
   */
  numberMustBeNonNegative: 'Number must be non-negative',
  /**
   * @description Button text for the "Clear site data" button in the Storage View of the Application panel while the clearing action is pending
   */
  clearing: 'Clearing...',
  /**
   * @description Quota row title in Clear Storage View of the Application panel
   */
  storageQuotaIsLimitedIn: 'Storage quota is limited in Incognito mode',
  /**
   * @description Text in Application Panel Sidebar of the Application panel
   */
  fileSystem: 'File System',
  /**
   * @description Text in Application Panel Sidebar of the Application panel
   */
  other: 'Other',
  /**
   * @description Text in Application Panel Sidebar of the Application panel
   */
  storageUsage: 'Storage usage',
  /**
   * @description Text in Application Panel Sidebar of the Application panel
   */
  serviceWorkers: 'Service Workers',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/StorageView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

/**
 * @implements {SDK.SDKModel.Observer}
 */
export class StorageView extends UI.ThrottledWidget.ThrottledWidget {
  private pieColors: Map<Protocol.Storage.StorageType, string>;
  private reportView: UI.ReportView.ReportView;
  private target: SDK.SDKModel.Target|null;
  private securityOrigin: string|null;
  private settings: Map<Protocol.Storage.StorageType, Common.Settings.Setting<boolean>>;
  private includeThirdPartyCookiesSetting: Common.Settings.Setting<boolean>;
  private quotaRow: HTMLElement;
  private quotaUsage: number|null;
  private pieChart: PerfUI.PieChart.PieChart;
  private previousOverrideFieldValue: string;
  private quotaOverrideCheckbox: UI.UIUtils.CheckboxLabel;
  private quotaOverrideControlRow: HTMLElement;
  private quotaOverrideEditor: HTMLInputElement;
  private quotaOverrideErrorMessage: HTMLElement;
  private clearButton: HTMLButtonElement;

  constructor() {
    super(true, 1000);
    this.registerRequiredCSS('panels/application/storageView.css', {enableLegacyPatching: false});
    this.contentElement.classList.add('clear-storage-container');
    this.pieColors = new Map([
      [Protocol.Storage.StorageType.Appcache, 'rgb(110, 161, 226)'],        // blue
      [Protocol.Storage.StorageType.Cache_storage, 'rgb(229, 113, 113)'],   // red
      [Protocol.Storage.StorageType.Cookies, 'rgb(239, 196, 87)'],          // yellow
      [Protocol.Storage.StorageType.Indexeddb, 'rgb(155, 127, 230)'],       // purple
      [Protocol.Storage.StorageType.Local_storage, 'rgb(116, 178, 102)'],   // green
      [Protocol.Storage.StorageType.Service_workers, 'rgb(255, 167, 36)'],  // orange
      [Protocol.Storage.StorageType.Websql, 'rgb(203, 220, 56)'],           // lime
    ]);

    // TODO(crbug.com/1156978): Replace UI.ReportView.ReportView with ReportView.ts web component.
    this.reportView = new UI.ReportView.ReportView(i18nString(UIStrings.storageTitle));
    this.reportView.registerRequiredCSS('panels/application/storageView.css', {enableLegacyPatching: false});
    this.reportView.element.classList.add('clear-storage-header');
    this.reportView.show(this.contentElement);
    /** @type {?SDK.SDKModel.Target} */
    this.target = null;
    /** @type {?string} */
    this.securityOrigin = null;

    this.settings = new Map();
    for (const type of AllStorageTypes) {
      this.settings.set(type, Common.Settings.Settings.instance().createSetting('clear-storage-' + type, true));
    }

    this.includeThirdPartyCookiesSetting =
        Common.Settings.Settings.instance().createSetting('clear-storage-include-third-party-cookies', false);

    const quota = this.reportView.appendSection(i18nString(UIStrings.usage));
    this.quotaRow = quota.appendSelectableRow();
    this.quotaRow.classList.add('quota-usage-row');
    const learnMoreRow = quota.appendRow();
    const learnMore = UI.XLink.XLink.create(
        'https://developer.chrome.com/docs/devtools/progressive-web-apps#opaque-responses',
        i18nString(UIStrings.learnMore));
    learnMoreRow.appendChild(learnMore);
    this.quotaUsage = null;
    this.pieChart = new PerfUI.PieChart.PieChart();
    this.populatePieChart(0, []);
    const usageBreakdownRow = quota.appendRow();
    usageBreakdownRow.classList.add('usage-breakdown-row');
    usageBreakdownRow.appendChild(this.pieChart);

    this.previousOverrideFieldValue = '';
    const quotaOverrideCheckboxRow = quota.appendRow();
    this.quotaOverrideCheckbox = UI.UIUtils.CheckboxLabel.create('Simulate custom storage quota', false, '');
    quotaOverrideCheckboxRow.appendChild(this.quotaOverrideCheckbox);
    this.quotaOverrideCheckbox.checkboxElement.addEventListener('click', this.onClickCheckbox.bind(this), false);
    this.quotaOverrideControlRow = quota.appendRow();
    /** @type {!HTMLInputElement} */
    this.quotaOverrideEditor =
        this.quotaOverrideControlRow.createChild('input', 'quota-override-notification-editor') as HTMLInputElement;
    this.quotaOverrideControlRow.appendChild(UI.UIUtils.createLabel(i18nString(UIStrings.mb)));
    this.quotaOverrideControlRow.classList.add('hidden');
    this.quotaOverrideEditor.addEventListener('keyup', event => {
      if (event.key === 'Enter') {
        this.applyQuotaOverrideFromInputField();
        event.consume(true);
      }
    });
    this.quotaOverrideEditor.addEventListener('focusout', event => {
      this.applyQuotaOverrideFromInputField();
      event.consume(true);
    });

    const errorMessageRow = quota.appendRow();
    this.quotaOverrideErrorMessage = errorMessageRow.createChild('div', 'quota-override-error');

    const clearButtonSection = this.reportView.appendSection('', 'clear-storage-button').appendRow();
    this.clearButton = UI.UIUtils.createTextButton(i18nString(UIStrings.clearSiteData), this.clear.bind(this));
    this.clearButton.id = 'storage-view-clear-button';
    clearButtonSection.appendChild(this.clearButton);

    const includeThirdPartyCookiesCheckbox = UI.SettingsUI.createSettingCheckbox(
        i18nString(UIStrings.includingThirdPartyCookies), this.includeThirdPartyCookiesSetting, true);
    includeThirdPartyCookiesCheckbox.classList.add('include-third-party-cookies');
    clearButtonSection.appendChild(includeThirdPartyCookiesCheckbox);

    const application = this.reportView.appendSection(i18nString(UIStrings.application));
    this.appendItem(
        application, i18nString(UIStrings.unregisterServiceWorker), Protocol.Storage.StorageType.Service_workers);
    application.markFieldListAsGroup();

    const storage = this.reportView.appendSection(i18nString(UIStrings.storageTitle));
    this.appendItem(storage, i18nString(UIStrings.localAndSessionStorage), Protocol.Storage.StorageType.Local_storage);
    this.appendItem(storage, i18nString(UIStrings.indexDB), Protocol.Storage.StorageType.Indexeddb);
    this.appendItem(storage, i18nString(UIStrings.webSql), Protocol.Storage.StorageType.Websql);
    this.appendItem(storage, i18nString(UIStrings.cookies), Protocol.Storage.StorageType.Cookies);
    storage.markFieldListAsGroup();

    const caches = this.reportView.appendSection(i18nString(UIStrings.cache));
    this.appendItem(caches, i18nString(UIStrings.cacheStorage), Protocol.Storage.StorageType.Cache_storage);
    this.appendItem(caches, i18nString(UIStrings.applicationCache), Protocol.Storage.StorageType.Appcache);
    caches.markFieldListAsGroup();

    SDK.SDKModel.TargetManager.instance().observeTargets(this);
  }

  private appendItem(section: UI.ReportView.Section, title: string, settingName: Protocol.Storage.StorageType): void {
    const row = section.appendRow();
    const setting = this.settings.get(settingName);
    if (setting) {
      row.appendChild(UI.SettingsUI.createSettingCheckbox(title, setting, true));
    }
  }

  targetAdded(target: SDK.SDKModel.Target): void {
    if (this.target) {
      return;
    }
    this.target = target;
    const securityOriginManager = target.model(SDK.SecurityOriginManager.SecurityOriginManager) as
        SDK.SecurityOriginManager.SecurityOriginManager;
    this.updateOrigin(
        securityOriginManager.mainSecurityOrigin(), securityOriginManager.unreachableMainSecurityOrigin());
    securityOriginManager.addEventListener(
        SDK.SecurityOriginManager.Events.MainSecurityOriginChanged, this.originChanged, this);
  }

  targetRemoved(target: SDK.SDKModel.Target): void {
    if (this.target !== target) {
      return;
    }
    const securityOriginManager = target.model(SDK.SecurityOriginManager.SecurityOriginManager) as
        SDK.SecurityOriginManager.SecurityOriginManager;
    securityOriginManager.removeEventListener(
        SDK.SecurityOriginManager.Events.MainSecurityOriginChanged, this.originChanged, this);
  }

  private originChanged(event: Common.EventTarget.EventTargetEvent): void {
    const mainOrigin = /** *@type {string} */ (event.data.mainSecurityOrigin);
    const unreachableMainOrigin = /** @type {string} */ (event.data.unreachableMainSecurityOrigin);
    this.updateOrigin(mainOrigin, unreachableMainOrigin);
  }

  private updateOrigin(mainOrigin: string, unreachableMainOrigin: string|null): void {
    const oldOrigin = this.securityOrigin;
    if (unreachableMainOrigin) {
      this.securityOrigin = unreachableMainOrigin;
      this.reportView.setSubtitle(i18nString(UIStrings.sFailedToLoad, {PH1: unreachableMainOrigin}));
    } else {
      this.securityOrigin = mainOrigin;
      this.reportView.setSubtitle(mainOrigin);
    }

    if (oldOrigin !== this.securityOrigin) {
      this.quotaOverrideControlRow.classList.add('hidden');
      this.quotaOverrideCheckbox.checkboxElement.checked = false;
      this.quotaOverrideErrorMessage.textContent = '';
    }
    this.doUpdate();
  }

  private async applyQuotaOverrideFromInputField(): Promise<void> {
    if (!this.target || !this.securityOrigin) {
      this.quotaOverrideErrorMessage.textContent = i18nString(UIStrings.internalError);
      return;
    }
    this.quotaOverrideErrorMessage.textContent = '';
    const editorString = this.quotaOverrideEditor.value;
    if (editorString === '') {
      await this.clearQuotaForOrigin(this.target, this.securityOrigin);
      this.previousOverrideFieldValue = '';
      return;
    }
    const quota = parseFloat(editorString);
    if (!Number.isFinite(quota)) {
      this.quotaOverrideErrorMessage.textContent = i18nString(UIStrings.pleaseEnterANumber);
      return;
    }
    if (quota < 0) {
      this.quotaOverrideErrorMessage.textContent = i18nString(UIStrings.numberMustBeNonNegative);
      return;
    }
    const bytesPerMB = 1000 * 1000;
    const quotaInBytes = Math.round(quota * bytesPerMB);
    const quotaFieldValue = `${quotaInBytes / bytesPerMB}`;
    this.quotaOverrideEditor.value = quotaFieldValue;
    this.previousOverrideFieldValue = quotaFieldValue;
    await this.target.storageAgent().invoke_overrideQuotaForOrigin(
        {origin: this.securityOrigin, quotaSize: quotaInBytes});
  }

  private async clearQuotaForOrigin(target: SDK.SDKModel.Target, origin: string): Promise<void> {
    await target.storageAgent().invoke_overrideQuotaForOrigin({origin});
  }

  private async onClickCheckbox(): Promise<void> {
    if (this.quotaOverrideControlRow.classList.contains('hidden')) {
      this.quotaOverrideControlRow.classList.remove('hidden');
      this.quotaOverrideCheckbox.checkboxElement.checked = true;
      this.quotaOverrideEditor.value = this.previousOverrideFieldValue;
      this.quotaOverrideEditor.focus();
    } else if (this.target && this.securityOrigin) {
      this.quotaOverrideControlRow.classList.add('hidden');
      this.quotaOverrideCheckbox.checkboxElement.checked = false;
      await this.clearQuotaForOrigin(this.target, this.securityOrigin);
      this.quotaOverrideErrorMessage.textContent = '';
    }
  }

  private clear(): void {
    if (!this.securityOrigin) {
      return;
    }
    const selectedStorageTypes = [];
    for (const type of this.settings.keys()) {
      const setting = this.settings.get(type);
      if (setting && setting.get()) {
        selectedStorageTypes.push(type);
      }
    }

    if (this.target) {
      const includeThirdPartyCookies = this.includeThirdPartyCookiesSetting.get();
      StorageView.clear(this.target, this.securityOrigin, selectedStorageTypes, includeThirdPartyCookies);
    }

    this.clearButton.disabled = true;
    const label = this.clearButton.textContent;
    this.clearButton.textContent = i18nString(UIStrings.clearing);
    setTimeout(() => {
      this.clearButton.disabled = false;
      this.clearButton.textContent = label;
      this.clearButton.focus();
    }, 500);
  }

  static clear(
      target: SDK.SDKModel.Target, securityOrigin: string, selectedStorageTypes: string[],
      includeThirdPartyCookies: boolean): void {
    target.storageAgent().invoke_clearDataForOrigin(
        {origin: securityOrigin, storageTypes: selectedStorageTypes.join(',')});

    const set = new Set(selectedStorageTypes);
    const hasAll = set.has(Protocol.Storage.StorageType.All);
    if (set.has(Protocol.Storage.StorageType.Cookies) || hasAll) {
      const cookieModel = target.model(SDK.CookieModel.CookieModel);
      if (cookieModel) {
        cookieModel.clear(undefined, includeThirdPartyCookies ? undefined : securityOrigin);
      }
    }

    if (set.has(Protocol.Storage.StorageType.Indexeddb) || hasAll) {
      for (const target of SDK.SDKModel.TargetManager.instance().targets()) {
        const indexedDBModel = target.model(IndexedDBModel);
        if (indexedDBModel) {
          indexedDBModel.clearForOrigin(securityOrigin);
        }
      }
    }

    if (set.has(Protocol.Storage.StorageType.Local_storage) || hasAll) {
      const storageModel = target.model(DOMStorageModel);
      if (storageModel) {
        storageModel.clearForOrigin(securityOrigin);
      }
    }

    if (set.has(Protocol.Storage.StorageType.Websql) || hasAll) {
      const databaseModel = target.model(DatabaseModel);
      if (databaseModel) {
        databaseModel.disable();
        databaseModel.enable();
      }
    }

    if (set.has(Protocol.Storage.StorageType.Cache_storage) || hasAll) {
      const target = SDK.SDKModel.TargetManager.instance().mainTarget();
      const model = target && target.model(SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel);
      if (model) {
        model.clearForOrigin(securityOrigin);
      }
    }

    if (set.has(Protocol.Storage.StorageType.Appcache) || hasAll) {
      const appcacheModel = target.model(ApplicationCacheModel);
      if (appcacheModel) {
        appcacheModel.reset();
      }
    }
  }

  async doUpdate(): Promise<void> {
    if (!this.securityOrigin || !this.target) {
      this.quotaRow.textContent = '';
      this.populatePieChart(0, []);
      return;
    }

    const securityOrigin = /** @type {string} */ (this.securityOrigin);
    const response = await this.target.storageAgent().invoke_getUsageAndQuota({origin: securityOrigin});
    this.quotaRow.textContent = '';
    if (response.getError()) {
      this.populatePieChart(0, []);
      return;
    }
    const quotaOverridden = response.overrideActive;
    const quotaAsString = Platform.NumberUtilities.bytesToString(response.quota);
    const usageAsString = Platform.NumberUtilities.bytesToString(response.usage);
    const formattedQuotaAsString = i18nString(UIStrings.storageWithCustomMarker, {PH1: quotaAsString});
    const quota =
        quotaOverridden ? UI.Fragment.Fragment.build`<b>${formattedQuotaAsString}</b>`.element() : quotaAsString;
    const element =
        i18n.i18n.getFormatLocalizedString(str_, UIStrings.storageQuotaUsed, {PH1: usageAsString, PH2: quota});
    this.quotaRow.appendChild(element);
    UI.Tooltip.Tooltip.install(
        this.quotaRow,
        i18nString(
            UIStrings.storageQuotaUsedWithBytes,
            {PH1: response.usage.toLocaleString(), PH2: response.quota.toLocaleString()}));

    if (!response.overrideActive && response.quota < 125829120) {  // 120 MB
      UI.Tooltip.Tooltip.install(this.quotaRow, i18nString(UIStrings.storageQuotaIsLimitedIn));
      this.quotaRow.appendChild(UI.Icon.Icon.create('smallicon-info'));
    }

    if (this.quotaUsage === null || this.quotaUsage !== response.usage) {
      this.quotaUsage = response.usage;
      /** @type {!Array<!PerfUI.PieChart.Slice>} */
      const slices = [];
      for (const usageForType of response.usageBreakdown.sort((a, b) => b.usage - a.usage)) {
        const value = usageForType.usage;
        if (!value) {
          continue;
        }
        const title = this.getStorageTypeName(usageForType.storageType);
        const color = this.pieColors.get(usageForType.storageType) || '#ccc';
        slices.push({value, color, title});
      }
      this.populatePieChart(response.usage, slices);
    }

    this.update();
  }

  private populatePieChart(total: number, slices: PerfUI.PieChart.Slice[]): void {
    this.pieChart.data = {
      chartName: i18nString(UIStrings.storageUsage),
      size: 110,
      formatter: Platform.NumberUtilities.bytesToString,
      showLegend: true,
      total,
      slices,
    };
  }

  private getStorageTypeName(type: Protocol.Storage.StorageType): string {
    switch (type) {
      case Protocol.Storage.StorageType.File_systems:
        return i18nString(UIStrings.fileSystem);
      case Protocol.Storage.StorageType.Websql:
        return i18nString(UIStrings.webSql);
      case Protocol.Storage.StorageType.Appcache:
        return i18nString(UIStrings.application);
      case Protocol.Storage.StorageType.Indexeddb:
        return i18nString(UIStrings.indexDB);
      case Protocol.Storage.StorageType.Cache_storage:
        return i18nString(UIStrings.cacheStorage);
      case Protocol.Storage.StorageType.Service_workers:
        return i18nString(UIStrings.serviceWorkers);
      default:
        return i18nString(UIStrings.other);
    }
  }
}

export const AllStorageTypes = [
  Protocol.Storage.StorageType.Appcache,
  Protocol.Storage.StorageType.Cache_storage,
  Protocol.Storage.StorageType.Cookies,
  Protocol.Storage.StorageType.Indexeddb,
  Protocol.Storage.StorageType.Local_storage,
  Protocol.Storage.StorageType.Service_workers,
  Protocol.Storage.StorageType.Websql,
];

let actionDelegateInstance: ActionDelegate;

export class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
  static instance(opts: {forceNew: boolean|null} = {forceNew: null}): ActionDelegate {
    const {forceNew} = opts;
    if (!actionDelegateInstance || forceNew) {
      actionDelegateInstance = new ActionDelegate();
    }

    return actionDelegateInstance;
  }

  handleAction(context: UI.Context.Context, actionId: string): boolean {
    switch (actionId) {
      case 'resources.clear':
        return this.handleClear(false);
      case 'resources.clear-incl-third-party-cookies':
        return this.handleClear(true);
    }
    return false;
  }

  private handleClear(includeThirdPartyCookies: boolean): boolean {
    const target = SDK.SDKModel.TargetManager.instance().mainTarget();
    if (!target) {
      return false;
    }
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    if (!resourceTreeModel) {
      return false;
    }
    const securityOrigin = resourceTreeModel.getMainSecurityOrigin();
    if (!securityOrigin) {
      return false;
    }

    StorageView.clear(target, securityOrigin, AllStorageTypes, includeThirdPartyCookies);
    return true;
  }
}
