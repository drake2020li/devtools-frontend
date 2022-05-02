// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';

import {Issue, IssueCategory, IssueKind} from './Issue.js';
import type {MarkdownIssueDescription} from './MarkdownIssueDescription.js';
import {resolveLazyDescription} from './MarkdownIssueDescription.js';

const
    UIStrings =
        {
          // Store strings used across messages in this block.
          /**
   * @description This links to the chrome feature status page when one exists.
   */
          feature: 'Check the feature status page for more details.',
          /**
   * @description This links to the chromium dash schedule when a milestone is set.
   * @example {100} milestone
   */
          milestone: 'This change will go into effect with milestone {milestone}.',
          /**
   *@description Title of issue raised when a deprecated feature is used
   */
          title: 'Deprecated Feature Used',

          // Store alphabetized messages per DeprecationIssueType in this block.
          /**
   *@description TODO(crbug.com/1318846): Description needed for translation
   */
          authorizationCoveredByWildcard:
              'Authorization will not be covered by the wildcard symbol (*) in CORS `Access-Control-Allow-Headers` handling.',
          /**
   *@description TODO(crbug.com/1320334): Description needed for translation
   */
          canRequestURLHTTPContainingNewline:
              'Resource requests whose URLs contained both removed whitespace `\\(n|r|t)` characters and less-than characters (`<`) are blocked. Please remove newlines and encode less-than characters from places like element attribute values in order to load these resources.',
          /**
   *@description TODO(crbug.com/1320335): Description needed for translation
   */
          chromeLoadTimesConnectionInfo:
              '`chrome.loadTimes()` is deprecated, instead use standardized API: Navigation Timing 2.',
          /**
   *@description TODO(crbug.com/1320336): Description needed for translation
   */
          chromeLoadTimesFirstPaintAfterLoadTime:
              '`chrome.loadTimes()` is deprecated, instead use standardized API: Paint Timing.',
          /**
   *@description TODO(crbug.com/1320337): Description needed for translation
   */
          chromeLoadTimesWasAlternateProtocolAvailable:
              '`chrome.loadTimes()` is deprecated, instead use standardized API: `nextHopProtocol` in Navigation Timing 2.',
          /**
   *@description TODO(crbug.com/1318847): Description needed for translation
   */
          cookieWithTruncatingChar: 'Cookies containing a `\\(0|r|n)` character will be rejected instead of truncated.',
          /**
   *@description TODO(crbug.com/1318849): Description needed for translation
   */
          crossOriginAccessBasedOnDocumentDomain:
              'Relaxing the same-origin policy by setting `document.domain` is deprecated, and will be disabled by default. This deprecation warning is for a cross-origin access that was enabled by setting `document.domain`.',
          /**
   *@description TODO(crbug.com/1318850): Description needed for translation
   */
          crossOriginWindowAlert:
              'Triggering `window.alert` from cross origin iframes has been deprecated and will be removed in the future.',
          /**
   *@description TODO(crbug.com/1318851): Description needed for translation
   */
          crossOriginWindowConfirm:
              'Triggering `window.confirm` from cross origin iframes has been deprecated and will be removed in the future.',
          /**
   *@description TODO(crbug.com/1320339): Description needed for translation
   */
          cssSelectorInternalMediaControlsOverlayCastButton:
              'The `disableRemotePlayback` attribute should be used in order to disable the default Cast integration instead of using `-internal-media-controls-overlay-cast-button` selector.',
          /**
   *@description TODO(crbug.com/1320340): Description needed for translation
   */
          customCursorIntersectsViewport:
              'Custom cursors with size greater than 32x32 DIP intersecting native UI is deprecated and will be removed.',
          /**
   *@description This message is shown when the example deprecated feature is used
   */
          deprecationExample: 'This is an example of a translated deprecation issue message.',
          /**
   *@description TODO(crbug.com/1318852): Description needed for translation
   */
          documentDomainSettingWithoutOriginAgentClusterHeader:
              'Relaxing the same-origin policy by setting `document.domain` is deprecated, and will be disabled by default. To continue using this feature, please opt-out of origin-keyed agent clusters by sending an `Origin-Agent-Cluster: ?0` header along with the HTTP response for the document and frames. See https://developer.chrome.com/blog/immutable-document-domain/ for more details.',
          /**
   *@description TODO(crbug.com/1320338): Description needed for translation
   */
          eventPath: '`Event.path` is deprecated and will be removed. Please use `Event.composedPath()` instead.',
          /**
   *@description Warning displayed to developers when the Geolocation API is used from an insecure origin (one that isn't localhost or doesn't use HTTPS) to notify them that this use is no longer supported.
   */
          geolocationInsecureOrigin:
              '`getCurrentPosition()` and `watchPosition()` no longer work on insecure origins. To use this feature, you should consider switching your application to a secure origin, such as HTTPS. See https://goo.gle/chrome-insecure-origins for more details.',
          /**
   *@description Warning displayed to developers when the Geolocation API is used from an insecure origin (one that isn't localhost or doesn't use HTTPS) to notify them that this use is deprecated.
   */
          geolocationInsecureOriginDeprecatedNotRemoved:
              '`getCurrentPosition()` and `watchPosition()` are deprecated on insecure origins. To use this feature, you should consider switching your application to a secure origin, such as HTTPS. See https://goo.gle/chrome-insecure-origins for more details.',
          /**
   *@description TODO(crbug.com/1318858): Description needed for translation
   */
          getUserMediaInsecureOrigin:
              '`getUserMedia()` no longer works on insecure origins. To use this feature, you should consider switching your application to a secure origin, such as HTTPS. See https://goo.gle/chrome-insecure-origins for more details.',
          /**
   *@description TODO(crbug.com/1320342): Description needed for translation
   */
          hostCandidateAttributeGetter:
              '`RTCPeerConnectionIceErrorEvent.hostCandidate` is deprecated. Please use `RTCPeerConnectionIceErrorEvent.address` or `RTCPeerConnectionIceErrorEvent.port` instead.',
          /**
   *@description TODO(crbug.com/1320343): Description needed for translation
   */
          insecurePrivateNetworkSubresourceRequest:
              'The website requested a subresource from a network that it could only access because of its users\' privileged network position. These requests expose non-public devices and servers to the internet, increasing the risk of a cross-site request forgery (CSRF) attack, and/or information leakage. To mitigate these risks, Chrome deprecates requests to non-public subresources when initiated from non-secure contexts, and will start blocking them.',
          /**
   *@description TODO(crbug.com/1318860): Description needed for translation
   */
          legacyConstraintGoogCpuOveruseDetection:
              'CPU overuse detection is enabled-by-default and the ability to disable it using `googCpuOveruseDetection` will soon be removed. Please stop using this legacy constraint.',
          /**
   *@description TODO(crbug.com/1318861): Description needed for translation
   */
          legacyConstraintGoogIPv6:
              'IPv6 is enabled-by-default and the ability to disable it using `googIPv6` will soon be removed. Please stop using this legacy constraint.',
          /**
   *@description TODO(crbug.com/1318863): Description needed for translation
   */
          legacyConstraintGoogScreencastMinBitrate:
              'Screencast min bitrate is now set to 100 kbps by default and `googScreencastMinBitrate` will soon be ignored in favor of this new default. Please stop using this legacy constraint.',
          /**
   *@description TODO(crbug.com/1318864): Description needed for translation
   */
          legacyConstraintGoogSuspendBelowMinBitrate:
              'Support for the `googSuspendBelowMinBitrate` constraint is about to be removed. Please stop using this legacy constraint.',
          /**
   *@description TODO(crbug.com/1318865): Description needed for translation
   */
          localCSSFileExtensionRejected:
              'CSS cannot be loaded from `file:` URLs unless they end in a `.css` file extension.',
          /**
   *@description TODO(crbug.com/1320344): Description needed for translation
   */
          mediaElementAudioSourceNode:
              'Creating a `MediaElementAudioSourceNode` on an `OfflineAudioContext` is deprecated and will be removed.',
          /**
   *@description TODO(crbug.com/1320345): Description needed for translation
   */
          mediaSourceAbortRemove:
              'Using `SourceBuffer.abort()` to abort `remove()`\'s asynchronous range removal is deprecated due to specification change. Support will be removed in the future. You should instead await `updateend`. `abort()` is intended to only abort an asynchronous media append or reset parser state.',
          /**
   *@description TODO(crbug.com/1320346): Description needed for translation
   */
          mediaSourceDurationTruncatingBuffered:
              'Setting `MediaSource.duration` below the highest presentation timestamp of any buffered coded frames is deprecated due to specification change. Support for implicit removal of truncated buffered media will be removed in the future. You should instead perform explicit `remove(newDuration, oldDuration)` on all `sourceBuffers`, where `newDuration < oldDuration`.',
          /**
   *@description TODO(crbug.com/1320347): Description needed for translation
   */
          noSysexWebMIDIWithoutPermission:
              'Web MIDI will ask a permission to use even if the sysex is not specified in the `MIDIOptions`.',
          /**
   *@description Warning displayed to developers when the Notification API is used from an insecure origin (one that isn't localhost or doesn't use HTTPS) to notify them that this use is no longer supported.
   */
          notificationInsecureOrigin:
              'The Notification API may no longer be used from insecure origins. You should consider switching your application to a secure origin, such as HTTPS. See https://goo.gle/chrome-insecure-origins for more details.',
          /**
   *@description Warning displayed to developers when permission to use notifications has been requested by a cross-origin iframe, to notify them that this use is no longer supported.
   */
          notificationPermissionRequestedIframe:
              'Permission for the Notification API may no longer be requested from a cross-origin iframe. You should consider requesting permission from a top-level frame or opening a new window instead.',
          /**
   *@description TODO(crbug.com/1318867): Description needed for translation
   */
          obsoleteWebRtcCipherSuite:
              'Your partner is negotiating an obsolete (D)TLS version. Please check with your partner to have this fixed.',
          /**
   *@description TODO(crbug.com/1320349): Description needed for translation
   */
          paymentRequestBasicCard: 'The `basic-card` payment method is deprecated and will be removed.',
          /**
   *@description TODO(crbug.com/1320350): Description needed for translation
   */
          paymentRequestShowWithoutGesture:
              'Calling `PaymentRequest.show()` without user activation is deprecated and will be removed.',
          /**
   *@description This issue indicates that a `<source>` element with a `<picture>` parent was using an `src` attribute, which is not valid and is ignored by the browser. The `srcset` attribute should be used instead.
   */
          pictureSourceSrc:
              '`<source src>` with a `<picture>` parent is invalid and therefore ignored. Please use `<source srcset>` instead.',
          /**
   *@description TODO(crbug.com/1318869): Description needed for translation
   */
          prefixedCancelAnimationFrame:
              '`webkitCancelAnimationFrame` is vendor-specific. Please use the standard `cancelAnimationFrame` instead.',
          /**
   *@description TODO(crbug.com/1318871): Description needed for translation
   */
          prefixedRequestAnimationFrame:
              '`webkitRequestAnimationFrame` is vendor-specific. Please use the standard `requestAnimationFrame` instead.',
          /**
   *@description TODO(crbug.com/1320351): Description needed for translation
   */
          prefixedStorageInfo:
              '`window.webkitStorageInfo` is deprecated. Please use `navigator.webkitTemporaryStorage` or `navigator.webkitPersistentStorage` instead.',
          /**
   *@description TODO(crbug.com/1320352): Description needed for translation
   */
          prefixedVideoDisplayingFullscreen:
              '`HTMLVideoElement.webkitDisplayingFullscreen` is deprecated. Please use `Document.fullscreenElement` instead.',
          /**
   *@description TODO(crbug.com/1320353): Description needed for translation
   */
          prefixedVideoEnterFullScreen:
              '`HTMLVideoElement.webkitEnterFullScreen()` is deprecated. Please use `Element.requestFullscreen()` instead.',
          /**
   *@description TODO(crbug.com/1320353): Description needed for translation
   */
          prefixedVideoEnterFullscreen:
              '`HTMLVideoElement.webkitEnterFullscreen()` is deprecated. Please use `Element.requestFullscreen()` instead.',
          /**
   *@description TODO(crbug.com/1320354): Description needed for translation
   */
          prefixedVideoExitFullScreen:
              '`HTMLVideoElement.webkitExitFullsSreen()` is deprecated. Please use `Document.exitFullscreen()` instead.',
          /**
   *@description TODO(crbug.com/1320354): Description needed for translation
   */
          prefixedVideoExitFullscreen:
              '`HTMLVideoElement.webkitExitFullscreen()` is deprecated. Please use `Document.exitFullscreen()` instead.',
          /**
   *@description TODO(crbug.com/1320355): Description needed for translation
   */
          prefixedVideoSupportsFullscreen:
              '`HTMLVideoElement.webkitSupportsFullscreen` is deprecated. Please use `Document.fullscreenEnabled` instead.',
          /**
   *@description TODO(crbug.com/1320356): Description needed for translation
   */
          rangeExpand: '`Range.expand()` is deprecated. Please use `Selection.modify()` instead.',
          /**
   *@description TODO(crbug.com/1320357): Description needed for translation
   */
          requestedSubresourceWithEmbeddedCredentials:
              'Subresource requests whose URLs contain embedded credentials (e.g. `https://user:pass@host/`) are blocked.',
          /**
   *@description TODO(crbug.com/1318872): Description needed for translation
   */
          rtcConstraintEnableDtlsSrtpFalse:
              'The constraint `DtlsSrtpKeyAgreement` is removed. You have specified a `false` value for this constraint, which is interpreted as an attempt to use the removed `SDES` key negotiation method. This functionality is removed; use a service that supports DTLS key negotiation instead.',
          /**
   *@description TODO(crbug.com/1318873): Description needed for translation
   */
          rtcConstraintEnableDtlsSrtpTrue:
              'The constraint `DtlsSrtpKeyAgreement` is removed. You have specified a `true` value for this constraint, which had no effect, but you can remove this constraint for tidiness.',
          /**
   *@description TODO(crbug.com/1318874): Description needed for translation
   */
          rtcPeerConnectionComplexPlanBSdpUsingDefaultSdpSemantics:
              'Complex Plan B SDP detected! Chrome will switch the default `sdpSemantics` from `plan-b` to the standardized `unified-plan` format and this peer connection is relying on the default `sdpSemantics`. This SDP is not compatible with Unified Plan and will be rejected by clients expecting Unified Plan. For more information about how to prepare for the switch, see https://webrtc.org/web-apis/chrome/unified-plan/.',
          /**
   *@description TODO(crbug.com/1318875): Description needed for translation
   */
          rtcPeerConnectionLegacyCreateWithMediaConstraints:
              'The `mediaConstraints` version of `RTCOfferOptions/RTCAnswerOptions` are deprecated and will soon be removed, please migrate to the promise-based `createOffer`/`createAnswer` instead.',
          /**
   *@description TODO(crbug.com/1320358): Description needed for translation
   */
          rtcPeerConnectionSdpSemanticsPlanB:
              'Plan B SDP semantics, which is used when constructing an `RTCPeerConnection` with `{sdpSemantics:\'plan-b\'}`, is a legacy non-standard version of the Session Description Protocol that has been permanently deleted from the Web Platform. It is still available when building with IS_FUCHSIA, but we intend to delete it as soon as possible. Stop depending on it. See https://crbug.com/1302249 for status.',
          /**
   *@description TODO(crbug.com/1320360): Description needed for translation
   */
          rtcpMuxPolicyNegotiate: 'The `rtcpMuxPolicy` option is deprecated and will be removed.',
          /**
   *@description TODO(crbug.com/1318876): Description needed for translation
   */
          rtpDataChannel:
              'RTP data channels are no longer supported. The `RtpDataChannels` constraint is currently ignored, and may cause an error at a later date.',
          /**
   *@description TODO(crbug.com/1320361): Description needed for translation
   */
          selectionAddRangeIntersect:
              'The behavior that `Selection.addRange()` merges existing Range and the specified Range was removed.',
          /**
   *@description TODO(crbug.com/1318878): Description needed for translation
   */
          sharedArrayBufferConstructedWithoutIsolation:
              '`SharedArrayBuffer` will require cross-origin isolation. See https://developer.chrome.com/blog/enabling-shared-array-buffer/ for more details.',
          /**
   *@description TODO(crbug.com/1320363): Description needed for translation
   */
          textToSpeech_DisallowedByAutoplay:
              '`speechSynthesis.speak()` without user activation is deprecated and will be removed.',
          /**
   *@description TODO(crbug.com/1318879): Description needed for translation
   */
          v8SharedArrayBufferConstructedInExtensionWithoutIsolation:
              'Extensions should opt into cross-origin isolation to continue using `SharedArrayBuffer`. See https://developer.chrome.com/docs/extensions/mv3/cross-origin-isolation/.',
          /**
   *@description TODO(crbug.com/1318880): Description needed for translation
   */
          webCodecsVideoFrameDefaultTimestamp:
              'Constructing a `VideoFrame` without a timestamp is deprecated and support will be removed. Please provide a timestamp via `VideoFrameInit`.',
          /**
   *@description TODO(crbug.com/1318881): Description needed for translation
   */
          xhrJSONEncodingDetection: 'UTF-16 is not supported by response json in `XMLHttpRequest`',
          /**
   *@description TODO(crbug.com/1318882): Description needed for translation
   */
          xmlHttpRequestSynchronousInNonWorkerOutsideBeforeUnload:
              'Synchronous `XMLHttpRequest` on the main thread is deprecated because of its detrimental effects to the end user\u2019s experience. For more help, check https://xhr.spec.whatwg.org/.',
          /**
   *@description TODO(crbug.com/1320365): Description needed for translation
   */
          xrSupportsSession:
              '`supportsSession()` is deprecated. Please use `isSessionSupported()` and check the resolved boolean value instead.',
        };
const str_ = i18n.i18n.registerUIStrings('models/issues_manager/DeprecationIssue.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

export class DeprecationIssue extends Issue {
  #issueDetails: Protocol.Audits.DeprecationIssueDetails;

  constructor(issueDetails: Protocol.Audits.DeprecationIssueDetails, issuesModel: SDK.IssuesModel.IssuesModel) {
    const issueCode = [
      Protocol.Audits.InspectorIssueCode.DeprecationIssue,
      issueDetails.type,
    ].join('::');
    super({code: issueCode, umaCode: 'DeprecationIssue'}, issuesModel);
    this.#issueDetails = issueDetails;
  }

  getCategory(): IssueCategory {
    return IssueCategory.Other;
  }

  details(): Protocol.Audits.DeprecationIssueDetails {
    return this.#issueDetails;
  }

  getDescription(): MarkdownIssueDescription {
    let messageFunction = (): string => '';
    let feature = 0;
    let milestone = 0;
    // Keep case statements alphabetized per DeprecationIssueType.
    switch (this.#issueDetails.type) {
      case Protocol.Audits.DeprecationIssueType.AuthorizationCoveredByWildcard:
        messageFunction = i18nLazyString(UIStrings.authorizationCoveredByWildcard);
        milestone = 97;
        break;
      case Protocol.Audits.DeprecationIssueType.CanRequestURLHTTPContainingNewline:
        messageFunction = i18nLazyString(UIStrings.canRequestURLHTTPContainingNewline);
        feature = 5735596811091968;
        break;
      case Protocol.Audits.DeprecationIssueType.ChromeLoadTimesConnectionInfo:
        messageFunction = i18nLazyString(UIStrings.chromeLoadTimesConnectionInfo);
        feature = 5637885046816768;
        break;
      case Protocol.Audits.DeprecationIssueType.ChromeLoadTimesFirstPaintAfterLoadTime:
        messageFunction = i18nLazyString(UIStrings.chromeLoadTimesFirstPaintAfterLoadTime);
        feature = 5637885046816768;
        break;
      case Protocol.Audits.DeprecationIssueType.ChromeLoadTimesWasAlternateProtocolAvailable:
        messageFunction = i18nLazyString(UIStrings.chromeLoadTimesWasAlternateProtocolAvailable);
        feature = 5637885046816768;
        break;
      case Protocol.Audits.DeprecationIssueType.CookieWithTruncatingChar:
        messageFunction = i18nLazyString(UIStrings.cookieWithTruncatingChar);
        milestone = 103;
        break;
      case Protocol.Audits.DeprecationIssueType.CrossOriginAccessBasedOnDocumentDomain:
        messageFunction = i18nLazyString(UIStrings.crossOriginAccessBasedOnDocumentDomain);
        milestone = 106;
        break;
      case Protocol.Audits.DeprecationIssueType.CrossOriginWindowAlert:
        messageFunction = i18nLazyString(UIStrings.crossOriginWindowAlert);
        break;
      case Protocol.Audits.DeprecationIssueType.CrossOriginWindowConfirm:
        messageFunction = i18nLazyString(UIStrings.crossOriginWindowConfirm);
        break;
      case Protocol.Audits.DeprecationIssueType.CSSSelectorInternalMediaControlsOverlayCastButton:
        messageFunction = i18nLazyString(UIStrings.cssSelectorInternalMediaControlsOverlayCastButton);
        feature = 5714245488476160;
        break;
      case Protocol.Audits.DeprecationIssueType.CustomCursorIntersectsViewport:
        messageFunction = i18nLazyString(UIStrings.customCursorIntersectsViewport);
        feature = 5825971391299584;
        milestone = 75;
        break;
      case Protocol.Audits.DeprecationIssueType.DeprecationExample:
        messageFunction = i18nLazyString(UIStrings.deprecationExample);
        feature = 5684289032159232;
        milestone = 100;
        break;
      case Protocol.Audits.DeprecationIssueType.DocumentDomainSettingWithoutOriginAgentClusterHeader:
        messageFunction = i18nLazyString(UIStrings.documentDomainSettingWithoutOriginAgentClusterHeader);
        milestone = 106;
        break;
      case Protocol.Audits.DeprecationIssueType.EventPath:
        messageFunction = i18nLazyString(UIStrings.eventPath);
        feature = 5726124632965120;
        milestone = 109;
        break;
      case Protocol.Audits.DeprecationIssueType.GeolocationInsecureOrigin:
        messageFunction = i18nLazyString(UIStrings.geolocationInsecureOrigin);
        break;
      case Protocol.Audits.DeprecationIssueType.GeolocationInsecureOriginDeprecatedNotRemoved:
        messageFunction = i18nLazyString(UIStrings.geolocationInsecureOriginDeprecatedNotRemoved);
        break;
      case Protocol.Audits.DeprecationIssueType.GetUserMediaInsecureOrigin:
        messageFunction = i18nLazyString(UIStrings.getUserMediaInsecureOrigin);
        break;
      case Protocol.Audits.DeprecationIssueType.HostCandidateAttributeGetter:
        messageFunction = i18nLazyString(UIStrings.hostCandidateAttributeGetter);
        break;
      case Protocol.Audits.DeprecationIssueType.InsecurePrivateNetworkSubresourceRequest:
        messageFunction = i18nLazyString(UIStrings.insecurePrivateNetworkSubresourceRequest);
        feature = 5436853517811712;
        milestone = 92;
        break;
      case Protocol.Audits.DeprecationIssueType.LegacyConstraintGoogCpuOveruseDetection:
        messageFunction = i18nLazyString(UIStrings.legacyConstraintGoogCpuOveruseDetection);
        milestone = 103;
        break;
      case Protocol.Audits.DeprecationIssueType.LegacyConstraintGoogIPv6:
        messageFunction = i18nLazyString(UIStrings.legacyConstraintGoogIPv6);
        milestone = 103;
        break;
      case Protocol.Audits.DeprecationIssueType.LegacyConstraintGoogScreencastMinBitrate:
        messageFunction = i18nLazyString(UIStrings.legacyConstraintGoogScreencastMinBitrate);
        milestone = 103;
        break;
      case Protocol.Audits.DeprecationIssueType.LegacyConstraintGoogSuspendBelowMinBitrate:
        messageFunction = i18nLazyString(UIStrings.legacyConstraintGoogSuspendBelowMinBitrate);
        milestone = 103;
        break;
      case Protocol.Audits.DeprecationIssueType.LocalCSSFileExtensionRejected:
        messageFunction = i18nLazyString(UIStrings.localCSSFileExtensionRejected);
        milestone = 64;
        break;
      case Protocol.Audits.DeprecationIssueType.MediaElementAudioSourceNode:
        messageFunction = i18nLazyString(UIStrings.mediaElementAudioSourceNode);
        feature = 5258622686724096;
        milestone = 71;
        break;
      case Protocol.Audits.DeprecationIssueType.MediaSourceAbortRemove:
        messageFunction = i18nLazyString(UIStrings.mediaSourceAbortRemove);
        feature = 6107495151960064;
        break;
      case Protocol.Audits.DeprecationIssueType.MediaSourceDurationTruncatingBuffered:
        messageFunction = i18nLazyString(UIStrings.mediaSourceDurationTruncatingBuffered);
        feature = 6107495151960064;
        break;
      case Protocol.Audits.DeprecationIssueType.NoSysexWebMIDIWithoutPermission:
        messageFunction = i18nLazyString(UIStrings.noSysexWebMIDIWithoutPermission);
        feature = 5138066234671104;
        milestone = 82;
        break;
      case Protocol.Audits.DeprecationIssueType.NotificationInsecureOrigin:
        messageFunction = i18nLazyString(UIStrings.notificationInsecureOrigin);
        break;
      case Protocol.Audits.DeprecationIssueType.NotificationPermissionRequestedIframe:
        messageFunction = i18nLazyString(UIStrings.notificationPermissionRequestedIframe);
        feature = 6451284559265792;
        break;
      case Protocol.Audits.DeprecationIssueType.ObsoleteWebRtcCipherSuite:
        messageFunction = i18nLazyString(UIStrings.obsoleteWebRtcCipherSuite);
        milestone = 81;
        break;
      case Protocol.Audits.DeprecationIssueType.PaymentRequestBasicCard:
        messageFunction = i18nLazyString(UIStrings.paymentRequestBasicCard);
        feature = 5730051011117056;
        milestone = 100;
        break;
      case Protocol.Audits.DeprecationIssueType.PaymentRequestShowWithoutGesture:
        messageFunction = i18nLazyString(UIStrings.paymentRequestShowWithoutGesture);
        feature = 5948593429020672;
        milestone = 102;
        break;
      case Protocol.Audits.DeprecationIssueType.PictureSourceSrc:
        messageFunction = i18nLazyString(UIStrings.pictureSourceSrc);
        break;
      case Protocol.Audits.DeprecationIssueType.PrefixedCancelAnimationFrame:
        messageFunction = i18nLazyString(UIStrings.prefixedCancelAnimationFrame);
        break;
      case Protocol.Audits.DeprecationIssueType.PrefixedRequestAnimationFrame:
        messageFunction = i18nLazyString(UIStrings.prefixedRequestAnimationFrame);
        break;
      case Protocol.Audits.DeprecationIssueType.PrefixedStorageInfo:
        messageFunction = i18nLazyString(UIStrings.prefixedStorageInfo);
        break;
      case Protocol.Audits.DeprecationIssueType.PrefixedVideoDisplayingFullscreen:
        messageFunction = i18nLazyString(UIStrings.prefixedVideoDisplayingFullscreen);
        break;
      case Protocol.Audits.DeprecationIssueType.PrefixedVideoEnterFullScreen:
        messageFunction = i18nLazyString(UIStrings.prefixedVideoEnterFullScreen);
        break;
      case Protocol.Audits.DeprecationIssueType.PrefixedVideoEnterFullscreen:
        messageFunction = i18nLazyString(UIStrings.prefixedVideoEnterFullscreen);
        break;
      case Protocol.Audits.DeprecationIssueType.PrefixedVideoExitFullScreen:
        messageFunction = i18nLazyString(UIStrings.prefixedVideoExitFullScreen);
        break;
      case Protocol.Audits.DeprecationIssueType.PrefixedVideoExitFullscreen:
        messageFunction = i18nLazyString(UIStrings.prefixedVideoExitFullscreen);
        break;
      case Protocol.Audits.DeprecationIssueType.PrefixedVideoSupportsFullscreen:
        messageFunction = i18nLazyString(UIStrings.prefixedVideoSupportsFullscreen);
        break;
      case Protocol.Audits.DeprecationIssueType.RangeExpand:
        messageFunction = i18nLazyString(UIStrings.rangeExpand);
        break;
      case Protocol.Audits.DeprecationIssueType.RequestedSubresourceWithEmbeddedCredentials:
        messageFunction = i18nLazyString(UIStrings.requestedSubresourceWithEmbeddedCredentials);
        feature = 5669008342777856;
        break;
      case Protocol.Audits.DeprecationIssueType.RTCConstraintEnableDtlsSrtpFalse:
        messageFunction = i18nLazyString(UIStrings.rtcConstraintEnableDtlsSrtpFalse);
        milestone = 97;
        break;
      case Protocol.Audits.DeprecationIssueType.RTCConstraintEnableDtlsSrtpTrue:
        messageFunction = i18nLazyString(UIStrings.rtcConstraintEnableDtlsSrtpTrue);
        milestone = 97;
        break;
      case Protocol.Audits.DeprecationIssueType.RTCPeerConnectionComplexPlanBSdpUsingDefaultSdpSemantics:
        messageFunction = i18nLazyString(UIStrings.rtcPeerConnectionComplexPlanBSdpUsingDefaultSdpSemantics);
        milestone = 72;
        break;
      case Protocol.Audits.DeprecationIssueType.RTCPeerConnectionLegacyCreateWithMediaConstraints:
        messageFunction = i18nLazyString(UIStrings.rtcPeerConnectionLegacyCreateWithMediaConstraints);
        milestone = 103;
        break;
      case Protocol.Audits.DeprecationIssueType.RTCPeerConnectionSdpSemanticsPlanB:
        messageFunction = i18nLazyString(UIStrings.rtcPeerConnectionSdpSemanticsPlanB);
        feature = 5823036655665152;
        milestone = 93;
        break;
      case Protocol.Audits.DeprecationIssueType.RtcpMuxPolicyNegotiate:
        messageFunction = i18nLazyString(UIStrings.rtcpMuxPolicyNegotiate);
        feature = 5654810086866944;
        milestone = 62;
        break;
      case Protocol.Audits.DeprecationIssueType.RTPDataChannel:
        messageFunction = i18nLazyString(UIStrings.rtpDataChannel);
        milestone = 88;
        break;
      case Protocol.Audits.DeprecationIssueType.SelectionAddRangeIntersect:
        messageFunction = i18nLazyString(UIStrings.selectionAddRangeIntersect);
        feature = 6680566019653632;
        break;
      case Protocol.Audits.DeprecationIssueType.SharedArrayBufferConstructedWithoutIsolation:
        messageFunction = i18nLazyString(UIStrings.sharedArrayBufferConstructedWithoutIsolation);
        milestone = 106;
        break;
      case Protocol.Audits.DeprecationIssueType.TextToSpeech_DisallowedByAutoplay:
        messageFunction = i18nLazyString(UIStrings.textToSpeech_DisallowedByAutoplay);
        feature = 5687444770914304;
        milestone = 71;
        break;
      case Protocol.Audits.DeprecationIssueType.V8SharedArrayBufferConstructedInExtensionWithoutIsolation:
        messageFunction = i18nLazyString(UIStrings.v8SharedArrayBufferConstructedInExtensionWithoutIsolation);
        milestone = 96;
        break;
      case Protocol.Audits.DeprecationIssueType.WebCodecsVideoFrameDefaultTimestamp:
        messageFunction = i18nLazyString(UIStrings.webCodecsVideoFrameDefaultTimestamp);
        feature = 5667793157488640;
        milestone = 99;
        break;
      case Protocol.Audits.DeprecationIssueType.XHRJSONEncodingDetection:
        messageFunction = i18nLazyString(UIStrings.xhrJSONEncodingDetection);
        milestone = 93;
        break;
      case Protocol.Audits.DeprecationIssueType.XMLHttpRequestSynchronousInNonWorkerOutsideBeforeUnload:
        messageFunction = i18nLazyString(UIStrings.xmlHttpRequestSynchronousInNonWorkerOutsideBeforeUnload);
        break;
      case Protocol.Audits.DeprecationIssueType.XRSupportsSession:
        messageFunction = i18nLazyString(UIStrings.xrSupportsSession);
        milestone = 80;
        break;
    }
    const links = [];
    if (feature !== 0) {
      links.push({
        link: `https://chromestatus.com/feature/${feature}`,
        linkTitle: i18nLazyString(UIStrings.feature),
      });
    }
    if (milestone !== 0) {
      links.push({
        link: 'https://chromiumdash.appspot.com/schedule',
        linkTitle: i18nLazyString(UIStrings.milestone, {milestone}),
      });
    }
    return resolveLazyDescription({
      file: 'deprecation.md',
      substitutions: new Map([
        ['PLACEHOLDER_title', i18nLazyString(UIStrings.title)],
        ['PLACEHOLDER_message', messageFunction],
      ]),
      links,
    });
  }

  sources(): Iterable<Protocol.Audits.SourceCodeLocation> {
    if (this.#issueDetails.sourceCodeLocation) {
      return [this.#issueDetails.sourceCodeLocation];
    }
    return [];
  }

  primaryKey(): string {
    return JSON.stringify(this.#issueDetails);
  }

  getKind(): IssueKind {
    return IssueKind.BreakingChange;
  }

  static fromInspectorIssue(issuesModel: SDK.IssuesModel.IssuesModel, inspectorIssue: Protocol.Audits.InspectorIssue):
      DeprecationIssue[] {
    const details = inspectorIssue.details.deprecationIssueDetails;
    if (!details) {
      console.warn('Deprecation issue without details received.');
      return [];
    }
    return [new DeprecationIssue(details, issuesModel)];
  }
}
