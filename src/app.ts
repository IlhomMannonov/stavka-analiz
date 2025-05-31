import 'reflect-metadata';
import express, {Application} from 'express';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import {errorHandler} from './middilwares/errorHandlers';
import {connectDB} from './config/db';
import mainBotRouter from "./routers/MainBotRouter";
import authenticateToken from "./middilwares/TwtAuth";


const app: Application = express();


// PostgreSQL bazasiga ulanish
connectDB();

app.use(morgan('dev'));
app.use(bodyParser.json());

app.use('/telegram', authenticateToken, mainBotRouter);

app.use(errorHandler);

export default app;
