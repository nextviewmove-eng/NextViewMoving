import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import DocumentTemplate from '../src/models/DocumentTemplate.js';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_SCRIPT_PATH = path.join(SCRIPT_DIR, 'updateDocumentTemplates.js');
const BACKEND_ENV_PATH = path.join(SCRIPT_DIR, '..', '.env');

const REQUIRED_KEYS = ['DOCUMENT_1', 'DOCUMENT_2', 'DOCUMENT_3', 'DOCUMENT_4', 'DOCUMENT_5'];
const PROTECTED_KEYS = ['TEST_DOCUMENT'];
const REQUIRED_PLACEHOLDERS = [
  '{{customer.fullName}}',
  '{{customer.phone}}',
  '{{moveDetails.movingFrom}}',
  '{{moveDetails.movingTo}}',
];
const EXPECTED_HEADER = [
  'CUSTOMER',
  '{{customer.fullName}}',
  '{{customer.phone}}',
  '',
  'MOVING FROM',
  '{{moveDetails.movingFrom}}',
  '',
  'MOVING TO',
  '{{moveDetails.movingTo}}',
].join('\n');
const BLOCKED_DATABASE_NAMES = ['test'];
const BLOCKED_HOST_FRAGMENTS = ['r8eafq8'];
const URI_ENV_VAR = 'CLIENT_MONGO_URI';
const EXPECTED_DB_ENV_VAR = 'CLIENT_DB_NAME';
const GUARDED_COLLECTIONS = ['admins', 'leads', 'leaddocuments', 'notes', 'followups'];
const ALLOWED_DEFINITION_KEYS = ['key', 'id', 'name', 'description', 'content'];
const ALLOWED_INTERPOLATIONS = ['HEADER'];
const SERVER_SELECTION_TIMEOUT_MS = 10000;

const USAGE = [
  'Usage:',
  '  node scripts/initializeClientDatabase.js --uri "<mongodb+srv://...>" --expect-db <databaseName> [--apply]',
  '',
  'Options:',
  '  --uri <uri>        Target MongoDB URI, including the database name.',
  '                     Required unless the ' + URI_ENV_VAR + ' environment variable is set.',
  '                     The process.env.MONGO_URI value is never used as a fallback.',
  '                     Credentials may be given raw or percent-encoded; they are normalised',
  '                     before the connection is opened.',
  '  --expect-db <name> Database name that the target URI must resolve to. Required for --apply.',
  '                     The comparison is case-sensitive and must match exactly.',
  '                     Can also be supplied through the ' + EXPECTED_DB_ENV_VAR + ' environment variable.',
  '  --apply            Perform the insert. Without this flag the script runs read-only in dry-run mode.',
  '  --help             Show this message.',
  '',
  'Environment variables:',
  '  ' + URI_ENV_VAR + '          Alternative to --uri (--uri wins).',
  '  ' + EXPECTED_DB_ENV_VAR + '        Alternative to --expect-db (--expect-db wins).',
  '',
  'Examples:',
  '  node scripts/initializeClientDatabase.js --uri "mongodb+srv://user:pass@client-cluster.mongodb.net/clientdb" --expect-db clientdb',
  '  node scripts/initializeClientDatabase.js --uri "mongodb+srv://user:pass@client-cluster.mongodb.net/clientdb" --expect-db clientdb --apply',
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

const resolveExpectedDb = (options) => options.expectedDb || process.env[EXPECTED_DB_ENV_VAR] || null;

const parseHost = (entry) => {
  if (entry.startsWith('[')) {
    const closing = entry.indexOf(']');
    return closing === -1 ? entry : entry.slice(0, closing + 1);
  }
  const colon = entry.indexOf(':');
  return colon === -1 ? entry : entry.slice(0, colon);
};

const parseMongoUri = (uri) => {
  const schemeMatch = /^(mongodb\+srv|mongodb):\/\//i.exec(uri);
  if (!schemeMatch) {
    throw new Error('Target URI must start with mongodb:// or mongodb+srv://');
  }

  const scheme = schemeMatch[1].toLowerCase();
  let remainder = uri.slice(schemeMatch[0].length);

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

  const password = credentials && credentials.includes(':') ? credentials.slice(credentials.indexOf(':') + 1) : null;
  const username = credentials === null ? null : credentials.includes(':') ? credentials.slice(0, credentials.indexOf(':')) : credentials;

  return { scheme, hosts, databaseName, credentials, password, username, hostPart, path, query, raw: uri };
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

// The operator supplies the URI as one string. The credentials in that string may be
// raw (not percent-encoded), which makes the driver read URI delimiters such as '@',
// ':', '/', '?' or '#' as part of the URI instead of as password characters, and the
// server then rejects the login. The credentials are therefore normalised (decoded
// first, so an already encoded value is not double encoded) before the connection
// URI is built. Every safety check keeps using the original, unmodified URI.
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

const redact = (text, uri, additionalUris = []) => {
  if (text === null || text === undefined) return '';
  let output = String(text);
  const parsed = parseMongoUri(uri);

  const secrets = [parsed.credentials, parsed.password];
  if (parsed.username !== null) secrets.push(encodeCredential(parsed.username));
  if (parsed.password) secrets.push(encodeCredential(parsed.password));

  for (const secret of secrets) {
    if (!secret) continue;
    output = output.split(secret).join('[redacted-credentials]');
    try {
      const decoded = decodeURIComponent(secret);
      if (decoded !== secret) output = output.split(decoded).join('[redacted-credentials]');
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
        throw new Error('The target host "' + host + '" belongs to the existing cluster. Aborting.');
      }
    }
  }

  assertNotExistingTarget(parsed, connected);
};

const skipWhitespace = (source, index) => {
  let position = index;

  while (position < source.length) {
    const character = source[position];
    if (character === ' ' || character === '\n' || character === '\r' || character === '\t') {
      position += 1;
      continue;
    }
    if (character === '/' && source[position + 1] === '/') {
      const lineEnd = source.indexOf('\n', position);
      position = lineEnd === -1 ? source.length : lineEnd;
      continue;
    }
    if (character === '/' && source[position + 1] === '*') {
      const blockEnd = source.indexOf('*/', position + 2);
      position = blockEnd === -1 ? source.length : blockEnd + 2;
      continue;
    }
    break;
  }

  return position;
};

const readIdentifier = (source, index) => {
  let position = index;
  while (position < source.length && /[A-Za-z0-9_$]/.test(source[position])) position += 1;
  if (position === index) {
    throw new Error('Expected a property name in the template definitions');
  }
  return { value: source.slice(index, position), end: position };
};

const readStringLiteral = (source, index) => {
  const quote = source[index];
  if (quote !== "'" && quote !== '"') {
    throw new Error('Expected a quoted string in the template definitions');
  }

  let position = index + 1;
  let value = '';

  while (position < source.length) {
    const character = source[position];

    if (character === '\\') {
      const escaped = source[position + 1];
      if (escaped === 'n') value += '\n';
      else if (escaped === 't') value += '\t';
      else if (escaped === 'r') value += '\r';
      else value += escaped;
      position += 2;
      continue;
    }

    if (character === quote) return { value, end: position + 1 };

    value += character;
    position += 1;
  }

  throw new Error('Unterminated string in the template definitions');
};

const readTemplateLiteral = (source, index, headerText) => {
  if (source[index] !== '`') {
    throw new Error('Expected a template literal in the template definitions');
  }

  let position = index + 1;
  let value = '';

  while (position < source.length) {
    const character = source[position];

    if (character === '\\') {
      const escaped = source[position + 1];
      if (escaped === 'n') value += '\n';
      else if (escaped === 't') value += '\t';
      else if (escaped === 'r') value += '\r';
      else value += escaped;
      position += 2;
      continue;
    }

    if (character === '`') return { value, end: position + 1 };

    if (character === '$' && source[position + 1] === '{') {
      const closingIndex = source.indexOf('}', position + 2);
      if (closingIndex === -1) {
        throw new Error('Unterminated interpolation in the template definitions');
      }
      const expression = source.slice(position + 2, closingIndex).trim();

      if (headerText === null) {
        throw new Error('The HEADER literal must not contain interpolations');
      }
      if (!ALLOWED_INTERPOLATIONS.includes(expression)) {
        throw new Error(
          'Unexpected interpolation "' + expression + '" in the template definitions. Only ' +
            ALLOWED_INTERPOLATIONS.join(', ') + ' is allowed.'
        );
      }

      value += headerText;
      position = closingIndex + 1;
      continue;
    }

    value += character;
    position += 1;
  }

  throw new Error('Unterminated template literal in the template definitions');
};

const parseDefinitionObject = (source, index, headerText) => {
  let position = skipWhitespace(source, index);
  if (source[position] !== '{') {
    throw new Error('Expected an object in the template definitions');
  }
  position += 1;

  const definition = {};

  while (true) {
    position = skipWhitespace(source, position);

    if (source[position] === '}') {
      position += 1;
      break;
    }

    const key = readIdentifier(source, position);
    if (!ALLOWED_DEFINITION_KEYS.includes(key.value)) {
      throw new Error(
        'Unexpected property "' + key.value + '" in the template definitions. Allowed properties: ' +
          ALLOWED_DEFINITION_KEYS.join(', ')
      );
    }
    if (Object.prototype.hasOwnProperty.call(definition, key.value)) {
      throw new Error('Duplicate property "' + key.value + '" in the template definitions');
    }

    position = skipWhitespace(source, key.end);
    if (source[position] !== ':') {
      throw new Error('Expected ":" after property "' + key.value + '"');
    }
    position = skipWhitespace(source, position + 1);

    let value;
    if (source[position] === "'" || source[position] === '"') {
      const read = readStringLiteral(source, position);
      value = read.value;
      position = read.end;
    } else if (source[position] === '`') {
      const read = readTemplateLiteral(source, position, headerText);
      value = read.value;
      position = read.end;
    } else {
      throw new Error(
        'Only string values are allowed in the template definitions. Property "' + key.value + '" has an unexpected value.'
      );
    }

    definition[key.value] = value;

    position = skipWhitespace(source, position);
    if (source[position] === ',') {
      position += 1;
      continue;
    }
    if (source[position] === '}') {
      position += 1;
      break;
    }
    throw new Error('Expected "," or "}" in the template definitions');
  }

  return { definition, end: position };
};

const parseDefinitionsArray = (source, index, headerText) => {
  let position = skipWhitespace(source, index);
  if (source[position] !== '[') {
    throw new Error('Expected an array in the template definitions');
  }
  position += 1;

  const definitions = [];

  while (true) {
    position = skipWhitespace(source, position);

    if (source[position] === ']') {
      position += 1;
      break;
    }

    const parsed = parseDefinitionObject(source, position, headerText);
    definitions.push(parsed.definition);
    position = skipWhitespace(source, parsed.end);

    if (source[position] === ',') {
      position += 1;
      continue;
    }
    if (source[position] === ']') {
      position += 1;
      break;
    }
    throw new Error('Expected "," or "]" in the template definitions');
  }

  return { definitions, end: position };
};

const readTemplateDefinitions = () => {
  if (!fs.existsSync(SOURCE_SCRIPT_PATH)) {
    throw new Error('Source script not found: ' + SOURCE_SCRIPT_PATH);
  }

  const source = fs.readFileSync(SOURCE_SCRIPT_PATH, 'utf8');

  const headerMarker = 'const HEADER = `';
  const headerIndex = source.indexOf(headerMarker);
  if (headerIndex === -1) {
    throw new Error('Could not find "const HEADER = `" in ' + SOURCE_SCRIPT_PATH);
  }
  const header = readTemplateLiteral(source, headerIndex + headerMarker.length - 1, null);

  const templatesMarker = 'const TEMPLATES = [';
  const templatesIndex = source.indexOf(templatesMarker);
  if (templatesIndex === -1) {
    throw new Error('Could not find "const TEMPLATES = [" in ' + SOURCE_SCRIPT_PATH);
  }
  const parsed = parseDefinitionsArray(source, templatesIndex + templatesMarker.length - 1, header.value);

  return { definitions: parsed.definitions, headerText: header.value };
};

const validateDefinitions = (definitions) => {
  if (!Array.isArray(definitions)) {
    throw new Error('The extracted template definitions are not an array');
  }
  if (definitions.length !== REQUIRED_KEYS.length) {
    throw new Error('Expected exactly ' + REQUIRED_KEYS.length + ' template definitions, found ' + definitions.length);
  }

  const keys = definitions.map((definition) => definition.key);
  for (const key of REQUIRED_KEYS) {
    if (!keys.includes(key)) {
      throw new Error('The extracted definitions are missing template "' + key + '"');
    }
  }
  for (const key of PROTECTED_KEYS) {
    if (keys.includes(key)) {
      throw new Error('Refusing to initialise protected template "' + key + '"');
    }
  }

  for (const definition of definitions) {
    if (typeof definition.name !== 'string' || definition.name.trim() === '') {
      throw new Error('Template "' + definition.key + '" has no name');
    }
    if (definition.name.length > 120) {
      throw new Error('Template "' + definition.key + '" has a name longer than 120 characters');
    }
    if (typeof definition.description !== 'string' || definition.description.trim() === '') {
      throw new Error('Template "' + definition.key + '" has no description');
    }
    if (definition.description.length > 500) {
      throw new Error('Template "' + definition.key + '" has a description longer than 500 characters');
    }
    if (typeof definition.content !== 'string' || definition.content.trim() === '') {
      throw new Error('Template "' + definition.key + '" has no content');
    }
    if (!definition.content.startsWith(EXPECTED_HEADER)) {
      throw new Error('Template "' + definition.key + '" does not start with the expected customer header');
    }
    for (const placeholder of REQUIRED_PLACEHOLDERS) {
      if (!definition.content.includes(placeholder)) {
        throw new Error('Template "' + definition.key + '" is missing placeholder ' + placeholder);
      }
    }
    if (definition.content.includes('\u2610')) {
      throw new Error('Template "' + definition.key + '" contains a character that PDFKit cannot render');
    }
  }
};

const buildInsertDocuments = (definitions) =>
  definitions.map((definition) => ({
    key: definition.key,
    name: definition.name,
    description: definition.description,
    content: definition.content,
    isActive: true,
  }));

const readTemplatesRaw = async () => {
  const cursor = await mongoose.connection.db.collection('documenttemplates').find({}).toArray();
  return cursor.map((document) => ({
    _id: document._id,
    key: document.key,
    name: document.name,
    isActive: document.isActive,
  }));
};

const inspectTarget = async () => {
  const listed = await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray();
  const collectionNames = listed.map((entry) => entry.name);
  const counts = {};
  const present = {};

  for (const name of GUARDED_COLLECTIONS) {
    present[name] = collectionNames.includes(name);
    // countDocuments is an exact read. It returns 0 for a missing collection and
    // does not create the collection.
    counts[name] = await mongoose.connection.db.collection(name).countDocuments({});
  }

  const templates = await readTemplatesRaw();
  return { counts, present, templates };
};

const isTransactionUnsupported = (error) => {
  const message = String(error?.message || '');

  if (/transaction numbers are only allowed/i.test(message)) return true;
  if (/transactions are not supported/i.test(message)) return true;
  if (/does not support transactions/i.test(message)) return true;
  if (/transaction support is not enabled/i.test(message)) return true;
  if (error?.code === 20 && /transaction/i.test(message) && /(not supported|not allowed|unsupported)/i.test(message)) {
    return true;
  }

  return false;
};

const insertTemplates = async (documents) => {
  const session = await mongoose.startSession();
  let mode = 'transaction';

  try {
    let inserted;
    await session.withTransaction(async () => {
      inserted = await DocumentTemplate.insertMany(documents, {
        session,
        ordered: true,
        runValidators: true,
      });
    });
    return { mode, inserted };
  } catch (error) {
    if (!isTransactionUnsupported(error)) throw error;
    mode = 'no-transaction';
  } finally {
    await session.endSession();
  }

  const existingKeys = (await readTemplatesRaw()).map((document) => document.key);
  const conflicting = existingKeys.filter((key) => REQUIRED_KEYS.includes(key));
  if (conflicting.length > 0) {
    throw new Error('Template keys already exist in the target database: ' + conflicting.join(', '));
  }

  const inserted = await DocumentTemplate.insertMany(documents, { ordered: true, runValidators: true });
  return { mode, inserted };
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
    fail('The target URI must include a database name, for example "mongodb+srv://user:pass@cluster.mongodb.net/clientdb".');
    return;
  }

  console.log('=== NextViewMove client database initializer ===');
  console.log('Target cluster host(s): ' + parsed.hosts.join(', '));
  console.log('Target database: ' + parsed.databaseName);
  console.log('Source of template definitions: ' + SOURCE_SCRIPT_PATH);
  console.log('');

  try {
    assertSafeTarget(parsed, null);
  } catch (error) {
    fail(error.message);
    return;
  }

  const expectedDb = resolveExpectedDb(options);
  if (expectedDb && expectedDb !== parsed.databaseName) {
    fail(
      'The target URI points at database "' + parsed.databaseName + '" but "' + expectedDb +
        '" was expected. The comparison is case-sensitive.'
    );
    return;
  }

  if (options.apply && !expectedDb) {
    fail('The target database name must be confirmed with --expect-db <name> (or ' + EXPECTED_DB_ENV_VAR + ') before --apply can be used.');
    return;
  }

  let definitions;
  try {
    const extracted = readTemplateDefinitions();
    validateDefinitions(extracted.definitions);
    definitions = extracted.definitions;
  } catch (error) {
    fail(error.message);
    return;
  }

  console.log('Templates to initialise (' + definitions.length + '):');
  for (const definition of definitions) {
    console.log(
      '  - ' + definition.key + ' | "' + definition.name + '" | content ' + definition.content.length + ' chars'
    );
  }
  console.log('Protected templates skipped: ' + PROTECTED_KEYS.join(', '));
  console.log('');

  if (!options.apply) {
    console.log('DRY RUN: no --apply flag was supplied.');
    console.log('No database connection was opened and no write was attempted.');
    console.log('Re-run with --apply (and --expect-db ' + (expectedDb || '<databaseName>') + ') to perform the insert.');
    return;
  }

  console.log('Connecting to the target database (read/write session starts here)...');
  try {
    await mongoose.connect(connectionUri, { serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS });
  } catch (error) {
    fail('Could not connect to the target database: ' + redact(error.message, uri, [connectionUri]));
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

    if (connected.databaseName !== parsed.databaseName) {
      fail('Connected to database "' + connected.databaseName + '" but the target URI requested "' + parsed.databaseName + '".');
      return;
    }

    if (expectedDb && connected.databaseName !== expectedDb) {
      fail('Connected to database "' + connected.databaseName + '" but "' + expectedDb + '" was expected.');
      return;
    }

    console.log('Connected to host: ' + connected.host);
    console.log('Connected database: ' + connected.databaseName);
    console.log('');

    const before = await inspectTarget();
    console.log('Existing state in the target database:');
    console.log('  documenttemplates: ' + before.templates.length + ' document(s)');
    for (const name of GUARDED_COLLECTIONS) {
      console.log(
        '  ' + name + ': ' + before.counts[name] + ' document(s)' +
          (before.present[name] ? '' : ' (collection does not exist yet)')
      );
    }

    const conflicting = before.templates
      .map((template) => template.key)
      .filter((key) => REQUIRED_KEYS.includes(key));

    if (conflicting.length > 0) {
      fail(
        'The target database already contains these template keys (' +
          conflicting.join(', ') +
          '). Nothing was written. Existing templates are never overwritten.'
      );
      return;
    }

    const guardedWithData = GUARDED_COLLECTIONS.filter((name) => before.counts[name] > 0);
    if (guardedWithData.length > 0) {
      fail(
        'The target database is not empty. These protected collections already contain documents: ' +
          guardedWithData.join(', ') +
          '. Nothing was written.'
      );
      return;
    }

    const protectedExisting = before.templates.filter((template) => PROTECTED_KEYS.includes(template.key));
    if (protectedExisting.length > 0) {
      console.log('Note: protected template keys already present and left untouched: ' + protectedExisting.map((t) => t.key).join(', '));
    }

    console.log('');
    console.log('Inserting ' + definitions.length + ' template(s)...');

    const documents = buildInsertDocuments(definitions);
    let result;
    try {
      result = await insertTemplates(documents);
    } catch (error) {
      fail('Insert failed: ' + redact(error.message, uri, [connectionUri]));
      const afterFailure = await readTemplatesRaw();
      const written = afterFailure.map((document) => document.key).filter((key) => REQUIRED_KEYS.includes(key));
      const driverInserted = error?.result?.insertedCount ?? error?.insertedDocs?.length ?? null;

      console.error('Templates present in the target database after the failure: ' + (written.length > 0 ? written.join(', ') : 'none'));
      if (driverInserted !== null) {
        console.error('The driver reported ' + driverInserted + ' document(s) inserted before the failure.');
      }
      if (written.length > 0 && written.length < definitions.length) {
        console.error(
          'PARTIAL INSERT: ' + written.length + ' of ' + definitions.length +
            ' templates were written. No records were deleted. Review the target database manually before re-running.'
        );
      }
      return;
    }

    const after = await inspectTarget();
    const written = after.templates.filter((template) => REQUIRED_KEYS.includes(template.key));

    console.log('Insert mode: ' + result.mode);
    console.log('Templates written: ' + written.length + ' of ' + definitions.length);
    for (const template of written) {
      console.log('  - ' + template.key + ' -> id ' + template._id.toString());
    }

    const missing = REQUIRED_KEYS.filter((key) => !written.some((template) => template.key === key));
    if (missing.length > 0) {
      fail('Partial insert detected. Missing templates: ' + missing.join(', '));
      return;
    }

    const sourceIds = definitions.map((definition) => definition.id).filter(Boolean);
    const reusedOldIds = written.filter((template) => sourceIds.includes(template._id.toString()));
    if (reusedOldIds.length > 0) {
      fail('Unexpected result: an old MongoDB id was reused. Review the target database manually.');
      return;
    }

    console.log('');
    console.log('Success: DOCUMENT_1 through DOCUMENT_5 were initialised in the target database.');
    console.log('No other collection was written. No admin account was created. TEST_DOCUMENT was not touched.');
  } catch (error) {
    fail('Unexpected failure: ' + redact(error.message, uri, [connectionUri]));
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
};

main();
