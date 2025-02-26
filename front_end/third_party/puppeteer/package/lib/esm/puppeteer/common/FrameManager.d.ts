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
import { Page } from '../api/Page.js';
import { CDPSession } from './Connection.js';
import { DeviceRequestPromptManager } from './DeviceRequestPrompt.js';
import { EventEmitter } from './EventEmitter.js';
import { ExecutionContext } from './ExecutionContext.js';
import { Frame } from './Frame.js';
import { FrameTree } from './FrameTree.js';
import { NetworkManager } from './NetworkManager.js';
import { CDPTarget } from './Target.js';
import { TimeoutSettings } from './TimeoutSettings.js';
/**
 * @internal
 */
export declare const UTILITY_WORLD_NAME = "__puppeteer_utility_world__";
/**
 * We use symbols to prevent external parties listening to these events.
 * They are internal to Puppeteer.
 *
 * @internal
 */
export declare const FrameManagerEmittedEvents: {
    FrameAttached: symbol;
    FrameNavigated: symbol;
    FrameDetached: symbol;
    FrameSwapped: symbol;
    LifecycleEvent: symbol;
    FrameNavigatedWithinDocument: symbol;
};
/**
 * A frame manager manages the frames for a given {@link Page | page}.
 *
 * @internal
 */
export declare class FrameManager extends EventEmitter {
    #private;
    /**
     * @internal
     */
    _frameTree: FrameTree<Frame>;
    get timeoutSettings(): TimeoutSettings;
    get networkManager(): NetworkManager;
    get client(): CDPSession;
    constructor(client: CDPSession, page: Page, ignoreHTTPSErrors: boolean, timeoutSettings: TimeoutSettings);
    private setupEventListeners;
    initialize(client?: CDPSession): Promise<void>;
    executionContextById(contextId: number, session?: CDPSession): ExecutionContext;
    getExecutionContextById(contextId: number, session?: CDPSession): ExecutionContext | undefined;
    page(): Page;
    mainFrame(): Frame;
    frames(): Frame[];
    frame(frameId: string): Frame | null;
    onAttachedToTarget(target: CDPTarget): void;
    /**
     * @internal
     */
    _deviceRequestPromptManager(client: CDPSession): DeviceRequestPromptManager;
}
//# sourceMappingURL=FrameManager.d.ts.map