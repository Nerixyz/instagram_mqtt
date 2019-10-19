import { FbnsClient } from '../src';
import { IgApiClient } from 'instagram-private-api';
import { promisify } from 'util';
import { writeFile, readFile, exists } from 'fs';

const writeFileAsync = promisify(writeFile);
const readFileAsync = promisify(readFile);
const existsAsync = promisify(exists);

(async () => {
    const ig = new IgApiClient();
    ig.state.generateDevice(process.env.IG_USERNAME);
    const fbnsClient = new FbnsClient(ig);

    // this will set the auth and the cookies for instagram
    await readState(ig, fbnsClient);

    // this logs the client in
    await loginToInstagram(ig, fbnsClient);

    // Example: listen to direct-messages
    // 'direct_v2_message' is emitted whenever anything gets sent to the user
    fbnsClient.on('direct_v2_message', logEvent('direct-message'));

    // 'push' is emitted on every push notification
    fbnsClient.on('push', logEvent('push'));
    // 'auth' is emitted whenever the auth is sent to the client
    fbnsClient.on('auth', async (auth) => {
        // logs the auth
        logEvent('auth')(auth);

        //saves the auth
        await saveState(ig, fbnsClient);
    });
    // 'error' is emitted whenever the client experiences a fatal error
    fbnsClient.on('error', logEvent('error'));
    // 'warning' is emitted whenever the client errors but the connection isn't affected
    fbnsClient.on('warning', logEvent('warning'));

    // this sends the connect packet to the server and starts the connection
    await fbnsClient.connect();
})();

async function saveState(ig: IgApiClient, fbns: FbnsClient) {
    // the normal saving of cookies for te instagram-api
    const cookies = await ig.state.serializeCookieJar();
    const state = {
        deviceString: ig.state.deviceString,
        deviceId: ig.state.deviceId,
        uuid: ig.state.uuid,
        phoneId: ig.state.phoneId,
        adid: ig.state.adid,
        build: ig.state.build,
    };
    return writeFileAsync('state.json', JSON.stringify({
        cookies: JSON.stringify(cookies),
        state,
        // this saves the auth
        fbnsAuth: fbns.auth.toString(),
    }), { encoding: 'utf8' });
}

async function readState(ig: IgApiClient, fbns: FbnsClient) {
    if (!await existsAsync('state.json'))
        return;
    // normal reading of state for the instagram-api
    const { cookies, state, fbnsAuth } = JSON.parse(await readFileAsync('state.json', { encoding: 'utf8' }));
    ig.state.deviceString = state.deviceString;
    ig.state.deviceId = state.deviceId;
    ig.state.uuid = state.uuid;
    ig.state.phoneId = state.phoneId;
    ig.state.adid = state.adid;
    ig.state.build = state.build;
    await ig.state.deserializeCookieJar(cookies);
    // this reads the auth
    fbns.auth.read(fbnsAuth);
}

async function loginToInstagram(ig: IgApiClient, fbns: FbnsClient) {
    ig.request.end$.subscribe(() => saveState(ig, fbns));
    await ig.account.login(process.env.IG_USERNAME, process.env.IG_PASSWORD);
}

/**
 * A wrapper function to log to the console
 * @param name
 * @returns {(data) => void}
 */
function logEvent(name) {
    return data => console.log(name, data);
}
