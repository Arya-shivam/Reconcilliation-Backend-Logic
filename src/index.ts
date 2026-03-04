import express from 'express';
import identifyRouter from './routes/Identifyroute.js';

const app = express();
app.use(express.json());

app.use('/identify', identifyRouter);

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});