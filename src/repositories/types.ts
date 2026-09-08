/**
 * Repository contract — implementations live per aggregate.
 * Services depend on interfaces, not concrete clients.
 */
export interface Repository<TId, TEntity> {
  findById(id: TId): Promise<TEntity | null>;
}
