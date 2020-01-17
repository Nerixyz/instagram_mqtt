import { IgApiClientExt, IgApiClientFbns, withFbns } from '../src';
import { IgApiClient } from 'instagram-private-api';
import { promisify } from 'util';
import { writeFile, readFile, exists } from 'fs';

const writeFileAsync = promisify(writeFile);
const readFileAsync = promisify(readFile);
const existsAsync = promisify(exists);

(async () => {
    const ig: IgApiClientFbns = withFbns(new IgApiClient());
    ig.state.generateDevice(process.env.IG_USERNAME);

    // this will set the auth and the cookies for instagram
    await readState(ig);

    // this logs the client in
    await loginToInstagram(ig);

    // Example: listen to direct-messages
    // 'direct_v2_message' is emitted whenever anything gets sent to the user
    ig.fbns.on('direct_v2_message', logEvent('direct-message'));

    // 'push' is emitted on every push notification
    ig.fbns.on('push', logEvent('push'));
    // 'auth' is emitted whenever the auth is sent to the client
    // the listener has to be added before connecting
    ig.fbns.on('auth', async (auth) => {
        // logs the auth
        logEvent('auth')(auth);

        //saves the auth
        await saveState(ig);
    });
    // 'error' is emitted whenever the client experiences a fatal error
    ig.fbns.on('error', logEvent('error'));
    // 'warning' is emitted whenever the client errors but the connection isn't affected
    ig.fbns.on('warning', logEvent('warning'));

    // this sends the connect packet to the server and starts the connection
    // the promise will resolve once the client is fully connected (once /push/register/ is received)
    await ig.fbns.connect();
})();

async function saveState(ig: IgApiClientExt) {
    return writeFileAsync('state.json', await ig.exportState(), { encoding: 'utf8' });
}

async function readState(ig: IgApiClientExt) {
    if (!await existsAsync('state.json'))
        return;
    await ig.importState(await readFileAsync('state.json', {encoding: 'utf8'}));
}

async function loginToInstagram(ig: IgApiClientExt) {
    ig.request.end$.subscribe(() => saveState(ig));
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
