import { IgApiClient } from 'instagram-private-api';
import { Enumerable } from 'instagram-private-api/dist/decorators';
import { debugChannel } from '../shared';

export class FbnsDeviceAuth {
    private authLog = debugChannel('fbns', 'device-auth');
    public clientId: string;
    public userId: number;
    public password: string;
    public deviceId: string;
    public deviceSecret: string;

    public sr: string;
    public rc: string;

    private json?: string;

    @Enumerable(false)
    private ig: IgApiClient;

    public constructor(ig: IgApiClient) {
        this.ig = ig;
        this.clientId = this.ig.state.phoneId?.substr(0, 20) || '';
        this.deviceId = '';
        this.userId = 0;
        this.deviceSecret = '';
        this.password = '';
    }

    public update() {
        if (this.clientId === '') {
            this.clientId = this.ig.state.phoneId?.substr(0, 20) || '';
        }
    }

    public read(jsonStr: string) {
        this.authLog(`Reading auth json ${jsonStr ?? 'empty'}`);
        if (!jsonStr) return;
        this.json = jsonStr;
        const { ck, cs, di, ds, sr, rc } = JSON.parse(jsonStr);
        this.userId = ck || this.userId;
        this.password = cs || this.password;
        if (di) {
            this.deviceId = di;
            this.clientId = this.deviceId.substr(0, 20);
        } else {
            this.deviceId = '';
        }
        this.deviceSecret = ds || this.deviceSecret;
        this.sr = sr || this.sr;
        this.rc = rc || this.rc;
    }

    public toString() {
        return this.json || '';
    }
}
