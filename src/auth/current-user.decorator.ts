import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export const CurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const gql = GqlExecutionContext.create(context);
    const ctx = gql.getContext() as any;
    if (ctx.req) {
      const id = ctx.req.headers['x-user-id'] || ctx.req.headers['x-user-id'];
      return { id };
    }
    const connectionParams = ctx.connectionParams || {};
    return { id: connectionParams['x-user-id'] };
  },
);
