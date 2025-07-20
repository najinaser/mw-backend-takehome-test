import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class ProviderLogs {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  vrm: string;

  @Column()
  providerName: string;

  @Column()
  requestUrl: string;

  @Column()
  responseCode: number;

  @Column({ nullable: true })
  errorMessage?: string;

  @Column({ type: 'timestamp' })
  requestDateTime: Date;

  @Column()
  requestDurationMs: number;
}