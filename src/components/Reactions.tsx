import {
    clientKey,
    Initiator,
    Scopes,
    useState,
} from '@state-less/react-server';
import { ServerSideProps } from './ServerSideProps';

type ReactionsState = Record<string, number>;
type ReactionsProps = {
    values: string[];
    key?: string;
    policies: ReactionPolicies[];
};

export const reactionsWhiteList = ['love', 'laugh', 'thumbs-up', 'thumbs-down'];

export enum ReactionPolicies {
    SingleVote = 'single-vote',
}

export const Reactions = (
    { policies = [], values = [] }: ReactionsProps,
    { context, key, initiator }
) => {
    const [reactions, setReactions] = useState<ReactionsState>(
        {},
        {
            key: `votings`,
            scope: key,
        }
    );

    const [voted, setVoted] = useState(null, {
        key: `voted`,
        scope: `${key}-${Scopes.Client}`,
    });

    const react = (reactionKey: string) => {
        if (!values.includes(reactionKey)) {
            throw new Error('Invalid reaction');
        }

        let newReactions;

        if (voted === reactionKey) {
            newReactions = {
                ...reactions,
                [reactionKey]: Math.max(1, Number(reactions[reactionKey])) - 1,
            };
            setTimeout(() => {
                setVoted(null);
            }, 0);
        } else {
            newReactions = {
                ...reactions,
                [reactionKey]: (reactions[reactionKey] || 0) + 1,
            };
            if (voted) {
                newReactions[voted] = Math.max(
                    1,
                    Number(newReactions[voted]) - 1
                );
            }
            setTimeout(() => {
                setVoted(reactionKey);
            }, 0);
        }

        setReactions(newReactions);
    };

    return (
        <ServerSideProps
            key={clientKey(`reactions-props-${key}`, context)}
            reactions={reactions}
            react={react}
            voted={voted}
            policies={policies}
        />
    );
};
