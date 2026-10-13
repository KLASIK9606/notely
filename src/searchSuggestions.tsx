import React from 'react';
import { Linking, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { SearchGrounding } from './api';

export function SearchSuggestions({ grounding }: { grounding: SearchGrounding }) {
  if (!grounding.searchSuggestions) return null;
  return <View style={{ width: '100%', height: 140, borderRadius: 12, overflow: 'hidden' }}>
    <WebView source={{ html: grounding.searchSuggestions }} originWhitelist={['*']} javaScriptEnabled={false} domStorageEnabled={false} scrollEnabled
      onShouldStartLoadWithRequest={request => {
        if (request.url === 'about:blank') return true;
        if (request.url.startsWith('https://')) void Linking.openURL(request.url);
        return false;
      }} />
  </View>;
}
