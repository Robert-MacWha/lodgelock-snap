import { createClient } from './client/index';
import { createQrCode } from './pairing';
import { generateSharedSecret, type SharedSecret } from './crypto';
import { DEFAULT_FIREBASE_URL } from './constants';
import type { Address } from 'viem';

export interface PairingInfo {
    sharedSecret: SharedSecret;
    qrCode: string;
    pairRequestId: string;
}

export interface AccountCreationResult {
    address: Address;
    sharedSecret: SharedSecret;
}

/**
 * Generate a QR code for pairing with the Lodgelock mobile app
 */
export async function generatePairingInfo(firebaseUrl?: string): Promise<PairingInfo> {
    const sharedSecret = generateSharedSecret();
    const client = createClient(sharedSecret, undefined, firebaseUrl ?? DEFAULT_FIREBASE_URL);

    const pairRequestId = await client.submitRequest('pair', {
        status: 'pending',
        fcmToken: '',
        deviceName: 'External Integration',
    });

    const qrCode = createQrCode(sharedSecret, pairRequestId);

    return {
        sharedSecret,
        qrCode,
        pairRequestId,
    };
}

/**
 * Wait for the mobile app to complete pairing
 */
export async function waitForPairing(
    pairingInfo: PairingInfo,
    firebaseUrl?: string,
    timeoutSeconds = 60,
): Promise<{ fcmToken: string; deviceName: string }> {
    const client = createClient(
        pairingInfo.sharedSecret,
        undefined,
        firebaseUrl ?? DEFAULT_FIREBASE_URL
    );

    const response = await client.pollUntil(
        pairingInfo.pairRequestId,
        'pair',
        1000,
        timeoutSeconds,
        (response) => response.status !== 'pending',
    );

    await client.deleteRequest(pairingInfo.pairRequestId);

    if (response.status === 'rejected') {
        throw new Error('Pairing was rejected by mobile device');
    }

    if (response.status === 'error') {
        throw new Error('Error occurred during pairing');
    }

    return {
        fcmToken: response.fcmToken,
        deviceName: response.deviceName,
    };
}

/**
 * Request an account from the mobile app
 */
export async function importAccount(
    sharedSecret: SharedSecret,
    firebaseUrl?: string,
    timeoutSeconds = 60,
): Promise<Address> {
    const client = createClient(sharedSecret, undefined, firebaseUrl ?? DEFAULT_FIREBASE_URL);

    const requestId = await client.submitRequest('importAccount', {
        status: 'pending',
    });

    const response = await client.pollUntil(
        requestId,
        'importAccount',
        1000,
        timeoutSeconds,
        (r) => r.status !== 'pending',
    );

    await client.deleteRequest(requestId);

    if (response.status === 'rejected') {
        throw new Error('Account import was rejected by user');
    }

    if (response.status === 'error') {
        throw new Error('Error occurred while creating account');
    }

    if (!response.address) {
        throw new Error('No address returned from mobile device');
    }

    return response.address;
}
