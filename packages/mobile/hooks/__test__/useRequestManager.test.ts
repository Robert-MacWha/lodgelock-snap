import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useRequestManager } from '../useRequestManager';
import { Request, SharedSecret } from '@lodgelock/shared';
import { ClientInstance } from '../useClients';

// Mock dependencies
jest.mock('expo-router', () => ({
    router: { push: jest.fn() },
}));

import { router } from 'expo-router';
import { Address, Hex } from 'viem';

const mockRouter = router as jest.Mocked<typeof router>;

describe('useRequestManager', () => {
    const mockGetRequests = jest.fn();
    const mockUpdateRequest = jest.fn();

    const mockClient: ClientInstance = {
        id: 'test-client-id',
        name: 'Test Client',
        sharedSecret: [1, 2, 3, 4, 5] as SharedSecret,
        client: {
            roomId: 'test-room-id',
            submitRequest: jest.fn(),
            updateRequest: mockUpdateRequest,
            getRequest: jest.fn(),
            getRequests: mockGetRequests,
            deleteRequest: jest.fn(),
            pollUntil: jest.fn(),
        },
    };

    const mockRequest: Request = {
        id: 'test-request-id',
        lastUpdated: Date.now(),
        type: 'signPersonal',
        request: {
            status: 'pending',
            from: '0x123' as Address,
            message: '0xdeadbeef' as Hex,
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockGetRequests.mockResolvedValue([mockRequest]);
        mockUpdateRequest.mockResolvedValue(undefined);
    });

    it('should auto-navigate to new requests', async () => {
        const { result, unmount } = renderHook(() =>
            useRequestManager({
                clients: [mockClient],
                pollingInterval: 0,
            }),
        );
        const _ = result;

        await waitFor(() => {
            expect(mockRouter.push).toHaveBeenCalled();
        });

        expect(mockRouter.push).toHaveBeenCalledWith({
            pathname: '/_requests/signPersonal',
            params: {
                clientId: 'test-client-id',
                requestId: 'test-request-id',
            },
        });

        // Clean up any ongoing operations
        act(() => {
            unmount();
        });
    });

    it('should handle fetch errors gracefully', async () => {
        mockGetRequests.mockRejectedValue(new Error('Fetch failed'));

        const { result, unmount } = renderHook(() =>
            useRequestManager({
                clients: [mockClient],
                pollingInterval: 0,
            }),
        );

        await waitFor(() => {
            expect(result.current.clientRequests).toHaveLength(0);
        });

        act(() => {
            unmount();
        });
    });

    it('should handle empty clients gracefully', async () => {
        const { result, unmount } = renderHook(() =>
            useRequestManager({
                clients: [],
                pollingInterval: 0,
            }),
        );

        await waitFor(() => {
            expect(result.current.clientRequests).toHaveLength(0);
        });

        expect(mockGetRequests).not.toHaveBeenCalled();

        act(() => {
            unmount();
        });
    });

    it('should not redirect for pairing requests', async () => {
        const pairingRequest: Request = {
            id: 'pairing-request-id',
            lastUpdated: Date.now(),
            type: 'pair',
            request: {
                status: 'pending',
                fcmToken: '',
                deviceName: '',
            },
        };

        mockGetRequests.mockResolvedValue([pairingRequest]);

        const { result, unmount } = renderHook(() =>
            useRequestManager({
                clients: [mockClient],
                pollingInterval: 0,
            }),
        );

        await waitFor(() => {
            expect(result.current.clientRequests).toHaveLength(1);
        });

        expect(mockRouter.push).not.toHaveBeenCalled();

        act(() => {
            unmount();
        });
    });
});
