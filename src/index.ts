const express = require('express');
import {pool} from './db';

const app = express();
app.use(express.json());

app.use('/identify', IdentifyRouter);

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});