import { RealtimeClient } from '../realtime.client';
import { IgApiClient } from 'instagram-private-api';

export abstract class Mixin {
    abstract apply(client: RealtimeClient, ig: IgApiClient): void;
    abstract get name(): string;
}

export function applyMixins(mixins: Mixin[], client: RealtimeClient, ig: IgApiClient): void {
    for (const mixin of mixins) mixin.apply(client, ig);
}

export function hook<K extends string, Fn extends (...args: any[]) => any>(
    target: { [x in K]: Fn },
    key: K,
    hooks: {
        pre?: (...args: Parameters<Fn>) => void | { returnValue: ReturnType<Fn>; overrideReturn: boolean };
        post?: (
            returnValue: ReturnType<Fn>,
            ...args: Parameters<Fn>
        ) => void | { returnValue: ReturnType<Fn>; overrideReturn: boolean };
    },
): void {
    const base = target[key];
    const wrapper = (...args: Parameters<Fn>): ReturnType<Fn> => {
        let returnValue: ReturnType<Fn>;
        let overrideReturn = false;
        if (hooks.pre) {
            const res = hooks.pre.apply(target, args);
            if (typeof res === 'object' && res.overrideReturn) {
                overrideReturn = true;
                returnValue = res.returnValue;
            }
        }
        const actualReturn = base.apply(target, args);
        if (!overrideReturn) returnValue = actualReturn;

        if (hooks.post) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- it's always defined
            const res = hooks.post.apply(target, [returnValue!, ...args]);
            if (typeof res === 'object' && res.overrideReturn) {
                returnValue = res.returnValue;
            }
        }
        // @ts-expect-error -- return value will be set [if pre sets it, else overrideReturn is false and it will be set by the actual function
        return returnValue;
    };
    // @ts-expect-error -- any[] vs Parameters<Fn>
    target[key] = wrapper.bind(target);
}
