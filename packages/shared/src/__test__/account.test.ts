import { LodgelockAccount } from '../account';
import { createClient } from '../client/index';
import type { Address, Hex } from 'viem';

// Mock the createClient function
jest.mock('../client/index');
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('LodgelockAccount', () => {
    let mockClient: any;
    let account: LodgelockAccount;
    const testAddress: Address = '0x1234567890abcdef1234567890abcdef12345678';
    const testSharedSecret = 'test-shared-secret' as any;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation(() => {});

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

        account = new LodgelockAccount({
            address: testAddress,
            sharedSecret: testSharedSecret,
            origin: 'test-origin',
            pollInterval: 100,
            pollTimeout: 5,
        });
    });

    describe('toViemAccount', () => {
        it('should create a viem LocalAccount with correct properties', () => {
            const viemAccount = account.toViemAccount();

            expect(viemAccount.address).toBe(testAddress);
            expect(viemAccount.type).toBe('local');
            expect(viemAccount.source).toBe('lodgelock');
            expect(typeof viemAccount.signMessage).toBe('function');
            expect(typeof viemAccount.signTransaction).toBe('function');
            expect(typeof viemAccount.signTypedData).toBe('function');
        });
    });

    describe('signMessage', () => {
        it('should sign a message successfully', async () => {
            const testMessage: Hex = '0x48656c6c6f20776f726c64';
            const testSignature: Hex = '0xsignature123';
            const requestId = 'test-request-id';

            mockClient.submitRequest.mockResolvedValue(requestId);
            mockClient.pollUntil.mockResolvedValue({
                status: 'approved',
                origin: 'test-origin',
                from: testAddress,
                message: testMessage,
                signature: testSignature,
            });
            mockClient.deleteRequest.mockResolvedValue();

            const viemAccount = account.toViemAccount();
            const result = await viemAccount.signMessage({ message: testMessage });

            expect(result).toBe(testSignature);
            expect(mockClient.submitRequest).toHaveBeenCalledWith('signPersonal', {
                status: 'pending',
                origin: 'test-origin',
                message: testMessage,
                from: testAddress,
            });
            expect(mockClient.pollUntil).toHaveBeenCalledWith(
                requestId,
                'signPersonal',
                100,
                5,
                expect.any(Function),
            );
            expect(mockClient.deleteRequest).toHaveBeenCalledWith(requestId);
        });

        it('should throw error when signing is rejected', async () => {
            const testMessage: Hex = '0x48656c6c6f20776f726c64';
            const requestId = 'test-request-id';

            mockClient.submitRequest.mockResolvedValue(requestId);
            mockClient.pollUntil.mockResolvedValue({
                status: 'rejected',
                origin: 'test-origin',
                from: testAddress,
                message: testMessage,
            });
            mockClient.deleteRequest.mockResolvedValue();

            const viemAccount = account.toViemAccount();

            await expect(
                viemAccount.signMessage({ message: testMessage })
            ).rejects.toThrow('Message signing was rejected by user');
        });

        it('should throw error when no signature is returned', async () => {
            const testMessage: Hex = '0x48656c6c6f20776f726c64';
            const requestId = 'test-request-id';

            mockClient.submitRequest.mockResolvedValue(requestId);
            mockClient.pollUntil.mockResolvedValue({
                status: 'approved',
                origin: 'test-origin',
                from: testAddress,
                message: testMessage,
            });
            mockClient.deleteRequest.mockResolvedValue();

            const viemAccount = account.toViemAccount();

            await expect(
                viemAccount.signMessage({ message: testMessage })
            ).rejects.toThrow('No signature returned from mobile device');
        });
    });

    describe('signTransaction', () => {
        it('should sign a transaction successfully', async () => {
            const testTransaction = {
                to: '0x1234567890abcdef1234567890abcdef12345678' as Address,
                value: 1000000000000000000n,
                gas: 21000n,
            };
            const testSigned: Hex = '0xsignedtransaction123';
            const requestId = 'test-request-id';

            mockClient.submitRequest.mockResolvedValue(requestId);
            mockClient.pollUntil.mockResolvedValue({
                status: 'approved',
                origin: 'test-origin',
                from: testAddress,
                transaction: '0xserialized',
                signed: testSigned,
            });
            mockClient.deleteRequest.mockResolvedValue();

            const viemAccount = account.toViemAccount();
            const result = await viemAccount.signTransaction(testTransaction);

            expect(result).toBe(testSigned);
            expect(mockClient.submitRequest).toHaveBeenCalledWith('signTransaction', {
                status: 'pending',
                origin: 'test-origin',
                from: testAddress,
                transaction: expect.any(String),
            });
        });

        it('should throw error when transaction signing is rejected', async () => {
            const testTransaction = {
                to: '0x1234567890abcdef1234567890abcdef12345678' as Address,
                value: 1000000000000000000n,
                gas: 21000n,
            };
            const requestId = 'test-request-id';

            mockClient.submitRequest.mockResolvedValue(requestId);
            mockClient.pollUntil.mockResolvedValue({
                status: 'rejected',
                origin: 'test-origin',
                from: testAddress,
                transaction: '0xserialized',
            });
            mockClient.deleteRequest.mockResolvedValue();

            const viemAccount = account.toViemAccount();

            await expect(
                viemAccount.signTransaction(testTransaction)
            ).rejects.toThrow('Transaction signing was rejected by user');
        });
    });

    describe('signTypedData', () => {
        it('should sign typed data successfully', async () => {
            const testTypedData = {
                domain: {
                    name: 'Test',
                    version: '1',
                    chainId: 1,
                    verifyingContract: '0x1234567890abcdef1234567890abcdef12345678' as Address,
                },
                types: {
                    EIP712Domain: [
                        { name: 'name', type: 'string' },
                        { name: 'version', type: 'string' },
                        { name: 'chainId', type: 'uint256' },
                        { name: 'verifyingContract', type: 'address' },
                    ],
                    Message: [{ name: 'content', type: 'string' }],
                },
                primaryType: 'Message' as const,
                message: {
                    content: 'Hello World',
                },
            };
            const testSignature: Hex = '0xsignature123';
            const requestId = 'test-request-id';

            mockClient.submitRequest.mockResolvedValue(requestId);
            mockClient.pollUntil.mockResolvedValue({
                status: 'approved',
                origin: 'test-origin',
                from: testAddress,
                data: testTypedData,
                signature: testSignature,
            });
            mockClient.deleteRequest.mockResolvedValue();

            const viemAccount = account.toViemAccount();
            const result = await viemAccount.signTypedData(testTypedData);

            expect(result).toBe(testSignature);
            expect(mockClient.submitRequest).toHaveBeenCalledWith('signTypedData', {
                status: 'pending',
                origin: 'test-origin',
                from: testAddress,
                data: testTypedData,
            });
        });

        it('should throw error when typed data signing is rejected', async () => {
            const testTypedData = {
                domain: {},
                types: {},
                primaryType: 'Message' as const,
                message: {},
            };
            const requestId = 'test-request-id';

            mockClient.submitRequest.mockResolvedValue(requestId);
            mockClient.pollUntil.mockResolvedValue({
                status: 'rejected',
                origin: 'test-origin',
                from: testAddress,
                data: testTypedData,
            });
            mockClient.deleteRequest.mockResolvedValue();

            const viemAccount = account.toViemAccount();

            await expect(
                viemAccount.signTypedData(testTypedData)
            ).rejects.toThrow('Typed data signing was rejected by user');
        });
    });

    describe('getters', () => {
        it('should return correct address', () => {
            expect(account.getAddress()).toBe(testAddress);
        });

        it('should return correct client', () => {
            expect(account.getClient()).toBe(mockClient);
        });
    });

    describe('constructor', () => {
        it('should create client with provided options', () => {
            expect(mockCreateClient).toHaveBeenCalledWith(
                testSharedSecret,
                undefined,
                expect.any(String)
            );
        });

        it('should create client with custom firebase URL', () => {
            new LodgelockAccount({
                address: testAddress,
                sharedSecret: testSharedSecret,
                firebaseUrl: 'https://custom.firebase.com',
            });

            expect(mockCreateClient).toHaveBeenCalledWith(
                testSharedSecret,
                undefined,
                'https://custom.firebase.com'
            );
        });

        it('should create client with FCM token', () => {
            new LodgelockAccount({
                address: testAddress,
                sharedSecret: testSharedSecret,
                fcmToken: 'test-fcm-token',
            });

            expect(mockCreateClient).toHaveBeenCalledWith(
                testSharedSecret,
                'test-fcm-token',
                expect.any(String)
            );
        });
    });
});