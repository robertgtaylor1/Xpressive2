/// <reference path="jquery-1.8.d.ts" />

interface pubsubCallback {
    (channel: string, payload: any): any;
}

interface observerCallback {
    (key: string, action: string): void;
}

// Interface
interface jStorageStatic {
    get(key: string, def?: any): any;
    set(key: string, value: any, options?: any): any;
    deleteKey(key: string): bool;
    setTTL(key: string, ttl: number): bool;
    getTTL(key: string): number;
    flush(): bool;
    storageObject(): any;
    index(): any;
    storageSize(): number;
    currentBackend(): string;
    storageAvailable(): bool;
    listenKeyChange(key: string, callback: observerCallback): void;
    stopListening(key: string, callback: observerCallback): void;
    subscribe(channel: string, callback: pubsubCallback): void;
    publish(channel: string, payload: pubsubCallback): void;
    reInit(): void;
    jStorage(): JQueryStatic;
}

interface JQueryStatic {
    jStorage: jStorageStatic;
}

// Local variables
