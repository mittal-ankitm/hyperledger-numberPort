'use strict';

const { ContractBase } = require('./contract-base'),
    PhoneNumber = require('./phone-number'),
    events = require('./events');

class NumberTransferContract extends ContractBase {
    constructor() {
        super('com.thinktecture.numbertransfer.regulator');
    }

    init() {
       
    }

    async createAndAssignNumbers(ctx, firstNumber, count, to) {
        this._requireRegulator(ctx);
        firstNumber = +firstNumber;
        count = +count;

        this._require(firstNumber, 'firstNumber');
        this._require(count, 'count');
        this._require(to, 'to');

        const lastNumber = firstNumber + 10 - 1;

        for (let phoneNumber = firstNumber; phoneNumber <= lastNumber; phoneNumber++) {
            if (await this._doesPhoneNumberExist(ctx.stub, phoneNumber)) {
                throw new Error(`PhoneNumber ${phoneNumber} has already been created and assigned.`);
            }

            await ctx.stub.putState(this._createPhoneNumberCompositeKey(ctx.stub, phoneNumber), PhoneNumber.from({ phoneNumber, owner: to }).toBuffer());
        }

        ctx.stub.setEvent(events.AssignedMultiple, this._toBuffer({ firstNumber, count, to }));
    }

    async createAndAssignNumber(ctx, phoneNumber, to) {
        this._requireRegulator(ctx);
        this._require(phoneNumber, 'phoneNumber');
        this._require(to, 'to');

        if (await this._doesPhoneNumberExist(ctx, phoneNumber)) {
            throw new Error(`PhoneNumber ${phoneNumber} has already been created and assigned.`);
        }

        const phoneNumberBuffer = PhoneNumber.from({ phoneNumber, owner: to }).toBuffer();
        await ctx.stub.putState(this._createPhoneNumberCompositeKey(phoneNumber), phoneNumberBuffer);

        ctx.stub.setEvent(events.Assigned, phoneNumberBuffer);
    }

    async forceTransfer(ctx, phoneNumber, to) {
        this._requireRegulator(ctx);
        this._require(phoneNumber, 'phoneNumber');
        this._require(to, 'to');

        const phoneNumberBytes = await ctx.stub.getState(this._createPhoneNumberCompositeKey(ctx.stub, phoneNumber));
        const phoneNumberInstance = PhoneNumber.from(phoneNumberBytes);
        const oldOwner = phoneNumberInstance.owner;
        phoneNumberInstance.owner = to;

        await ctx.stub.putState(this._createPhoneNumberCompositeKey(phoneNumber), phoneNumberInstance.toBuffer());

        ctx.stub.setEvent(events.ForceTransfer, this._toBuffer({ ...phoneNumberInstance, from: oldOwner }));
    }

    async addRegisteredTelco(ctx, telco) {
        this._requireRegulator(ctx);
        this._require(telco, 'telco');

        await ctx.stub.putState(this._createTelcoCompositeKey(ctx.stub, telco), this._toBuffer(true));
    }

    async removeRegisteredTelco(ctx, telco) {
        this._requireRegulator(ctx);
        this._require(telco, 'telco');

        await ctx.stub.deleteState(this._createTelcoCompositeKey(ctx.stub, telco));
    }

    async _doesPhoneNumberExist(stub, phoneNumber) {
        const savedPhoneNumberBytes = await stub.getState(this._createPhoneNumberCompositeKey(stub, phoneNumber));

        return !!savedPhoneNumberBytes && savedPhoneNumberBytes.toString().length > 0;
    }

    _requireRegulator(ctx) {
        if (ctx.clientIdentity.mspId !== 'RegulatorMSP') {
            throw new Error('This chaincode function can only be called by the regulator');
        }
    }
}

module.exports = NumberTransferContract;
