/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
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

import type * as Common from '../../core/common/common.js';
import * as Workspace from '../workspace/workspace.js';

/**
 * @interface
 */
export interface ChunkedReader {
  fileSize(): number;

  loadedSize(): number;

  fileName(): string;

  cancel(): void;

  error(): DOMError|null;
}
interface DecompressionStream extends GenericTransformStream {
  readonly format: string;
}
declare const DecompressionStream: {
  prototype: DecompressionStream,
  new (format: string): DecompressionStream,
};

export class ChunkedFileReader implements ChunkedReader {
  private file: File|null;
  private readonly fileSizeInternal: number;
  private loadedSizeInternal: number;
  private streamReader: ReadableStreamReader<Uint8Array>|null;
  private readonly chunkSize: number;
  private readonly chunkTransferredCallback: ((arg0: ChunkedReader) => void)|undefined;
  private readonly decoder: TextDecoder;
  private isCanceled: boolean;
  private errorInternal: DOMException|null;
  private transferFinished!: (arg0: boolean) => void;
  private output?: Common.StringOutputStream.OutputStream;
  private reader?: FileReader|null;

  constructor(file: File, chunkSize: number, chunkTransferredCallback?: ((arg0: ChunkedReader) => void)) {
    this.file = file;
    this.fileSizeInternal = file.size;
    this.loadedSizeInternal = 0;
    this.chunkSize = chunkSize;
    this.chunkTransferredCallback = chunkTransferredCallback;
    this.decoder = new TextDecoder();
    this.isCanceled = false;
    this.errorInternal = null;
    this.streamReader = null;
  }

  async read(output: Common.StringOutputStream.OutputStream): Promise<boolean> {
    if (this.chunkTransferredCallback) {
      this.chunkTransferredCallback(this);
    }

    if (this.file?.type.endsWith('gzip')) {
      const stream = this.decompressStream(this.file.stream());
      this.streamReader = stream.getReader();
    } else {
      this.reader = new FileReader();
      this.reader.onload = this.onChunkLoaded.bind(this);
      this.reader.onerror = this.onError.bind(this);
    }

    this.output = output;
    this.loadChunk();

    return new Promise(resolve => {
      this.transferFinished = resolve;
    });
  }

  cancel(): void {
    this.isCanceled = true;
  }

  loadedSize(): number {
    return this.loadedSizeInternal;
  }

  fileSize(): number {
    return this.fileSizeInternal;
  }

  fileName(): string {
    if (!this.file) {
      return '';
    }
    return this.file.name;
  }

  error(): DOMException|null {
    return this.errorInternal;
  }

  // Decompress gzip natively thanks to https://wicg.github.io/compression/
  private decompressStream(stream: ReadableStream): ReadableStream {
    const ds = new DecompressionStream('gzip');
    const decompressionStream = stream.pipeThrough(ds);
    return decompressionStream;
  }

  private onChunkLoaded(event: Event): void {
    if (this.isCanceled) {
      return;
    }

    const eventTarget = (event.target as FileReader);
    if (eventTarget.readyState !== FileReader.DONE) {
      return;
    }

    if (!this.reader) {
      return;
    }

    const buffer = (this.reader.result as ArrayBuffer);
    this.loadedSizeInternal += buffer.byteLength;
    const endOfFile = this.loadedSizeInternal === this.fileSizeInternal;
    this.decodeChunkBuffer(buffer, endOfFile);
  }

  private async decodeChunkBuffer(buffer: ArrayBuffer, endOfFile: boolean): Promise<void> {
    if (!this.output) {
      return;
    }
    const decodedString = this.decoder.decode(buffer, {stream: !endOfFile});
    await this.output.write(decodedString);
    if (this.isCanceled) {
      return;
    }
    if (this.chunkTransferredCallback) {
      this.chunkTransferredCallback(this);
    }

    if (endOfFile) {
      this.finishRead();
      return;
    }
    this.loadChunk();
  }

  private finishRead(): void {
    if (!this.output) {
      return;
    }
    this.file = null;
    this.reader = null;
    this.output.close();
    this.transferFinished(!this.errorInternal);
  }

  private async loadChunk(): Promise<void> {
    if (!this.output || !this.file) {
      return;
    }
    if (this.streamReader) {
      const {value, done} = await this.streamReader.read();
      if (done || !value) {
        return this.finishRead();
      }
      this.decodeChunkBuffer(value.buffer, false);
    }
    if (this.reader) {
      const chunkStart = this.loadedSizeInternal;
      const chunkEnd = Math.min(this.fileSizeInternal, chunkStart + this.chunkSize);
      const nextPart = this.file.slice(chunkStart, chunkEnd);
      this.reader.readAsArrayBuffer(nextPart);
    }
  }

  private onError(event: Event): void {
    const eventTarget = (event.target as FileReader);
    this.errorInternal = eventTarget.error;
    this.transferFinished(false);
  }
}

export class FileOutputStream implements Common.StringOutputStream.OutputStream {
  private writeCallbacks: (() => void)[];
  private fileName!: string;
  private closed?: boolean;
  constructor() {
    this.writeCallbacks = [];
  }

  async open(fileName: string): Promise<boolean> {
    this.closed = false;
    /** @type {!Array<function():void>} */
    this.writeCallbacks = [];
    this.fileName = fileName;
    const saveResponse = await Workspace.FileManager.FileManager.instance().save(this.fileName, '', true);
    if (saveResponse) {
      Workspace.FileManager.FileManager.instance().addEventListener(
          Workspace.FileManager.Events.AppendedToURL, this.onAppendDone, this);
    }
    return Boolean(saveResponse);
  }

  write(data: string): Promise<void> {
    return new Promise(resolve => {
      this.writeCallbacks.push(resolve);
      Workspace.FileManager.FileManager.instance().append(this.fileName, data);
    });
  }

  async close(): Promise<void> {
    this.closed = true;
    if (this.writeCallbacks.length) {
      return;
    }
    Workspace.FileManager.FileManager.instance().removeEventListener(
        Workspace.FileManager.Events.AppendedToURL, this.onAppendDone, this);
    Workspace.FileManager.FileManager.instance().close(this.fileName);
  }

  private onAppendDone(event: Common.EventTarget.EventTargetEvent): void {
    if (event.data !== this.fileName) {
      return;
    }
    const writeCallback = this.writeCallbacks.shift();
    if (writeCallback) {
      writeCallback();
    }
    if (this.writeCallbacks.length) {
      return;
    }
    if (!this.closed) {
      return;
    }
    Workspace.FileManager.FileManager.instance().removeEventListener(
        Workspace.FileManager.Events.AppendedToURL, this.onAppendDone, this);
    Workspace.FileManager.FileManager.instance().close(this.fileName);
  }
}
