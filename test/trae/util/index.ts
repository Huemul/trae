// import gracefulShutdown from 'http-graceful-shutdown';
import shutdown from 'http-shutdown';
import connect from 'connect';
import bodyParser from 'body-parser';
import http from 'http';

function createServer(options: {
  port: number;
  endpoint: string;
  handler: connect.HandleFunction;
}): http.Server {
  const { port, handler, endpoint = '/' } = options;
  const app: connect.Server = connect();

  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());
  app.use(endpoint, handler);

  const server: http.Server = http.createServer(app);

  return shutdown(server.listen(port));
}

module.exports = {
  createServer,
};
