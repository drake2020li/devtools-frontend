// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../../front_end/core/common/common.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Application from '../../../../../front_end/panels/application/application.js';
import * as UI from '../../../../../front_end/ui/legacy/legacy.js';

import type * as Protocol from '../../../../../front_end/generated/protocol.js';
import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import {createTarget, stubNoopSettings} from '../../helpers/EnvironmentHelpers.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';
import {getCleanTextContentFromElements} from '../../helpers/DOMHelpers.js';

const {assert} = chai;

describeWithMockConnection('AppManifestView', () => {
  const tests = (targetFactory: () => SDK.Target.Target) => {
    let target: SDK.Target.Target;
    let emptyView: UI.EmptyWidget.EmptyWidget;
    let reportView: UI.ReportView.ReportView;
    let throttler: Common.Throttler.Throttler;
    let view: Application.AppManifestView.AppManifestView;
    beforeEach(() => {
      stubNoopSettings();
      target = targetFactory();
      emptyView = new UI.EmptyWidget.EmptyWidget('');
      reportView = new UI.ReportView.ReportView('');
      throttler = new Common.Throttler.Throttler(0);
    });

    afterEach(() => {
      view.detach();
    });

    it('shows report view once manifest available', async () => {
      const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      assertNotNullOrUndefined(resourceTreeModel);

      const URL = 'http://example.com' as Platform.DevToolsPath.UrlString;
      const fetchAppManifest = sinon.stub(resourceTreeModel, 'fetchAppManifest');
      fetchAppManifest.onCall(0).resolves({url: URL, data: null, errors: []});
      fetchAppManifest.onCall(1).resolves({url: URL, data: '{}', errors: []});
      sinon.stub(resourceTreeModel, 'getInstallabilityErrors').resolves([]);
      sinon.stub(resourceTreeModel, 'getAppId').resolves({} as Protocol.Page.GetAppIdResponse);

      view = new Application.AppManifestView.AppManifestView(emptyView, reportView, throttler);
      view.markAsRoot();
      view.show(document.body);

      await new Promise<Event>(resolve => {
        view.contentElement.addEventListener('manifestDetection', resolve, {once: true});
      });
      assert.isTrue(emptyView.isShowing());
      assert.isFalse(reportView.isShowing());

      resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.DOMContentLoaded, 42);
      await new Promise<Event>(resolve => {
        view.contentElement.addEventListener('manifestDetection', resolve, {once: true});
      });
      assert.isFalse(emptyView.isShowing());
      assert.isTrue(reportView.isShowing());
    });

    it('shows pwa wco if available', async () => {
      const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      assertNotNullOrUndefined(resourceTreeModel);

      const URL = 'https://www.example.com' as Platform.DevToolsPath.UrlString;
      const fetchAppManifest = sinon.stub(resourceTreeModel, 'fetchAppManifest');
      fetchAppManifest.resolves({url: URL, data: '{"display_override": ["window-controls-overlay"]}', errors: []});

      sinon.stub(resourceTreeModel, 'getInstallabilityErrors').resolves([]);
      sinon.stub(resourceTreeModel, 'getAppId').resolves({} as Protocol.Page.GetAppIdResponse);

      view = new Application.AppManifestView.AppManifestView(emptyView, reportView, throttler);
      view.markAsRoot();
      view.show(document.body);

      resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.DOMContentLoaded, 42);
      await new Promise<Event>(resolve => {
        view.contentElement.addEventListener('manifestDetection', resolve, {once: true});
      });

      const manifestSections = view.getStaticSections();
      const values = getCleanTextContentFromElements(manifestSections[4].getFieldElement(), '.wco');
      assert.deepEqual(values, ['window-controls-overlay']);
    });

    it('can parse ‘sizes’-field', async () => {
      view = new Application.AppManifestView.AppManifestView(emptyView, reportView, throttler);
      const parsed =
          view.parseSizes('512x512', 'Icon' as Platform.UIString.LocalizedString, 'https://web.dev/image.html', []);
      const expected = [{
        width: 512,
        height: 512,
        formatted: '512×512px',
      } as Application.AppManifestView.ParsedSize];
      assert.deepStrictEqual(parsed, expected);
    });

    it('can handle missing ‘sizes’-field', async () => {
      view = new Application.AppManifestView.AppManifestView(emptyView, reportView, throttler);
      const parsed = view.parseSizes(
          undefined as unknown as string, 'Icon' as Platform.UIString.LocalizedString, 'https://web.dev/image.html',
          []);
      assert.deepStrictEqual(parsed, []);
    });
  };
  describe('without tab target', () => tests(() => createTarget()));
  describe('with tab target', () => tests(() => {
                                const tabTarget = createTarget({type: SDK.Target.Type.Tab});
                                createTarget({parentTarget: tabTarget, subtype: 'prerender'});
                                return createTarget({parentTarget: tabTarget});
                              }));
});
