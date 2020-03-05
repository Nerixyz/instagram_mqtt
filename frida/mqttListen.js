/* eslint-disable */

/**
 *          MQTT LISTEN
 *
 *  This script prints all data SENT to the MQTT broker by the app.
 *
 */

/**
 *  search for the string       'MessageEncoder'
 *
 * EXPECTED:
 *       any.any("MessageEncoder", new IllegalArgumentException(() + "Unknown message type: " + a), "send/unexpected; type=%s", b)
 *
 *  OR
 *
 *  search for the string       'No message encoder'
 *
 * EXPECTED:
 *       throw new IOException("No message encoder");
 *
 * CURRENT: v123.0.0.21.114 @ x86
 */
const MESSAGE_ENCODER_SEND = 'X.02w';



Java.perform(function () {
    var packetWriter = [];
    var logOut = false;
    const JDataOutputStream = Java.use('java.io.DataOutputStream');
    JDataOutputStream.write.overload('[B', 'int', 'int').implementation = function (data, b, c) {
        if (logOut) {
            packetWriter.push(arrayToByteThing(data));
        }
        return this.write.overload('[B', 'int', 'int').call(this, data, b, c);
    };
    JDataOutputStream.write.overload('int').implementation = function (i) {
        if (logOut) {
            packetWriter.push(numToHex(i, 1));
        }
        return this.write.overload('int').call(this, i);
    };
    preIntercept(JDataOutputStream, 'writeBoolean', function (b) {
        if (logOut) {
            packetWriter.push(numToHex(b ? 1 : 0, 1));
        }
    });
    preIntercept(JDataOutputStream, 'writeByte', function (b) {
        if (logOut) {
            packetWriter.push(numToHex(b, 1));
        }
    });
    preIntercept(JDataOutputStream, 'writeShort', function (b) {
        if (logOut) {
            packetWriter.push(numToHex(b, 2));
        }
    });
    preIntercept(JDataOutputStream, 'writeInt', function (b) {
        if (logOut) {
            packetWriter.push(numToHex(b, 4));
        }
    });
    const RawMqttHandler = Java.use(MESSAGE_ENCODER_SEND);
    RawMqttHandler.A00.implementation = function (thisObj, messageEncoder, message) {
        console.log('\n\nSTART');
        logOut = true;
        const res = this.A00(thisObj, messageEncoder, message);
        logOut = false;
        console.log(packetWriter.join(''));
        packetWriter = [];
        console.log('END\n\n');
        return res;
    }

});

function preIntercept(target, method, callback) {
    target[method].implementation = function () {
        callback.apply(this, arguments);
        return this[method].apply(this, arguments);
    }
}

function arrayToByteThing(arr) {
    if (!arr)
        return '';
    var acc = '';
    const len = arr.length;
    for (var i = 0; i < len; i++) {
        const v = arr[i] & 0xff;
        const str = v.toString(16);
        acc += str.length === 1 ? '0' + str : str;
    }
    return acc;
}

function numToHex(int, len) {
    len *= 2;
    const str = int.toString(16);
    var acc = '';
    for (var i = 0; i < len - str.length; i++) {
        acc += '0';
    }
    acc += str;
    return acc;
}
