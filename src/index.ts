import http from 'http';
import app from './app';
import config from './config/config';
import {get_fifa18} from "./service/SportService";

const index = http.createServer(app);

index.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
});


const fifa = get_fifa18()

