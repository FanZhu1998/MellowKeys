import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

// The same ordered migrations serve local development and desktop releases.
export function openDatabase(filename, migrationDirectory) {
  fs.mkdirSync(path.dirname(filename), {recursive:true});
  const sqlite = new DatabaseSync(filename);
  sqlite.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
  sqlite.exec('CREATE TABLE IF NOT EXISTS mellow_migrations (name TEXT PRIMARY KEY NOT NULL)');
  const files=fs.readdirSync(migrationDirectory).filter(f=>/^\d+_[\w-]+\.sql$/.test(f)).sort();
  const known=new Set(files);
  for(const {name} of sqlite.prepare('SELECT name FROM mellow_migrations').all())if(!known.has(name)){sqlite.close();throw Error('This library was saved by a newer app. Please use the newer version.');}
  for(const name of files){
    if(sqlite.prepare('SELECT name FROM mellow_migrations WHERE name=?').get(name))continue;
    sqlite.exec('BEGIN');
    try{
      const legacy=name==='0000_lyrical_longshot.sql'&&sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='studio_workspaces'").get();
      if(!legacy)sqlite.exec(fs.readFileSync(path.join(migrationDirectory,name),'utf8'));
      sqlite.prepare('INSERT INTO mellow_migrations VALUES (?)').run(name);
      sqlite.exec('COMMIT');
    }catch(error){sqlite.exec('ROLLBACK');sqlite.close();throw error;}
  }
  return {
    prepare(sql){return {bind(...args){const statement=sqlite.prepare(sql);return {first:async()=>statement.get(...args),run:async()=>({meta:{changes:Number(statement.run(...args).changes)}})};}};},
    close(){sqlite.close();},
  };
}
