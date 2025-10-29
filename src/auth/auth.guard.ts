import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const gql = GqlExecutionContext.create(context);
    const ctx = gql.getContext() as any;
    const headers = ctx.req?.headers || ctx.connectionParams || {};
    const userId = headers['x-user-id'] || headers['x-user-id'];
    return !!userId;
  }
}
