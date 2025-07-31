import React, { useState, createContext, useContext, ReactNode } from 'react';
import { Dialog, Portal, Button, Text } from 'react-native-paper';

interface AlertButton {
    text: string;
    style?: 'default' | 'cancel' | 'destructive';
    onPress?: () => void;
}

interface AlertOptions {
    title: string;
    message?: string | undefined;
    buttons?: AlertButton[];
}

interface AlertContextType {
    alert: (title: string, message?: string, buttons?: AlertButton[]) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
    const [visible, setVisible] = useState(false);
    const [alertData, setAlertData] = useState<AlertOptions>({
        title: '',
        message: '',
        buttons: []
    });

    const alert = (title: string, message?: string, buttons?: AlertButton[]) => {
        setAlertData({
            title,
            message,
            buttons: buttons || [{ text: 'OK', style: 'default' }]
        });
        setVisible(true);
    };

    const handleButtonPress = (button: AlertButton) => {
        setVisible(false);
        if (button.onPress) {
            button.onPress();
        }
    };

    const getButtonMode = (style: AlertButton['style']) => {
        switch (style) {
            case 'destructive':
                return 'contained';
            case 'cancel':
                return 'outlined';
            default:
                return 'text';
        }
    };

    const getButtonColor = (style: AlertButton['style']) => {
        switch (style) {
            case 'destructive':
                return 'error';
            default:
                return undefined;
        }
    };

    return (
        <AlertContext.Provider value={{ alert }}>
            {children}
            <Portal>
                <Dialog visible={visible} onDismiss={() => setVisible(false)}>
                    <Dialog.Title>{alertData.title}</Dialog.Title>
                    {alertData.message && (
                        <Dialog.Content>
                            <Text variant="bodyMedium">{alertData.message}</Text>
                        </Dialog.Content>
                    )}
                    <Dialog.Actions>
                        {alertData.buttons?.map((button, index) => {
                            const buttonColor = getButtonColor(button.style);
                            return (
                                <Button
                                    key={index}
                                    mode={getButtonMode(button.style)}
                                    {...(buttonColor && { buttonColor })}
                                    onPress={() => handleButtonPress(button)}
                                >
                                    {button.text}
                                </Button>
                            )
                        })}
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </AlertContext.Provider>
    );
}

export function useAlert() {
    const context = useContext(AlertContext);
    if (!context) {
        throw new Error('useAlert must be used within an AlertProvider');
    }
    return context;
}