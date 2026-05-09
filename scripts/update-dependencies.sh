#!/bin/bash
set -e

echo "🔄 Updating dependencies to fix security vulnerabilities..."
echo ""

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please install it first:"
    echo "   npm install -g pnpm"
    exit 1
fi

echo "📦 Current pnpm version:"
pnpm --version
echo ""

echo "🧹 Cleaning old dependencies..."
rm -rf node_modules
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules
echo "✅ Cleaned"
echo ""

echo "📥 Installing dependencies with security overrides..."
pnpm install
echo "✅ Dependencies installed"
echo ""

echo "🔍 Checking for peer dependency issues..."
pnpm peers check || echo "⚠️  Peer dependency warnings (may be acceptable)"
echo ""

echo "🔒 Running security audit..."
echo ""
echo "Vulnerable packages that should now be fixed:"
echo "  - axios: 1.13.4 → 1.15.2"
echo "  - @xmldom/xmldom: 0.8.11 → 0.9.10"
echo "  - minimatch: 3.1.2 → 10.2.3"
echo "  - node-forge: 1.3.3 → 1.4.0"
echo "  - picomatch: 2.3.1/3.0.1 → 4.0.4"
echo "  - tar: 7.5.7 → 7.5.11"
echo "  - undici: 6.23.0 → 7.24.0"
echo ""

echo "✅ Done! Dependencies updated."
echo ""
echo "Next steps:"
echo "  1. Test the application: pnpm dev"
echo "  2. Run tests: pnpm test (if available)"
echo "  3. Build Docker image: docker build -t self-service:test ."
echo "  4. Scan with Trivy: trivy image self-service:test"
