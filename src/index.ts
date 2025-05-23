import 'dotenv/config';
import {config} from 'dotenv';

import cron from 'node-cron';
import {append, cwd, list, inspect, remove, appendAsync} from 'fs-jetpack';
import {join} from 'path';
import clientPool from './mongoPool';
import {Db, MongoClient} from 'mongodb';
import {dbs, RETENTION_DAYS} from './constant';

config({
  path: [`.env.${process.env.NODE_ENV}`, '.env'],
});

const LOG_FILE = process.env.LOG_FILE || 'backup.log';
const BACKUP_DIR = process.env.BACKUP_DIR || 'backup';
const env = process.env.NODE_ENV || 'development';
const retentionPeriod =
  env === 'development' ? 2 * 60 * 1000 : RETENTION_DAYS * 24 * 60 * 60 * 1000;
const interval = env === 'development' ? '*/2 * * * *' : '0 2 * * *';

async function storeDocuments(
  db: Db,
  colName: string,
  batchSize: number,
  backupPath: string
) {
  let page = 0;
  let cnt = 0;

  const total = await db.collection(colName).countDocuments({});
  while (cnt < total) {
    const documents = await db
      .collection(colName)
      .find({})
      .limit(batchSize ?? 500)
      .skip(page * batchSize)
      .toArray();

    if (documents.length === 0) break; // Exit if no more documents

    await appendAsync(
      backupPath,
      '\n' + documents.map(doc => JSON.stringify(doc)).join('\n')
    );

    cnt += documents.length;
    page++;
  }
  return `${cnt} documents backed up from ${total} documents in ${colName}`;
}

async function* getCollections(client: MongoClient) {
  const collections = await client.db().listCollections().toArray();
  for (const collection of collections) {
    yield collection;
  }
}

async function backupDatabase(dbName: string) {
  const client = await clientPool[dbName];
  try {
    for await (const collection of getCollections(client)) {
      const colName = collection.name;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${dbName}_${colName}-${timestamp}.json`;
      const backupPath = getPath(join(BACKUP_DIR, filename));
      try {
        const result = await storeDocuments(
          client.db(),
          colName,
          200,
          backupPath
        );
        append(
          getPath(LOG_FILE),
          `[${new Date().toISOString()}] Collection: ${colName} Backup completed: ${backupPath} ${result}\n`
        );
      } catch (error) {
        if (error instanceof Error) {
          append(
            getPath(LOG_FILE),
            `[${new Date().toISOString()}] Collection: ${colName} Error: ${error.message}\n`
          );
        } else {
          append(
            getPath(LOG_FILE),
            `[${new Date().toISOString()}] Collection: ${colName} Error: ${error}\n`
          );
        }
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      append(
        getPath(LOG_FILE),
        `[${new Date().toISOString()}] dbName: ${dbName} General Error: ${error.message}\n`
      );
    } else {
      append(
        getPath(LOG_FILE),
        `[${new Date().toISOString()}] dbName: ${dbName} General Error: ${error}\n`
      );
    }
  } finally {
    console.log(`Db: ${dbName} Backup completed!`);
    append(
      getPath(LOG_FILE),
      `[${new Date().toISOString()}] Db: ${dbName} Backup completed!\n`
    );
  }
}

function getPath(path: string) {
  if (process.env.NODE_ENV === 'development') {
    return join(cwd(), path);
  } else {
    return path;
  }
}

async function createBackup() {
  console.log('Creating backup...');
  try {
    for (let index = 0; index < dbs.length; index++) {
      const dbName = dbs[index];
      await backupDatabase(dbName);
    }
  } catch (error) {
    if (error instanceof Error) {
      append(
        getPath(LOG_FILE),
        `[${new Date().toISOString()}] Error: ${error.message}\n`
      );
    } else {
      append(
        getPath(LOG_FILE),
        `[${new Date().toISOString()}] Unknown Error: ${error}\n`
      );
    }
  }
}

async function cleanOldBackups() {
  console.log('Cleaning old backup...');
  const now = Date.now();

  const path = getPath(BACKUP_DIR);
  const backups = list(path);
  if (backups && backups.length > 0) {
    backups.forEach(backupfilename => {
      const backupfilePath = getPath(join(BACKUP_DIR, backupfilename));
      const result = inspect(backupfilePath, {times: true});
      if (result && result?.modifyTime) {
        const diff = now - result.modifyTime.getTime();
        if (diff > retentionPeriod) {
          append(
            getPath(LOG_FILE),
            `[${new Date().toISOString()}] Collection: ${backupfilename.split('-')[0]} Backup deleted: ${backupfilename}\n`
          );
          remove(backupfilePath);
          console.log(`Deleted old backup: ${backupfilename}`);
        }
      }
    });
  }
  console.log('Old backup cleaned!');
}
// Schedule the backup task to run daily at 2 AM
console.log(
  'Starting backup scheduler... - ',
  new Date().toISOString(),
  ' - ',
  interval
);
async function test() {
  await createBackup();
  await cleanOldBackups();
}

if (process.env.QUICKTEST === 'true') {
  test().then();
} else {
  cron.schedule(interval, async () => {
    await createBackup();
    await cleanOldBackups();
    append(
      LOG_FILE,
      `[${new Date().toISOString()}] Scheduled backup completed\n`
    );
  });
}
