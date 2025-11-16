import {
    generatePairingQR,
    waitForPairing,
    type PairingInfo,
} from '@lodgelock/shared';
import qrcode from 'qrcode';
import { updateState, getState } from './state';

export interface PairingQrData {
    qrData: string;
    qrSrc: string;
    pairingInfo: PairingInfo;
}

export class PairingService {
    async start(): Promise<PairingQrData> {
        const state = await getState();
        const pairingInfo = await generatePairingQR(state?.firebaseUrl);

        // Save the shared secret to snap state
        await updateState({
            sharedSecret: pairingInfo.sharedSecret,
        });

        // Generate QR code image for snap UI
        const qrSrc = await qrcode.toString(pairingInfo.qrCode);

        return {
            qrData: pairingInfo.qrCode,
            qrSrc,
            pairingInfo,
        };
    }

    async waitForPairing(
        pairingInfo: PairingInfo,
        timeoutSeconds = 300,
    ): Promise<{ fcmToken: string; deviceName: string }> {
        const state = await getState();
        const result = await waitForPairing(
            pairingInfo,
            state?.firebaseUrl,
            timeoutSeconds,
        );

        // Save the pairing data to snap state
        await updateState({
            sharedSecret: pairingInfo.sharedSecret,
            fcmToken: result.fcmToken,
            deviceName: result.deviceName,
        });

        return result;
    }
}
