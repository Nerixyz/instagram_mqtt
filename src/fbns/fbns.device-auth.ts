import {IgApiClient} from "instagram-private-api";

export class FbnsDeviceAuth {
    public clientId: string;
    public userId: number;
    public password: string;
    public deviceId: string;
    public deviceSecret: string;

    public sr: string;
    public rc: string;

    private json?: string;

    private ig: IgApiClient;

    constructor(ig: IgApiClient) {
        this.ig = ig;
        this.clientId = this.ig.state.phoneId.substr(0, 20);
        this.deviceId = '';
        this.userId = 0;
        this.deviceSecret = '';
        this.password = '';
    }

    public read(jsonStr: string) {
        this.json = jsonStr;
        const {ck, cs, di, ds, sr, rc} = JSON.parse(jsonStr);
        this.userId = ck || this.userId;
        this.password = cs || this.password;
        if(di){
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
