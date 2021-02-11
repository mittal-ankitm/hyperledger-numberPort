'use strict';

const { ContractBase } = require('./contract-base'),
    PhoneNumber = require('./phone-number'),
    events = require('./events');

class NumberTransferContract extends ContractBase {
    constructor() {
        super('com.thinktecture.numbertransfer.telco');
    }

    async checkRequestTransfer(ctx, phoneNumber) {
        this._require(phoneNumber, 'phoneNumber');

        const checkRequestTransferResult = await this._checkRequestTransfer(ctx, phoneNumber);

        return this._toBuffer(checkRequestTransferResult);
    }

    async _checkRequestTransfer(ctx, phoneNumber) {
        const telcoAvailable = await this._checkTelcoAvailable(ctx);

        if (telcoAvailable) {
            return telcoAvailable;
        }

        const phoneNumberCheck = await this._checkPhoneNumber(ctx, phoneNumber);

        if (phoneNumberCheck) {
            return phoneNumberCheck;
        }

        return { code: 0 };
    }

    async _checkTelcoAvailable(ctx) {
        const telcoBytes = await ctx.stub.getState(this._createTelcoCompositeKey(ctx.stub, ctx.clientIdentity.mspId));
        const telco = this._fromBuffer(telcoBytes);

        if (!telco) {
            return {
                code: 20,
                message: 'Sender not allowed telco',
            };
        }
    }

    async _checkPhoneNumber(ctx, phoneNumber) {
        const phoneNumberInstance = await this._getPhoneNumber(ctx.stub, phoneNumber);

        if (!phoneNumberInstance) {
            return {
                code: 21,
                message: 'Number is not assigned',
            };
        }

        if (phoneNumberInstance.inTransferSince) {
            return {
                code: 30,
                message: 'Number is already in transfer',
            };
        }

        if (phoneNumberInstance.owner === ctx.clientIdentity.mspId) {
            return {
                code: 33,
                message: 'Sender is already the current owner',
            };
        }
    }

    async requestTransfer(ctx, phoneNumber) {
        this._require(phoneNumber, 'phoneNumber');

        const checkTransferResult = await this._checkRequestTransfer(ctx, phoneNumber);

        if (checkTransferResult.code) {
            return this._toBuffer(checkTransferResult);
        }

        const phoneNumberInstance = await this._getPhoneNumber(ctx.stub, phoneNumber);

        phoneNumberInstance.inTransferSince = Date.now();
        phoneNumberInstance.transferTo = ctx.clientIdentity.mspId;

        await ctx.stub.putState(this._createPhoneNumberCompositeKey(ctx.stub, phoneNumber), phoneNumberInstance.toBuffer());

        ctx.stub.setEvent(events.TransferRequested, this._toBuffer({
            phoneNumber,
            from: phoneNumberInstance.owner,
            to: phoneNumberInstance.transferTo,
        }));
    }

    async checkConfirmTransfer(ctx, phoneNumber) {
        this._require(phoneNumber, 'phoneNumber');

        const checkConfirmTransferResult = await this._checkConfirmTransfer(ctx, phoneNumber);

        return this._toBuffer(checkConfirmTransferResult);
    }

    async _checkConfirmTransfer(ctx, phoneNumber) {
        const phoneNumberInstance = await this._getPhoneNumber(ctx.stub, phoneNumber);

        if (!phoneNumberInstance || !phoneNumberInstance.inTransferSince) {
            return {
                code: 31,
                message: 'Number not in a requested transfer',
            };
        }

        if (phoneNumberInstance.owner !== ctx.clientIdentity.mspId) {
            return {
                code: 32,
                message: 'Sender is not the current owner',
            };
        }

        return { code: 0 };
    }

    async confirmTransfer(ctx, phoneNumber) {
        this._require(phoneNumber, 'phoneNumber');

        const checkConfirmTransferResult = await this._checkConfirmTransfer(ctx, phoneNumber);

        if (checkConfirmTransferResult.code) {
            return this._toBuffer(checkConfirmTransferResult);
        }

        const phoneNumberInstance = await this._getPhoneNumber(ctx.stub, phoneNumber);

        const oldOwner = phoneNumberInstance.owner;
        phoneNumberInstance.owner = phoneNumberInstance.transferTo;
        phoneNumberInstance.transferTo = '';
        phoneNumberInstance.inTransferSince = 0;

        await ctx.stub.putState(this._createPhoneNumberCompositeKey(ctx.stub, phoneNumber), phoneNumberInstance.toBuffer());

        ctx.stub.setEvent(events.TransferConfirmed, this._toBuffer({
            phoneNumber,
            from: oldOwner,
            to: phoneNumberInstance.owner,
        }));
    }

    async checkRejectTransfer(ctx, phoneNumber) {
        this._require(phoneNumber, 'phoneNumber');

        const phoneNumberInstance = await this._getPhoneNumber(ctx.stub, phoneNumber);

        if (!phoneNumberInstance || !phoneNumberInstance.inTransferSince) {
            return {
                code: 31,
                message: 'Number not in a requested transfer',
            };
        }

        if (phoneNumberInstance.owner !== ctx.clientIdentity.mspId) {
            return {
                code: 32,
                message: 'Sender is not the current owner',
            };
        }

        return { code: 0 };
    }

    async rejectTransfer(ctx, phoneNumber) {
        this._require(phoneNumber, 'phoneNumber');

        const checkRejectTransferResult = await this._checkRejectTransfer(ctx, phoneNumber);

        if (checkRejectTransferResult.code) {
            return this._toBuffer(checkRejectTransferResult);
        }

        const phoneNumberInstance = await this._getPhoneNumber(ctx.stub, phoneNumber);

        const oldOwner = phoneNumberInstance.owner;
        phoneNumberInstance.transferTo = '';
        phoneNumberInstance.inTransferSince = 0;

        await ctx.stub.putState(this._createPhoneNumberCompositeKey(phoneNumber), phoneNumberInstance.toBuffer());

        ctx.stub.setEvent(events.TransferRejected, this._toBuffer({
            phoneNumber,
            from: oldOwner,
            to: phoneNumberInstance.owner,
        }));
    }

    async numberOwner(ctx, phoneNumber) {
        this._require(phoneNumber, 'phoneNumber');

        const numberBytes = await ctx.stub.getState(this._createPhoneNumberCompositeKey(ctx.stub, phoneNumber));

        return Buffer.from(numberBytes);
    }

    async requestedTransfer(ctx, phoneNumber) {
        this._require(phoneNumber, 'phoneNumber');

        const numberBytes = await ctx.stub.getState(this._createPhoneNumberCompositeKey(ctx.stub, phoneNumber));
        const phoneNumberInstance = PhoneNumber.from(numberBytes);

        if (phoneNumberInstance.transferTo) {
            return Buffer.from(numberBytes);
        }
    }
}

module.exports = NumberTransferContract;
