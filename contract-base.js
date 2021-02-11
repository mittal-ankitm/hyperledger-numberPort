'use strict';

const { Contract } = require('fabric-contract-api'),
    PhoneNumber = require('./phone-number');

class ContractBase extends Contract {
    constructor(namespace) {
        super(namespace);
    }

    _createTelcoCompositeKey(stub, telco) {
        return stub.createCompositeKey('telco', [`${telco}`]);
    }

    _createPhoneNumberCompositeKey(stub, phoneNumber) {
        return stub.createCompositeKey('phoneNumber', [`${phoneNumber}`]);
    }

    async _getPhoneNumber(stub, phoneNumber) {
        const phoneNumberBytes = await stub.getState(this._createPhoneNumberCompositeKey(stub, phoneNumber));
        return PhoneNumber.from(phoneNumberBytes);
    }

    _require(value, name) {
        if (!value) {
            throw new Error(`Parameter ${name} is missing.`);
        }
    }

    _toBuffer(obj) {
        return Buffer.from(JSON.stringify(obj));
    }

    _fromBuffer(buffer) {
        if (Buffer.isBuffer(buffer)) {
            if (!buffer.length) {
                return;
            }

            return JSON.parse(buffer.toString('utf-8'));
        }
    }
}

module.exports = { ContractBase };
