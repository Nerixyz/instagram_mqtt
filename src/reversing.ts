/* eslint no-console: "off" */
import { thriftReadToObject, thriftWriteFromObject } from './thrift';
import { unzipAsync } from './shared';
import { MQTToTConnection } from './mqttot/mqttot.connection';

/**
 *  This file is for analyzing requests.
 *  Put your zipped hex content (starting with 123 or 0x78) in 'data' and see the thrift struct.
 */

(async () => {
    const data =
        '78DACD92BF6B144114C7EFD65FD1A092C49C67B71C0A46B2C9CEEEDEFE704D710489011125062416C3ECCCBBCB24BB33E3EEEC9920166AA158F807585B89858DA59D82F6E29FA185959DB3C41482826518780CEFBDCF77DE7C79DD332CF4290B61E8A030F49DC0CDFA4E72A5F3E9C787F71BDDC7ED555169322A496123E42FB8E6F8C902F23C7B20582939B32F7AE162DC1452DBF75CA6786A4761BC83501CA4F60A88DD426A2EC5E2EFFED45EAE2B2D0BFBE6A61490DAE34CEEC4A1DABFA43608BCBE96DA28EAF7A3200CDCB9CE37ABD39AB5A6A6BBE7FF362AA1C8413EF2860965348993A9596BB6D579F9F4DDE13978DB7E61BDB6DE58CFAD575677924AB9CD01935A6F76BE7E7EF2F3CBF747D6B5D6CCA156F75205556586E46C0979280890E72337BEE00FD046784B07E3ADE206EDD7439308EF1E7F364994C263281BE2D49FAE4CDD7156579C65A248C673AE3954137E56DE1EDFBFBA74160C42732025AEEAACA225578D2FD5C7F6831E178DA430460D39254D7ABF27034C655180D0BDCB3D14C549E24726F63D3F89A2A837FF5F286E42532182E11254BEFB0FB13167203125798E152935A75C11839B0DD08019E4DC7C618F3580A10CEBF6231FA1DEC313EB1594CE60645E3A084B737A402928ED5C27625493111C01E1ACAF4DA89CE8A12C8B63644FF8241FE1E29ED6B894B586A36CCBB4CB73CA185867B8A84658EF2AC0594EE876CE2B3DC3780954CFDB26CDC55E75BAD927E319DD040C826439B0B6DBFA0519DE1127';
    const buf = Buffer.from(data, 'hex');
    // @ts-ignore
    const unzipped = await unzipAsync(buf);
    console.log(unzipped.toString('hex'));

    const a = thriftReadToObject<any>(unzipped, MQTToTConnection.thriftConfig);
    console.log(a);

    const serialized = thriftWriteFromObject(
        {
            clientIdentifier: a.clientIdentifier,
            clientInfo: a.clientInfo,
            password: a.password,
        },
        MQTToTConnection.thriftConfig,
    );
    // console.log(serialized.toString('hex').toUpperCase());
    // console.log(areEqual(unzipped, serialized));
    // logJSONEvent('reread')({ a: thriftReadToObject(serialized, MQTToTConnection.thriftConfig) });
})();

function areEqual(a: Buffer, b: Buffer) {
    return a && b && a.length === b.length && a.toString() === b.toString();
}

function logJSONEvent(name: string): (data) => void {
    return data => console.log(`${name}: ${JSON.stringify(data, undefined, 2)}`);
}
