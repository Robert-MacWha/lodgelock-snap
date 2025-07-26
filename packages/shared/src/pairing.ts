import { SharedSecret, isValidSharedSecret } from "./crypto";

export interface QrCodeData {
    sharedSecret: SharedSecret;
    version: number;
}

export const QR_VERSION = 1;
export const QR_PROTOCOL = "tlock";
export const QR_ACTION = "pair";

export async function createQrCode(sharedSecret: SharedSecret): Promise<string> {
    const qrData: QrCodeData = {
        sharedSecret,
        version: QR_VERSION
    };

    const encodedData = btoa(JSON.stringify(qrData));
    return `${QR_PROTOCOL}://${QR_ACTION}/${encodedData}`;
}

export async function parseQrCode(qrCode: string): Promise<SharedSecret> {
    const expectedPrefix = `${QR_PROTOCOL}://${QR_ACTION}/`;

    if (!qrCode.startsWith(expectedPrefix)) {
        throw new Error("Expected QR code to start with " + expectedPrefix + " but got: " + qrCode);
    }

    const encodedData = qrCode.slice(expectedPrefix.length);
    const qrData: QrCodeData = JSON.parse(atob(encodedData));

    if (qrData.version !== QR_VERSION) {
        throw new Error("Unsupported QR code version");
    }

    if (!isValidSharedSecret(qrData.sharedSecret)) {
        throw new Error(`Invalid shared secret in QR code: ${qrData.sharedSecret}`);
    }

    return qrData.sharedSecret;
}
