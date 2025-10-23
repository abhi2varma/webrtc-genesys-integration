#!/bin/bash

# ================================================
# WebRTC Genesys - Package Project Script
# Creates a distribution package
# ================================================

set -e

echo "================================================"
echo "WebRTC Genesys Integration - Packaging"
echo "================================================"
echo ""

# Configuration
PROJECT_NAME="webrtc-genesys-integration"
VERSION="1.0.0"
OUTPUT_DIR="dist"
PACKAGE_NAME="${PROJECT_NAME}-v${VERSION}"

echo "Project: $PROJECT_NAME"
echo "Version: $VERSION"
echo ""

# Create dist directory
mkdir -p "$OUTPUT_DIR"
rm -rf "$OUTPUT_DIR/$PACKAGE_NAME"
mkdir -p "$OUTPUT_DIR/$PACKAGE_NAME"

echo "Copying files..."

# Copy main files
cp server.js "$OUTPUT_DIR/$PACKAGE_NAME/"
cp server-https.js "$OUTPUT_DIR/$PACKAGE_NAME/"
cp package.json "$OUTPUT_DIR/$PACKAGE_NAME/"
cp .gitignore "$OUTPUT_DIR/$PACKAGE_NAME/"
cp LICENSE "$OUTPUT_DIR/$PACKAGE_NAME/"

# Copy documentation
cp README.md "$OUTPUT_DIR/$PACKAGE_NAME/"
cp QUICK_START.md "$OUTPUT_DIR/$PACKAGE_NAME/"
cp INSTALLATION.md "$OUTPUT_DIR/$PACKAGE_NAME/"
cp GENESYS_SETUP.md "$OUTPUT_DIR/$PACKAGE_NAME/"
cp DEPLOYMENT_INTERNET.md "$OUTPUT_DIR/$PACKAGE_NAME/"
cp TURN_SERVER_SETUP.md "$OUTPUT_DIR/$PACKAGE_NAME/"
cp PROJECT_STRUCTURE.md "$OUTPUT_DIR/$PACKAGE_NAME/"
cp CHANGELOG.md "$OUTPUT_DIR/$PACKAGE_NAME/"

# Copy configuration templates
cp .env.example "$OUTPUT_DIR/$PACKAGE_NAME/"
cp config.production.example "$OUTPUT_DIR/$PACKAGE_NAME/"

# Copy setup scripts
cp setup.bat "$OUTPUT_DIR/$PACKAGE_NAME/"
cp setup.sh "$OUTPUT_DIR/$PACKAGE_NAME/"
cp deploy.sh "$OUTPUT_DIR/$PACKAGE_NAME/"
chmod +x "$OUTPUT_DIR/$PACKAGE_NAME/setup.sh"
chmod +x "$OUTPUT_DIR/$PACKAGE_NAME/deploy.sh"

# Copy public directory
cp -r public "$OUTPUT_DIR/$PACKAGE_NAME/"

echo ""
echo "Files copied successfully!"
echo ""

# Create tarball
echo "Creating tarball..."
cd "$OUTPUT_DIR"
tar -czf "${PACKAGE_NAME}.tar.gz" "$PACKAGE_NAME"
cd ..

# Create ZIP (if zip is available)
if command -v zip &> /dev/null; then
    echo "Creating ZIP archive..."
    cd "$OUTPUT_DIR"
    zip -r "${PACKAGE_NAME}.zip" "$PACKAGE_NAME" > /dev/null
    cd ..
fi

echo ""
echo "================================================"
echo "Package created successfully!"
echo "================================================"
echo ""
echo "Packages created:"
echo "  - $OUTPUT_DIR/${PACKAGE_NAME}.tar.gz"
if [ -f "$OUTPUT_DIR/${PACKAGE_NAME}.zip" ]; then
    echo "  - $OUTPUT_DIR/${PACKAGE_NAME}.zip"
fi
echo ""

# Create checksums
echo "Creating checksums..."
cd "$OUTPUT_DIR"

# SHA256 for tarball
sha256sum "${PACKAGE_NAME}.tar.gz" > "${PACKAGE_NAME}.tar.gz.sha256"
echo "  ✓ ${PACKAGE_NAME}.tar.gz.sha256"

# SHA256 for ZIP if exists
if [ -f "${PACKAGE_NAME}.zip" ]; then
    sha256sum "${PACKAGE_NAME}.zip" > "${PACKAGE_NAME}.zip.sha256"
    echo "  ✓ ${PACKAGE_NAME}.zip.sha256"
fi

cd ..

echo ""
echo "Package contents:"
echo "  - Server files (server.js, server-https.js)"
echo "  - Client files (public/)"
echo "  - Complete documentation (*.md)"
echo "  - Setup scripts (setup.sh, deploy.sh)"
echo "  - Configuration templates (.env.example)"
echo ""
echo "Package is ready for distribution!"
echo ""

# Display package size
echo "Package size:"
du -h "$OUTPUT_DIR/${PACKAGE_NAME}.tar.gz"
if [ -f "$OUTPUT_DIR/${PACKAGE_NAME}.zip" ]; then
    du -h "$OUTPUT_DIR/${PACKAGE_NAME}.zip"
fi
echo ""

