import React, { createContext, forwardRef, useContext, useState } from 'react';
import {
  StyleSheet,
  Platform,
  Text as NativeText,
  TextInput as NativeTextInput,
  TextProps,
  TextInputProps,
  TextStyle,
} from 'react-native';
import { isLoaded, useFonts } from 'expo-font';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { C } from './theme';

const fonts = { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold };
const WeightContext = createContext<TextStyle['fontWeight']>('400');

export function useInterFonts() {
  return useFonts(fonts);
}

function fontStyle(weight: TextStyle['fontWeight']): TextStyle {
  const numericWeight = weight === 'bold' ? 700 : Number(weight) || 400;
  const family =
    numericWeight >= 700
      ? 'Inter_700Bold'
      : numericWeight >= 600
        ? 'Inter_600SemiBold'
        : numericWeight >= 500
          ? 'Inter_500Medium'
          : 'Inter_400Regular';
  // Static faces work consistently in Expo Go; avoid synthetic bold on Android.
  return isLoaded(family) ? { fontFamily: family, fontWeight: 'normal' } : { fontWeight: weight };
}

export const Text = forwardRef<NativeText, TextProps>(function Text({ style, ...props }, ref) {
  const inheritedWeight = useContext(WeightContext);
  const weight = StyleSheet.flatten(style)?.fontWeight ?? inheritedWeight;
  return (
    <WeightContext.Provider value={weight}>
      <NativeText ref={ref} {...props} style={[style, fontStyle(weight)]} />
    </WeightContext.Provider>
  );
});

export const TextInput = forwardRef<NativeTextInput, TextInputProps>(function TextInput(
  { style, placeholderTextColor = C.muted, onFocus, onBlur, ...props },
  ref,
) {
  const weight = StyleSheet.flatten(style)?.fontWeight ?? '400';
  const [focused, setFocused] = useState(false);
  const hasBorder = Number(StyleSheet.flatten(style)?.borderWidth) > 0;
  return (
    <NativeTextInput
      ref={ref}
      {...props}
      underlineColorAndroid={props.underlineColorAndroid ?? 'transparent'}
      placeholderTextColor={placeholderTextColor}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      style={[
        style,
        fontStyle(weight),
        focused && hasBorder && { borderColor: C.primary },
        Platform.OS === 'web' && {
          outlineWidth: focused ? 2 : 0,
          outlineColor: '#DED6F5',
          outlineStyle: 'solid',
          outlineOffset: 2,
        },
      ]}
    />
  );
});
