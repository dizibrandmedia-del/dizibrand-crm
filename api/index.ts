export default async function handler(req: any, res: any) {
  try {
    const appMod = await import('../server/app.js');
    const app = appMod.default || appMod.app;
    return app(req, res);
  } catch (err: any) {
    console.error('Vercel API bootstrap error:', err);
    return res.status(500).json({
      error: err.message,
      stack: err.stack,
      nodeVersion: process.version,
      env: {
        isVercel: process.env.VERCEL,
        cwd: process.cwd(),
      },
    });
  }
}
