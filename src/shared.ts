import {IgApiClient} from "instagram-private-api";
import { deflate, unzip } from "zlib";
import Bluebird = require("bluebird");

// TODO: map
export function createUserAgent(ig: IgApiClient) {
    const deviceParams = ig.state.deviceString.split('; ');
    return  `[FBAN/MQTT;`
        + `FBAV/${ig.state.appVersion};`
        + `FBBV/175574640;`
        + `FBDM/{density=4.0,width=${deviceParams[2].split('x')[0]},height=${deviceParams[2].split('x')[1]}};`
        + `FBLC/${ig.state.language};`
        + `FBCR/Android;`
        + `FBMF/${deviceParams[3].toUpperCase()};`
        + `FBBD/Android;`
        + `FBPN/com.instagram.android;`
        + `FBDV/${deviceParams[4].toUpperCase()};`
        + `FBSV/9.0.0;`
        + `FBLR/0;`
        + `FBBK/1;`
        + `FBCA/armeabi-v7a:armeabi;]`;
}

export async function compressDeflate(data: string | Buffer) {
    return Bluebird.fromCallback<Buffer>(cb => deflate(data, {level: 9}, cb));
}

export async function unzipAsync(data: string | Buffer) {
    return Bluebird.fromCallback<Buffer>(cb => unzip(data, cb));
}
