import { IgApiClient } from 'instagram-private-api';
import { deflate, unzip } from 'zlib';
import Bluebird = require('bluebird');

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

export async function compressDeflate(data: string | Buffer) {
    return Bluebird.fromCallback<Buffer>(cb => deflate(data, { level: 9 }, cb));
}

export async function unzipAsync(data: string | Buffer) {
    return Bluebird.fromCallback<Buffer>(cb => unzip(data, cb));
}

export const notUndefined = a => typeof a !== 'undefined';
