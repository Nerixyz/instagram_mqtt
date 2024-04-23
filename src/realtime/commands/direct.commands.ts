import { MQTToTClient } from '../../mqttot';
import { Topics } from '../../constants';
import { compressDeflate, debugChannel, notUndefined } from '../../shared';
import { MessageSyncMessageTypes } from '../messages';
import * as Chance from 'chance';
import { ThriftDescriptors, ThriftPacketDescriptor, thriftWriteFromObject } from '../../thrift';
import { MqttMessageOutgoing } from 'mqtts';

interface ItemBaseType {
   threadId: string;
   clientContext?: string;
}

export interface ForegroundState {
   inForegroundApp?: boolean;
   inForegroundDevice?: boolean;
   keepAliveTimeout?: number;
   subscribeTopics?: string[];
   subscribeGenericTopics?: string[];
   unsubscribeTopics?: string[];
   unsubscribeGenericTopics?: string[];
   requestId?: bigint;
}

export class DirectCommands {
   private directDebug = debugChannel('realtime', 'direct');
   private client: MQTToTClient;
   private chance: Chance.Chance;

   public foregroundStateConfig: ThriftPacketDescriptor[] = [
      ThriftDescriptors.boolean('inForegroundApp', 1),
      ThriftDescriptors.boolean('inForegroundDevice', 2),
      ThriftDescriptors.int32('keepAliveTimeout', 3),
      ThriftDescriptors.listOfBinary('subscribeTopics', 4),
      ThriftDescriptors.listOfBinary('subscribeGenericTopics', 5),
      ThriftDescriptors.listOfBinary('unsubscribeTopics', 6),
      ThriftDescriptors.listOfBinary('unsubscribeGenericTopics', 7),
      ThriftDescriptors.int64('requestId', 8),
   ];

   public constructor(client: MQTToTClient) {
      this.client = client;
      this.chance = new Chance();
   }

   public async sendForegroundState(state: ForegroundState) {
      this.directDebug(`Updated foreground state: ${JSON.stringify(state)}`);
      return this.client
         .publish({
            topic: Topics.FOREGROUND_STATE.id,
            payload: await compressDeflate(
               Buffer.concat([Buffer.alloc(1, 0), thriftWriteFromObject(state, this.foregroundStateConfig)]),
            ),
            qosLevel: 1,
         })
         .then(res => {
            // updating the keepAlive to match the shared value
            if (notUndefined(state.keepAliveTimeout)) {
               this.client.keepAlive = state.keepAliveTimeout;
            }
            return res;
         });
   }

   private async sendCommand({
      action,
      data,
      threadId,
      clientContext,
   }: { action: string; data: any } & ItemBaseType): Promise<MqttMessageOutgoing> {
      if (clientContext) {
         data.client_context = clientContext;
      }
      const json = JSON.stringify({
         action,
         thread_id: threadId,
         ...data,
      });
      return this.client.publish({
         topic: Topics.SEND_MESSAGE.id,
         qosLevel: 1,
         payload: await compressDeflate(json),
      });
   }

   private async sendItem({ threadId, itemType, data, clientContext }: { itemType: string; data: any } & ItemBaseType) {
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

   public async sendHashtag({
      text,
      threadId,
      hashtag,
      clientContext,
   }: { text?: string; hashtag: string } & ItemBaseType) {
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

   public async sendLocation({
      text,
      locationId,
      threadId,
      clientContext,
   }: { text?: string; locationId: string } & ItemBaseType) {
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

   public async sendMedia({
      text,
      mediaId,
      threadId,
      clientContext,
   }: { text?: string; mediaId: string } & ItemBaseType) {
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

   public async sendProfile({
      text,
      userId,
      threadId,
      clientContext,
   }: { text?: string; userId: string } & ItemBaseType) {
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
      targetItemType,
      emoji,
   }: {
      itemId: string;
      reactionType?: 'like' | string;
      reactionStatus?: 'created' | 'deleted';
      targetItemType?: MessageSyncMessageTypes;
      emoji?: string;
   } & ItemBaseType) {
      return this.sendItem({
         itemType: 'reaction',
         threadId,
         clientContext,
         data: {
            item_id: itemId,
            node_type: 'item',
            reaction_type: reactionType || 'like',
            reaction_status: reactionStatus || 'created',
            target_item_type: targetItemType,
            emoji: emoji || '',
         },
      });
   }

   public async sendUserStory({
      text,
      storyId,
      threadId,
      clientContext,
   }: { text?: string; storyId: string } & ItemBaseType) {
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

   public async markAsSeen({ threadId, itemId }: { threadId: string; itemId: string }) {
      return this.sendCommand({
         action: 'mark_seen',
         threadId,
         data: {
            item_id: itemId,
         },
      });
   }

   public async indicateActivity({ threadId, isActive, clientContext }: { isActive?: boolean } & ItemBaseType) {
      return this.sendCommand({
         action: 'indicate_activity',
         threadId,
         clientContext: clientContext || this.chance.guid({ version: 4 }),
         data: {
            activity_status: (typeof isActive === 'undefined' ? true : isActive) ? '1' : '0',
         },
      });
   }
}
