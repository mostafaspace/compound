import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
  Text,
} from 'react-native';
import BootSplash from 'react-native-bootsplash';
import { colors } from '../../theme';

const { width } = Dimensions.get('window');

export const SplashScreen = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const logoFade = useRef(new Animated.Value(0)).current;
  const taglineFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered entrance animations
    Animated.sequence([
      // Phase 1: Logo scales in with spring
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 7,
          tension: 50,
          useNativeDriver: true,
        }),
      ]),
      // Phase 2: Logo fades in
      Animated.timing(logoFade, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      // Phase 3: Tagline fades in
      Animated.timing(taglineFade, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      {/* Subtle radial glow behind logo */}
      <View style={styles.glowOuter}>
        <View style={styles.glowInner} />
      </View>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Logo */}
        <Animated.View style={{ opacity: logoFade }}>
          <View style={styles.logoCard}>
            <Image
              source={require('../../assets/images/splash_logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Brand name */}
          <Text style={styles.brandName}>Compound</Text>
          <Text style={styles.tagline}>Smart Community Management</Text>
        </Animated.View>
      </Animated.View>

      {/* Bottom accent bar */}
      <Animated.View style={[styles.bottomBar, { opacity: taglineFade }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.dark,
  },
  // Radial glow effect
  glowOuter: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  glowInner: {
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: 'rgba(20, 184, 166, 0.04)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoCard: {
    width: width * 0.55,
    height: width * 0.55,
    borderRadius: width * 0.275,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#14B8A6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  logo: {
    width: '70%',
    height: '70%',
  },
  brandName: {
    marginTop: 32,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 2,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  tagline: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: 1.5,
    color: 'rgba(240, 253, 250, 0.5)',
    textAlign: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    start: 0,
    end: 0,
    height: 3,
    backgroundColor: colors.primary.dark,
    opacity: 0.6,
  },
});
