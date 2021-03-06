import * as firebase_admin from 'firebase-admin';
import { createParamDecorator, Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { getConnection } from 'typeorm';
import { User } from '../user/user.entity';

export class AuthData {
    private user: User = null;
    constructor(private readonly decoded_id_token: firebase_admin.auth.DecodedIdToken ){}
    public get uid(): string { return this.decoded_id_token.uid; }
    public get exp(): number { return this.decoded_id_token.exp; }
    public get iat(): number { return this.decoded_id_token.iat; }
    public get auth_time(): number { return this.decoded_id_token.auth_time; }
    public get iss(): string { return this.decoded_id_token.iss; }
    public async getFirebaseUser(): Promise<firebase_admin.auth.UserRecord> { return await firebase_admin.auth().getUser(this.uid); }
    public get isAnonymous(): boolean {return this.decoded_id_token.firebase.sign_in_provider === 'anonymous';}
    public async getUser(): Promise<User> {
        if ( this.isAnonymous ) throw new ForbiddenException('anonymous not allowed');
        if ( !this.user ) {
            this.user = await getConnection().getRepository(User).findOne({
                where: { firebase_uid: this.decoded_id_token.uid },
            });
            if ( !this.user ) {
                this.user = new User();
                this.user.firebase_uid = this.uid;
                this.user.fcm_token = [];
                this.user = await getConnection().getRepository(User).save(this.user);
            }
        }
        return this.user;
    }
    public async getUserId(): Promise<number> {
        if (!this.user)
            this.user = await getConnection().getRepository(User).findOne({
                where: { firebase_uid: this.decoded_id_token.uid },
            });
            if ( !this.user ) {
                this.user = new User();
                this.user.firebase_uid = this.uid;
                this.user.fcm_token = [];
                this.user = await getConnection().getRepository(User).save(this.user);
            }
        return this.user.id;
    }
}
export const AuthUser = createParamDecorator( (data, [root, args, ctx, info]) => new AuthData(ctx.req.user) );

@Injectable()
export class AuthGuard implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const ctx = GqlExecutionContext.create(context);
        if ( !ctx.getContext().req.headers ) return false;
        if ( ctx.getContext().req.headers.hasOwnProperty('authorization') ) {
            const str_token: string[] = ( ( ctx.getContext().req.headers.authorization ) as string ).split(' ');
            if ( str_token.length !== 2 ) return false;
            try {
                ctx.getContext().req.user = await firebase_admin.auth().verifyIdToken(str_token[1], true);
            } catch ( error ) {
                throw error;
            }
            return true;
        }
        else return false;
    }
}