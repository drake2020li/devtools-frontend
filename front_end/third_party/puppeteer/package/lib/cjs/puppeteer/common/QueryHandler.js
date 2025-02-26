"use strict";
/**
 * Copyright 2023 Google Inc. All rights reserved.
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
exports.QueryHandler = void 0;
const ElementHandle_js_1 = require("../api/ElementHandle.js");
const ErrorLike_js_1 = require("../util/ErrorLike.js");
const Function_js_1 = require("../util/Function.js");
const HandleIterator_js_1 = require("./HandleIterator.js");
const LazyArg_js_1 = require("./LazyArg.js");
/**
 * @internal
 */
class QueryHandler {
    // Either one of these may be implemented, but at least one must be.
    static querySelectorAll;
    static querySelector;
    static get _querySelector() {
        if (this.querySelector) {
            return this.querySelector;
        }
        if (!this.querySelectorAll) {
            throw new Error('Cannot create default `querySelector`.');
        }
        return (this.querySelector = (0, Function_js_1.interpolateFunction)(async (node, selector, PuppeteerUtil) => {
            const querySelectorAll = PLACEHOLDER('querySelectorAll');
            const results = querySelectorAll(node, selector, PuppeteerUtil);
            for await (const result of results) {
                return result;
            }
            return null;
        }, {
            querySelectorAll: (0, Function_js_1.stringifyFunction)(this.querySelectorAll),
        }));
    }
    static get _querySelectorAll() {
        if (this.querySelectorAll) {
            return this.querySelectorAll;
        }
        if (!this.querySelector) {
            throw new Error('Cannot create default `querySelectorAll`.');
        }
        return (this.querySelectorAll = (0, Function_js_1.interpolateFunction)(async function* (node, selector, PuppeteerUtil) {
            const querySelector = PLACEHOLDER('querySelector');
            const result = await querySelector(node, selector, PuppeteerUtil);
            if (result) {
                yield result;
            }
        }, {
            querySelector: (0, Function_js_1.stringifyFunction)(this.querySelector),
        }));
    }
    /**
     * Queries for multiple nodes given a selector and {@link ElementHandle}.
     *
     * Akin to {@link https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelectorAll | Document.querySelectorAll()}.
     */
    static async *queryAll(element, selector) {
        element.assertElementHasWorld();
        const handle = await element.evaluateHandle(this._querySelectorAll, selector, LazyArg_js_1.LazyArg.create(context => {
            return context.puppeteerUtil;
        }));
        yield* (0, HandleIterator_js_1.transposeIterableHandle)(handle);
    }
    /**
     * Queries for a single node given a selector and {@link ElementHandle}.
     *
     * Akin to {@link https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector}.
     */
    static async queryOne(element, selector) {
        element.assertElementHasWorld();
        const result = await element.evaluateHandle(this._querySelector, selector, LazyArg_js_1.LazyArg.create(context => {
            return context.puppeteerUtil;
        }));
        if (!(result instanceof ElementHandle_js_1.ElementHandle)) {
            await result.dispose();
            return null;
        }
        return result;
    }
    /**
     * Waits until a single node appears for a given selector and
     * {@link ElementHandle}.
     *
     * This will always query the handle in the Puppeteer world and migrate the
     * result to the main world.
     */
    static async waitFor(elementOrFrame, selector, options) {
        let frame;
        let element;
        if (!(elementOrFrame instanceof ElementHandle_js_1.ElementHandle)) {
            frame = elementOrFrame;
        }
        else {
            frame = elementOrFrame.frame;
            element = await frame.isolatedRealm().adoptHandle(elementOrFrame);
        }
        const { visible = false, hidden = false, timeout, signal } = options;
        try {
            signal?.throwIfAborted();
            const handle = await frame.isolatedRealm().waitForFunction(async (PuppeteerUtil, query, selector, root, visible) => {
                const querySelector = PuppeteerUtil.createFunction(query);
                const node = await querySelector(root ?? document, selector, PuppeteerUtil);
                return PuppeteerUtil.checkVisibility(node, visible);
            }, {
                polling: visible || hidden ? 'raf' : 'mutation',
                root: element,
                timeout,
                signal,
            }, LazyArg_js_1.LazyArg.create(context => {
                return context.puppeteerUtil;
            }), (0, Function_js_1.stringifyFunction)(this._querySelector), selector, element, visible ? true : hidden ? false : undefined);
            if (signal?.aborted) {
                await handle.dispose();
                throw signal.reason;
            }
            if (!(handle instanceof ElementHandle_js_1.ElementHandle)) {
                await handle.dispose();
                return null;
            }
            return frame.mainRealm().transferHandle(handle);
        }
        catch (error) {
            if (!(0, ErrorLike_js_1.isErrorLike)(error)) {
                throw error;
            }
            if (error.name === 'AbortError') {
                throw error;
            }
            error.message = `Waiting for selector \`${selector}\` failed: ${error.message}`;
            throw error;
        }
        finally {
            if (element) {
                await element.dispose();
            }
        }
    }
}
exports.QueryHandler = QueryHandler;
//# sourceMappingURL=QueryHandler.js.map