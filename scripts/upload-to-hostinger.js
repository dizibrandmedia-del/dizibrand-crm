import fs from 'fs';
import path from 'path';

const TUS_URL = 'https://srv2204-files.hstgr.io/rest/f83d5d6b6627c85a/api/tus/public_html';
const AUTH_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoxLCJsb2NhbGUiOiJlbl9VUyIsInZpZXdNb2RlIjoibGlzdCIsInNpbmdsZUNsaWNrIjpmYWxzZSwicmVkaXJlY3RBZnRlckNvcHlNb3ZlIjpmYWxzZSwicGVybSI6eyJhZG1pbiI6ZmFsc2UsImV4ZWN1dGUiOmZhbHNlLCJjcmVhdGUiOnRydWUsInJlbmFtZSI6dHJ1ZSwibW9kaWZ5Ijp0cnVlLCJkZWxldGUiOnRydWUsInNoYXJlIjpmYWxzZSwiZG93bmxvYWQiOnRydWV9LCJjb21tYW5kcyI6W10sImxvY2tQYXNzd29yZCI6dHJ1ZSwiaGlkZURvdGZpbGVzIjpmYWxzZSwiZGF0ZUZvcm1hdCI6ZmFsc2UsInVzZXJuYW1lIjoidTQ2ODE2MTMwMCIsImFjZUVkaXRvclRoZW1lIjoiIn0sImlzcyI6IkZpbGUgQnJvd3NlciIsImV4cCI6MTc4ODMyMjYxNiwiaWF0IjoxNzg4MzAxMDE2fQ.IXCIJz3WBkeSUlGttMc6TK6gbGcRmplAibSwYuX7gDg';
const REST_AUTH_KEY = 'e010c060a2d771cf8355f76e5ad6663732e14f2e3b57f94381c5194880699e27-f83d5d6b6627c85a';

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
  const files = [
    { local: 'dist/index.html', remote: 'crm/index.html' },
    { local: 'dist/assets/index-BocWq1HO.css', remote: 'crm/assets/index-BocWq1HO.css' },
    { local: 'dist/assets/index-BEktDRhs.js', remote: 'crm/assets/index-BEktDRhs.js' },
  ];

  for (const f of files) {
    if (fs.existsSync(f.local)) {
      await uploadFile(f.local, f.remote);
    }
  }

  // Upload .htaccess for SPA routing
  const htaccess = `<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>`;
  fs.writeFileSync('temp_htaccess', htaccess);
  await uploadFile('temp_htaccess', 'crm/.htaccess');
  if (fs.existsSync('temp_htaccess')) fs.unlinkSync('temp_htaccess');

  console.log('🎉 All files uploaded successfully to Hostinger crm.dizibrandmedia.com!');
}

run().catch(console.error);
