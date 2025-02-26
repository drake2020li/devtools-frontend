"use strict";
/**
 * Copyright 2017 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CDPBrowserContext = exports.CDPBrowser = void 0;
const Browser_js_1 = require("../api/Browser.js");
const BrowserContext_js_1 = require("../api/BrowserContext.js");
const assert_js_1 = require("../util/assert.js");
const ChromeTargetManager_js_1 = require("./ChromeTargetManager.js");
const Connection_js_1 = require("./Connection.js");
const FirefoxTargetManager_js_1 = require("./FirefoxTargetManager.js");
const Target_js_1 = require("./Target.js");
const TaskQueue_js_1 = require("./TaskQueue.js");
/**
 * @internal
 */
class CDPBrowser extends Browser_js_1.Browser {
    /**
     * @internal
     */
    static async _create(product, connection, contextIds, ignoreHTTPSErrors, defaultViewport, process, closeCallback, targetFilterCallback, isPageTargetCallback, waitForInitiallyDiscoveredTargets = true) {
        const browser = new CDPBrowser(product, connection, contextIds, ignoreHTTPSErrors, defaultViewport, process, closeCallback, targetFilterCallback, isPageTargetCallback, waitForInitiallyDiscoveredTargets);
        await browser._attach();
        return browser;
    }
    #ignoreHTTPSErrors;
    #defaultViewport;
    #process;
    #connection;
    #closeCallback;
    #targetFilterCallback;
    #isPageTargetCallback;
    #defaultContext;
    #contexts = new Map();
    #screenshotTaskQueue;
    #targetManager;
    /**
     * @internal
     */
    get _targets() {
        return this.#targetManager.getAvailableTargets();
    }
    /**
     * @internal
     */
    constructor(product, connection, contextIds, ignoreHTTPSErrors, defaultViewport, process, closeCallback, targetFilterCallback, isPageTargetCallback, waitForInitiallyDiscoveredTargets = true) {
        super();
        product = product || 'chrome';
        this.#ignoreHTTPSErrors = ignoreHTTPSErrors;
        this.#defaultViewport = defaultViewport;
        this.#process = process;
        this.#screenshotTaskQueue = new TaskQueue_js_1.TaskQueue();
        this.#connection = connection;
        this.#closeCallback = closeCallback || function () { };
        this.#targetFilterCallback =
            targetFilterCallback ||
                (() => {
                    return true;
                });
        this.#setIsPageTargetCallback(isPageTargetCallback);
        if (product === 'firefox') {
            this.#targetManager = new FirefoxTargetManager_js_1.FirefoxTargetManager(connection, this.#createTarget, this.#targetFilterCallback);
        }
        else {
            this.#targetManager = new ChromeTargetManager_js_1.ChromeTargetManager(connection, this.#createTarget, this.#targetFilterCallback, waitForInitiallyDiscoveredTargets);
        }
        this.#defaultContext = new CDPBrowserContext(this.#connection, this);
        for (const contextId of contextIds) {
            this.#contexts.set(contextId, new CDPBrowserContext(this.#connection, this, contextId));
        }
    }
    #emitDisconnected = () => {
        this.emit("disconnected" /* BrowserEmittedEvents.Disconnected */);
    };
    /**
     * @internal
     */
    async _attach() {
        this.#connection.on(Connection_js_1.ConnectionEmittedEvents.Disconnected, this.#emitDisconnected);
        this.#targetManager.on("targetAvailable" /* TargetManagerEmittedEvents.TargetAvailable */, this.#onAttachedToTarget);
        this.#targetManager.on("targetGone" /* TargetManagerEmittedEvents.TargetGone */, this.#onDetachedFromTarget);
        this.#targetManager.on("targetChanged" /* TargetManagerEmittedEvents.TargetChanged */, this.#onTargetChanged);
        this.#targetManager.on("targetDiscovered" /* TargetManagerEmittedEvents.TargetDiscovered */, this.#onTargetDiscovered);
        await this.#targetManager.initialize();
    }
    /**
     * @internal
     */
    _detach() {
        this.#connection.off(Connection_js_1.ConnectionEmittedEvents.Disconnected, this.#emitDisconnected);
        this.#targetManager.off("targetAvailable" /* TargetManagerEmittedEvents.TargetAvailable */, this.#onAttachedToTarget);
        this.#targetManager.off("targetGone" /* TargetManagerEmittedEvents.TargetGone */, this.#onDetachedFromTarget);
        this.#targetManager.off("targetChanged" /* TargetManagerEmittedEvents.TargetChanged */, this.#onTargetChanged);
        this.#targetManager.off("targetDiscovered" /* TargetManagerEmittedEvents.TargetDiscovered */, this.#onTargetDiscovered);
    }
    /**
     * The spawned browser process. Returns `null` if the browser instance was created with
     * {@link Puppeteer.connect}.
     */
    process() {
        return this.#process ?? null;
    }
    /**
     * @internal
     */
    _targetManager() {
        return this.#targetManager;
    }
    #setIsPageTargetCallback(isPageTargetCallback) {
        this.#isPageTargetCallback =
            isPageTargetCallback ||
                ((target) => {
                    return (target.type() === 'page' ||
                        target.type() === 'background_page' ||
                        target.type() === 'webview');
                });
    }
    /**
     * @internal
     */
    _getIsPageTargetCallback() {
        return this.#isPageTargetCallback;
    }
    /**
     * Creates a new incognito browser context. This won't share cookies/cache with other
     * browser contexts.
     *
     * @example
     *
     * ```ts
     * (async () => {
     *   const browser = await puppeteer.launch();
     *   // Create a new incognito browser context.
     *   const context = await browser.createIncognitoBrowserContext();
     *   // Create a new page in a pristine context.
     *   const page = await context.newPage();
     *   // Do stuff
     *   await page.goto('https://example.com');
     * })();
     * ```
     */
    async createIncognitoBrowserContext(options = {}) {
        const { proxyServer, proxyBypassList } = options;
        const { browserContextId } = await this.#connection.send('Target.createBrowserContext', {
            proxyServer,
            proxyBypassList: proxyBypassList && proxyBypassList.join(','),
        });
        const context = new CDPBrowserContext(this.#connection, this, browserContextId);
        this.#contexts.set(browserContextId, context);
        return context;
    }
    /**
     * Returns an array of all open browser contexts. In a newly created browser, this will
     * return a single instance of {@link BrowserContext}.
     */
    browserContexts() {
        return [this.#defaultContext, ...Array.from(this.#contexts.values())];
    }
    /**
     * Returns the default browser context. The default browser context cannot be closed.
     */
    defaultBrowserContext() {
        return this.#defaultContext;
    }
    /**
     * @internal
     */
    async _disposeContext(contextId) {
        if (!contextId) {
            return;
        }
        await this.#connection.send('Target.disposeBrowserContext', {
            browserContextId: contextId,
        });
        this.#contexts.delete(contextId);
    }
    #createTarget = (targetInfo, session) => {
        const { browserContextId } = targetInfo;
        const context = browserContextId && this.#contexts.has(browserContextId)
            ? this.#contexts.get(browserContextId)
            : this.#defaultContext;
        if (!context) {
            throw new Error('Missing browser context');
        }
        const createSession = (isAutoAttachEmulated) => {
            return this.#connection._createSession(targetInfo, isAutoAttachEmulated);
        };
        const targetForFilter = new Target_js_1.OtherTarget(targetInfo, session, context, this.#targetManager, createSession);
        if (this.#isPageTargetCallback(targetForFilter)) {
            return new Target_js_1.PageTarget(targetInfo, session, context, this.#targetManager, createSession, this.#ignoreHTTPSErrors, this.#defaultViewport ?? null, this.#screenshotTaskQueue);
        }
        if (targetInfo.type === 'service_worker' ||
            targetInfo.type === 'shared_worker') {
            return new Target_js_1.WorkerTarget(targetInfo, session, context, this.#targetManager, createSession);
        }
        return new Target_js_1.OtherTarget(targetInfo, session, context, this.#targetManager, createSession);
    };
    #onAttachedToTarget = async (target) => {
        if ((await target._initializedDeferred.valueOrThrow()) ===
            Target_js_1.InitializationStatus.SUCCESS) {
            this.emit("targetcreated" /* BrowserEmittedEvents.TargetCreated */, target);
            target
                .browserContext()
                .emit("targetcreated" /* BrowserContextEmittedEvents.TargetCreated */, target);
        }
    };
    #onDetachedFromTarget = async (target) => {
        target._initializedDeferred.resolve(Target_js_1.InitializationStatus.ABORTED);
        target._isClosedDeferred.resolve();
        if ((await target._initializedDeferred.valueOrThrow()) ===
            Target_js_1.InitializationStatus.SUCCESS) {
            this.emit("targetdestroyed" /* BrowserEmittedEvents.TargetDestroyed */, target);
            target
                .browserContext()
                .emit("targetdestroyed" /* BrowserContextEmittedEvents.TargetDestroyed */, target);
        }
    };
    #onTargetChanged = ({ target }) => {
        this.emit("targetchanged" /* BrowserEmittedEvents.TargetChanged */, target);
        target
            .browserContext()
            .emit("targetchanged" /* BrowserContextEmittedEvents.TargetChanged */, target);
    };
    #onTargetDiscovered = (targetInfo) => {
        this.emit('targetdiscovered', targetInfo);
    };
    /**
     * The browser websocket endpoint which can be used as an argument to
     * {@link Puppeteer.connect}.
     *
     * @returns The Browser websocket url.
     *
     * @remarks
     *
     * The format is `ws://${host}:${port}/devtools/browser/<id>`.
     *
     * You can find the `webSocketDebuggerUrl` from `http://${host}:${port}/json/version`.
     * Learn more about the
     * {@link https://chromedevtools.github.io/devtools-protocol | devtools protocol} and
     * the {@link
     * https://chromedevtools.github.io/devtools-protocol/#how-do-i-access-the-browser-target
     * | browser endpoint}.
     */
    wsEndpoint() {
        return this.#connection.url();
    }
    /**
     * Promise which resolves to a new {@link Page} object. The Page is created in
     * a default browser context.
     */
    async newPage() {
        return this.#defaultContext.newPage();
    }
    /**
     * @internal
     */
    async _createPageInContext(contextId) {
        const { targetId } = await this.#connection.send('Target.createTarget', {
            url: 'about:blank',
            browserContextId: contextId || undefined,
        });
        const target = this.#targetManager.getAvailableTargets().get(targetId);
        if (!target) {
            throw new Error(`Missing target for page (id = ${targetId})`);
        }
        const initialized = (await target._initializedDeferred.valueOrThrow()) ===
            Target_js_1.InitializationStatus.SUCCESS;
        if (!initialized) {
            throw new Error(`Failed to create target for page (id = ${targetId})`);
        }
        const page = await target.page();
        if (!page) {
            throw new Error(`Failed to create a page for context (id = ${contextId})`);
        }
        return page;
    }
    /**
     * All active targets inside the Browser. In case of multiple browser contexts, returns
     * an array with all the targets in all browser contexts.
     */
    targets() {
        return Array.from(this.#targetManager.getAvailableTargets().values()).filter(target => {
            return (target._initializedDeferred.value() === Target_js_1.InitializationStatus.SUCCESS);
        });
    }
    /**
     * The target associated with the browser.
     */
    target() {
        const browserTarget = this.targets().find(target => {
            return target.type() === 'browser';
        });
        if (!browserTarget) {
            throw new Error('Browser target is not found');
        }
        return browserTarget;
    }
    async version() {
        const version = await this.#getVersion();
        return version.product;
    }
    /**
     * The browser's original user agent. Pages can override the browser user agent with
     * {@link Page.setUserAgent}.
     */
    async userAgent() {
        const version = await this.#getVersion();
        return version.userAgent;
    }
    async close() {
        await this.#closeCallback.call(null);
        this.disconnect();
    }
    disconnect() {
        this.#targetManager.dispose();
        this.#connection.dispose();
        this._detach();
    }
    /**
     * Indicates that the browser is connected.
     */
    isConnected() {
        return !this.#connection._closed;
    }
    #getVersion() {
        return this.#connection.send('Browser.getVersion');
    }
}
exports.CDPBrowser = CDPBrowser;
/**
 * @internal
 */
class CDPBrowserContext extends BrowserContext_js_1.BrowserContext {
    #connection;
    #browser;
    #id;
    /**
     * @internal
     */
    constructor(connection, browser, contextId) {
        super();
        this.#connection = connection;
        this.#browser = browser;
        this.#id = contextId;
    }
    get id() {
        return this.#id;
    }
    /**
     * An array of all active targets inside the browser context.
     */
    targets() {
        return this.#browser.targets().filter(target => {
            return target.browserContext() === this;
        });
    }
    /**
     * This searches for a target in this specific browser context.
     *
     * @example
     * An example of finding a target for a page opened via `window.open`:
     *
     * ```ts
     * await page.evaluate(() => window.open('https://www.example.com/'));
     * const newWindowTarget = await browserContext.waitForTarget(
     *   target => target.url() === 'https://www.example.com/'
     * );
     * ```
     *
     * @param predicate - A function to be run for every target
     * @param options - An object of options. Accepts a timeout,
     * which is the maximum wait time in milliseconds.
     * Pass `0` to disable the timeout. Defaults to 30 seconds.
     * @returns Promise which resolves to the first target found
     * that matches the `predicate` function.
     */
    waitForTarget(predicate, options = {}) {
        return this.#browser.waitForTarget(target => {
            return target.browserContext() === this && predicate(target);
        }, options);
    }
    /**
     * An array of all pages inside the browser context.
     *
     * @returns Promise which resolves to an array of all open pages.
     * Non visible pages, such as `"background_page"`, will not be listed here.
     * You can find them using {@link CDPTarget.page | the target page}.
     */
    async pages() {
        const pages = await Promise.all(this.targets()
            .filter(target => {
            return (target.type() === 'page' ||
                (target.type() === 'other' &&
                    this.#browser._getIsPageTargetCallback()?.(target)));
        })
            .map(target => {
            return target.page();
        }));
        return pages.filter((page) => {
            return !!page;
        });
    }
    /**
     * Returns whether BrowserContext is incognito.
     * The default browser context is the only non-incognito browser context.
     *
     * @remarks
     * The default browser context cannot be closed.
     */
    isIncognito() {
        return !!this.#id;
    }
    /**
     * @example
     *
     * ```ts
     * const context = browser.defaultBrowserContext();
     * await context.overridePermissions('https://html5demos.com', [
     *   'geolocation',
     * ]);
     * ```
     *
     * @param origin - The origin to grant permissions to, e.g. "https://example.com".
     * @param permissions - An array of permissions to grant.
     * All permissions that are not listed here will be automatically denied.
     */
    async overridePermissions(origin, permissions) {
        const protocolPermissions = permissions.map(permission => {
            const protocolPermission = Browser_js_1.WEB_PERMISSION_TO_PROTOCOL_PERMISSION.get(permission);
            if (!protocolPermission) {
                throw new Error('Unknown permission: ' + permission);
            }
            return protocolPermission;
        });
        await this.#connection.send('Browser.grantPermissions', {
            origin,
            browserContextId: this.#id || undefined,
            permissions: protocolPermissions,
        });
    }
    /**
     * Clears all permission overrides for the browser context.
     *
     * @example
     *
     * ```ts
     * const context = browser.defaultBrowserContext();
     * context.overridePermissions('https://example.com', ['clipboard-read']);
     * // do stuff ..
     * context.clearPermissionOverrides();
     * ```
     */
    async clearPermissionOverrides() {
        await this.#connection.send('Browser.resetPermissions', {
            browserContextId: this.#id || undefined,
        });
    }
    /**
     * Creates a new page in the browser context.
     */
    newPage() {
        return this.#browser._createPageInContext(this.#id);
    }
    /**
     * The browser this browser context belongs to.
     */
    browser() {
        return this.#browser;
    }
    /**
     * Closes the browser context. All the targets that belong to the browser context
     * will be closed.
     *
     * @remarks
     * Only incognito browser contexts can be closed.
     */
    async close() {
        (0, assert_js_1.assert)(this.#id, 'Non-incognito profiles cannot be closed!');
        await this.#browser._disposeContext(this.#id);
    }
}
exports.CDPBrowserContext = CDPBrowserContext;
//# sourceMappingURL=Browser.js.map