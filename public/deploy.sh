#!/bin/bash
CRM_DIR="/home/u468161300/domains/dizibrandmedia.com/public_html/crm"
ROOT_DIR="/home/u468161300/domains/dizibrandmedia.com/public_html"

mkdir -p "$CRM_DIR/assets"
mkdir -p "$ROOT_DIR/assets"

curl -sL https://dizibrand-crm.vercel.app/index.html -o "$CRM_DIR/index.html"
curl -sL https://dizibrand-crm.vercel.app/assets/index-D1hAVJSf.js -o "$CRM_DIR/assets/index-D1hAVJSf.js"
curl -sL https://dizibrand-crm.vercel.app/assets/index-BdReXX4Z.css -o "$CRM_DIR/assets/index-BdReXX4Z.css"

cp "$CRM_DIR/index.html" "$ROOT_DIR/index.html"
cp "$CRM_DIR/assets/index-D1hAVJSf.js" "$ROOT_DIR/assets/index-D1hAVJSf.js"
cp "$CRM_DIR/assets/index-BdReXX4Z.css" "$ROOT_DIR/assets/index-BdReXX4Z.css"

echo "SYNC_SUCCESS_$(date +%s)"
