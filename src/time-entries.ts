import { parseISO } from 'date-fns';
import * as express from 'express';
import { Request } from 'express';
import { getAccount as dbGetAccount } from './db/accounts-repository';
import { getActive, getAll, getByTimeId, getTags, saveTimeEntry } from './db/time-entry-repository';
import { Account, TimeEntry } from './types';
import * as yup from 'yup';

const router = express.Router();

export async function getLoggedInAccount(req: Request) {
    const auth = req.header('Authorization');
    if (auth.startsWith('Basic ')) {
        const userPass = Buffer.from(auth.substr(6), 'base64').toString('ascii');
        const apiKey = userPass.substr(0, userPass.length - 1);
        return await dbGetAccount(apiKey);
    }

    return null;
}

interface HasAccount {
    account: Account;
}

function hasAccount(req: any): req is HasAccount {
    return 'account' in req;
}

router.use(async (req, res, next) => {
    const account = await getLoggedInAccount(req);
    if (!account) {
        return res.status(401).json({ error: 'not_logged_in' });
    }
    (req as any).account = account;
    next();
});

function getAccount(req: Request) {
    const account = hasAccount(req) ? req.account : null;

    if (!account) {
        throw new Error('No account');
    }
    return account;
}

function toJsonTimeEntry(timeEntry: TimeEntry) {
    const { id, ...rest } = timeEntry;
    return {
        ...rest
    };
}

router.post<any, any, {tags: string[]}>('/start', async (req, res) => {
    const account = getAccount(req);

    const activeTimer = await getActive(account.apiKey);
    if (activeTimer) {
        return res.status(400).json({ error: 'timer_already_started' });
    }

    const tags = req.body;
    const timeEntry: TimeEntry = {
        account: account.apiKey,
        start: new Date(),
        tags: tags?.tags || []
    };
    console.log('save time entry', timeEntry);
    const saved = await saveTimeEntry(timeEntry);
    res.json(toJsonTimeEntry(saved));
});

router.post('/stop', async (req, res) => {
    const account = getAccount(req);
    const activeTimer = await getActive(account.apiKey);
    if (!activeTimer) {
        return res.send(400).json({ error: 'no_active_timer' });
    }

    activeTimer.stop = new Date();
    const timeEntry = await saveTimeEntry(activeTimer);

    res.json(toJsonTimeEntry(timeEntry));
});

router.get('/active', async (req, res) => {
    const account = getAccount(req);
    try {
        const activeTimer = await getActive(account.apiKey);
        if (!activeTimer) {
            console.log('no active timer');
            return res.status(400).json({ error: 'no_active_timer' });
        }

        res.json(toJsonTimeEntry(activeTimer));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
});

router.get('/tags', async (req, res) => {
    const account = getAccount(req);

    const tags = await getTags(account.apiKey);

    res.json({tags});
});

router.put('/:timeId', async (req, res) => {
    const account = getAccount(req);
    const timeId = req.params.timeId;
    if (isNaN(Number(timeId))) {
        return res.status(400).json({error: 'invalid_time_id'});
    }

    const timeEntry = await getByTimeId(account.apiKey, Number(timeId));
    if (!timeEntry) {
        return res.status(400).json({error: 'no_timer_found'});
    }

    const schema = yup.object().noUnknown().shape({
        start: yup.date(),
        stop: yup.date(),
        tags: yup.array().of(yup.string())
    });

    const updatedTimeEntry = req.body;
    if (!schema.isValidSync(updatedTimeEntry)) {
        return res.status(400).json({error: 'invalid_body'});
    }

    const updated = await saveTimeEntry({...timeEntry, ...schema.cast(updatedTimeEntry)});

    res.json(toJsonTimeEntry(updated));
});

router.get('/:timeId', async (req, res) => {
    const account = getAccount(req);
    const timeId = req.params.timeId;
    if (isNaN(Number(timeId))) {
        return res.status(400).json({error: 'invalid_time_id'});
    }

    const timeEntry = await getByTimeId(account.apiKey, Number(timeId));
    if (!timeEntry) {
        return res.status(400).json({error: 'no_timer_found'});
    }

    res.json(toJsonTimeEntry(timeEntry));
});

router.get('/', async (req, res) => {
    const account = getAccount(req);
    const { from, to } = req.query as {from: string, to: string};
    const fromDate = parseISO(from);
    const toDate = parseISO(to);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        return res.status(400).json({error: 'invalid_date_range'});
    }

    const entries = await getAll(account.apiKey, fromDate, toDate);
    res.json(entries.map(toJsonTimeEntry));
});

export default router;
