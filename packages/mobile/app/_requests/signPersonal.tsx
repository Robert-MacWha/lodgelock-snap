import React from 'react';
import { View, Text, Button } from 'react-native';
import { useKeyringContext } from '../../contexts/KeyringContext';
import { useRequestHandler } from '../../hooks/useRequestHandler';
import { fromHex } from 'viem';

export default function SignPersonalScreen() {
    const { signPersonal } = useKeyringContext();
    const { request, loading, error, handleApprove, handleReject } = useRequestHandler({
        type: 'signPersonal',
        onApprove: async (request) => {
            const signature = await signPersonal(request.from, request.message);
            return { signature };
        },
    });

    if (loading) return <Text>Loading...</Text>;
    if (error) return <Text>Error: {error}</Text>;
    if (!request) return <Text>No request available</Text>;

    return (
        <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
            <Text style={{ fontSize: 24, marginBottom: 20 }}>Personal Sign</Text>
            <Text style={{ marginBottom: 30 }}>
                MetaMask is requesting to sign a text challenge. Do you approve?
            </Text>
            <Text>
                Message: {fromHex(request.message || '0x', 'string')}
            </Text>
            <Button title="Approve" onPress={() => { void handleApprove() }} />
            <Button title="Reject" onPress={() => { void handleReject() }} />
        </View>
    );
}