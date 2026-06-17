// 种子脚本 - 创建初始管理员用户
import Database from 'better-sqlite3'
import { hash } from 'bcryptjs'
import { randomUUID } from 'crypto'

const DB_PATH = process.env.DB_PATH || './data/db/enterprise.db'
