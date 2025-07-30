'use client';
import {
  ApolloClient,
  HttpLink,
  InMemoryCache,
  split,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';

/**
 * 🎯 ดึง token จาก localStorage
 */
function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

/**
 * 🔐 authLink สำหรับ HTTP (query/mutation)
 */
const authLink = setContext((_, { headers }) => {
  const token = getToken();
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

/**
 * 🔌 GraphQLWsLink สำหรับ subscription
 */
function createWsLink() {
  if (typeof window === 'undefined') return null;

  return new GraphQLWsLink(
    createClient({
      url: 'ws://localhost:4000/graphql', // ใช้ wss:// ถ้า HTTPS
      connectionParams: () => {
        const token = getToken();
        return {
          authorization: token ? `Bearer ${token}` : '',
        };
      },
    })
  );
}

/**
 * 🚀 Apollo Client Factory
 */
const createAIApolloClient = () => {
  const httpLink = new HttpLink({
    uri: 'http://localhost:4000/graphql', // ❗ เปลี่ยนจาก ws:// เป็น http://
  });

  const wsLink = createWsLink();

  const splitLink =
    typeof window !== 'undefined' && wsLink
      ? split(
          ({ query }) => {
            const definition = getMainDefinition(query);
            return (
              definition.kind === 'OperationDefinition' &&
              definition.operation === 'subscription'
            );
          },
          wsLink,
          httpLink
        )
      : httpLink;

  return new ApolloClient({
    cache: new InMemoryCache({ addTypename: false }),
    link: authLink.concat(splitLink),
  });
};

export default createAIApolloClient;
