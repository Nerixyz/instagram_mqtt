import { MQTToTClient } from '../../mqttot/mqttot.client';
import { Topics } from '../../constants';
import { compressDeflate } from '../../shared';
import * as Chance from 'chance';

interface ItemBaseType {
    threadId: string;
    clientContext?: string;
}

export class DirectCommands {
    private client: MQTToTClient;
    private chance: Chance.Chance;

    constructor(client: MQTToTClient) {
        this.client = client;
        this.chance = new Chance();
    }

    private async sendCommand({ action, data, threadId, clientContext }: { action: string, data: any } & ItemBaseType) {
        if (clientContext) {
            data.client_context = clientContext;
        }
        const json = JSON.stringify({
            action,
            thread_id: threadId,
            ...data,
        });
        console.log(json);
        return this.client.publish({
            topic: Topics.SEND_MESSAGE.id,
            qosLevel: 0,
            payload: await compressDeflate(json),
        });
    }

    private async sendItem({ threadId, itemType, data, clientContext }: { itemType: string, data: any } & ItemBaseType) {
        return this.sendCommand({
            action: 'send_item',
            threadId,
            clientContext: clientContext || this.chance.guid({ version: 4 }),
            data: {
                item_type: itemType,
                ...data,
            },
        });
    }

    public async sendHashtag({ text, threadId, hashtag, clientContext }: { text?: string, hashtag: string } & ItemBaseType) {
        return this.sendItem({
            itemType: 'hashtag',
            threadId,
            clientContext,
            data: {
                text: text || '',
                hashtag,
                item_id: hashtag,
            },
        });
    }

    public async sendLike({ threadId, clientContext }: ItemBaseType) {
        return this.sendItem({
            itemType: 'like',
            threadId,
            clientContext,
            data: {},
        });
    }

    public async sendLocation({ text, locationId, threadId, clientContext }: { text?: string, locationId: string } & ItemBaseType) {
        return this.sendItem({
            itemType: 'location',
            threadId,
            clientContext,
            data: {
                text: text || '',
                venue_id: locationId,
                item_id: locationId,
            },
        });
    }

    public async sendMedia({ text, mediaId, threadId, clientContext }: { text?: string, mediaId: string } & ItemBaseType) {
        return this.sendItem({
            itemType: 'media_share',
            threadId,
            clientContext,
            data: {
                text: text || '',
                media_id: mediaId,
            },
        });
    }

    public async sendProfile({ text, userId, threadId, clientContext }: { text?: string, userId: string } & ItemBaseType) {
        return this.sendItem({
            itemType: 'profile',
            threadId,
            clientContext,
            data: {
                text: text || '',
                profile_user_id: userId,
                item_id: userId,
            },
        });
    }

    public async sendReaction({
                                  itemId,
                                  reactionType,
                                  clientContext,
                                  threadId,
                                  reactionStatus,
                              }: {
        itemId: string,
        reactionType?: 'like' | string,
        reactionStatus?: 'created' | 'deleted' } & ItemBaseType) {
        return this.sendItem({
            itemType: 'reaction',
            threadId,
            clientContext,
            data: {
                item_id: itemId,
                node_type: 'item',
                reaction_type: reactionType || 'like',
                reaction_status: reactionStatus || 'created',
            },
        });
    }

    public async sendUserStory({ text, storyId, threadId, clientContext }: { text?: string, storyId: string } & ItemBaseType) {
        return this.sendItem({
            itemType: 'reel_share',
            threadId,
            clientContext,
            data: {
                text: text || '',
                item_id: storyId,
                media_id: storyId,
            },
        });
    }

    public async sendText({ text, clientContext, threadId }: { text: string } & ItemBaseType) {
        return this.sendItem({
            itemType: 'text',
            threadId,
            clientContext,
            data: {
                text,
            },
        });
    }

    public async markAsSeen({threadId, itemId}: {threadId: string, itemId: string}) {
        return this.sendCommand({
            action: 'mark_seen',
            threadId,
            data: {
                item_id: itemId,
            }
        });
    }

    public async indicateActivity({threadId, isActive, clientContext}: {isActive?: boolean} & ItemBaseType) {
        return this.sendCommand({
            action: 'indicate_activity',
            threadId,
            clientContext: clientContext || this.chance.guid({version: 4}),
            data: {
                activity_status: (typeof isActive === 'undefined' ? true : isActive) ? '1' : '0'
            }
        });
    }

}
