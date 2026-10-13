import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from './ui';

export function IncompleteMaterial() {
  return <View style={style.notice}>
    <View style={style.icon}><Ionicons name="sparkles-outline" size={21} color="#98652C" /></View>
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={style.title}>Brak opracowania AI</Text>
      <Text style={style.body}>Pliki są zapisane. Dokończ odczyt, aby przygotować materiały do nauki.</Text>
    </View>
  </View>;
}
const style = StyleSheet.create({
  notice: { backgroundColor: '#FBF5E9', borderRadius: 16, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#F3E7CB', alignItems: 'center', justifyContent: 'center' },
  title: { color: C.ink, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  body: { color: '#806E53', fontSize: 13, lineHeight: 20 },
});
