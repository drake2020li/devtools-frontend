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
/// <reference types="node" />
import { Protocol } from 'devtools-protocol';
import { Frame } from '../api/Frame.js';
import { CDPSession } from '../common/Connection.js';
import { ExecutionContext } from '../common/ExecutionContext.js';
import { WaitForSelectorOptions } from '../common/IsolatedWorld.js';
import { ElementFor, EvaluateFuncWith, HandleFor, HandleOr, NodeFor } from '../common/types.js';
import { KeyInput } from '../common/USKeyboardLayout.js';
import { KeyPressOptions, MouseClickOptions, KeyboardTypeOptions } from './Input.js';
import { JSHandle } from './JSHandle.js';
import { ScreenshotOptions } from './Page.js';
/**
 * @public
 */
export interface BoxModel {
    content: Point[];
    padding: Point[];
    border: Point[];
    margin: Point[];
    width: number;
    height: number;
}
/**
 * @public
 */
export interface BoundingBox extends Point {
    /**
     * the width of the element in pixels.
     */
    width: number;
    /**
     * the height of the element in pixels.
     */
    height: number;
}
/**
 * @public
 */
export interface Offset {
    /**
     * x-offset for the clickable point relative to the top-left corner of the border box.
     */
    x: number;
    /**
     * y-offset for the clickable point relative to the top-left corner of the border box.
     */
    y: number;
}
/**
 * @public
 */
export interface ClickOptions extends MouseClickOptions {
    /**
     * Offset for the clickable point relative to the top-left corner of the border box.
     */
    offset?: Offset;
}
/**
 * @public
 */
export interface Point {
    x: number;
    y: number;
}
/**
 * ElementHandle represents an in-page DOM element.
 *
 * @remarks
 * ElementHandles can be created with the {@link Page.$} method.
 *
 * ```ts
 * import puppeteer from 'puppeteer';
 *
 * (async () => {
 *   const browser = await puppeteer.launch();
 *   const page = await browser.newPage();
 *   await page.goto('https://example.com');
 *   const hrefElement = await page.$('a');
 *   await hrefElement.click();
 *   // ...
 * })();
 * ```
 *
 * ElementHandle prevents the DOM element from being garbage-collected unless the
 * handle is {@link JSHandle.dispose | disposed}. ElementHandles are auto-disposed
 * when their origin frame gets navigated.
 *
 * ElementHandle instances can be used as arguments in {@link Page.$eval} and
 * {@link Page.evaluate} methods.
 *
 * If you're using TypeScript, ElementHandle takes a generic argument that
 * denotes the type of element the handle is holding within. For example, if you
 * have a handle to a `<select>` element, you can type it as
 * `ElementHandle<HTMLSelectElement>` and you get some nicer type checks.
 *
 * @public
 */
export declare class ElementHandle<ElementType extends Node = Element> extends JSHandle<ElementType> {
    #private;
    /**
     * @internal
     */
    protected handle: JSHandle<ElementType>;
    /**
     * @internal
     */
    constructor(handle: JSHandle<ElementType>);
    /**
     * @internal
     */
    get id(): string | undefined;
    /**
     * @internal
     */
    get disposed(): boolean;
    /**
     * @internal
     */
    getProperty<K extends keyof ElementType>(propertyName: HandleOr<K>): Promise<HandleFor<ElementType[K]>>;
    /**
     * @internal
     */
    getProperty(propertyName: string): Promise<JSHandle<unknown>>;
    /**
     * @internal
     */
    getProperties(): Promise<Map<string, JSHandle>>;
    /**
     * @internal
     */
    evaluate<Params extends unknown[], Func extends EvaluateFuncWith<ElementType, Params> = EvaluateFuncWith<ElementType, Params>>(pageFunction: Func | string, ...args: Params): Promise<Awaited<ReturnType<Func>>>;
    /**
     * @internal
     */
    evaluateHandle<Params extends unknown[], Func extends EvaluateFuncWith<ElementType, Params> = EvaluateFuncWith<ElementType, Params>>(pageFunction: Func | string, ...args: Params): Promise<HandleFor<Awaited<ReturnType<Func>>>>;
    /**
     * @internal
     */
    jsonValue(): Promise<ElementType>;
    /**
     * @internal
     */
    toString(): string;
    /**
     * @internal
     */
    dispose(): Promise<void>;
    asElement(): ElementHandle<ElementType>;
    /**
     * @internal
     */
    executionContext(): ExecutionContext;
    /**
     * @internal
     */
    get client(): CDPSession;
    get frame(): Frame;
    /**
     * Queries the current element for an element matching the given selector.
     *
     * @param selector - The selector to query for.
     * @returns A {@link ElementHandle | element handle} to the first element
     * matching the given selector. Otherwise, `null`.
     */
    $<Selector extends string>(selector: Selector): Promise<ElementHandle<NodeFor<Selector>> | null>;
    /**
     * Queries the current element for all elements matching the given selector.
     *
     * @param selector - The selector to query for.
     * @returns An array of {@link ElementHandle | element handles} that point to
     * elements matching the given selector.
     */
    $$<Selector extends string>(selector: Selector): Promise<Array<ElementHandle<NodeFor<Selector>>>>;
    /**
     * Runs the given function on the first element matching the given selector in
     * the current element.
     *
     * If the given function returns a promise, then this method will wait till
     * the promise resolves.
     *
     * @example
     *
     * ```ts
     * const tweetHandle = await page.$('.tweet');
     * expect(await tweetHandle.$eval('.like', node => node.innerText)).toBe(
     *   '100'
     * );
     * expect(await tweetHandle.$eval('.retweets', node => node.innerText)).toBe(
     *   '10'
     * );
     * ```
     *
     * @param selector - The selector to query for.
     * @param pageFunction - The function to be evaluated in this element's page's
     * context. The first element matching the selector will be passed in as the
     * first argument.
     * @param args - Additional arguments to pass to `pageFunction`.
     * @returns A promise to the result of the function.
     */
    $eval<Selector extends string, Params extends unknown[], Func extends EvaluateFuncWith<NodeFor<Selector>, Params> = EvaluateFuncWith<NodeFor<Selector>, Params>>(selector: Selector, pageFunction: Func | string, ...args: Params): Promise<Awaited<ReturnType<Func>>>;
    /**
     * Runs the given function on an array of elements matching the given selector
     * in the current element.
     *
     * If the given function returns a promise, then this method will wait till
     * the promise resolves.
     *
     * @example
     * HTML:
     *
     * ```html
     * <div class="feed">
     *   <div class="tweet">Hello!</div>
     *   <div class="tweet">Hi!</div>
     * </div>
     * ```
     *
     * JavaScript:
     *
     * ```js
     * const feedHandle = await page.$('.feed');
     * expect(
     *   await feedHandle.$$eval('.tweet', nodes => nodes.map(n => n.innerText))
     * ).toEqual(['Hello!', 'Hi!']);
     * ```
     *
     * @param selector - The selector to query for.
     * @param pageFunction - The function to be evaluated in the element's page's
     * context. An array of elements matching the given selector will be passed to
     * the function as its first argument.
     * @param args - Additional arguments to pass to `pageFunction`.
     * @returns A promise to the result of the function.
     */
    $$eval<Selector extends string, Params extends unknown[], Func extends EvaluateFuncWith<Array<NodeFor<Selector>>, Params> = EvaluateFuncWith<Array<NodeFor<Selector>>, Params>>(selector: Selector, pageFunction: Func | string, ...args: Params): Promise<Awaited<ReturnType<Func>>>;
    /**
     * @deprecated Use {@link ElementHandle.$$} with the `xpath` prefix.
     *
     * Example: `await elementHandle.$$('xpath/' + xpathExpression)`
     *
     * The method evaluates the XPath expression relative to the elementHandle.
     * If `xpath` starts with `//` instead of `.//`, the dot will be appended
     * automatically.
     *
     * If there are no such elements, the method will resolve to an empty array.
     * @param expression - Expression to {@link https://developer.mozilla.org/en-US/docs/Web/API/Document/evaluate | evaluate}
     */
    $x(expression: string): Promise<Array<ElementHandle<Node>>>;
    /**
     * Wait for an element matching the given selector to appear in the current
     * element.
     *
     * Unlike {@link Frame.waitForSelector}, this method does not work across
     * navigations or if the element is detached from DOM.
     *
     * @example
     *
     * ```ts
     * import puppeteer from 'puppeteer';
     *
     * (async () => {
     *   const browser = await puppeteer.launch();
     *   const page = await browser.newPage();
     *   let currentURL;
     *   page
     *     .mainFrame()
     *     .waitForSelector('img')
     *     .then(() => console.log('First URL with image: ' + currentURL));
     *
     *   for (currentURL of [
     *     'https://example.com',
     *     'https://google.com',
     *     'https://bbc.com',
     *   ]) {
     *     await page.goto(currentURL);
     *   }
     *   await browser.close();
     * })();
     * ```
     *
     * @param selector - The selector to query and wait for.
     * @param options - Options for customizing waiting behavior.
     * @returns An element matching the given selector.
     * @throws Throws if an element matching the given selector doesn't appear.
     */
    waitForSelector<Selector extends string>(selector: Selector, options?: WaitForSelectorOptions): Promise<ElementHandle<NodeFor<Selector>> | null>;
    /**
     * Checks if an element is visible using the same mechanism as
     * {@link ElementHandle.waitForSelector}.
     */
    isVisible(): Promise<boolean>;
    /**
     * Checks if an element is hidden using the same mechanism as
     * {@link ElementHandle.waitForSelector}.
     */
    isHidden(): Promise<boolean>;
    /**
     * @deprecated Use {@link ElementHandle.waitForSelector} with the `xpath`
     * prefix.
     *
     * Example: `await elementHandle.waitForSelector('xpath/' + xpathExpression)`
     *
     * The method evaluates the XPath expression relative to the elementHandle.
     *
     * Wait for the `xpath` within the element. If at the moment of calling the
     * method the `xpath` already exists, the method will return immediately. If
     * the `xpath` doesn't appear after the `timeout` milliseconds of waiting, the
     * function will throw.
     *
     * If `xpath` starts with `//` instead of `.//`, the dot will be appended
     * automatically.
     *
     * @example
     * This method works across navigation.
     *
     * ```ts
     * import puppeteer from 'puppeteer';
     * (async () => {
     *   const browser = await puppeteer.launch();
     *   const page = await browser.newPage();
     *   let currentURL;
     *   page
     *     .waitForXPath('//img')
     *     .then(() => console.log('First URL with image: ' + currentURL));
     *   for (currentURL of [
     *     'https://example.com',
     *     'https://google.com',
     *     'https://bbc.com',
     *   ]) {
     *     await page.goto(currentURL);
     *   }
     *   await browser.close();
     * })();
     * ```
     *
     * @param xpath - A
     * {@link https://developer.mozilla.org/en-US/docs/Web/XPath | xpath} of an
     * element to wait for
     * @param options - Optional waiting parameters
     * @returns Promise which resolves when element specified by xpath string is
     * added to DOM. Resolves to `null` if waiting for `hidden: true` and xpath is
     * not found in DOM, otherwise resolves to `ElementHandle`.
     * @remarks
     * The optional Argument `options` have properties:
     *
     * - `visible`: A boolean to wait for element to be present in DOM and to be
     *   visible, i.e. to not have `display: none` or `visibility: hidden` CSS
     *   properties. Defaults to `false`.
     *
     * - `hidden`: A boolean wait for element to not be found in the DOM or to be
     *   hidden, i.e. have `display: none` or `visibility: hidden` CSS properties.
     *   Defaults to `false`.
     *
     * - `timeout`: A number which is maximum time to wait for in milliseconds.
     *   Defaults to `30000` (30 seconds). Pass `0` to disable timeout. The
     *   default value can be changed by using the {@link Page.setDefaultTimeout}
     *   method.
     */
    waitForXPath(xpath: string, options?: {
        visible?: boolean;
        hidden?: boolean;
        timeout?: number;
    }): Promise<ElementHandle<Node> | null>;
    /**
     * Converts the current handle to the given element type.
     *
     * @example
     *
     * ```ts
     * const element: ElementHandle<Element> = await page.$(
     *   '.class-name-of-anchor'
     * );
     * // DO NOT DISPOSE `element`, this will be always be the same handle.
     * const anchor: ElementHandle<HTMLAnchorElement> = await element.toElement(
     *   'a'
     * );
     * ```
     *
     * @param tagName - The tag name of the desired element type.
     * @throws An error if the handle does not match. **The handle will not be
     * automatically disposed.**
     */
    toElement<K extends keyof HTMLElementTagNameMap | keyof SVGElementTagNameMap>(tagName: K): Promise<HandleFor<ElementFor<K>>>;
    /**
     * Resolves to the content frame for element handles referencing
     * iframe nodes, or null otherwise
     */
    contentFrame(): Promise<Frame | null>;
    /**
     * Returns the middle point within an element unless a specific offset is provided.
     */
    clickablePoint(offset?: Offset): Promise<Point>;
    /**
     * This method scrolls element into view if needed, and then
     * uses {@link Page} to hover over the center of the element.
     * If the element is detached from DOM, the method throws an error.
     */
    hover(this: ElementHandle<Element>): Promise<void>;
    /**
     * This method scrolls element into view if needed, and then
     * uses {@link Page | Page.mouse} to click in the center of the element.
     * If the element is detached from DOM, the method throws an error.
     */
    click(this: ElementHandle<Element>, options?: ClickOptions): Promise<void>;
    /**
     * This method creates and captures a dragevent from the element.
     */
    drag(this: ElementHandle<Element>, target: Point): Promise<Protocol.Input.DragData>;
    /**
     * This method creates a `dragenter` event on the element.
     */
    dragEnter(this: ElementHandle<Element>, data?: Protocol.Input.DragData): Promise<void>;
    /**
     * This method creates a `dragover` event on the element.
     */
    dragOver(this: ElementHandle<Element>, data?: Protocol.Input.DragData): Promise<void>;
    /**
     * This method triggers a drop on the element.
     */
    drop(this: ElementHandle<Element>, data?: Protocol.Input.DragData): Promise<void>;
    /**
     * This method triggers a dragenter, dragover, and drop on the element.
     */
    dragAndDrop(this: ElementHandle<Element>, target: ElementHandle<Node>, options?: {
        delay: number;
    }): Promise<void>;
    /**
     * Triggers a `change` and `input` event once all the provided options have been
     * selected. If there's no `<select>` element matching `selector`, the method
     * throws an error.
     *
     * @example
     *
     * ```ts
     * handle.select('blue'); // single selection
     * handle.select('red', 'green', 'blue'); // multiple selections
     * ```
     *
     * @param values - Values of options to select. If the `<select>` has the
     * `multiple` attribute, all values are considered, otherwise only the first
     * one is taken into account.
     */
    select(...values: string[]): Promise<string[]>;
    /**
     * Sets the value of an
     * {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input | input element}
     * to the given file paths.
     *
     * @remarks This will not validate whether the file paths exists. Also, if a
     * path is relative, then it is resolved against the
     * {@link https://nodejs.org/api/process.html#process_process_cwd | current working directory}.
     * For locals script connecting to remote chrome environments, paths must be
     * absolute.
     */
    uploadFile(this: ElementHandle<HTMLInputElement>, ...paths: string[]): Promise<void>;
    /**
     * This method scrolls element into view if needed, and then uses
     * {@link Touchscreen.tap} to tap in the center of the element.
     * If the element is detached from DOM, the method throws an error.
     */
    tap(this: ElementHandle<Element>): Promise<void>;
    touchStart(this: ElementHandle<Element>): Promise<void>;
    touchMove(this: ElementHandle<Element>): Promise<void>;
    touchEnd(this: ElementHandle<Element>): Promise<void>;
    /**
     * Calls {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/focus | focus} on the element.
     */
    focus(): Promise<void>;
    /**
     * Focuses the element, and then sends a `keydown`, `keypress`/`input`, and
     * `keyup` event for each character in the text.
     *
     * To press a special key, like `Control` or `ArrowDown`,
     * use {@link ElementHandle.press}.
     *
     * @example
     *
     * ```ts
     * await elementHandle.type('Hello'); // Types instantly
     * await elementHandle.type('World', {delay: 100}); // Types slower, like a user
     * ```
     *
     * @example
     * An example of typing into a text field and then submitting the form:
     *
     * ```ts
     * const elementHandle = await page.$('input');
     * await elementHandle.type('some text');
     * await elementHandle.press('Enter');
     * ```
     *
     * @param options - Delay in milliseconds. Defaults to 0.
     */
    type(text: string, options?: Readonly<KeyboardTypeOptions>): Promise<void>;
    /**
     * Focuses the element, and then uses {@link Keyboard.down} and {@link Keyboard.up}.
     *
     * @remarks
     * If `key` is a single character and no modifier keys besides `Shift`
     * are being held down, a `keypress`/`input` event will also be generated.
     * The `text` option can be specified to force an input event to be generated.
     *
     * **NOTE** Modifier keys DO affect `elementHandle.press`. Holding down `Shift`
     * will type the text in upper case.
     *
     * @param key - Name of key to press, such as `ArrowLeft`.
     * See {@link KeyInput} for a list of all key names.
     */
    press(key: KeyInput, options?: Readonly<KeyPressOptions>): Promise<void>;
    /**
     * This method returns the bounding box of the element (relative to the main frame),
     * or `null` if the element is not visible.
     */
    boundingBox(): Promise<BoundingBox | null>;
    /**
     * This method returns boxes of the element, or `null` if the element is not visible.
     *
     * @remarks
     *
     * Boxes are represented as an array of points;
     * Each Point is an object `{x, y}`. Box points are sorted clock-wise.
     */
    boxModel(): Promise<BoxModel | null>;
    /**
     * This method scrolls element into view if needed, and then uses
     * {@link Page.(screenshot:3) } to take a screenshot of the element.
     * If the element is detached from DOM, the method throws an error.
     */
    screenshot(this: ElementHandle<Element>, options?: ScreenshotOptions): Promise<string | Buffer>;
    /**
     * @internal
     */
    protected assertConnectedElement(): Promise<void>;
    /**
     * @internal
     */
    protected scrollIntoViewIfNeeded(this: ElementHandle<Element>): Promise<void>;
    /**
     * Resolves to true if the element is visible in the current viewport. If an
     * element is an SVG, we check if the svg owner element is in the viewport
     * instead. See https://crbug.com/963246.
     *
     * @param options - Threshold for the intersection between 0 (no intersection) and 1
     * (full intersection). Defaults to 1.
     */
    isIntersectingViewport(this: ElementHandle<Element>, options?: {
        threshold?: number;
    }): Promise<boolean>;
    /**
     * Scrolls the element into view using either the automation protocol client
     * or by calling element.scrollIntoView.
     */
    scrollIntoView(this: ElementHandle<Element>): Promise<void>;
    /**
     * @internal
     */
    assertElementHasWorld(): asserts this;
    /**
     * If the element is a form input, you can use {@link ElementHandle.autofill}
     * to test if the form is compatible with the browser's autofill
     * implementation. Throws an error if the form cannot be autofilled.
     *
     * @remarks
     *
     * Currently, Puppeteer supports auto-filling credit card information only and
     * in Chrome in the new headless and headful modes only.
     *
     * ```ts
     * // Select an input on the credit card form.
     * const name = await page.waitForSelector('form #name');
     * // Trigger autofill with the desired data.
     * await name.autofill({
     *   creditCard: {
     *     number: '4444444444444444',
     *     name: 'John Smith',
     *     expiryMonth: '01',
     *     expiryYear: '2030',
     *     cvc: '123',
     *   },
     * });
     * ```
     */
    autofill(data: AutofillData): Promise<void>;
}
/**
 * @public
 */
export interface AutofillData {
    creditCard: {
        number: string;
        name: string;
        expiryMonth: string;
        expiryYear: string;
        cvc: string;
    };
}
//# sourceMappingURL=ElementHandle.d.ts.map