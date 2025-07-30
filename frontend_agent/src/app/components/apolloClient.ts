'use client';
import { ApolloClient, HttpLink, InMemoryCache, split } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { WebSocketLink } from '@apollo/client/link/ws';
import { getMainDefinition } from '@apollo/client/utilities';

/**
 * 🎯 Utility: ดึง token จาก localStorage (หรือจุดอื่นที่คุณจัดการไว้)
 */
function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token'); // เปลี่ยนตามกลไกการจัดเก็บ token ของคุณ
}

/**
 * 🔐 authLink สำหรับ HTTP request
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
 * 🔌 WebSocketLink สำหรับ subscription
 */
function createWsLink() {
  if (typeof window === 'undefined') return null;

  return new WebSocketLink({
    uri: process.env.WS_GQL_API as string,
    options: {
      reconnect: true,
      reconnectionAttempts: 5,
      timeout: 30000,
      lazy: true,
      connectionParams: () => {
        const token = getToken();
        return {
          authorization: token ? `Bearer ${token}` : '',
        };
      },
      connectionCallback: (error: any) => {
        if (error) {
          console.error('WS Connection error:', error);
        }
      },
    },
  });
}

/**
 * 🚀 Apollo Client Factory
 */
const createAIApolloClient = () => {
  const httpLink = new HttpLink({
    uri: process.env.GQL_API,
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
