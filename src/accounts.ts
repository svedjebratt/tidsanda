import * as express from 'express';
import { createAccount, getAccounts } from './db/accounts-repository';
import { v4 as uuid } from 'uuid';
import { getLoggedInAccount } from './time-entries';

const router = express.Router();

router.get('/', async (req, res) => {
    const account = await getLoggedInAccount(req);
    if (!account) {
        return res.status(401).json({ error: 'not_authorized' });
    }

    if (!account.admin) {
        return res.json([{ account: account.apiKey }]);
    }

    try {
        const account = await getAccounts();
        res.json(account);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
});

router.post('/', (req, res) => {
    const apiKey = uuid().substr(0, 8);
    createAccount(apiKey)
        .then((account) => {
            res.json(account);
        })
        .catch((err) => {
            console.error(err);
            res.status(500).json({ error: 'INTERNAL_ERROR' });
        });
});

export default router;
