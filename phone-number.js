'use strict';

class PhoneNumber {
    constructor() {
        this.number = '';
        this.owner = '';
        this.transferTo = '';
        this.inTransferSince = 0;
    }

    static from(bufferOrJson) {
        if (Buffer.isBuffer(bufferOrJson)) {
            if (!bufferOrJson.length) {
                return;
            }

            bufferOrJson = JSON.parse(bufferOrJson.toString('utf-8'));
        }

        const result = new PhoneNumber();
        result.number = bufferOrJson.number;
        result.owner = bufferOrJson.owner;
        result.transferTo = bufferOrJson.transferTo;
        result.inTransferSince = bufferOrJson.inTransferSince;

        return result;
    }

    toJson() {
        return JSON.stringify(this);
    }

    toBuffer() {
        return Buffer.from(this.toJson());
    }
}

module.exports = PhoneNumber;
