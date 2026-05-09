#!/bin/bash
set -e

echo "🚀 Upgrading to Expo SDK 55..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must be run from repository root"
    exit 1
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please install it first:"
    echo "   npm install -g pnpm"
    exit 1
fi

echo "📦 Current versions:"
cd apps/self-service
echo "  Expo: $(node -p "require('./package.json').dependencies.expo")"
echo "  React Native: $(node -p "require('./package.json').dependencies['react-native']")"
echo "  React: $(node -p "require('./package.json').dependencies.react")"
echo ""

echo "⚠️  This will upgrade to:"
echo "  Expo: ^55.0.0"
echo "  React Native: 0.83.2"
echo "  All expo-* packages to SDK 55 versions"
echo ""

read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Upgrade cancelled"
    exit 1
fi

echo ""
echo "📥 Step 1: Upgrading Expo SDK..."
pnpm add expo@^55.0.0
echo "✅ Expo SDK upgraded"
echo ""

echo "📥 Step 2: Upgrading React Native..."
pnpm add react-native@0.83.2
echo "✅ React Native upgraded"
echo ""

echo "📥 Step 3: Upgrading all Expo packages..."
npx expo install --fix
echo "✅ Expo packages upgraded"
echo ""

echo "🔍 Step 4: Running Expo Doctor..."
npx expo-doctor || echo "⚠️  Expo Doctor found some issues (may be acceptable)"
echo ""

echo "📦 Step 5: Installing workspace dependencies..."
cd ../..
pnpm install
echo "✅ Workspace dependencies installed"
echo ""

echo "🎉 Upgrade complete!"
echo ""
echo "📋 Next steps:"
echo "  1. Review changes: git diff"
echo "  2. Test locally: cd apps/self-service && pnpm dev"
echo "  3. Check for errors in console"
echo "  4. Test all features (auth, API calls, navigation)"
echo "  5. Build Docker: docker build -t self-service:sdk55 ."
echo "  6. Commit changes: git add . && git commit -m 'chore: upgrade to Expo SDK 55'"
echo ""
echo "📚 See EXPO_SDK_55_UPGRADE.md for detailed information"
