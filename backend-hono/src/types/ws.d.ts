// Type declarations for 'ws' module
declare module 'ws' {
  import { EventEmitter } from 'events';
  import * as http from 'http';
  import * as https from 'https';
  import * as net from 'net';
  import * as stream from 'stream';
  import { URL } from 'url';

  export interface ClientOptions {
    protocol?: string | string[];
    followRedirects?: boolean;
    generateMask?: boolean;
    handshakeTimeout?: number;
    maxRedirects?: number;
    perMessageDeflate?: boolean | PerMessageDeflateOptions;
    localAddress?: string;
    protocolVersion?: number;
    headers?: { [key: string]: string };
    origin?: string;
    agent?: http.Agent | https.Agent;
    host?: string;
    family?: number;
    checkOrigin?: (origin: string) => boolean;
    rejectUnauthorized?: boolean;
    skipUTF8Validation?: boolean;
    maxPayload?: number;
  }

  export interface PerMessageDeflateOptions {
    serverNoContextTakeover?: boolean;
    clientNoContextTakeover?: boolean;
    serverMaxWindowBits?: number;
    clientMaxWindowBits?: number;
    zlibDeflateOptions?: {
      flush?: number;
      finishFlush?: number;
      chunkSize?: number;
      windowBits?: number;
      level?: number;
      memLevel?: number;
      strategy?: number;
      dictionary?: Buffer | Buffer[] | DataView;
    };
    zlibInflateOptions?: {
      chunkSize?: number;
      windowBits?: number;
    };
    threshold?: number;
    concurrencyLimit?: number;
  }

  export interface ServerOptions {
    host?: string;
    port?: number;
    backlog?: number;
    path?: string;
    noServer?: boolean;
    clientTracking?: boolean;
    perMessageDeflate?: boolean | PerMessageDeflateOptions;
    maxPayload?: number;
    skipUTF8Validation?: boolean;
    WebSocket?: typeof WebSocket;
    verifyClient?: (
      info: { origin: string; secure: boolean; req: http.IncomingMessage },
      callback: (res: boolean, code?: number, message?: string) => void
    ) => void;
  }

  export class WebSocket extends EventEmitter {
    static CONNECTING: number;
    static OPEN: number;
    static CLOSING: number;
    static CLOSED: number;

    CONNECTING: number;
    OPEN: number;
    CLOSING: number;
    CLOSED: number;

    readyState: number;
    protocol: string;
    extensions: string;
    url: string;
    binaryType: 'nodebuffer' | 'arraybuffer' | 'fragments';

    constructor(address: string | URL, protocols?: string | string[] | ClientOptions, options?: ClientOptions);
    constructor(address: string | URL, options?: ClientOptions);

    close(code?: number, data?: string | Buffer): void;
    ping(data?: any, mask?: boolean, cb?: (err: Error) => void): void;
    pong(data?: any, mask?: boolean, cb?: (err: Error) => void): void;
    send(data: any, cb?: (err?: Error) => void): void;
    send(data: any, options: { mask?: boolean; binary?: boolean; compress?: boolean; fin?: boolean }, cb?: (err?: Error) => void): void;
    terminate(): void;

    on(event: 'close', listener: (code: number, reason: Buffer) => void): this;
    on(event: 'error', listener: (error: Error) => void): this;
    on(event: 'upgrade', listener: (request: http.IncomingMessage) => void): this;
    on(event: 'message', listener: (data: Buffer | ArrayBuffer | Buffer[], isBinary: boolean) => void): this;
    on(event: 'open', listener: () => void): this;
    on(event: 'ping', listener: (data: Buffer) => void): this;
    on(event: 'pong', listener: (data: Buffer) => void): this;
    on(event: 'unexpected-response', listener: (request: http.ClientRequest, response: http.IncomingMessage) => void): this;
    on(event: string | symbol, listener: (...args: any[]) => void): this;

    addEventListener(type: 'close' | 'error' | 'message' | 'open', listener: (event: any) => void): void;
    removeEventListener(type: 'close' | 'error' | 'message' | 'open', listener: (event: any) => void): void;
  }

  export class WebSocketServer extends EventEmitter {
    options: ServerOptions;
    path: string;
    clients: Set<WebSocket>;

    constructor(options?: ServerOptions, callback?: () => void);

    close(cb?: (err?: Error) => void): void;
    handleUpgrade(
      request: http.IncomingMessage,
      socket: net.Socket,
      upgradeHead: Buffer,
      callback: (client: WebSocket, request: http.IncomingMessage) => void
    ): void;
    shouldHandle(request: http.IncomingMessage): boolean | Promise<boolean>;

    on(event: 'connection', listener: (socket: WebSocket, request: http.IncomingMessage) => void): this;
    on(event: 'error', listener: (error: Error) => void): this;
    on(event: 'headers', listener: (headers: string[], request: http.IncomingMessage) => void): this;
    on(event: 'listening', listener: () => void): this;
    on(event: string | symbol, listener: (...args: any[]) => void): this;
  }

  export function createWebSocketStream(websocket: WebSocket, options?: stream.DuplexOptions): stream.Duplex;
}
