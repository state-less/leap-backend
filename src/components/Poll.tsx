import {
    authenticate,
    IComponent,
    isClientContext,
    Scopes,
    useState,
    clientKey,
} from '@state-less/react-server';
import { JWT_SECRET } from '../lib/config';
import { ServerSideProps } from './ServerSideProps';

export enum PollActions {
    Authenticate,
    Revert,
}

export const Poll: IComponent<any> = (
    { values, policies = [] }: { values: string[]; policies: PollActions[] },
    { context, key }
) => {
    let user = null;
    if (isClientContext(context))
        try {
            user = authenticate(context.headers, JWT_SECRET);
        } catch (e) {}

    const [votes, setVotes] = useState(
        values.map(() => 0),
        { key: `votes-${key}`, scope: 'global' }
    );

    const [voted, setVoted] = useState(-1, {
        key: `voted-${key}`,
        scope: `${user?.id || Scopes.Client}`,
    });

    const unvote = (index) => {
        if (voted !== index) {
            throw new Error('You can only unvote what you voted for');
        }
        if (voted === -1) {
            throw new Error('You must vote first');
        }
        const newVotes = [...votes];
        newVotes[index] -= 1;
        setVoted(-1);
        setVotes(newVotes);
    };

    const vote = (index) => {
        if (voted === index && policies.includes(PollActions.Revert)) {
            unvote(index);
            return;
        }
        if (voted !== -1) {
            throw new Error('Already voted');
        }
        const newVotes = [...votes];
        newVotes[index] += 1;
        setVoted(index);
        setVotes(newVotes);
    };

    return (
        <ServerSideProps
            key={clientKey(`poll-props-${key}`, context)}
            votes={votes}
            values={values}
            voted={voted}
            vote={vote}
        />
    );
};
