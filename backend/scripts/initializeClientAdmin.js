import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import Admin from '../src/models/Admin.js';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ENV_PATH = path.join(SCRIPT_DIR, '..', '.env');

// The client database this script may ever write to. The comparison is case-sensitive.
const EXPECTED_DATABASE_NAME = 'nextviewmove_db_user';
const BLOCKED_DATABASE_NAMES = ['test'];
const BLOCKED_HOST_FRAGMENTS = ['r8eafq8'];
const REQUIRED_HOST_SUFFIX = '.mongodb.net';

const URI_ENV_VAR = 'CLIENT_MONGO_URI';
const EMAIL_ENV_VAR = 'CLIENT_ADMIN_EMAIL';
const PASSWORD_ENV_VAR = 'CLIENT_ADMIN_PASSWORD';
const NAME_ENV_VAR = 'CLIENT_ADMIN_NAME';
const DEFAULT_ADMIN_NAME = 'NextViewMove Admin';

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$/;
const SERVER_SELECTION_TIMEOUT_MS = 10000;

const USAGE = [
  'Usage:',
  '  node scripts/initializeClientAdmin.js --uri "<mongodb+srv://...>" --expect-db nextviewmove_db_user [--apply]',
  '',
  'Creates the initial NextViewMove admin account in the client database.',
  '',
  'Options:',
  '  --uri <uri>        Target MongoDB URI including the database name.',
  '                     Required unless the ' + URI_ENV_VAR + ' environment variable is set.',
  '                     process.env.MONGO_URI is never used as a fallback.',
  '                     Credentials may be given raw or percent-encoded; they are normalised',
  '                     before the connection is opened.',
  '  --expect-db <name> Must be "' + EXPECTED_DATABASE_NAME + '". The comparison is case-sensitive.',
  '  --apply            Perform the insert. Without this flag the script runs read-only in dry-run mode',
  '                     and never opens a database connection.',
  '  --help             Show this message.',
  '',
  'Environment variables (the admin credentials are only ever read from here):',
  '  ' + EMAIL_ENV_VAR + '    Required. Email address of the admin account.',
  '  ' + PASSWORD_ENV_VAR + ' Required. Password of the admin account, at least ' + MIN_PASSWORD_LENGTH + ' characters.',
  '                     It is hashed with bcrypt by the Admin model and is never printed.',
  '  ' + NAME_ENV_VAR + '      Optional display name. Defaults to "' + DEFAULT_ADMIN_NAME + '".',
  '',
  'Safety rules:',
  '  - The target database must be exactly "' + EXPECTED_DATABASE_NAME + '".',
  '  - The existing cluster (host fragment "' + BLOCKED_HOST_FRAGMENTS[0] + '") and the database "' +
    BLOCKED_DATABASE_NAMES[0] + '" are rejected.',
  '  - The target host must not be the cluster in process.env.MONGO_URI or in backend/.env.',
  '  - Nothing is written when an admin account with the same email already exists.',
  '',
  'PowerShell example (keeps the password out of the command line):',
  '  $env:' + EMAIL_ENV_VAR + ' = "admin@example.com"',
  '  $env:' + PASSWORD_ENV_VAR + ' = [System.Net.NetworkCredential]::new("", (Read-Host -AsSecureString)).Password',
  '  $env:' + URI_ENV_VAR + ' = "mongodb+srv://user:password@cluster.mongodb.net/' + EXPECTED_DATABASE_NAME + '"',
  '  node scripts/initializeClientAdmin.js --expect-db ' + EXPECTED_DATABASE_NAME + ' --apply',
];

const fail = (message) => {
  console.error('ABORTED: ' + message);
  process.exitCode = 1;
};

const parseArguments = (argv) => {
  const options = { uri: null, expectedDb: null, apply: false, help: false };
  const supported = new Set(['--uri', '--expect-db', '--apply', '--help']);

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const separatorIndex = argument.indexOf('=');
    const flag = separatorIndex === -1 ? argument : argument.slice(0, separatorIndex);
    const inlineValue = separatorIndex === -1 ? null : argument.slice(separatorIndex + 1);

    if (!supported.has(flag)) {
      throw new Error('Unknown argument "' + argument + '".\n\n' + USAGE.join('\n'));
    }

    if (flag === '--apply' || flag === '--help') {
      if (inlineValue !== null) {
        throw new Error('The ' + flag + ' flag does not accept a value.');
      }
      if (flag === '--apply') options.apply = true;
      else options.help = true;
      continue;
    }

    let value = inlineValue;
    if (value === null) {
      value = argv[index + 1];
      if (value === undefined || value.startsWith('--')) {
        throw new Error('The ' + flag + ' flag requires a value.');
      }
      index += 1;
    }

    if (value.trim() === '') {
      throw new Error('The ' + flag + ' flag requires a non-empty value.');
    }

    if (flag === '--uri') options.uri = value.trim();
    else options.expectedDb = value.trim();
  }

  return options;
};

const resolveTargetUri = (options) => {
  if (options.uri !== null) {
    return options.uri;
  }

  const fromEnvironment = process.env[URI_ENV_VAR];
  if (fromEnvironment === undefined || fromEnvironment === null) {
    throw new Error(
      'No target MongoDB URI was supplied. Pass --uri "<uri>" or set the ' + URI_ENV_VAR +
        ' environment variable. process.env.MONGO_URI is never used as a fallback.'
    );
  }
  if (fromEnvironment.trim() === '') {
    throw new Error('The ' + URI_ENV_VAR + ' environment variable is empty or whitespace only.');
  }

  return fromEnvironment.trim();
};

const parseHost = (entry) => {
  if (entry.startsWith('[')) {
    const closing = entry.indexOf(']');
    return closing === -1 ? entry : entry.slice(0, closing + 1);
  }
  const colon = entry.indexOf(':');
  return colon === -1 ? entry : entry.slice(0, colon);
};

const parseMongoUri = (uri) => {
  const trimmed = uri.trim();
  const schemeMatch = /^mongodb(\+srv)?:\/\//i.exec(trimmed);
  if (!schemeMatch) {
    throw new Error('Target URI must start with mongodb:// or mongodb+srv://');
  }

  const scheme = schemeMatch[1] ? 'mongodb+srv' : 'mongodb';
  let remainder = trimmed.slice(schemeMatch[0].length);

  const queryIndex = remainder.indexOf('?');
  const query = queryIndex === -1 ? '' : remainder.slice(queryIndex);
  remainder = queryIndex === -1 ? remainder : remainder.slice(0, queryIndex);

  const slashIndex = remainder.lastIndexOf('/');
  const authority = slashIndex === -1 ? remainder : remainder.slice(0, slashIndex);
  const path = slashIndex === -1 ? '' : remainder.slice(slashIndex + 1);

  const atIndex = authority.lastIndexOf('@');
  const credentials = atIndex === -1 ? null : authority.slice(0, atIndex);
  const hostPart = atIndex === -1 ? authority : authority.slice(atIndex + 1);

  const hosts = hostPart
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map(parseHost);

  if (hosts.length === 0) {
    throw new Error('Target URI does not contain a host');
  }

  let databaseName = path;
  try {
    databaseName = decodeURIComponent(path);
  } catch {
    databaseName = path;
  }
  databaseName = databaseName.trim();

  const separatorIndex = credentials === null ? -1 : credentials.indexOf(':');
  const username = credentials === null ? null : separatorIndex === -1 ? credentials : credentials.slice(0, separatorIndex);
  const password = credentials === null ? null : separatorIndex === -1 ? '' : credentials.slice(separatorIndex + 1);

  return { scheme, hosts, databaseName, credentials, username, password, hostPart, path, query, raw: trimmed };
};

const encodeCredential = (value) => {
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    decoded = value;
  }
  return encodeURIComponent(decoded);
};

// The operator supplies the URI as one string. Credentials in that string may be raw
// (not percent-encoded), which makes the driver read URI delimiters such as '@', ':',
// '/', '?' or '#' as part of the URI instead of as password characters, and the server
// then rejects the login with "bad auth". The credentials are therefore normalised
// (decoded first, so an already encoded value is not double encoded) before the
// connection URI is built. Every safety check keeps using the original URI.
const buildConnectionUri = (parsed) => {
  if (!parsed.credentials) {
    return parsed.raw;
  }

  const separatorIndex = parsed.credentials.indexOf(':');
  const username = separatorIndex === -1 ? parsed.credentials : parsed.credentials.slice(0, separatorIndex);
  const password = separatorIndex === -1 ? '' : parsed.credentials.slice(separatorIndex + 1);

  const authority = encodeCredential(username) + (separatorIndex === -1 ? '' : ':' + encodeCredential(password));

  return parsed.scheme + '://' + authority + '@' + parsed.hostPart + '/' + parsed.path + parsed.query;
};

const redact = (text, uri, additionalUris = [], secrets = []) => {
  if (text === null || text === undefined) return '';
  let output = String(text);

  const parsed = parseMongoUri(uri);
  const masked = [parsed.credentials, parsed.password];
  if (parsed.username !== null) masked.push(encodeCredential(parsed.username));
  if (parsed.password) masked.push(encodeCredential(parsed.password));

  for (const secret of [...masked, ...secrets]) {
    if (!secret) continue;
    output = output.split(secret).join('[redacted]');
    try {
      const decoded = decodeURIComponent(secret);
      if (decoded !== secret) output = output.split(decoded).join('[redacted]');
    } catch {
      // The secret is not percent-encoded, nothing else to redact.
    }
  }

  for (const candidate of [uri, ...additionalUris]) {
    if (!candidate) continue;
    output = output.split(candidate).join('[redacted-uri]');
  }

  return output;
};

const hostsOverlap = (left, right) => {
  const leftHosts = left.filter(Boolean).map((host) => host.toLowerCase());
  const rightHosts = right.filter(Boolean).map((host) => host.toLowerCase());
  return leftHosts.some((host) => rightHosts.includes(host));
};

const readBackendEnvMongoUri = () => {
  try {
    if (!fs.existsSync(BACKEND_ENV_PATH)) return null;
    const contents = fs.readFileSync(BACKEND_ENV_PATH, 'utf8');

    for (const rawLine of contents.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line.startsWith('MONGO_URI')) continue;
      const equalsIndex = line.indexOf('=');
      if (equalsIndex === -1) continue;
      if (line.slice(0, equalsIndex).trim() !== 'MONGO_URI') continue;

      let value = line.slice(equalsIndex + 1).trim();
      if (value.length >= 2 && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))) {
        value = value.slice(1, -1);
      }
      return value.trim() || null;
    }
  } catch {
    return null;
  }

  return null;
};

// The existing cluster is only ever compared against, never used as a connection target.
const assertNotExistingTarget = (target, connected) => {
  const targetHosts = [...target.hosts, ...(connected ? [connected.host] : [])].filter(Boolean);

  const environmentUri = process.env.MONGO_URI;
  if (environmentUri) {
    let parsedEnvironment = null;
    try {
      parsedEnvironment = parseMongoUri(environmentUri);
    } catch {
      parsedEnvironment = null;
    }
    if (parsedEnvironment && hostsOverlap(targetHosts, parsedEnvironment.hosts)) {
      throw new Error('The target host matches the cluster in process.env.MONGO_URI. Aborting.');
    }
  }

  const backendUri = readBackendEnvMongoUri();
  if (backendUri) {
    let parsedBackend = null;
    try {
      parsedBackend = parseMongoUri(backendUri);
    } catch {
      parsedBackend = null;
    }
    if (parsedBackend && hostsOverlap(targetHosts, parsedBackend.hosts)) {
      throw new Error('The target host matches the cluster recorded in backend/.env (MONGO_URI). Aborting.');
    }
  }
};

const assertSafeTarget = (parsed, connected) => {
  const databaseNames = [parsed.databaseName, connected ? connected.databaseName : null]
    .filter(Boolean)
    .map((name) => name.toLowerCase());

  for (const name of databaseNames) {
    if (BLOCKED_DATABASE_NAMES.includes(name)) {
      throw new Error('The target database "' + name + '" is a protected database name. Aborting.');
    }
  }

  const hosts = [...parsed.hosts, ...(connected ? [connected.host] : [])].filter(Boolean).map((host) => host.toLowerCase());
  for (const host of hosts) {
    for (const fragment of BLOCKED_HOST_FRAGMENTS) {
      if (host.includes(fragment)) {
        throw new Error('The target host "' + host + '" belongs to the existing NextViewMove cluster. Aborting.');
      }
    }
    if (!host.endsWith(REQUIRED_HOST_SUFFIX)) {
      throw new Error(
        'The target host "' + host + '" is not a MongoDB Atlas host (expected a name ending in "' +
          REQUIRED_HOST_SUFFIX + '"). Aborting.'
      );
    }
  }

  assertNotExistingTarget(parsed, connected);
};

const resolveAdminCredentials = () => {
  const rawEmail = process.env[EMAIL_ENV_VAR];
  const rawPassword = process.env[PASSWORD_ENV_VAR];
  const rawName = process.env[NAME_ENV_VAR];

  // The Admin model lowercases the address on save, so the lookup uses the same form.
  const email = (rawEmail === undefined || rawEmail === null ? '' : rawEmail).trim().toLowerCase();
  const password = rawPassword === undefined || rawPassword === null ? '' : rawPassword;
  const name = (rawName === undefined || rawName === null ? '' : rawName).trim() || DEFAULT_ADMIN_NAME;

  if (email === '') {
    throw new Error('No admin email was supplied. Set the ' + EMAIL_ENV_VAR + ' environment variable.');
  }
  if (!EMAIL_PATTERN.test(email)) {
    throw new Error('The value of ' + EMAIL_ENV_VAR + ' is not a valid email address.');
  }
  if (password === '') {
    throw new Error('No admin password was supplied. Set the ' + PASSWORD_ENV_VAR + ' environment variable.');
  }
  if (password.trim() === '') {
    throw new Error('The value of ' + PASSWORD_ENV_VAR + ' is empty or whitespace only.');
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      'The value of ' + PASSWORD_ENV_VAR + ' must be at least ' + MIN_PASSWORD_LENGTH +
        ' characters long, which is the minimum enforced by the Admin model.'
    );
  }

  return { email, password, name };
};

const main = async () => {
  let options;
  try {
    options = parseArguments(process.argv.slice(2));
  } catch (error) {
    fail(error.message);
    return;
  }

  if (options.help) {
    console.log(USAGE.join('\n'));
    return;
  }

  let uri;
  let parsed;
  let connectionUri;
  try {
    uri = resolveTargetUri(options);
    parsed = parseMongoUri(uri);
    connectionUri = buildConnectionUri(parsed);
  } catch (error) {
    fail(error.message);
    return;
  }

  if (!parsed.databaseName) {
    fail(
      'The target URI must include a database name, for example "mongodb+srv://user:pass@cluster.mongodb.net/' +
        EXPECTED_DATABASE_NAME + '".'
    );
    return;
  }

  try {
    assertSafeTarget(parsed, null);
  } catch (error) {
    fail(error.message);
    return;
  }

  if (parsed.databaseName !== EXPECTED_DATABASE_NAME) {
    fail(
      'The target URI points at database "' + parsed.databaseName + '" but "' + EXPECTED_DATABASE_NAME +
        '" is required. The comparison is case-sensitive.'
    );
    return;
  }

  if (options.expectedDb !== null && options.expectedDb !== EXPECTED_DATABASE_NAME) {
    fail('--expect-db must be "' + EXPECTED_DATABASE_NAME + '". The comparison is case-sensitive.');
    return;
  }

  let credentials;
  try {
    credentials = resolveAdminCredentials();
  } catch (error) {
    fail(error.message);
    return;
  }

  console.log('=== NextViewMove client admin initializer ===');
  console.log('Target cluster host(s): ' + parsed.hosts.join(', '));
  console.log('Target database: ' + parsed.databaseName);
  console.log('Admin email: ' + credentials.email);
  console.log('Admin name: ' + credentials.name);
  console.log('Admin role: admin');
  console.log('');

  if (!options.apply) {
    console.log('DRY RUN: no --apply flag was supplied.');
    console.log('No database connection was opened and no account was created.');
    console.log('Re-run with --apply to create the admin account.');
    return;
  }

  console.log('Connecting to the target database...');
  try {
    await mongoose.connect(connectionUri, { serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS });
  } catch (error) {
    fail('Could not connect to the target database: ' + redact(error.message, uri, [connectionUri], [credentials.password]));
    return;
  }

  try {
    const connected = {
      host: mongoose.connection.host,
      databaseName: mongoose.connection.name,
      uri: connectionUri,
    };

    try {
      assertSafeTarget(parsed, connected);
    } catch (error) {
      fail(error.message);
      return;
    }

    if (connected.databaseName !== EXPECTED_DATABASE_NAME) {
      fail('Connected to database "' + connected.databaseName + '" but "' + EXPECTED_DATABASE_NAME + '" is required.');
      return;
    }

    console.log('Connected to host: ' + connected.host);
    console.log('Connected database: ' + connected.databaseName);
    console.log('');

    // Makes sure the unique index on the email address exists before anything is written.
    await Admin.init();

    const existing = await Admin.findOne({ email: credentials.email });
    if (existing) {
      fail(
        'An admin account with the email "' + credentials.email + '" already exists in the target database. ' +
          'Nothing was created and no record was modified.'
      );
      return;
    }

    const totalAdmins = await Admin.countDocuments({});
    if (totalAdmins > 0) {
      fail(
        'The target database already contains ' + totalAdmins + ' admin account(s). This script only creates the ' +
          'initial admin. Nothing was created and no record was modified.'
      );
      return;
    }

    console.log('Creating the admin account...');

    try {
      await Admin.create({
        name: credentials.name,
        email: credentials.email,
        password: credentials.password,
        role: 'admin',
        isActive: true,
      });
    } catch (error) {
      if (error && error.code === 11000) {
        fail(
          'An admin account with the email "' + credentials.email + '" already exists (duplicate key). ' +
            'Nothing was created.'
        );
        return;
      }
      fail('The admin account could not be created: ' + redact(error.message, uri, [connectionUri], [credentials.password]));
      return;
    }

    const stored = await Admin.findOne({ email: credentials.email }).select('+password');
    if (!stored) {
      fail('The admin account was created but could not be read back. Review the target database manually.');
      return;
    }
    if (stored.password === credentials.password) {
      fail('The stored password is not hashed. Review the target database manually.');
      return;
    }
    if (!BCRYPT_HASH_PATTERN.test(stored.password)) {
      fail('The stored password is not a bcrypt hash. Review the target database manually.');
      return;
    }
    const passwordMatches = await stored.comparePassword(credentials.password);
    if (!passwordMatches) {
      fail('The stored password does not match the supplied password. Review the target database manually.');
      return;
    }

    console.log('');
    console.log('Admin created: ' + stored.email + ' (name: ' + stored.name + ', role: ' + stored.role + ', id: ' + stored._id.toString() + ')');
    console.log('Password storage: bcrypt hash, verified against the supplied password.');
    console.log('Admin accounts in the target database: ' + (await Admin.countDocuments({})));
    console.log('No other record was created or modified.');
  } catch (error) {
    fail('Unexpected failure: ' + redact(error.message, uri, [connectionUri], [credentials.password]));
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
};

main();
