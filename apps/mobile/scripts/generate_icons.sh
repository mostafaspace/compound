#!/bin/bash

# Source image
SOURCE="/Users/mostafamagdy/.gemini/antigravity/brain/17f52940-5d05-4af8-8fcd-3e0db73b3ca8/media__1777189380649.jpg"

# iOS Paths
IOS_DIR="ios/Compound/Images.xcassets/AppIcon.appiconset"

# Android Paths
ANDROID_RES="android/app/src/main/res"

echo "🚀 Generating App Icons (Bash 3.2+ Compatibility Mode)..."

# Helper for iOS
generate_ios() {
    local size=$1
    local name=$2
    echo "Creating iOS: $name ($size x $size)"
    sips -s format png -z $size $size "$SOURCE" --out "$IOS_DIR/$name" > /dev/null
}

# iOS Icons
generate_ios 40 "icon-40.png"
generate_ios 60 "icon-60.png"
generate_ios 58 "icon-58.png"
generate_ios 87 "icon-87.png"
generate_ios 80 "icon-80.png"
generate_ios 120 "icon-120.png"
generate_ios 180 "icon-180.png"
generate_ios 20 "icon-20.png"
generate_ios 29 "icon-29.png"
generate_ios 76 "icon-76.png"
generate_ios 152 "icon-152.png"
generate_ios 167 "icon-167.png"
generate_ios 1024 "icon-1024.png"

# Helper for Android
generate_android() {
    local density=$1
    local size=$2
    echo "Creating Android: $density ($size x $size)"
    mkdir -p "$ANDROID_RES/mipmap-$density"
    sips -s format png -z $size $size "$SOURCE" --out "$ANDROID_RES/mipmap-$density/ic_launcher.png" > /dev/null
    sips -s format png -z $size $size "$SOURCE" --out "$ANDROID_RES/mipmap-$density/ic_launcher_round.png" > /dev/null
}

# Android Icons
generate_android "mdpi" 48
generate_android "hdpi" 72
generate_android "xhdpi" 96
generate_android "xxhdpi" 144
generate_android "xxxhdpi" 192

# Create iOS Contents.json
cat <<EOF > "$IOS_DIR/Contents.json"
{
  "images": [
    { "size": "20x20", "idiom": "iphone", "filename": "icon-40.png", "scale": "2x" },
    { "size": "20x20", "idiom": "iphone", "filename": "icon-60.png", "scale": "3x" },
    { "size": "29x29", "idiom": "iphone", "filename": "icon-29.png", "scale": "1x" },
    { "size": "29x29", "idiom": "iphone", "filename": "icon-58.png", "scale": "2x" },
    { "size": "29x29", "idiom": "iphone", "filename": "icon-87.png", "scale": "3x" },
    { "size": "40x40", "idiom": "iphone", "filename": "icon-80.png", "scale": "2x" },
    { "size": "40x40", "idiom": "iphone", "filename": "icon-120.png", "scale": "3x" },
    { "size": "60x60", "idiom": "iphone", "filename": "icon-120.png", "scale": "2x" },
    { "size": "60x60", "idiom": "iphone", "filename": "icon-180.png", "scale": "3x" },
    { "size": "20x20", "idiom": "ipad", "filename": "icon-20.png", "scale": "1x" },
    { "size": "20x20", "idiom": "ipad", "filename": "icon-40.png", "scale": "2x" },
    { "size": "29x29", "idiom": "ipad", "filename": "icon-29.png", "scale": "1x" },
    { "size": "29x29", "idiom": "ipad", "filename": "icon-58.png", "scale": "2x" },
    { "size": "40x40", "idiom": "ipad", "filename": "icon-40.png", "scale": "1x" },
    { "size": "40x40", "idiom": "ipad", "filename": "icon-80.png", "scale": "2x" },
    { "size": "76x76", "idiom": "ipad", "filename": "icon-76.png", "scale": "1x" },
    { "size": "76x76", "idiom": "ipad", "filename": "icon-152.png", "scale": "2x" },
    { "size": "83.5x83.5", "idiom": "ipad", "filename": "icon-167.png", "scale": "2x" },
    { "size": "1024x1024", "idiom": "ios-marketing", "filename": "icon-1024.png", "scale": "1x" }
  ],
  "info": { "version": 1, "author": "xcode" }
}
EOF

echo "✅ App Icons generated successfully!"
