import { toAccount } from 'viem/accounts';
import type {
    Address,
    Hex,
    LocalAccount,
    SignableMessage,
    TransactionSerializable,
    TransactionSerialized,
    TypedData,
    SerializeTransactionFn,
    GetTransactionType,
    TypedDataDefinition,
    IsNarrowable,
} from 'viem';
import { bytesToHex, serializeTransaction } from 'viem';
import { createClient, type Client } from './client/index';
import type { SharedSecret } from './crypto';
import { DEFAULT_FIREBASE_URL } from './constants';

export interface LodgelockAccountOptions {
    address: Address;
    sharedSecret: SharedSecret;
    origin?: string | undefined;
    firebaseUrl?: string | undefined;
    fcmToken?: string | undefined;
    pollInterval?: number | undefined;
    pollTimeout?: number | undefined;
}

const DEFAULT_POLL_INTERVAL = 1000;
const DEFAULT_POLL_TIMEOUT = 60;

export class LodgelockAccount {
    private client: Client;
    private address: Address;
    private origin?: string | undefined;
    private pollInterval: number;
    private pollTimeout: number;

    constructor(options: LodgelockAccountOptions) {
        this.client = createClient(
            options.sharedSecret,
            options.fcmToken,
            options.firebaseUrl ?? DEFAULT_FIREBASE_URL
        );
        this.address = options.address;
        this.origin = options.origin;
        this.pollInterval = options.pollInterval ?? DEFAULT_POLL_INTERVAL;
        this.pollTimeout = options.pollTimeout ?? DEFAULT_POLL_TIMEOUT;
    }

    toViemAccount(): LocalAccount {
        const account = toAccount({
            address: this.address,
            signMessage: this.signMessage.bind(this),
            signTransaction: this.signTransaction.bind(this),
            signTypedData: this.signTypedData.bind(this),
        });

        return account;
    }

    private async signMessage({ message }: { message: SignableMessage }): Promise<Hex> {
        let messageHex: Hex;
        if (typeof message === 'string') messageHex = message as Hex;
        else if (message.raw instanceof Uint8Array) messageHex = bytesToHex(message.raw);
        else messageHex = message.raw;

        const requestId = await this.client.submitRequest('signPersonal', {
            status: 'pending',
            origin: this.origin,
            message: messageHex,
            from: this.address,
        });

        const response = await this.client.pollUntil(
            requestId,
            'signPersonal',
            this.pollInterval,
            this.pollTimeout,
            (r) => r.status !== 'pending',
        );

        await this.client.deleteRequest(requestId);

        if (response.status === 'rejected') {
            throw new Error('Message signing was rejected by user');
        }

        if (response.status === 'error') {
            throw new Error('Error occurred while signing message');
        }

        if (!response.signature) {
            throw new Error('No signature returned from mobile device');
        }

        return response.signature;
    }

    private async signTransaction<
        serializer extends SerializeTransactionFn<TransactionSerializable> = SerializeTransactionFn<TransactionSerializable>,
        T extends Parameters<serializer>[0] = Parameters<serializer>[0],
    >(
        transaction: T,
        options?: { serializer?: serializer | undefined },
    ): Promise<
        IsNarrowable<
            TransactionSerialized<GetTransactionType<T>>,
            Hex
        > extends true
        ? TransactionSerialized<GetTransactionType<T>>
        : Hex
    > {
        const serializedTx = options?.serializer
            ? options.serializer(transaction)
            : serializeTransaction(transaction);

        const requestId = await this.client.submitRequest('signTransaction', {
            status: 'pending',
            origin: this.origin,
            from: this.address,
            transaction: serializedTx,
        });

        const response = await this.client.pollUntil(
            requestId,
            'signTransaction',
            this.pollInterval,
            this.pollTimeout,
            (r) => r.status !== 'pending',
        );

        await this.client.deleteRequest(requestId);

        if (response.status === 'rejected') {
            throw new Error('Transaction signing was rejected by user');
        }
        if (response.status === 'error') {
            throw new Error('Error occurred while signing transaction');
        }
        if (!response.signed) {
            throw new Error('No signed transaction returned from mobile device');
        }

        return response.signed as TransactionSerialized<GetTransactionType<T>>;
    }


    private async signTypedData<
        const T extends TypedData | Record<string, unknown>,
        P extends keyof T | 'EIP712Domain' = keyof T,
    >(
        parameters: TypedDataDefinition<T, P>,
    ): Promise<Hex> {
        const requestId = await this.client.submitRequest('signTypedData', {
            status: 'pending',
            origin: this.origin,
            from: this.address,
            data: parameters as TypedDataDefinition,
        });

        const response = await this.client.pollUntil(
            requestId,
            'signTypedData',
            this.pollInterval,
            this.pollTimeout,
            (r) => r.status !== 'pending',
        );

        await this.client.deleteRequest(requestId);

        if (response.status === 'rejected') throw new Error('Typed data signing was rejected by user');
        if (response.status === 'error') throw new Error('Error occurred while signing typed data');
        if (!response.signature) throw new Error('No signature returned from mobile device');

        return response.signature;
    }

    getAddress(): Address {
        return this.address;
    }

    getClient(): Client {
        return this.client;
    }
}