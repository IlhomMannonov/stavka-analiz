import {Column, Entity} from 'typeorm';
import {BaseEntityFull} from "./template/BaseEntityFull";

@Entity('users')
export class User extends BaseEntityFull {


    @Column({type: 'varchar', length: 255, nullable: true})
    first_name!: string;

    @Column({type: 'varchar', length: 255, nullable: true})
    last_name!: string;
    @Column({type: 'varchar', length: 255, nullable: true})
    phone_number!: string;

    @Column({type: 'varchar', length: 255, nullable: true})
    patron!: string;

    @Column({type: 'varchar', length: 255, unique: true, nullable: true})
    email!: string;

    @Column({type: 'varchar', length: 255, unique: true, nullable: true})
    aviator_id!: string;

    @Column({type: 'varchar', length: 255, unique: true, nullable: true})
    password!: string;

    @Column({type: 'timestamp', nullable: true})
    last_login_time!: Date;

    @Column({type: 'boolean', default: false})
    phone_verified!: boolean;

    @Column({type: 'boolean', default: false})
    email_verified!: boolean;



    @Column({type: 'varchar', length: 255, nullable: true})
    chat_id!: string;

    @Column({type: 'varchar', length: 255, nullable: true})
    state!: string;

    @Column({type: 'boolean', default: false})
    is_bot_user!: boolean;


}
