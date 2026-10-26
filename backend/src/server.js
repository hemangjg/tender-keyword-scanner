const app = require('./app');
const { port } = require('./config');

app.listen(port, () => console.log(`Tender scanner API listening on http://localhost:${port}`));
