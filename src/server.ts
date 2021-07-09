import * as express from 'express';
import accounts from './accounts';
import timeEntries from './time-entries';
import * as cors from 'cors';

const app = express();
const port = 3000;

app.use(cors());

app.use(express.json());
app.use('/api/accounts', accounts);
app.use('/api/time', timeEntries);

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
