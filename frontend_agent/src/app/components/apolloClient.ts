// apolloClient.ts
import { ApolloClient, HttpLink, InMemoryCache, split } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { getSession } from 'next-auth/react';
import { WebSocketLink } from '@apollo/client/link/ws';
import { getMainDefinition } from '@apollo/client/utilities';

const authLink = setContext(async (_, { headers }) => {
  const session = await getSession();
  const token = session?.user?.token;
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

const httpLink = new HttpLink({
  uri: process.env.NEXT_PUBLIC_GQL_API, // กำหนดใน .env.local
});

const wsLink = typeof window !== 'undefined' ? new WebSocketLink({
  uri: process.env.NEXT_PUBLIC_WS_GQL_API as string,
  options: {
    reconnect: true,
    lazy: true,
    timeout: 30000,
    connectionParams: async () => {
      const session = await getSession();
      const token = session?.user?.token;
      return {
        authorization: token ? `Bearer ${token}` : '',
      };
    },
    connectionCallback: (error) => {
      if (error) {
        console.error('WS Connection error:', error);
      }
    },
  },
}) : null;

const splitLink = typeof window !== 'undefined' && wsLink
  ? split(
      ({ query }) => {
        const definition = getMainDefinition(query);
        return (
          definition.kind === 'OperationDefinition' &&
          definition.operation === 'subscription'
        );
      },
      wsLink,
      httpLink,
    )
  : httpLink;

const client = new ApolloClient({
  cache: new InMemoryCache({ addTypename: false }),
  link: authLink.concat(splitLink),
});

export default client;
