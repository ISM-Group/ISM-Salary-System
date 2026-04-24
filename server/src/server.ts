import http from 'http';
import dotenv from 'dotenv';
import app from './app';

dotenv.config();

const port = Number(process.env.PORT || 5002);
const server = http.createServer(app);

server.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
