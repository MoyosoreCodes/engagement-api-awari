export interface GraphQLContext {
  req: {
    user?: {
      id: string;
    };
    headers: Record<string, string>;
  };
}
