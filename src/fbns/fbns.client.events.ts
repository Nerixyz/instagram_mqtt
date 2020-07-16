import { FbnsMessageData, FbnsNotification, FbnsNotificationUnknown } from './fbns.types';
import { FbnsDeviceAuth } from './fbns.device-auth';

export interface FbnsClientEvents extends ToClientEvents<FbnsNotificationEventParams> {
  auth: FbnsDeviceAuth;
  push: FbnsNotificationUnknown;
  error: Error;
  warning: Error;
  // message without fbpushnotif
  message: FbnsMessageData;
  logging: { beacon_id: number };
  pp: string;
  disconnect: string | undefined;
}

export type ToClientEvents<T> = {[x in keyof T]: FbnsNotification<T[x]>} 

export interface FbnsNotificationEventParams {
  post: {id: string};
  first_post: {username: string};
  resurrected_user_post: {id: string};
  recent_follow_post: {id: string};
  fb_first_post: {username: string};
  first_bestie_post: {id: string};
  direct_v2_message: {id: string, x: string};
}