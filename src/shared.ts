import { IgApiClient } from 'instagram-private-api';
import { deflate, unzip, unzipSync } from 'zlib';
import Bluebird = require('bluebird');
import debug, { Debug, Debugger } from 'debug';
import { Observable } from "rxjs";
import { MqttClient } from "mqtts";

// TODO: map
export function createUserAgent(ig: IgApiClient) {
    const [androidVersion, , resolution, manufacturer, deviceName] = ig.state.deviceString.split('; ');
    const [width, height] = resolution.split('x');
    const params = {
        FBAN: 'MQTT',
        FBAV: ig.state.appVersion,
        FBBV: ig.state.appVersionCode,
        FBDM: `{density=4.0,width=${width},height=${height}`,
        FBLC: ig.state.language,
        FBCR: 'Android',
        FBMF: manufacturer.trim(),
        FBBD: 'Android',
        FBPN: 'com.instagram.android',
        FBDV: deviceName.trim(),
        FBSV: androidVersion.split('/')[1],
        FBLR: '0',
        FBBK: '1',
        FBCA: 'x86:armeabi-v7a',
    };
    return `[${Object.entries(params)
        .map(p => p.join('/'))
        .join(';')}]`;
}

export async function compressDeflate(data: string | Buffer): Promise<Buffer> {
    return Bluebird.fromCallback<Buffer>(cb => deflate(data, { level: 9 }, cb));
}

export async function unzipAsync(data: string | Buffer) {
    return Bluebird.fromCallback<Buffer>(cb => unzip(data, cb));
}

export async function tryUnzipAsync(data: Buffer): Promise<Buffer> {
    try {
        if (data.readInt8(0) !== 0x78) return data;

        return unzipAsync(data);
    } catch (e) {
        return data;
    }
}

export function tryUnzipSync(data: Buffer): Buffer {
    try {
        if (data.readInt8(0) !== 0x78) return data;

        return unzipSync(data);
    } catch (e) {
        return data;
    }
}

export function isJson(buffer: Buffer) {
    return String.fromCharCode(buffer[0]).match(/[{[]/);
}

/**
 * Returns a debug function with a path starting with ig:mqtt
 * @param {string} path
 * @returns {(msg: string, ...additionalData: any) => void}
 */
export const debugChannel = (...path: string[]): Debugger =>
    debug(['ig', 'mqtt', ...path].join(':'));

export function notUndefined<T>(a: T | undefined): a is T {
    return typeof a !== 'undefined';
}

export type BigInteger = string | number | bigint;

export type ToEventFn<T> = {
    [x in keyof T]: T[x] extends Array<unknown> ? (...args: T[x]) => void : (e: T[x]) => void;
};

export function listenOnce<T>(client: MqttClient<any, any>, topic: string): Promise<T> {
    return new Promise<T>(resolve => {
        const removeFn = client.listen<T>(topic, msg => {
            removeFn();
            resolve(msg);
        });
    })
}

const MAX_STRING_LENGTH = 128;
const ACTUAL_MAX_LEN = MAX_STRING_LENGTH - `"[${MAX_STRING_LENGTH}...]"`.length;
export function prepareLogString(value: string): string {
    if(value.length > ACTUAL_MAX_LEN ) {
        value = `${value.substring(0, ACTUAL_MAX_LEN)}[${MAX_STRING_LENGTH}...]`;
    }
    return `"${value}"`;
}
