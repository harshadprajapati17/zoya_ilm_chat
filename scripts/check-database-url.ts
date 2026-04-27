import 'dotenv/config';

function maskPassword(urlString: string): string {
  try {
    const url = new URL(urlString);
    if (url.password) {
      url.password = '***';
    }
    return url.toString();
  } catch {
    return '[invalid url]';
  }
}

function validateDatabaseUrl(): number {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('DATABASE_URL is missing in environment.');
    console.error('Add it in your .env file and retry.');
    return 1;
  }

  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch (error) {
    console.error('DATABASE_URL is not a valid URL format.');
    console.error('Value:', maskPassword(databaseUrl));
    console.error('Parse error:', error);
    return 1;
  }

  const allowedProtocols = new Set(['postgres:', 'postgresql:']);
  if (!allowedProtocols.has(parsed.protocol)) {
    console.error(
      `DATABASE_URL must use postgres/postgresql protocol. Received: ${parsed.protocol}`
    );
    return 1;
  }

  if (!parsed.hostname) {
    console.error('DATABASE_URL is missing host.');
    return 1;
  }

  const databaseName = parsed.pathname.replace(/^\/+/, '');
  if (!databaseName) {
    console.error('DATABASE_URL is missing database name in path.');
    return 1;
  }

  console.log('DATABASE_URL format looks valid.');
  console.log(`Protocol: ${parsed.protocol.replace(':', '')}`);
  console.log(`Host: ${parsed.hostname}`);
  console.log(`Port: ${parsed.port || '5432 (default)'}`);
  console.log(`Database: ${databaseName}`);
  console.log(`User: ${parsed.username || '(not set)'}`);
  console.log(`SSL mode: ${parsed.searchParams.get('sslmode') || '(not set)'}`);
  console.log(`Masked URL: ${maskPassword(databaseUrl)}`);

  return 0;
}

process.exitCode = validateDatabaseUrl();
