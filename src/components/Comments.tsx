/* eslint-disable no-shadow */
/* eslint-disable no-unused-vars */
import {
    authenticate,
    ClientContext,
    clientKey,
    Dispatcher,
    IComponent,
    isClientContext,
    Scopes,
    useState,
} from '@state-less/react-server';
import { v4 } from 'uuid';

import { PartialAuth } from '@state-less/react-server/dist/types/auth';
import { JWT_SECRET } from '../lib/config';
import { ServerSideProps } from './ServerSideProps';
import { Admins, GoogleToken, Session } from '../lib/types';
import { VotingPolicies, Votings } from './Votings';

export enum CommentPolicies {
    Authenticate,
    AuthenticateRead,
    Delete,
}

export const Comments: IComponent<any> = (
    {
        policies = [],
        users = [],
    }: { policies: CommentPolicies[]; id: string; users: Admins },
    { key, context }
) => {
    if (
        isClientContext(context) &&
        policies.includes(CommentPolicies.AuthenticateRead)
    )
        authenticate(context.headers, JWT_SECRET);

    let user: Session | null;
    try {
        user = authenticate(
            (context as ClientContext).headers,
            JWT_SECRET
        ) as unknown as Session;
    } catch (e) {
        user = null;
    }

    const [comments, setComments] = useState([], {
        key: `comments`,
        scope: key,
    });

    const comment = (message) => {
        let decoded: Session | PartialAuth<unknown> | null = null;
        try {
            decoded = authenticate(
                (context as ClientContext).headers,
                JWT_SECRET
            );
        } catch (e) {
            decoded = null;
        }

        if (policies.includes(CommentPolicies.Authenticate)) {
            if (!decoded) {
                throw new Error('Not authenticated');
            }
        }

        if (!message) throw new Error('Message is required');

        const { strategy, strategies } = (decoded || {
            strategy: 'anonymous',
        }) as Session;
        const {
            email,
            decoded: { name, picture },
        } = strategies?.[strategy] || {
            email: null,
            decoded: { name: 'Anonymous', picture: null },
        };

        const commentObj = {
            id: v4(),
            message,
            identity: {
                id: (context as ClientContext).headers['x-unique-id'],
                email,
                strategy,
                name,
                picture,
            },
        };
        const newComments = [...comments, commentObj];
        setComments(newComments);
    };

    const del = (index) => {
        const commentToDelete = comments[index];
        if (!commentToDelete) throw new Error('Comment not found');
        const isOwnComment =
            commentToDelete.identity.email ===
                user?.strategies?.[user?.strategy]?.email ||
            (commentToDelete.identity.id ===
                (context as ClientContext).headers['x-unique-id'] &&
                commentToDelete.identity.strategy === 'anonymous');

        if (
            !isOwnComment &&
            !users.includes(user?.strategies?.[user?.strategy]?.email)
        ) {
            throw new Error('Not an admin');
        }

        const newComments = [...comments];
        newComments.splice(index, 1);
        setComments(newComments);
    };

    return (
        <ServerSideProps
            permissions={{
                comment: policies.includes(CommentPolicies.Authenticate)
                    ? !!user?.id
                    : true,
                delete: users.includes(
                    user?.strategies?.[user?.strategy]?.email
                ),
            }}
            key={clientKey(`${key}-props`, context)}
            comments={comments}
            comment={comment}
            del={del}
        >
            {comments.map((cmt, i) => {
                return (
                    <Comment
                        key={`comment-${cmt.id}`}
                        {...cmt}
                        remove={() => del(i)}
                    />
                );
            })}
        </ServerSideProps>
    );
};

export interface CommentProps {
    remove: () => void;
}

export const Comment = (props: CommentProps, { key }) => {
    const { remove } = props;
    const del = () => {
        Dispatcher.getCurrent().destroy();
        remove();
    };
    return (
        <ServerSideProps key={`${key}-props`} {...props} del={del}>
            <Votings
                key={`votings-${key}`}
                policies={[VotingPolicies.SingleVote]}
            />
        </ServerSideProps>
    );
};
