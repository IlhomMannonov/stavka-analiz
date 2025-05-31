import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntityFull } from "./template/BaseEntityFull";

@Entity('match')
export class
Match {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'bigint', nullable: true })
    match_id!: number;

    @Column({ type: 'varchar', length: 255, nullable: true })
    game_number!: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    team1!: string;

    @Column({ type: 'bigint', nullable: true })
    team1_id!: number;

    @Column({ type: 'varchar', length: 255, nullable: true })
    team2!: string;

    @Column({ type: 'bigint', nullable: true })
    team2_id!: number;

    @Column({ type: 'timestamp', nullable: true })
    start_time!: Date;

    @Column({ type: 'varchar', length: 255, nullable: true })
    status!: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    result!: string;

    @Column({ type: 'varchar', nullable: true })
    p1_koeff!: string;

    @Column({ type: 'varchar', nullable: true })
    p2_koeff!: string;

    @Column({ type: 'json', nullable: true })
    total_over!: { value: number; koeff: number };

    @Column({ type: 'json', nullable: true })
    total_under!: { value: number; koeff: number };

    @Column({ type: 'bigint', nullable: true })
    message_id!: number;
}
