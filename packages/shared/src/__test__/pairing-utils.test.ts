import {
    generatePairingQR,
    waitForPairing,
    requestAccountCreation,
    pairAndCreateAccount,
} from '../pairing-utils';
import { createClient } from '../client/index';
import { createQrCode } from '../pairing';
import { generateSharedSecret } from '../crypto';
import type { Address } from 'viem';

// Mock dependencies
jest.mock('../client/index');
jest.mock('../pairing');
jest.mock('../crypto');

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockCreateQrCode = createQrCode as jest.MockedFunction<typeof createQrCode>;
const mockGenerateSharedSecret = generateSharedSecret as jest.MockedFunction<typeof generateSharedSecret>;

describe('pairing-utils', () => {
    let mockClient: any;
    const testAddress: Address = '0x1234567890abcdef1234567890abcdef12345678';

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(console, 'log').mockImplementation(() => {});

        mockClient = {
            roomId: 'test-room',
            submitRequest: jest.fn(),
            updateRequest: jest.fn(),
            getRequest: jest.fn(),
            getRequests: jest.fn(),
            deleteRequest: jest.fn(),
            pollUntil: jest.fn(),
        };

        mockCreateClient.mockReturnValue(mockClient);
        mockGenerateSharedSecret.mockReturnValue('test-shared-secret' as any);
        mockCreateQrCode.mockReturnValue('lodgelock://pair/test-qr-data');
    });

    describe('generatePairingQR', () => {
        it('should generate pairing QR successfully', async () => {
            const pairRequestId = 'test-pair-request-id';
            mockClient.submitRequest.mockResolvedValue(pairRequestId);

            const result = await generatePairingQR('https://test-firebase.com');

            expect(mockGenerateSharedSecret).toHaveBeenCalled();
            expect(mockCreateClient).toHaveBeenCalledWith(
                'test-shared-secret',
                undefined,
                'https://test-firebase.com'
            );
            expect(mockClient.submitRequest).toHaveBeenCalledWith('pair', {
                status: 'pending',
                fcmToken: '',
                deviceName: 'External Integration',
            });
            expect(mockCreateQrCode).toHaveBeenCalledWith(
                'test-shared-secret',
                pairRequestId
            );
            expect(result.qrCode).toBe('lodgelock://pair/test-qr-data');
            expect(result.sharedSecret).toBe('test-shared-secret');
            expect(result.pairRequestId).toBe(pairRequestId);
        });

        it('should use default firebase URL when none provided', async () => {
            const pairRequestId = 'test-pair-request-id';
            mockClient.submitRequest.mockResolvedValue(pairRequestId);

            await generatePairingQR();

            expect(mockCreateClient).toHaveBeenCalledWith(
                'test-shared-secret',
                undefined,
                expect.stringContaining('firebase')
            );
        });
    });

    describe('waitForPairing', () => {
        it('should wait for pairing completion successfully', async () => {
            const pairingInfo = {
                sharedSecret: 'test-shared-secret' as any,
                qrCode: 'test-qr-code',
                pairRequestId: 'test-pair-request-id',
            };

            mockClient.pollUntil.mockResolvedValue({
                status: 'approved',
                fcmToken: 'test-fcm-token',
                deviceName: 'Test Device',
            });
            mockClient.deleteRequest.mockResolvedValue();

            const result = await waitForPairing(pairingInfo, 'https://test-firebase.com', 30);

            expect(mockCreateClient).toHaveBeenCalledWith(
                'test-shared-secret',
                undefined,
                'https://test-firebase.com'
            );
            expect(mockClient.pollUntil).toHaveBeenCalledWith(
                'test-pair-request-id',
                'pair',
                1000,
                30,
                expect.any(Function)
            );
            expect(mockClient.deleteRequest).toHaveBeenCalledWith(
                'test-pair-request-id'
            );
            expect(result.fcmToken).toBe('test-fcm-token');
            expect(result.deviceName).toBe('Test Device');
        });

        it('should use default timeout when none provided', async () => {
            const pairingInfo = {
                sharedSecret: 'test-shared-secret' as any,
                qrCode: 'test-qr-code',
                pairRequestId: 'test-pair-request-id',
            };

            mockClient.pollUntil.mockResolvedValue({
                status: 'approved',
                fcmToken: 'test-fcm-token',
                deviceName: 'Test Device',
            });
            mockClient.deleteRequest.mockResolvedValue();

            const result = await waitForPairing(pairingInfo);

            expect(mockClient.pollUntil).toHaveBeenCalledWith(
                'test-pair-request-id',
                'pair',
                1000,
                60,
                expect.any(Function)
            );
            expect(result.fcmToken).toBe('test-fcm-token');
            expect(result.deviceName).toBe('Test Device');
        });
    });

    describe('requestAccountCreation', () => {
        it('should request account creation successfully', async () => {
            const importRequestId = 'test-import-request-id';
            const sharedSecret = 'test-shared-secret' as any;

            mockClient.submitRequest.mockResolvedValue(importRequestId);
            mockClient.pollUntil.mockResolvedValue({
                status: 'approved',
                address: testAddress,
            });
            mockClient.deleteRequest.mockResolvedValue();

            const result = await requestAccountCreation(
                sharedSecret,
                'https://test-firebase.com',
                30
            );

            expect(mockCreateClient).toHaveBeenCalledWith(
                sharedSecret,
                undefined,
                'https://test-firebase.com'
            );
            expect(mockClient.submitRequest).toHaveBeenCalledWith('importAccount', {
                status: 'pending',
            });
            expect(mockClient.pollUntil).toHaveBeenCalledWith(
                importRequestId,
                'importAccount',
                1000,
                30,
                expect.any(Function)
            );
            expect(mockClient.deleteRequest).toHaveBeenCalledWith(importRequestId);
            expect(result).toBe(testAddress);
        });

        it('should throw error when account creation is rejected', async () => {
            const importRequestId = 'test-import-request-id';
            const sharedSecret = 'test-shared-secret' as any;

            mockClient.submitRequest.mockResolvedValue(importRequestId);
            mockClient.pollUntil.mockResolvedValue({
                status: 'rejected',
            });
            mockClient.deleteRequest.mockResolvedValue();

            await expect(
                requestAccountCreation(sharedSecret)
            ).rejects.toThrow('Account creation was rejected by user');
        });

        it('should throw error when no address is returned', async () => {
            const importRequestId = 'test-import-request-id';
            const sharedSecret = 'test-shared-secret' as any;

            mockClient.submitRequest.mockResolvedValue(importRequestId);
            mockClient.pollUntil.mockResolvedValue({
                status: 'approved',
            });
            mockClient.deleteRequest.mockResolvedValue();

            await expect(
                requestAccountCreation(sharedSecret)
            ).rejects.toThrow('No address returned from mobile device');
        });
    });

    describe('pairAndCreateAccount', () => {
        it('should complete full pairing and account creation flow', async () => {
            const pairRequestId = 'test-pair-request-id';
            const importRequestId = 'test-import-request-id';

            // Mock pairing flow
            mockClient.submitRequest
                .mockResolvedValueOnce(pairRequestId)
                .mockResolvedValueOnce(importRequestId);

            // Mock pairing completion
            mockClient.pollUntil
                .mockResolvedValueOnce({
                    status: 'approved',
                    fcmToken: 'test-fcm-token',
                    deviceName: 'Test Device',
                })
                // Mock account creation
                .mockResolvedValueOnce({
                    status: 'approved',
                    address: testAddress,
                });

            mockClient.deleteRequest.mockResolvedValue();

            const result = await pairAndCreateAccount('https://test-firebase.com', 30);

            expect(result.address).toBe(testAddress);
            expect(result.sharedSecret).toBe('test-shared-secret');
            expect(result.fcmToken).toBe('test-fcm-token');
            expect(result.deviceName).toBe('Test Device');
            expect(console.log).toHaveBeenCalledWith(
                'Scan this QR code with your Lodgelock mobile app:'
            );
            expect(console.log).toHaveBeenCalledWith('lodgelock://pair/test-qr-data');
        });

        it('should use default parameters when none provided', async () => {
            const pairRequestId = 'test-pair-request-id';
            const importRequestId = 'test-import-request-id';

            mockClient.submitRequest
                .mockResolvedValueOnce(pairRequestId)
                .mockResolvedValueOnce(importRequestId);

            mockClient.pollUntil
                .mockResolvedValueOnce({
                    status: 'approved',
                    fcmToken: 'test-fcm-token',
                    deviceName: 'Test Device',
                })
                .mockResolvedValueOnce({
                    status: 'approved',
                    address: testAddress,
                });

            mockClient.deleteRequest.mockResolvedValue();

            const result = await pairAndCreateAccount();

            expect(result.address).toBe(testAddress);
            expect(result.sharedSecret).toBe('test-shared-secret');
            expect(result.fcmToken).toBe('test-fcm-token');
            expect(result.deviceName).toBe('Test Device');
        });
    });
});