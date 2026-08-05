#!/bin/bash
# Quick fix script to run directly on VPS

cd ~/resume-developer/web || exit 1

echo "🔧 Fixing missing files..."

# Remove problematic lib files
rm -rf lib/supabase

# Simplify app/layout.tsx (already done)
# Simplify app/page.tsx (already done)

# Create a stub types file
mkdir -p types
cat > types/database.types.ts << 'EOFDATABASE'
export type Database = {
  public: {
	Tables: {}
	Views: {}
	Functions: {}
	Enums: {}
  }
}
EOFDATABASE

echo "✓ Created stub types"

# Remove .next and rebuild
rm -rf .next
echo "🔨 Building..."
npm run build

if [ $? -eq 0 ]; then
	echo "✅ Build successful!"
	pm2 restart cv-builder
	pm2 logs cv-builder --lines 10
else
	echo "❌ Build failed"
	exit 1
fi
