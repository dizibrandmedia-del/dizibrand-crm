import fs from 'fs';
import path from 'path';

const TUS_URL = 'https://srv2204-files.hstgr.io/rest/d9834190293baf03/api/tus';
const AUTH_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoxLCJsb2NhbGUiOiJlbl9VUyIsInZpZXdNb2RlIjoibGlzdCIsInNpbmdsZUNsaWNrIjpmYWxzZSwicmVkaXJlY3RBZnRlckNvcHlNb3ZlIjpmYWxzZSwicGVybSI6eyJhZG1pbiI6ZmFsc2UsImV4ZWN1dGUiOmZhbHNlLCJjcmVhdGUiOnRydWUsInJlbmFtZSI6dHJ1ZSwibW9kaWZ5Ijp0cnVlLCJkZWxldGUiOnRydWUsInNoYXJlIjpmYWxzZSwiZG93bmxvYWQiOnRydWV9LCJjb21tYW5kcyI6W10sImxvY2tQYXNzd29yZCI6dHJ1ZSwiaGlkZURvdGZpbGVzIjpmYWxzZSwiZGF0ZUZvcm1hdCI6ZmFsc2UsInVzZXJuYW1lIjoidTQ2ODE2MTMwMCIsImFjZUVkaXRvclRoZW1lIjoiIn0sImlzcyI6IkZpbGUgQnJvd3NlciIsImV4cCI6MTc4ODM1MTIxMCwiaWF0IjoxNzg4MzI5NjEwfQ.v7eTlaPeM88rOzxqFh2-ADpvvVGFvzWZ4o-D62JN6D8';
const REST_AUTH_KEY = 'd14e9ccec180b7ff2c653ac3f8cc1e4d4ff170c161b2bb4fd5bb4374132117aa-d9834190293baf03';

async function uploadFile(localPath, remotePath) {
  const content = fs.readFileSync(localPath);
  const size = content.length;
  const targetUrl = `${TUS_URL}/${remotePath}?override=true`;

  console.log(`Uploading ${remotePath} (${size} bytes)...`);

  const initRes = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'X-Auth': AUTH_KEY,
      'X-Auth-Rest': REST_AUTH_KEY,
      'Tus-Resumable': '1.0.0',
      'Upload-Length': String(size),
      'Upload-Offset': '0',
    },
  });

  if (initRes.status !== 201 && initRes.status !== 200 && initRes.status !== 204) {
    console.error(`Init failed ${remotePath}:`, initRes.status, await initRes.text());
    return false;
  }

  const patchRes = await fetch(targetUrl, {
    method: 'PATCH',
    headers: {
      'X-Auth': AUTH_KEY,
      'X-Auth-Rest': REST_AUTH_KEY,
      'Tus-Resumable': '1.0.0',
      'Content-Type': 'application/offset+octet-stream',
      'Upload-Offset': '0',
    },
    body: content,
  });

  console.log(`Uploaded ${remotePath}: Status ${patchRes.status}`);
  return patchRes.status === 204 || patchRes.status === 200;
}

async function run() {
  console.log('--- Uploading to crm.dizibrandmedia.com root document ---');
  await uploadFile('dist/index.html', 'index.html');

  const assetFiles = fs.readdirSync('dist/assets');
  for (const file of assetFiles) {
    await uploadFile(`dist/assets/${file}`, `assets/${file}`);
  }

  // Also upload DirectoryIndex .htaccess that prioritizes index.html
  const htaccess = `DirectoryIndex index.html index.php
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>`;
  fs.writeFileSync('temp_htaccess', htaccess);
  await uploadFile('temp_htaccess', '.htaccess');
  if (fs.existsSync('temp_htaccess')) fs.unlinkSync('temp_htaccess');

  // Also copy to crm/ folder just in case
  console.log('--- Also syncing crm/ subfolder ---');
  await uploadFile('dist/index.html', 'crm/index.html');
  for (const file of assetFiles) {
    await uploadFile(`dist/assets/${file}`, `crm/assets/${file}`);
  }

  console.log('🎉 Deploy to Hostinger crm.dizibrandmedia.com completed!');
}

run().catch(console.error);
