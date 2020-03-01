import gracefulShutdown from 'http-graceful-shutdown';
import connect from 'connect';
import bodyParser from 'body-parser';
import http from 'http';

function createServer(options: {
  port: number;
  use: [connect.HandleFunction];
}): () => Promise<void> {
  const { port, use } = options;
  const app: connect.Server = connect();

  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());
  app.use(...use);

  const server: http.Server = http.createServer(app).listen(port);

  return gracefulShutdown(server);
}

module.exports = {
  createServer,
};
