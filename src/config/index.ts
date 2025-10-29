import { config } from 'dotenv';
config();
import app from './app.config';
import db from './db.config';
import redis from './redis.config';

export default [app, db, redis];
