import {Pool} from 'pg';

export const pool = new Pool({
    host:'localhost',
    user:'postgres',
    password:'arya',
    database:'test',
    port:5432
})