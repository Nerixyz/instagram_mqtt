import { IgApiClientExt, IgApiClientFbns, withFbns } from '../src';
import { IgApiClient } from 'instagram-private-api';
import { promisify } from 'util';
import { writeFile, readFile, exists } from 'fs';

const writeFileAsync = promisify(writeFile);
const readFileAsync = promisify(readFile);
const existsAsync = promisify(exists);

const {IG_USERNAME = '', IG_PASSWORD = ''} = process.env;

(async () => {
    const ig: IgApiClientFbns = withFbns(new IgApiClient());
    ig.state.generateDevice(IG_USERNAME);

    // this will set the auth and the cookies for instagram
    await readState(ig);

    // this logs the client in
    await loginToInstagram(ig);

    // you received a notification
    ig.fbns.on('push', logEvent('push'));

    // the client received auth data
    // the listener has to be added before connecting
    ig.fbns.on('auth', async auth => {
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

    // you can pass in an object with socks proxy options to use this proxy
    // await ig.fbns.connect({socksOptions: {host: '...', port: 12345, type: 4}});
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
    await ig.account.login(IG_USERNAME, IG_PASSWORD);
}

/**
 * A wrapper function to log to the console
 * @param name
 * @returns {(data) => void}
 */
function logEvent(name: string) {
    return (data: any) => console.log(name, data);
}
