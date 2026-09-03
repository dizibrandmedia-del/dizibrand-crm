#!/bin/bash
CRM_DIR="/home/u468161300/domains/dizibrandmedia.com/public_html/crm"
ROOT_DIR="/home/u468161300/domains/dizibrandmedia.com/public_html"

mkdir -p "$CRM_DIR/assets"
mkdir -p "$ROOT_DIR/assets"

curl -sL https://dizibrand-crm.vercel.app/index.html -o "$CRM_DIR/index.html"
cp "$CRM_DIR/index.html" "$ROOT_DIR/index.html"

JS_FILE=$(grep -o 'assets/index-[^"]*\.js' "$CRM_DIR/index.html" | head -n 1)
CSS_FILE=$(grep -o 'assets/index-[^"]*\.css' "$CRM_DIR/index.html" | head -n 1)

if [ -n "$JS_FILE" ]; then
  curl -sL "https://dizibrand-crm.vercel.app/$JS_FILE" -o "$CRM_DIR/$JS_FILE"
  cp "$CRM_DIR/$JS_FILE" "$ROOT_DIR/$JS_FILE"
fi

if [ -n "$CSS_FILE" ]; then
  curl -sL "https://dizibrand-crm.vercel.app/$CSS_FILE" -o "$CRM_DIR/$CSS_FILE"
  cp "$CRM_DIR/$CSS_FILE" "$ROOT_DIR/$CSS_FILE"
fi

echo "DEPLOY_COMPLETE_$(date +%s)"
