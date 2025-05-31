import {Request} from "express";
import {User} from "../User";

export interface AuthenticatedRequest extends Request {
    user?: any;
}
export interface IUser {
    id?: number;
    first_name?: string;
    last_name?: string;
    phone_number?: string;
    patron?: string;
    email?: string;
    password?: string;
}

export function userToIUser(user: User): IUser {
    return {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        phone_number: user.phone_number,
        patron: user.patron,
        email: user.email,
        password: user.password,
    };
}

