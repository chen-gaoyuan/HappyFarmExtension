import { Logger } from './log';
import { Server } from './bus/server';

const server = new Server();
server.start();

const logger = new Logger('APP');
process.on('uncaughtException', function (err) {
    logger.error('uncaughtException:');
    logger.error(err);
});
process.on('unhandledRejection', function (err, promise) {
    logger.error('unhandledRejection:');
    logger.error(promise);
    logger.error(err);
});
