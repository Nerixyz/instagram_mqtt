import { ListenerInfo } from './mqtt.types';
import { MqttMessage } from './mqtt.message';

export function topicListener<T>(options: {
    topic: string;
    transformer: (data: MqttMessage) => T | PromiseLike<T>;
    validator?: (data: MqttMessage) => boolean | PromiseLike<boolean>;
    onData: (data: T) => void | PromiseLike<void>;
}): ListenerInfo<MqttMessage, T> {
    return {
        eventName: 'message',
        validator: data => {
            if (data.topic === options.topic) {
                return options.validator ? options.validator(data) : true;
            }
            return false;
        },
        transformer: options.transformer,
        onData: options.onData,
    };
}
