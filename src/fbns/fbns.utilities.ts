import { FbnsBadgeCount, FbnsNotificationUnknown, FbPushNotif } from './fbns.types';
import { notUndefined } from '../shared';
import * as querystring from 'querystring';
import * as URL from 'url';

export function createNotificationFromJson(json: string): FbnsNotificationUnknown {
    const data: FbPushNotif = JSON.parse(json);

    const notification = Object.defineProperty({}, 'description', {
        enumerable: false,
        value: data,
    }) as FbnsNotificationUnknown;

    if (notUndefined(data.t)) {
        notification.title = data.t;
    }
    if (notUndefined(data.m)) {
        notification.message = data.m;
    }
    if (notUndefined(data.tt)) {
        notification.tickerText = data.tt;
    }
    if (notUndefined(data.ig)) {
        notification.igAction = data.ig;
        const url = URL.parse(data.ig);
        if (url.pathname) {
            notification.actionPath = url.pathname;
        }
        if (url.query) {
            notification.actionParams = querystring.decode(url.query);
        }
    }
    if (notUndefined(data.collapse_key)) {
        notification.collapseKey = data.collapse_key;
    }
    if (notUndefined(data.i)) {
        notification.optionalImage = data.i;
    }
    if (notUndefined(data.a)) {
        notification.optionalAvatarUrl = data.a;
    }
    if (notUndefined(data.sound)) {
        notification.sound = data.sound;
    }
    if (notUndefined(data.pi)) {
        notification.pushId = data.pi;
    }
    if (notUndefined(data.c)) {
        notification.pushCategory = data.c;
    }
    if (notUndefined(data.u)) {
        notification.intendedRecipientUserId = data.u;
    }
    if (notUndefined(data.s) && data.s !== 'None') {
        notification.sourceUserId = data.s;
    }
    if (notUndefined(data.igo)) {
        notification.igActionOverride = data.igo;
    }
    if (notUndefined(data.bc)) {
        const badgeCount: FbnsBadgeCount = {};
        const parsed = JSON.parse(data.bc);
        if (notUndefined(parsed.di)) {
            badgeCount.direct = parsed.di;
        }
        if (notUndefined(parsed.ds)) {
            badgeCount.ds = parsed.ds;
        }
        if (notUndefined(parsed.ac)) {
            badgeCount.activities = parsed.ac;
        }
        notification.badgeCount = badgeCount;
    }
    if (notUndefined(data.ia)) {
        notification.inAppActors = data.ia;
    }

    return notification;
}
