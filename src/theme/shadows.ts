import { Platform, type ViewStyle } from 'react-native';

/** Subtle card elevation — works on iOS (shadow*) and Android (elevation). */
export const cardShadow: ViewStyle =
  Platform.OS === 'android'
    ? {
        elevation: 3,
        shadowColor: '#0f172a',
      }
    : {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      };

export const headerShadow: ViewStyle =
  Platform.OS === 'android'
    ? {
        elevation: 2,
        shadowColor: '#0f172a',
      }
    : {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      };
