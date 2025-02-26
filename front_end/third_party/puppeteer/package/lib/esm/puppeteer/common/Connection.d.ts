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
import { Protocol } from 'devtools-protocol';
import { ProtocolMapping } from 'devtools-protocol/types/protocol-mapping.js';
import { Deferred } from '../util/Deferred.js';
import { ConnectionTransport } from './ConnectionTransport.js';
import { ProtocolError } from './Errors.js';
import { EventEmitter } from './EventEmitter.js';
/**
 * @public
 */
export { ConnectionTransport, ProtocolMapping };
/**
 * Internal events that the Connection class emits.
 *
 * @internal
 */
export declare const ConnectionEmittedEvents: {
    readonly Disconnected: symbol;
};
/**
 * @internal
 */
export declare class Callback {
    #private;
    constructor(id: number, label: string, timeout?: number);
    resolve(value: unknown): void;
    reject(error: Error): void;
    get id(): number;
    get promise(): Deferred<unknown>;
    get error(): ProtocolError;
    get label(): string;
}
/**
 * Manages callbacks and their IDs for the protocol request/response communication.
 *
 * @internal
 */
export declare class CallbackRegistry {
    #private;
    create(label: string, timeout: number | undefined, request: (id: number) => void): Promise<unknown>;
    reject(id: number, message: string, originalMessage?: string): void;
    _reject(callback: Callback, errorMessage: string | ProtocolError, originalMessage?: string): void;
    resolve(id: number, value: unknown): void;
    clear(): void;
}
/**
 * @public
 */
export declare class Connection extends EventEmitter {
    #private;
    constructor(url: string, transport: ConnectionTransport, delay?: number, timeout?: number);
    static fromSession(session: CDPSession): Connection | undefined;
    get timeout(): number;
    /**
     * @internal
     */
    get _closed(): boolean;
    /**
     * @internal
     */
    get _sessions(): Map<string, CDPSession>;
    /**
     * @param sessionId - The session id
     * @returns The current CDP session if it exists
     */
    session(sessionId: string): CDPSession | null;
    url(): string;
    send<T extends keyof ProtocolMapping.Commands>(method: T, ...paramArgs: ProtocolMapping.Commands[T]['paramsType']): Promise<ProtocolMapping.Commands[T]['returnType']>;
    /**
     * @internal
     */
    _rawSend<T extends keyof ProtocolMapping.Commands>(callbacks: CallbackRegistry, method: T, params: ProtocolMapping.Commands[T]['paramsType'][0], sessionId?: string): Promise<ProtocolMapping.Commands[T]['returnType']>;
    /**
     * @internal
     */
    closeBrowser(): Promise<void>;
    /**
     * @internal
     */
    protected onMessage(message: string): Promise<void>;
    dispose(): void;
    /**
     * @internal
     */
    isAutoAttached(targetId: string): boolean;
    /**
     * @internal
     */
    _createSession(targetInfo: Protocol.Target.TargetInfo, isAutoAttachEmulated?: boolean): Promise<CDPSession>;
    /**
     * @param targetInfo - The target info
     * @returns The CDP session that is created
     */
    createSession(targetInfo: Protocol.Target.TargetInfo): Promise<CDPSession>;
}
/**
 * @internal
 */
export interface CDPSessionOnMessageObject {
    id?: number;
    method: string;
    params: Record<string, unknown>;
    error: {
        message: string;
        data: any;
        code: number;
    };
    result?: any;
}
/**
 * Internal events that the CDPSession class emits.
 *
 * @internal
 */
export declare const CDPSessionEmittedEvents: {
    readonly Disconnected: symbol;
};
/**
 * The `CDPSession` instances are used to talk raw Chrome Devtools Protocol.
 *
 * @remarks
 *
 * Protocol methods can be called with {@link CDPSession.send} method and protocol
 * events can be subscribed to with `CDPSession.on` method.
 *
 * Useful links: {@link https://chromedevtools.github.io/devtools-protocol/ | DevTools Protocol Viewer}
 * and {@link https://github.com/aslushnikov/getting-started-with-cdp/blob/HEAD/README.md | Getting Started with DevTools Protocol}.
 *
 * @example
 *
 * ```ts
 * const client = await page.target().createCDPSession();
 * await client.send('Animation.enable');
 * client.on('Animation.animationCreated', () =>
 *   console.log('Animation created!')
 * );
 * const response = await client.send('Animation.getPlaybackRate');
 * console.log('playback rate is ' + response.playbackRate);
 * await client.send('Animation.setPlaybackRate', {
 *   playbackRate: response.playbackRate / 2,
 * });
 * ```
 *
 * @public
 */
export declare class CDPSession extends EventEmitter {
    /**
     * @internal
     */
    constructor();
    connection(): Connection | undefined;
    /**
     * Parent session in terms of CDP's auto-attach mechanism.
     *
     * @internal
     */
    parentSession(): CDPSession | undefined;
    send<T extends keyof ProtocolMapping.Commands>(method: T, ...paramArgs: ProtocolMapping.Commands[T]['paramsType']): Promise<ProtocolMapping.Commands[T]['returnType']>;
    /**
     * Detaches the cdpSession from the target. Once detached, the cdpSession object
     * won't emit any events and can't be used to send messages.
     */
    detach(): Promise<void>;
    /**
     * Returns the session's id.
     */
    id(): string;
}
/**
 * @internal
 */
export declare class CDPSessionImpl extends CDPSession {
    #private;
    /**
     * @internal
     */
    constructor(connection: Connection, targetType: string, sessionId: string, parentSessionId: string | undefined);
    connection(): Connection | undefined;
    parentSession(): CDPSession | undefined;
    send<T extends keyof ProtocolMapping.Commands>(method: T, ...paramArgs: ProtocolMapping.Commands[T]['paramsType']): Promise<ProtocolMapping.Commands[T]['returnType']>;
    /**
     * @internal
     */
    _onMessage(object: CDPSessionOnMessageObject): void;
    /**
     * Detaches the cdpSession from the target. Once detached, the cdpSession object
     * won't emit any events and can't be used to send messages.
     */
    detach(): Promise<void>;
    /**
     * @internal
     */
    _onClosed(): void;
    /**
     * Returns the session's id.
     */
    id(): string;
}
/**
 * @internal
 */
export declare function isTargetClosedError(error: Error): boolean;
//# sourceMappingURL=Connection.d.ts.map