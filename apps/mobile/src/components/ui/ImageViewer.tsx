import React, { useRef, useCallback } from 'react';
import {
  Modal,
  StyleSheet,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StatusBar,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Typography } from './Typography';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const DOUBLE_TAP_DELAY = 300;
const ZOOM_SCALE = 3;

interface ImageViewerProps {
  visible: boolean;
  uri: string;
  headers?: Record<string, string>;
  onClose: () => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ visible, uri, headers, onClose }) => {
  const scrollRef = useRef<ScrollView>(null);
  const lastTapRef = useRef(0);
  const currentScaleRef = useRef(1);

  const handleScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    currentScaleRef.current = e.nativeEvent.zoomScale;
  }, []);

  const handleDoubleTap = useCallback((evt: any) => {
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      if (currentScaleRef.current > 1) {
        scrollRef.current?.scrollResponderZoomTo({
          x: 0, y: 0, width: SCREEN_W, height: SCREEN_H,
          animated: true,
        });
      } else {
        const { locationX, locationY } = evt.nativeEvent;
        const zoomW = SCREEN_W / ZOOM_SCALE;
        const zoomH = SCREEN_H / ZOOM_SCALE;
        scrollRef.current?.scrollResponderZoomTo({
          x: locationX - zoomW / 2,
          y: locationY - zoomH / 2,
          width: zoomW,
          height: zoomH,
          animated: true,
        });
      }
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }, []);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Typography style={styles.closeText}>✕</Typography>
        </TouchableOpacity>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          maximumZoomScale={5}
          minimumZoomScale={1}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          centerContent
          bouncesZoom
          onScrollEndDrag={handleScrollEnd}
          onMomentumScrollEnd={handleScrollEnd}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={handleDoubleTap}
            style={styles.imageContainer}
          >
            <Image
              source={{ uri, headers }}
              style={styles.image}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    width: SCREEN_W,
    height: SCREEN_H * 0.8,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
